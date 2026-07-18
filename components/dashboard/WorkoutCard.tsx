"use client";

// ─── components/dashboard/WorkoutCard.tsx ────────────────────────────────────
// Phase UX-1 — Workout Experience Redesign.
// This component manages ALL workout state and data writes.
// Rendering is delegated to focused sub-components:
//   idle  → WorkoutHeroView (+ training header, rescue banners)
//   skip-reason → inline reason picker
//   feedback → inline post-workout feedback
//   active → GuidedExerciseFlow + RestScreen
//   done  → WorkoutCompletionView
//
// Dashboard 3.0 — Layer 1 consolidation. Merges what were 6 separate sibling
// cards (TrainingCard, ConfidenceBadge, SkipReasonCard, WorkoutFeedbackCard,
// MinimumViableWorkoutCard, RescueModeCard) into this one card as internal
// render branches. Trigger/detection logic for rescue-session-offer and
// rescue-mode-active stays external (computed in app/dashboard/page.tsx's
// adherence-risk refresh routine, which this component has no visibility
// into) — only their presentation moved. skip-reason and feedback modes are
// fully internal now: both were driven by this component's own lifecycle
// already (a click inside WorkoutHeroView, or handleFinish() completing),
// so page.tsx no longer needs to own showSkipReason/showFeedback at all.
// See docs/ux/UXStabilizationAudit.md for the Dashboard 3.0 batch entry.

import { useState, useEffect, useRef } from "react";
import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { Exercise }           from "@/lib/exercises/exerciseLibrary";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";
import type { LoggedExercise, LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import {
  saveLoggedWorkout,
  setActiveWorkout,
  getActiveWorkout,
  clearActiveWorkout,
  getLoggedWorkout,
} from "@/lib/workoutExecution/workoutLogging";
import {
  saveExercisePerformances,
  type ExercisePerformance,
} from "@/lib/progression/exerciseHistory";
import { getExerciseHistory } from "@/lib/history/exerciseHistory";
import { generateWarmupSets } from "@/lib/exercises/warmupSets";
import { canPostpone, postponeArray, postponeRecord } from "@/lib/exercises/postponeExercise";
import type { SetRecord }         from "@/components/workout/types";
import { WorkoutHeroView }        from "@/components/workout/WorkoutHeroView";
import { WorkoutModeShell }       from "@/components/workout/WorkoutModeShell";
import { GuidedExerciseFlow }     from "@/components/workout/GuidedExerciseFlow";
import { RestScreen }             from "@/components/workout/RestScreen";
import { WorkoutCompletionView }  from "@/components/workout/WorkoutCompletionView";
import { ErrorBoundary }          from "@/components/resilience/ErrorBoundary";
import { AxisIcon }               from "@/components/ui/Icon";
import { ConfidenceBadge }        from "@/components/intelligence/ConfidenceBadge";
import type { ConfidenceProfile } from "@/lib/intelligence/confidence/ConfidenceTypes";
import type { TrainingRecommendation } from "@/types/recommendation";
import { SKIP_REASONS, type SkipReason } from "@/lib/adherence/skipReasonStore";
import type { RecoveryRating, PerformanceRating, WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import { saveWorkoutFeedback, getWorkoutFeedback } from "@/lib/workoutExecution/feedback";
import type { MinimumViableWorkout } from "@/lib/adherence/minimumWorkout";
import type { RescueModeState }      from "@/lib/adherence/rescueMode";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutMode = "idle" | "skip-reason" | "feedback" | "active" | "done";

const REST_TIMER_STORAGE_KEY = "axis_rest_timer_enabled";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultSets(ex: WorkoutExercise, lastWeight?: number): SetRecord[] {
  return Array.from({ length: ex.sets }, () => ({
    targetReps: ex.reps,
    completed:  false,
    actualReps: ex.reps,
    weight:     lastWeight,
    rpe:        ex.rpe ?? undefined,
  }));
}

// Workout Engine Sprint — Phase A.1. Warm-up sets ramp toward the same
// lastWeight reference defaultSets() already uses, so both are computed from
// one history lookup per exercise (see the actuals/warmupActuals
// initializers below) rather than duplicating it. Logged as ordinary
// SetRecord[] — reusing ExerciseFocusCard's existing completion-tracking
// pattern — but kept in a separate warmupActuals map so warm-up completions
// never reach buildExercisePerformances()/buildLog(), i.e. never count as
// working volume.
function defaultWarmupSets(ex: WorkoutExercise, lastWeight?: number): SetRecord[] {
  return generateWarmupSets(ex.exercise, lastWeight).map(w => ({
    targetReps: w.reps,
    completed:  false,
    actualReps: w.reps,
    weight:     w.weight,
  }));
}

function parseReps(repsStr: string): number {
  const n = parseInt(repsStr, 10);
  return isNaN(n) ? 0 : n;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Training header (merged TrainingCard) ────────────────────────────────────

const BADGE_CONFIG = {
  Push:     { bg: "bg-success-bg",    text: "text-success-text", label: "Push day"    },
  Maintain: { bg: "bg-brand-bg-mid",  text: "text-brand-text",   label: "Maintain"    },
  Watch:    { bg: "bg-caution-bg",    text: "text-caution-text", label: "Watch"       },
  Recover:  { bg: "bg-neutral-bg",    text: "text-neutral-text", label: "Recovery day" },
};

function TrainingHeader({
  training, restDaySignal, confidenceProfile,
}: {
  training: TrainingRecommendation;
  restDaySignal: boolean;
  confidenceProfile?: ConfidenceProfile | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = BADGE_CONFIG[training.badge] ?? BADGE_CONFIG.Maintain;

  return (
    <div className="mb-4 pb-4 border-b border-border">
      {restDaySignal && (
        <div className="mb-3 p-3 bg-neutral-bg rounded-xl border border-neutral-border">
          <p className="text-[11px] text-neutral-text leading-relaxed">
            Readiness has been below threshold for 3 consecutive days. A rest day or active
            recovery session may better serve training outcomes than structured load today.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug">{training.focus}</h3>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          {confidenceProfile && <ConfidenceBadge level={confidenceProfile.level} size="sm" />}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">Intensity</span>
        <span className="text-[11px] font-semibold text-ink">{training.intensity}</span>
      </div>

      <p className="text-[12px] text-ink-secondary leading-relaxed italic border-l-2 border-border-strong pl-3">
        &ldquo;{training.headline}&rdquo;
      </p>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="mt-2 text-[11px] font-semibold text-brand hover:text-brand-dark transition-colors min-h-[44px] flex items-center focus-ring"
        aria-expanded={expanded}
      >
        {expanded ? "Show less ↑" : "More detail ↓"}
      </button>

      {expanded && (
        <div className="mt-2">
          <p className="text-[12px] text-ink-secondary leading-relaxed mb-3">{training.body}</p>
          {training.suggestions?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Suggested focus</div>
              <ul className="space-y-1.5">
                {training.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12px] text-ink-secondary leading-relaxed">
                    <span className="mt-[5px] w-1 h-1 rounded-full bg-ink-faint flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {training.avoidNote && (
            <div className="mt-3 p-3 bg-caution-bg rounded-xl border border-caution-border">
              <p className="text-[11px] text-caution-text leading-relaxed">{training.avoidNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rescue banners (merged RescueModeCard + MinimumViableWorkoutCard) ────────

function RescueModeBanner({ rescueMode, onExit }: { rescueMode: RescueModeState; onExit: () => void }) {
  const { adjustments, daysRemaining } = rescueMode;
  const progress = Math.max(0, Math.min(100, ((7 - daysRemaining) / 7) * 100));
  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-widest mb-0.5">Rescue Mode Active</div>
          <h4 className="text-sm font-semibold text-ink">Protecting Your Momentum</h4>
          <p className="text-[11px] text-ink-muted mt-0.5">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</p>
        </div>
        <button onClick={onExit} className="text-[11px] text-ink-muted hover:text-ink-secondary border border-border rounded-full px-3 py-1 transition-colors flex-shrink-0 min-h-[44px] focus-ring">
          Exit mode
        </button>
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-ink-muted flex justify-between">
          <span>Started</span><span>Day {7 - daysRemaining + 1} of 7</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-black/8">
          <div className="h-1.5 rounded-full bg-rose-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Sessions", value: `${adjustments.targetSessions} / week` },
          { label: "Duration", value: `${adjustments.sessionDurationMin} min` },
          { label: "Nutrition", value: adjustments.nutritionFocus },
          { label: "Recovery", value: `${adjustments.recoveryHabits} habit / day` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-subtle border border-border rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-ink-muted mb-0.5">{label}</div>
            <div className="text-xs font-medium text-ink">{value}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-muted leading-relaxed text-center">
        Rescue mode reduces volume and expectations so you stay in the habit without burning out further.
        Axis will gradually restore normal load once momentum returns.
      </p>
    </div>
  );
}

function RescueOfferBanner({ workout, onDismiss }: { workout: MinimumViableWorkout; onDismiss: () => void }) {
  return (
    <div className="bg-caution-bg border border-caution-border rounded-2xl p-4 space-y-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-caution font-semibold uppercase tracking-widest mb-0.5">Rescue Session</div>
          <h4 className="text-sm font-semibold text-ink">{workout.name}</h4>
          <p className="text-[11px] text-ink-muted mt-0.5">{workout.durationMin} min · No equipment needed</p>
        </div>
        <button onClick={onDismiss} className="min-w-[44px] min-h-[44px] -m-2.5 flex items-center justify-center text-ink-muted hover:text-ink-secondary text-lg leading-none flex-shrink-0" aria-label="Dismiss">×</button>
      </div>
      <p className="text-[11px] text-ink-secondary leading-relaxed">{workout.rationale}</p>
      <div className="space-y-2">
        {workout.exercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between bg-white/60 border border-caution-border rounded-xl px-3 py-2.5">
            <div>
              <div className="text-xs font-medium text-ink">{ex.name}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">{ex.sets} sets × {ex.reps}</div>
            </div>
            <div className="text-[10px] text-ink-muted">{ex.restSec}s rest</div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-ink-muted text-center">
        Something is always better than nothing. Ten minutes today keeps the habit alive.
      </p>
    </div>
  );
}

// ─── Skip-reason (merged SkipReasonCard) ──────────────────────────────────────

function SkipReasonView({ onComplete, onDismiss }: { onComplete: (reason: SkipReason) => void; onDismiss: () => void }) {
  const [selected, setSelected] = useState<SkipReason | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Why did you skip?</h3>
        <p className="text-[11px] text-ink-muted mt-0.5">This helps Axis learn when to offer you a shorter session.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SKIP_REASONS.map(reason => (
          <button
            key={reason}
            onClick={() => setSelected(reason)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selected === reason
                ? "bg-brand-bg-mid border-brand-border text-brand-dark"
                : "bg-surface-hover border-border text-ink-secondary hover:text-ink"
            }`}
          >
            {reason}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { if (selected) onComplete(selected); }}
          disabled={!selected}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors min-h-[44px]"
        >
          Save
        </button>
        <button onClick={onDismiss} className="px-4 py-2.5 rounded-xl text-sm text-ink-secondary hover:text-ink transition-colors min-h-[44px]">
          Skip
        </button>
      </div>
    </div>
  );
}

// ─── Feedback (merged WorkoutFeedbackCard) ────────────────────────────────────

const RECOVERY_OPTIONS: { value: RecoveryRating; label: string }[] = [
  { value: "fully_recovered",     label: "Fully recovered"     },
  { value: "slight_fatigue",      label: "Slight fatigue"      },
  { value: "moderate_fatigue",    label: "Moderate fatigue"    },
  { value: "significant_fatigue", label: "Significant fatigue" },
];
const PERFORMANCE_OPTIONS: { value: PerformanceRating; label: string }[] = [
  { value: "better",   label: "Better than expected" },
  { value: "expected", label: "As expected"          },
  { value: "worse",    label: "Worse than expected"  },
];

function FeedbackOptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border transition-colors text-center min-h-[44px] ${
        selected ? "bg-brand-bg-mid text-brand-dark border-brand-border" : "bg-surface-subtle text-ink-secondary border-border hover:border-border-strong"
      }`}
    >
      {children}
    </button>
  );
}

function FeedbackView({ date, onComplete }: { date: string; onComplete: (feedback: WorkoutFeedback) => void }) {
  const [sessionRPE,        setSessionRPE]        = useState<number>(5);
  const [recoveryRating,    setRecoveryRating]    = useState<RecoveryRating | null>(null);
  const [performanceRating, setPerformanceRating] = useState<PerformanceRating | null>(null);
  const canSubmit = recoveryRating !== null && performanceRating !== null;

  function handleSubmit() {
    if (!canSubmit) return;
    const feedback: WorkoutFeedback = {
      id: date, date, sessionRPE,
      recoveryRating: recoveryRating!, performanceRating: performanceRating!,
      savedAt: new Date().toISOString(),
    };
    saveWorkoutFeedback(feedback);
    onComplete(feedback);
  }

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">Session feedback</div>
      <div className="mb-5">
        <div className="text-[12px] font-semibold text-ink mb-2">How difficult was today&apos;s workout?</div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-ink-muted">Effort level</span>
          <span className="text-[13px] font-semibold text-ink">{sessionRPE}<span className="text-ink-muted font-normal">/10</span></span>
        </div>
        <input type="range" min="1" max="10" value={sessionRPE} onChange={e => setSessionRPE(Number(e.target.value))} className="w-full accent-brand cursor-pointer" />
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-ink-muted">Very easy</span>
          <span className="text-[10px] text-ink-muted">Maximal effort</span>
        </div>
      </div>
      <div className="mb-5">
        <div className="text-[12px] font-semibold text-ink mb-2">How recovered do you feel?</div>
        <div className="flex flex-col gap-2">
          {RECOVERY_OPTIONS.map(opt => (
            <FeedbackOptionButton key={opt.value} selected={recoveryRating === opt.value} onClick={() => setRecoveryRating(opt.value)}>{opt.label}</FeedbackOptionButton>
          ))}
        </div>
      </div>
      <div className="mb-5">
        <div className="text-[12px] font-semibold text-ink mb-2">How was your performance today?</div>
        <div className="flex gap-2">
          {PERFORMANCE_OPTIONS.map(opt => (
            <FeedbackOptionButton key={opt.value} selected={performanceRating === opt.value} onClick={() => setPerformanceRating(opt.value)}>{opt.label}</FeedbackOptionButton>
          ))}
        </div>
      </div>
      <button
        type="button" onClick={handleSubmit} disabled={!canSubmit}
        className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-colors min-h-[44px] ${
          canSubmit ? "bg-brand text-white hover:bg-brand-dark" : "bg-surface-hover text-ink-faint cursor-not-allowed"
        }`}
      >
        Save feedback
      </button>
      {!canSubmit && <p className="text-center text-[11px] text-ink-muted mt-2">Select recovery and performance to continue</p>}
    </div>
  );
}

function FeedbackSavedNote() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-success-bg border border-success-border flex items-center justify-center flex-shrink-0">
        <AxisIcon name="check" size={12} strokeWidth={2.5} className="text-success" />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-ink">Session feedback saved</div>
        <div className="text-[11px] text-ink-muted">Used to improve future recommendations</div>
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout:              GeneratedWorkout;
  environment:          TrainingEnvironment;
  onEnvironmentChange:  (env: TrainingEnvironment) => void;
  completionStatus?:    WorkoutCompletionStatus;
  onMarkComplete:       () => void;
  onMarkPartial:        () => void;
  onMarkSkip:           () => void;
  onWorkoutLogged?:     (log: LoggedWorkout) => void;
  confidenceProfile?:   ConfidenceProfile | null;
  training:             TrainingRecommendation;
  restDaySignal?:       boolean;
  onSkipReasonComplete: (reason: SkipReason) => void;
  onFeedbackComplete?:  (feedback: WorkoutFeedback) => void;
  rescueWorkout?:          MinimumViableWorkout;
  showRescueSession?:      boolean;
  onDismissRescueSession?: () => void;
  rescueModeState?:        RescueModeState | null;
  onExitRescueMode?:       () => void;
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

export function WorkoutCard({
  workout,
  environment,
  onEnvironmentChange,
  completionStatus = "pending",
  onMarkComplete,
  onMarkPartial,
  onMarkSkip,
  onWorkoutLogged,
  confidenceProfile,
  training,
  restDaySignal = false,
  onSkipReasonComplete,
  onFeedbackComplete,
  rescueWorkout,
  showRescueSession = false,
  onDismissRescueSession,
  rescueModeState,
  onExitRescueMode,
}: WorkoutCardProps) {
  const todayStr = today();

  // Mutable exercise list — supports in-session swaps
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);

  function handleSwap(idx: number, newExercise: Exercise) {
    setExercises(prev => prev.map((ex, i) =>
      i === idx ? { ...ex, name: newExercise.name, exercise: newExercise } : ex
    ));
  }

  // Workout Engine Sprint — Phase B.7. Postpone the exercise at `idx` — see
  // lib/exercises/postponeExercise.ts for the reorder invariant. A no-op
  // when there's no next exercise to postpone past.
  function handlePostpone(idx: number) {
    if (!canPostpone(idx, exercises.length)) return;
    const length = exercises.length;
    setExercises(prev => postponeArray(prev, idx));
    setActuals(prev => postponeRecord(prev, idx, length));
    setWarmupActuals(prev => postponeRecord(prev, idx, length));
  }

  // Add an exercise mid-session (UX Stabilization #9). Uses sensible defaults —
  // it logs identically to a generated exercise, no special-casing downstream.
  function handleAddExercise(newExercise: Exercise) {
    const added: WorkoutExercise = {
      name:      newExercise.name,
      exercise:  newExercise,
      sets:      3,
      reps:      "8-12",
      rest:      "90 sec",
      rationale: "Added mid-session.",
    };
    const newIdx = exercises.length;
    setExercises(prev => [...prev, added]);
    const history    = getExerciseHistory(added.name);
    const lastWeight = (history.bestSet && history.bestSet.weight > 0)
      ? history.bestSet.weight
      : undefined;
    setActuals(prev => ({ ...prev, [newIdx]: defaultSets(added, lastWeight) }));
    setWarmupActuals(prev => ({ ...prev, [newIdx]: defaultWarmupSets(added, lastWeight) }));
  }

  // Restore in-progress state from localStorage on mount. Also detects the
  // "workout logged this session, feedback not yet given" state (previously
  // page.tsx's own showFeedback, seeded from getLoggedWorkout() !== null at
  // mount) — skip-reason mode is intentionally NOT re-derived here: it's a
  // one-time same-session prompt, not something that should reappear on
  // every reload once a workout is already marked skipped.
  const [mode, setMode] = useState<WorkoutMode>(() => {
    if (typeof window === "undefined") return "idle";
    if (completionStatus === "pending") {
      const active = getActiveWorkout();
      return active?.date === todayStr ? "active" : "idle";
    }
    if (
      (completionStatus === "completed" || completionStatus === "partially_completed") &&
      getLoggedWorkout(todayStr) !== null &&
      getWorkoutFeedback(todayStr) === null
    ) {
      return "feedback";
    }
    return "idle";
  });

  const startedAtRef = useRef<number>(
    typeof window !== "undefined"
      ? (() => {
          const active = getActiveWorkout();
          if (active?.date === todayStr) return new Date(active.startedAt).getTime();
          return Date.now();
        })()
      : Date.now()
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [actuals, setActuals] = useState<Record<number, SetRecord[]>>(() =>
    Object.fromEntries(
      workout.exercises.map((ex, i) => {
        const history    = getExerciseHistory(ex.name);
        const lastWeight = (history.bestSet && history.bestSet.weight > 0)
          ? history.bestSet.weight
          : undefined;
        return [i, defaultSets(ex, lastWeight)];
      })
    )
  );

  // Workout Engine Sprint — Phase A.1. Kept separate from `actuals` so
  // warm-up completions never reach buildExercisePerformances()/buildLog()
  // (never count as working volume).
  const [warmupActuals, setWarmupActuals] = useState<Record<number, SetRecord[]>>(() =>
    Object.fromEntries(
      workout.exercises.map((ex, i) => {
        const history    = getExerciseHistory(ex.name);
        const lastWeight = (history.bestSet && history.bestSet.weight > 0)
          ? history.bestSet.weight
          : undefined;
        return [i, defaultWarmupSets(ex, lastWeight)];
      })
    )
  );

  const [overallDifficulty, setOverallDifficulty] = useState(5);
  const [finishedDuration,  setFinishedDuration]  = useState(0);
  const [restTimer, setRestTimer] = useState<{
    totalSeconds:  number;
    exerciseName:  string;
    nextExercise:  string | null;
  } | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(
    () => typeof window !== "undefined" && getWorkoutFeedback(todayStr) !== null
  );

  // Rest-timer preference (Settings → Workout preferences) — defaults to on.
  // onRestStart still fires either way; when off, we simply don't surface the
  // forced rest screen, so exercises continue without interruption.
  const [restTimerEnabled] = useState(() =>
    typeof window === "undefined"
      ? true
      : (localStorage.getItem(REST_TIMER_STORAGE_KEY) ?? "true") === "true"
  );

  // ── Timer ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== "active") return;
    setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Clean up active flag if status resolved outside this component
  useEffect(() => {
    if (completionStatus !== "pending") clearActiveWorkout();
  }, [completionStatus]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const stateWarning =
    workout.trainingState === "overreached"
      ? "Today's session has been significantly reduced to support nervous system recovery."
      : workout.trainingState === "fatigued"
      ? "Volume has been reduced — focus on movement quality over load."
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleStart() {
    setActiveWorkout(todayStr);
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setMode("active");
  }

  function handleSkip() {
    onMarkSkip();
    setMode("skip-reason");
  }

  function handleSkipReasonSave(reason: SkipReason) {
    onSkipReasonComplete(reason);
    setMode("idle");
  }

  function handleFeedbackSave(feedback: WorkoutFeedback) {
    setFeedbackSubmitted(true);
    onFeedbackComplete?.(feedback);
    setMode("idle");
  }

  function buildExercisePerformances(
    exerciseList: WorkoutExercise[],
    actualsMap:   Record<number, SetRecord[]>,
    date:         string,
    completed:    boolean,
  ): ExercisePerformance[] {
    return exerciseList.map((ex, i) => {
      const sets = actualsMap[i] ?? defaultSets(ex);
      const done = sets.filter(s => s.completed);

      if (done.length === 0) {
        return {
          exerciseId:   ex.name,
          exerciseName: ex.name,
          date,
          weight:       0,
          reps:         parseReps(ex.reps),
          sets:         ex.sets,
          completed:    false,
        } satisfies ExercisePerformance;
      }

      const avgWeight = done.reduce((s, d) => s + (d.weight ?? 0), 0) / done.length;
      const avgReps   = done.reduce((s, d) => s + parseReps(d.actualReps || d.targetReps), 0) / done.length;
      const lastRpe   = [...done].reverse().find(d => d.rpe !== undefined)?.rpe;

      return {
        exerciseId:   ex.name,
        exerciseName: ex.name,
        date,
        weight:       Math.round(avgWeight * 10) / 10,
        reps:         Math.round(avgReps),
        sets:         done.length,
        rpe:          lastRpe,
        completed,
      } satisfies ExercisePerformance;
    });
  }

  function buildPlannedPerformances(
    exerciseList: WorkoutExercise[],
    date:         string,
  ): ExercisePerformance[] {
    return exerciseList.map(ex => ({
      exerciseId:   ex.name,
      exerciseName: ex.name,
      date,
      weight:       0,
      reps:         parseReps(ex.reps),
      sets:         ex.sets,
      completed:    true,
    } satisfies ExercisePerformance));
  }

  function buildLog(status: "completed" | "partial"): LoggedWorkout {
    const loggedExercises: LoggedExercise[] = exercises.map((ex, i) => {
      const sets    = actuals[i] ?? defaultSets(ex);
      const done    = sets.filter(s => s.completed);
      const repsArr = done.map(s => s.actualReps || s.targetReps);
      const repsStr = repsArr[0] ?? ex.reps;
      const avgWt   = done.length > 0
        ? done.reduce((sum, s) => sum + (s.weight ?? 0), 0) / done.length
        : undefined;
      const lastRpe = [...done].reverse().find(s => s.rpe !== undefined)?.rpe ?? (ex.rpe ?? 0);
      return {
        exerciseName:   ex.name,
        prescribedSets: ex.sets,
        completedSets:  done.length,
        prescribedReps: ex.reps,
        completedReps:  repsArr.join(", ") || ex.reps,
        prescribedRPE:  ex.rpe ?? 0,
        actualRPE:      lastRpe,
        weight:         avgWt && avgWt > 0 ? avgWt : undefined,
        actualReps:     parseReps(repsStr) || undefined,
      };
    });
    return {
      id:               todayStr,
      date:             todayStr,
      workoutName:      workout.workoutName,
      completionStatus: status,
      exercises:        loggedExercises,
      durationMinutes:  Math.max(1, Math.round(elapsedSeconds / 60)),
      overallDifficulty,
    };
  }

  function handleFinish(status: "completed" | "partial") {
    const dur = Math.max(1, Math.round(elapsedSeconds / 60));
    setFinishedDuration(dur);
    const log  = buildLog(status);
    const perfs = buildExercisePerformances(exercises, actuals, todayStr, status === "completed");
    saveLoggedWorkout(log);
    saveExercisePerformances(perfs);
    clearActiveWorkout();
    if (status === "completed") onMarkComplete(); else onMarkPartial();
    onWorkoutLogged?.(log);
    setMode("done");
  }

  function handleQuickMarkComplete() {
    saveExercisePerformances(buildPlannedPerformances(exercises, todayStr));
    onMarkComplete();
  }

  function handleQuickMarkPartial() {
    saveExercisePerformances(
      buildPlannedPerformances(exercises, todayStr).map(p => ({ ...p, completed: false }))
    );
    onMarkPartial();
  }

  function handleDoneAcknowledged() {
    // Matches the pre-merge behavior: finishing the guided flow set
    // showFeedback=true in the background while the completion screen was
    // still showing; clicking through landed on the feedback prompt (not a
    // bare idle dashboard) if feedback hadn't been given yet.
    setMode(feedbackSubmitted ? "idle" : "feedback");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary label="workout-experience">
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-4">
        Today's Workout
      </div>

      {/* ── Idle: training header + rescue banners + pre-workout hero ────── */}
      {mode === "idle" && (
        <>
          {rescueModeState && onExitRescueMode && (
            <RescueModeBanner rescueMode={rescueModeState} onExit={onExitRescueMode} />
          )}
          {showRescueSession && rescueWorkout && onDismissRescueSession && (
            <RescueOfferBanner workout={rescueWorkout} onDismiss={onDismissRescueSession} />
          )}
          <TrainingHeader training={training} restDaySignal={restDaySignal} confidenceProfile={confidenceProfile} />
          <WorkoutHeroView
            workout={workout}
            environment={environment}
            onEnvironmentChange={onEnvironmentChange}
            completionStatus={completionStatus}
            stateWarning={stateWarning}
            onStart={handleStart}
            onQuickMarkComplete={handleQuickMarkComplete}
            onQuickMarkPartial={handleQuickMarkPartial}
            onMarkSkip={handleSkip}
          />
        </>
      )}

      {/* ── Skip reason ───────────────────────────────────────────────────── */}
      {mode === "skip-reason" && (
        <SkipReasonView onComplete={handleSkipReasonSave} onDismiss={() => setMode("idle")} />
      )}

      {/* ── Post-workout feedback ────────────────────────────────────────── */}
      {mode === "feedback" && (
        feedbackSubmitted
          ? <FeedbackSavedNote />
          : <FeedbackView date={todayStr} onComplete={handleFeedbackSave} />
      )}

      {/* ── Active + Done: dedicated Workout Mode ────────────────────────────
          Phase C.9 — a full-viewport dark overlay (WorkoutModeShell), not
          inline in this card. The dashboard's nav is unreachable underneath
          it. See docs/ux/WorkoutModeProposal.md. */}
      {(mode === "active" || mode === "done") && (
        <WorkoutModeShell>
          {mode === "active" && (
            <GuidedExerciseFlow
              exercises={exercises}
              actuals={actuals}
              onChange={(idx, sets) => setActuals(prev => ({ ...prev, [idx]: sets }))}
              warmupActuals={warmupActuals}
              onWarmupChange={(idx, sets) => setWarmupActuals(prev => ({ ...prev, [idx]: sets }))}
              onRestStart={(totalSeconds, exerciseName) => {
                if (!restTimerEnabled) return; // preference off — continue without a forced screen
                // Find the next exercise name for the rest screen preview
                const currentIdx  = exercises.findIndex(e => e.name === exerciseName);
                const nextExercise = currentIdx >= 0 && currentIdx < exercises.length - 1
                  ? exercises[currentIdx + 1].name
                  : null;
                setRestTimer({ totalSeconds, exerciseName, nextExercise });
              }}
              elapsedSeconds={elapsedSeconds}
              environment={environment}
              onSwap={handleSwap}
              onPostpone={handlePostpone}
              onFinish={handleFinish}
              overallDifficulty={overallDifficulty}
              onDifficultyChange={setOverallDifficulty}
              warmupBlock={workout.warmupBlock}
              recoveryBlock={workout.recoveryBlock}
              onAddExercise={handleAddExercise}
            />
          )}

          {mode === "done" && (
            <WorkoutCompletionView
              exercises={exercises}
              actuals={actuals}
              durationMinutes={finishedDuration}
              onDone={handleDoneAcknowledged}
            />
          )}

          {/* Rest screen — inside the shell so its z-50 stacks correctly
              against the shell's own z-[100] instead of racing it. */}
          {restTimer && mode === "active" && (
            <RestScreen
              totalSeconds={restTimer.totalSeconds}
              nextExerciseName={restTimer.nextExercise}
              onDismiss={() => setRestTimer(null)}
            />
          )}
        </WorkoutModeShell>
      )}
    </div>
    </ErrorBoundary>
  );
}
