"use client";

import { useState, useEffect, useRef } from "react";
import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { Exercise } from "@/lib/exercises/exerciseLibrary";
import { getCoachingData } from "@/lib/exercises/exerciseCoaching";
import { getExerciseSubstitutions } from "@/lib/exercises/exerciseSubstitutions";
import { getExerciseHistory } from "@/lib/history/exerciseHistory";
import { isFavorite, toggleFavorite } from "@/lib/exercises/exerciseFavorites";
import {
  isRestricted,
  addRestriction,
  removeRestriction,
  type RestrictionReason,
  RESTRICTION_LABELS,
} from "@/lib/exercises/exerciseRestrictions";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";
import type { LoggedExercise, LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import {
  saveLoggedWorkout,
  setActiveWorkout,
  getActiveWorkout,
  clearActiveWorkout,
} from "@/lib/workoutExecution/workoutLogging";
import {
  saveExercisePerformances,
  type ExercisePerformance,
} from "@/lib/progression/exerciseHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutMode = "idle" | "active" | "done";

// Per-set logging model (28H) — replaces the old single-row ActualData approach
interface SetRecord {
  targetReps: string;   // prescribed (display only)
  completed:  boolean;
  actualReps: string;   // editable by user
  weight?:    number;   // kg
  rpe?:       number;   // only shown when exercise has a prescribed RPE
}

function defaultSets(ex: WorkoutExercise, lastWeight?: number): SetRecord[] {
  return Array.from({ length: ex.sets }, () => ({
    targetReps: ex.reps,
    completed:  false,
    actualReps: ex.reps,
    weight:     lastWeight,
    rpe:        ex.rpe ?? undefined,
  }));
}

function parseReps(repsStr: string): number {
  const n = parseInt(repsStr, 10);
  return isNaN(n) ? 0 : n;
}

function parseRestSeconds(rest: string): number {
  const min = rest.match(/(\d+)\s*min/);
  const sec = rest.match(/(\d+)\s*sec/);
  if (min) return parseInt(min[1], 10) * 60;
  if (sec) return parseInt(sec[1], 10);
  return 60;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1EFE8] text-[#5C5850] border border-[#E0DDD4]">
      {children}
    </span>
  );
}

function RpePill({ rpe }: { rpe: number }) {
  const color =
    rpe >= 9 ? "bg-[#FDE8E8] text-[#8B1A1A] border-[#F5BCBC]" :
    rpe >= 7 ? "bg-[#FDF6EC] text-[#633806] border-[#E8C98A]" :
               "bg-[#E1F5EE] text-[#085041] border-[#A3DCCA]";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}>
      RPE {rpe}
    </span>
  );
}

// ─── Environment selector ─────────────────────────────────────────────────────

const ENV_OPTIONS: { value: TrainingEnvironment; label: string }[] = [
  { value: "gym",             label: "Full Gym"   },
  { value: "home_gym",        label: "Home Gym"   },
  { value: "dumbbells_only",  label: "Dumbbells"  },
  { value: "bodyweight_only", label: "Bodyweight" },
];

function EnvironmentSelector({
  environment,
  onChange,
  disabled,
}: {
  environment: TrainingEnvironment;
  onChange:    (env: TrainingEnvironment) => void;
  disabled?:   boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {ENV_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => !disabled && onChange(opt.value)}
          disabled={disabled}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
            environment === opt.value
              ? "bg-[#1C1B18] text-[#F5F3EE] border-[#1C1B18]"
              : disabled
              ? "bg-[#F5F3EE] text-[#C8C5BC] border-[#E0DDD4] cursor-not-allowed"
              : "bg-[#F5F3EE] text-[#6B6860] border-[#E0DDD4] hover:border-[#A09C94]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Idle exercise row (prescription display + expandable detail drawer) ────────

function MuscleBadge({ label, primary }: { label: string; primary: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
      primary
        ? "bg-[#F0EEF8] text-[#534AB7]"
        : "bg-[#F5F3EE] text-[#6B6860] border border-[#E0DDD4]"
    }`}>
      {label}
    </span>
  );
}

function ExerciseRow({
  ex,
  exerciseIdx,
  environment,
  onSwap,
}: {
  ex:          WorkoutExercise;
  exerciseIdx: number;
  environment: TrainingEnvironment;
  onSwap:      (idx: number, newExercise: Exercise) => void;
}) {
  const [expanded, setExpanded]               = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [starred, setStarred]                 = useState(() => isFavorite(ex.name));
  const [blocked, setBlocked]                 = useState(() => isRestricted(ex.name));

  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#9B9690] flex-shrink-0 mt-0.5">
              {expanded ? "▼" : "▶"}
            </span>
            <span className="text-[13px] font-medium text-[#1C1B18] leading-snug">{ex.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <StatPill>{ex.sets} × {ex.reps}</StatPill>
            {ex.rpe !== undefined && <RpePill rpe={ex.rpe} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9B9690] font-medium uppercase tracking-wider">Rest</span>
          <span className="text-[10px] text-[#5C5850]">{ex.rest}</span>
          <span className="text-[#D8D4CC]">·</span>
          <span className="text-[10px] text-[#9B9690]">{ex.exercise.equipment}</span>
        </div>
      </button>

      {ex.notes && (
        <div className="mt-1.5 px-2.5 py-1.5 bg-[#FDF6EC] rounded-lg border border-[#E8C98A]">
          <p className="text-[10px] text-[#633806] leading-relaxed">{ex.notes}</p>
        </div>
      )}

      {/* Detail drawer */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#F0EDE4] space-y-3">
          {/* Favourite + restrict toggles */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStarred(toggleFavorite(ex.name))}
              className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                starred ? "text-[#B25E1B]" : "text-[#9B9690] hover:text-[#5C5850]"
              }`}
            >
              <span>{starred ? "★" : "☆"}</span>
              <span>{starred ? "Favourited" : "Favourite"}</span>
            </button>

            <RestrictionToggle
              exerciseName={ex.name}
              blocked={blocked}
              onToggle={setBlocked}
            />
          </div>

          {/* Muscles */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1.5">Primary</div>
            <div className="flex flex-wrap gap-1">
              {ex.exercise.primaryMuscles.map(m => <MuscleBadge key={m} label={m} primary />)}
            </div>
          </div>
          {ex.exercise.secondaryMuscles.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1.5">Secondary</div>
              <div className="flex flex-wrap gap-1">
                {ex.exercise.secondaryMuscles.map(m => <MuscleBadge key={m} label={m} primary={false} />)}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690]">Pattern  </span>
              <span className="text-[10px] text-[#5C5850]">{ex.exercise.movementPattern}</span>
            </div>
            <span className="text-[#D8D4CC]">·</span>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690]">Difficulty  </span>
              <span className="text-[10px] text-[#5C5850]">{ex.exercise.difficulty}</span>
            </div>
          </div>

          {/* Coach's note */}
          <div className="px-2.5 py-2 bg-[#F5F3EE] rounded-lg">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1">Coach's note</div>
            <p className="text-[10px] text-[#5C5850] leading-relaxed">{ex.exercise.biomechanicalNote}</p>
          </div>

          {/* Why today */}
          {ex.rationale && (
            <div className="px-2.5 py-2 bg-[#F3F2FD] rounded-lg border border-[#C9C5EE]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#6B5ECC] mb-1">Why today</div>
              <p className="text-[10px] text-[#3C3489] leading-relaxed">{ex.rationale}</p>
            </div>
          )}

          <HistorySection exerciseName={ex.name} />

          {/* Alternatives */}
          <div>
            <button
              type="button"
              onClick={() => setShowAlternatives(a => !a)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#534AB7] hover:text-[#3C3489] transition-colors"
            >
              <span>{showAlternatives ? "▼" : "▶"}</span>
              <span>Alternatives</span>
            </button>
            {showAlternatives && (
              <AlternativesSection
                ex={ex}
                exerciseIdx={exerciseIdx}
                environment={environment}
                onSwap={onSwap}
              />
            )}
          </div>

          <CoachingSection exerciseName={ex.name} />
        </div>
      )}
    </div>
  );
}

// ─── Alternatives sub-section (28C) ──────────────────────────────────────────

function AlternativesSection({
  ex,
  exerciseIdx,
  environment,
  onSwap,
}: {
  ex:          WorkoutExercise;
  exerciseIdx: number;
  environment: TrainingEnvironment;
  onSwap:      (idx: number, newExercise: Exercise) => void;
}) {
  const alternatives = getExerciseSubstitutions({
    exercise:    ex.exercise,
    environment,
  }).slice(0, 5);

  if (alternatives.length === 0) {
    return (
      <p className="mt-2 text-[10px] text-[#9B9690]">
        No alternatives available for your current environment.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      {alternatives.map(alt => (
        <div
          key={alt.name}
          className="flex items-center justify-between gap-2 px-2.5 py-2 bg-[#FAFAF7] rounded-lg border border-[#E5E2DA]"
        >
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-[#1C1B18] truncate">{alt.name}</div>
            <div className="text-[10px] text-[#9B9690]">
              {alt.equipment} · {alt.difficulty}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSwap(exerciseIdx, alt)}
            className="flex-shrink-0 text-[10px] font-semibold text-[#534AB7] bg-[#F0EEF8] hover:bg-[#E3E0F8] px-2.5 py-1 rounded-full transition-colors"
          >
            Swap
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Restriction toggle (28F) ────────────────────────────────────────────────

const REASON_OPTIONS: RestrictionReason[] = ["pain", "dislike", "equipment_issue", "other"];

function RestrictionToggle({
  exerciseName,
  blocked,
  onToggle,
}: {
  exerciseName: string;
  blocked:      boolean;
  onToggle:     (blocked: boolean) => void;
}) {
  const [picking, setPicking] = useState(false);

  if (blocked) {
    return (
      <button
        type="button"
        onClick={() => { removeRestriction(exerciseName); onToggle(false); }}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C0390B] transition-colors"
      >
        <span>⊘</span>
        <span>Blocked — tap to unblock</span>
      </button>
    );
  }

  if (picking) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {REASON_OPTIONS.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => {
              addRestriction(exerciseName, r);
              onToggle(true);
              setPicking(false);
            }}
            className="text-[10px] font-semibold text-[#C0390B] bg-[#FDE8E8] hover:bg-[#FACACA] px-2 py-1 rounded-full transition-colors"
          >
            {RESTRICTION_LABELS[r]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPicking(false)}
          className="text-[10px] text-[#9B9690] hover:text-[#5C5850] px-2 py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPicking(true)}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9B9690] hover:text-[#C0390B] transition-colors"
    >
      <span>⊘</span>
      <span>Block exercise</span>
    </button>
  );
}

// ─── History sub-section (28D) ───────────────────────────────────────────────

const TREND_ICON: Record<string, string> = {
  improving: "↑",
  stable:    "→",
  declining: "↓",
};

const TREND_COLOR: Record<string, string> = {
  improving: "text-[#085041]",
  stable:    "text-[#9B9690]",
  declining: "text-[#B25E1B]",
};

function HistorySection({ exerciseName }: { exerciseName: string }) {
  const history = getExerciseHistory(exerciseName);
  if (history.completionCount === 0) return null;

  const { completionCount, bestSet, lastPerformed, trend } = history;

  const daysAgo = lastPerformed
    ? Math.floor((Date.now() - new Date(lastPerformed).getTime()) / 86_400_000)
    : null;

  return (
    <div className="px-2.5 py-2 bg-[#FAFAF7] rounded-lg border border-[#E5E2DA]">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">Your history</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[10px] text-[#9B9690]">Completed</div>
          <div className="text-[13px] font-semibold text-[#1C1B18]">{completionCount}×</div>
        </div>
        {bestSet && bestSet.reps > 0 && (
          <div>
            <div className="text-[10px] text-[#9B9690]">Best set</div>
            <div className="text-[13px] font-semibold text-[#1C1B18]">
              {bestSet.weight > 0 ? `${bestSet.weight}kg × ${bestSet.reps}` : `${bestSet.reps} reps`}
            </div>
          </div>
        )}
        {daysAgo !== null && (
          <div>
            <div className="text-[10px] text-[#9B9690]">Last done</div>
            <div className="text-[13px] font-semibold text-[#1C1B18]">
              {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}
            </div>
          </div>
        )}
      </div>
      {trend && (
        <div className={`mt-2 text-[10px] font-semibold ${TREND_COLOR[trend.direction]}`}>
          {TREND_ICON[trend.direction]} {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
        </div>
      )}
    </div>
  );
}

// ─── Coaching sub-section (28B) ───────────────────────────────────────────────

function CoachingSection({ exerciseName }: { exerciseName: string }) {
  const coaching = getCoachingData(exerciseName);
  if (!coaching) return null;

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">How to perform</div>
        <ol className="space-y-1.5">
          {coaching.instructions.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[10px] font-bold text-[#534AB7] flex-shrink-0 w-4">{i + 1}.</span>
              <span className="text-[10px] text-[#5C5850] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Coaching cues */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">Coaching cues</div>
        <div className="space-y-1">
          {coaching.coachingCues.map((cue, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] text-[#085041] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-[10px] text-[#5C5850] leading-relaxed">{cue}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Common mistakes */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">Common mistakes</div>
        <div className="space-y-1">
          {coaching.commonMistakes.map((mistake, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] text-[#B25E1B] flex-shrink-0 mt-0.5">⚠</span>
              <span className="text-[10px] text-[#5C5850] leading-relaxed">{mistake}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      {(coaching.beginnerTip || coaching.advancedTip) && (
        <div className="space-y-1.5">
          {coaching.beginnerTip && (
            <div className="px-2.5 py-2 bg-[#E1F5EE] rounded-lg">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#085041]">Beginner tip  </span>
              <span className="text-[10px] text-[#085041] leading-relaxed">{coaching.beginnerTip}</span>
            </div>
          )}
          {coaching.advancedTip && (
            <div className="px-2.5 py-2 bg-[#FDF6EC] rounded-lg border border-[#E8C98A]">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#633806]">Advanced tip  </span>
              <span className="text-[10px] text-[#633806] leading-relaxed">{coaching.advancedTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rest timer (28J M-2) ────────────────────────────────────────────────────

function RestTimer({
  totalSeconds,
  onDismiss,
}: {
  totalSeconds: number;
  onDismiss:    () => void;
}) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (remaining <= 0) { onDismiss(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDismiss]);

  const pct  = Math.max(0, remaining / totalSeconds);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")}`
    : `${secs}s`;

  return (
    <div className="mt-2 flex items-center gap-3 px-2.5 py-2 bg-[#F3F2FD] rounded-lg border border-[#C9C5EE]">
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
          <circle cx="16" cy="16" r="13" fill="none" stroke="#E0DDD4" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="13" fill="none"
            stroke="#534AB7" strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - pct)}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#6B5ECC]">Rest</div>
        <div className="text-[14px] font-bold text-[#3C3489] leading-none">{display}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[10px] font-semibold text-[#9B9690] hover:text-[#534AB7] transition-colors px-2 py-1"
      >
        Skip
      </button>
    </div>
  );
}

// ─── Active exercise row — per-set checkboxes (28H) ──────────────────────────

function ActiveExerciseRow({
  ex,
  sets,
  onChange,
}: {
  ex:       WorkoutExercise;
  sets:     SetRecord[];
  onChange: (sets: SetRecord[]) => void;
}) {
  const inputCls =
    "text-center text-[11px] font-medium text-[#1C1B18] bg-[#F5F3EE] border border-[#E0DDD4] rounded-lg px-1 py-1.5 focus:outline-none focus:border-[#534AB7] focus:bg-white transition-colors w-full";

  const [restingAfterSet, setRestingAfterSet] = useState<number | null>(null);
  const restDuration = parseRestSeconds(ex.rest);

  function updateSet(i: number, patch: Partial<SetRecord>) {
    const next = sets.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange(next);
    // Start rest timer when a set is newly checked off (not unchecked)
    if (patch.completed === true && !sets[i].completed) {
      const isLastSet = i === sets.length - 1 && next.every(s => s.completed);
      if (!isLastSet) setRestingAfterSet(i);
    }
    if (patch.completed === false) setRestingAfterSet(null);
  }

  const doneCount = sets.filter(s => s.completed).length;

  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      {/* Exercise header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-semibold text-[#1C1B18]">{ex.name}</div>
        <div className="text-[10px] text-[#9B9690]">{doneCount}/{ex.sets} sets</div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.5rem_2rem_1fr_3rem_2.5rem] gap-1.5 mb-1 px-0.5">
        <span />
        <span className="text-[8px] font-bold uppercase tracking-wider text-[#9B9690] text-center">Set</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-[#9B9690] text-center">Reps</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-[#9B9690] text-center">kg</span>
        {ex.rpe !== undefined && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-[#9B9690] text-center">RPE</span>
        )}
      </div>

      {/* Per-set rows */}
      <div className="space-y-1.5">
        {sets.map((set, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1.5rem_2rem_1fr_3rem_2.5rem] gap-1.5 items-center px-0.5 transition-opacity ${
              set.completed ? "opacity-60" : ""
            }`}
          >
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => updateSet(i, { completed: !set.completed })}
              className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold transition-colors ${
                set.completed
                  ? "bg-[#534AB7] border-[#534AB7] text-white"
                  : "border-[#C5C1B7] text-transparent hover:border-[#534AB7]"
              }`}
            >
              ✓
            </button>

            {/* Set number */}
            <span className="text-[10px] font-semibold text-[#9B9690] text-center">{i + 1}</span>

            {/* Reps */}
            <input
              type="text"
              value={set.actualReps}
              onChange={e => updateSet(i, { actualReps: e.target.value })}
              className={inputCls}
              placeholder={set.targetReps}
            />

            {/* Weight */}
            <input
              type="number"
              min="0"
              step="0.5"
              value={set.weight ?? ""}
              onChange={e => updateSet(i, {
                weight: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)),
              })}
              placeholder="—"
              className={inputCls}
            />

            {/* RPE (only if exercise has RPE target) */}
            {ex.rpe !== undefined && (
              <input
                type="number"
                min="1"
                max="10"
                value={set.rpe ?? ""}
                onChange={e => updateSet(i, {
                  rpe: e.target.value === "" ? undefined : Math.min(10, Math.max(1, Number(e.target.value))),
                })}
                placeholder="—"
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>

      {/* Rest timer — appears after checking a set, hides when all sets done */}
      {restingAfterSet !== null && (
        <RestTimer
          key={restingAfterSet}
          totalSeconds={restDuration}
          onDismiss={() => setRestingAfterSet(null)}
        />
      )}
    </div>
  );
}

// ─── Timer helpers ────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── PrepSection ──────────────────────────────────────────────────────────────
// Collapsible warmup / activation / recovery block.

import type { WarmupBlock, MobilityItem, RecoveryBlock } from "@/lib/exercises/generateWorkout";

interface PrepSectionProps {
  label:       string;
  defaultOpen: boolean;
  warmup?:     WarmupBlock;
  items?:      MobilityItem[];
  recovery?:   RecoveryBlock;
}

function PrepSection({ label, defaultOpen, warmup, items, recovery }: PrepSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const totalMin = warmup?.totalMinutes ?? recovery?.totalMinutes;
  const subtitle = totalMin ? `~${totalMin} min` : undefined;

  return (
    <div className="mb-3 border border-[#EAE7DE] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FAFAF7] hover:bg-[#F5F3EE] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#534AB7]">
            {label}
          </span>
          {subtitle && (
            <span className="text-[10px] text-[#9B9690]">{subtitle}</span>
          )}
        </div>
        <span className="text-[11px] text-[#9B9690]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2 bg-white">
          {/* Cardio warmup */}
          {warmup?.cardio && (
            <div className="flex items-start gap-2 pb-2 border-b border-[#F0EDE4]">
              <span className="text-[10px] text-[#9B9690] font-bold uppercase tracking-wide mt-0.5 shrink-0">Cardio</span>
              <div className="flex-1">
                <p className="text-[12px] font-medium text-[#1C1B18]">{warmup.cardio.name}</p>
                <p className="text-[11px] text-[#9B9690]">{warmup.cardio.duration} · {warmup.cardio.intensity}</p>
              </div>
            </div>
          )}

          {/* Mobility items */}
          {warmup?.mobility && warmup.mobility.length > 0 && (
            <div className="pb-2 border-b border-[#F0EDE4]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-1.5">Mobility</div>
              <div className="space-y-1.5">
                {warmup.mobility.map((item, i) => (
                  <MobilityItemRow key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Standalone items list (activation block) */}
          {items && items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <MobilityItemRow key={i} item={item} />
              ))}
            </div>
          )}

          {/* Recovery stretches */}
          {recovery?.stretches && recovery.stretches.length > 0 && (
            <div className="space-y-1.5">
              {recovery.stretches.map((item, i) => (
                <MobilityItemRow key={i} item={item} />
              ))}
            </div>
          )}

          {/* Breathwork */}
          {recovery?.breathwork && (
            <div className="mt-2 px-3 py-2 bg-[#F3F2FD] rounded-lg">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#534AB7] mb-1">Breathwork</div>
              <p className="text-[11px] text-[#3C3489] leading-relaxed">{recovery.breathwork}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MobilityItemRow({ item }: { item: MobilityItem }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-[12px] text-[#1C1B18] leading-snug">{item.name}</p>
      <span className="shrink-0 text-[10px] text-[#9B9690] font-medium whitespace-nowrap">{item.duration}</span>
    </div>
  );
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout:              GeneratedWorkout;
  environment:          TrainingEnvironment;
  onEnvironmentChange:  (env: TrainingEnvironment) => void;
  completionStatus?:    WorkoutCompletionStatus;
  onMarkComplete:       () => void;
  onMarkPartial:        () => void;
  onMarkSkip:           () => void;
  onWorkoutLogged?:     (log: LoggedWorkout) => void;
}

export function WorkoutCard({
  workout,
  environment,
  onEnvironmentChange,
  completionStatus = "pending",
  onMarkComplete,
  onMarkPartial,
  onMarkSkip,
  onWorkoutLogged,
}: WorkoutCardProps) {
  const today = new Date().toISOString().slice(0, 10);

  // Mutable exercise list — supports in-session swaps (28C)
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);

  function handleSwap(idx: number, newExercise: Exercise) {
    setExercises(prev => prev.map((ex, i) =>
      i === idx ? { ...ex, name: newExercise.name, exercise: newExercise } : ex
    ));
  }

  // Restore in-progress state from localStorage on mount
  const [mode, setMode] = useState<WorkoutMode>(() => {
    if (typeof window === "undefined" || completionStatus !== "pending") return "idle";
    const active = getActiveWorkout();
    return active?.date === today ? "active" : "idle";
  });

  const startedAtRef = useRef<number>(
    typeof window !== "undefined"
      ? (() => {
          const active = getActiveWorkout();
          if (active?.date === today) return new Date(active.startedAt).getTime();
          return Date.now();
        })()
      : Date.now()
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [actuals, setActuals] = useState<Record<number, SetRecord[]>>(() =>
    Object.fromEntries(
      workout.exercises.map((ex, i) => {
        const history   = getExerciseHistory(ex.name);
        const lastWeight = (history.bestSet && history.bestSet.weight > 0)
          ? history.bestSet.weight
          : undefined;
        return [i, defaultSets(ex, lastWeight)];
      })
    )
  );

  const [overallDifficulty, setOverallDifficulty] = useState(5);
  const [finishedDuration, setFinishedDuration]   = useState(0);

  // Tick the timer while active
  useEffect(() => {
    if (mode !== "active") return;
    // Sync elapsed on activation
    setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Clean up active flag if status was resolved outside this component
  useEffect(() => {
    if (completionStatus !== "pending") clearActiveWorkout();
  }, [completionStatus]);

  const stateWarning =
    workout.trainingState === "overreached"
      ? "Deload session — volume and intensity significantly reduced. Prioritise nervous system recovery."
      : workout.trainingState === "fatigued"
      ? "Fatigue detected — volume reduced. Focus on movement quality over load."
      : null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleStart() {
    setActiveWorkout(today);
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setMode("active");
  }

  // Build ExercisePerformance[] from actuals — called on full session finish.
  // Falls back to planned values for exercises where no sets were checked.
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
        // Exercise not performed — store planned values with completed=false
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

  // Fallback for quick-mark (no set-level data): store planned values as completed.
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
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const loggedExercises: LoggedExercise[] = exercises.map((ex, i) => {
      const sets     = actuals[i] ?? defaultSets(ex);
      const done     = sets.filter(s => s.completed);
      const repsArr  = done.map(s => s.actualReps || s.targetReps);
      const repsStr  = repsArr[0] ?? ex.reps;
      const avgWt    = done.length > 0
        ? done.reduce((sum, s) => sum + (s.weight ?? 0), 0) / done.length
        : undefined;
      const lastRpe  = [...done].reverse().find(s => s.rpe !== undefined)?.rpe ?? (ex.rpe ?? 0);
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
    return { id: today, date: today, workoutName: workout.workoutName, completionStatus: status, exercises: loggedExercises, durationMinutes, overallDifficulty };
  }

  function handleFinish(status: "completed" | "partial") {
    const dur = Math.max(1, Math.round(elapsedSeconds / 60));
    setFinishedDuration(dur);
    const log  = buildLog(status);
    const perfs = buildExercisePerformances(exercises, actuals, today, status === "completed");
    saveLoggedWorkout(log);
    saveExercisePerformances(perfs);
    clearActiveWorkout();
    if (status === "completed") onMarkComplete(); else onMarkPartial();
    onWorkoutLogged?.(log);
    setMode("done");
  }

  // Quick-mark wrappers — save planned values since no set-level data exists
  function handleQuickMarkComplete() {
    saveExercisePerformances(buildPlannedPerformances(exercises, today));
    onMarkComplete();
  }

  function handleQuickMarkPartial() {
    // Partial quick-mark: save planned values but mark completed=false
    saveExercisePerformances(
      buildPlannedPerformances(exercises, today).map(p => ({ ...p, completed: false }))
    );
    onMarkPartial();
  }

  // ── Completion section (shown at bottom) ─────────────────────────────────────

  function CompletionSection() {
    // Already finalized in a previous session
    if (completionStatus !== "pending" && mode !== "done") {
      if (completionStatus === "completed" || completionStatus === "partially_completed") {
        return (
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E1F5EE] border border-[#A3DCCA]">
            <span className="text-[12px] font-semibold text-[#085041]">Logged</span>
            <span className="text-[11px] text-[#2A7D62]">✓</span>
          </div>
        );
      }
      if (completionStatus === "skipped") {
        return (
          <div className="flex items-center justify-center py-2.5 rounded-xl bg-[#F5F3EE] border border-[#E0DDD4]">
            <span className="text-[12px] font-medium text-[#9B9690]">Skipped</span>
          </div>
        );
      }
    }

    if (mode === "done") {
      return (
        <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E1F5EE] border border-[#A3DCCA]">
          <span className="text-[12px] font-semibold text-[#085041]">
            Logged · {finishedDuration} min
          </span>
          <span className="text-[11px] text-[#2A7D62]">✓</span>
        </div>
      );
    }

    if (mode === "idle") {
      return (
        <div>
          <button
            onClick={handleStart}
            className="w-full py-3 rounded-xl bg-[#534AB7] text-white text-[13px] font-semibold hover:bg-[#3C3489] transition-colors mb-3"
          >
            Start workout
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#9B9690]">Quick mark:</span>
            <button onClick={handleQuickMarkComplete} className="text-[10px] font-semibold text-[#5C5850] hover:text-[#1C1B18] transition-colors px-1.5 py-0.5 rounded border border-[#E0DDD4] bg-[#F5F3EE]">Done</button>
            <button onClick={handleQuickMarkPartial}  className="text-[10px] font-semibold text-[#5C5850] hover:text-[#1C1B18] transition-colors px-1.5 py-0.5 rounded border border-[#E0DDD4] bg-[#F5F3EE]">Partial</button>
            <button onClick={onMarkSkip}              className="text-[10px] font-semibold text-[#9B9690] hover:text-[#1C1B18] transition-colors px-1.5 py-0.5 rounded border border-[#E0DDD4] bg-[#F5F3EE]">Skip</button>
          </div>
        </div>
      );
    }

    // mode === "active"
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleFinish("completed")}
          className="flex-1 py-2.5 rounded-xl bg-[#534AB7] text-white text-[12px] font-semibold hover:bg-[#3C3489] transition-colors"
        >
          Finish workout
        </button>
        <button
          onClick={() => handleFinish("partial")}
          className="px-3 py-2.5 rounded-xl bg-[#F5F3EE] text-[#5C5850] text-[12px] font-medium border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
        >
          Partial
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <CardLabel>Today's Workout</CardLabel>
        {mode === "active" && (
          <span className="text-[11px] font-semibold text-[#534AB7]">
            ● {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>

      <EnvironmentSelector
        environment={environment}
        onChange={onEnvironmentChange}
        disabled={mode === "active"}
      />

      {/* Name + duration */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3
          className="text-[1.1rem] font-light text-[#1C1B18] leading-snug"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {workout.workoutName}
        </h3>
        <span className="flex-shrink-0 text-[10px] font-semibold text-[#9B9690] bg-[#F5F3EE] px-2.5 py-1 rounded-full border border-[#E0DDD4]">
          ~{workout.estimatedDurationMin} min
        </span>
      </div>

      <p className="text-[11px] text-[#9B9690] mb-4">{workout.focus}</p>

      {stateWarning && (
        <div className="mb-3 px-3 py-2 bg-[#FDF6EC] rounded-xl border border-[#E8C98A]">
          <p className="text-[11px] text-[#633806] leading-relaxed">{stateWarning}</p>
        </div>
      )}
      {workout.phaseNote && (
        <div className="mb-4 px-3 py-2 bg-[#F3F2FD] rounded-xl border border-[#C9C5EE]">
          <p className="text-[11px] text-[#3C3489] leading-relaxed">{workout.phaseNote}</p>
        </div>
      )}

      {/* ── Movement Preparation ─────────────────────────────────────────────── */}
      {workout.warmupBlock && mode !== "active" && (
        <PrepSection
          label="Warmup"
          warmup={workout.warmupBlock}
          defaultOpen={true}
        />
      )}
      {workout.activationBlock && workout.activationBlock.length > 0 && mode !== "active" && (
        <PrepSection
          label="Activation"
          items={workout.activationBlock}
          defaultOpen={false}
        />
      )}

      {/* Movement readiness notes */}
      {workout.movementReadiness?.notes.length && workout.movementReadiness.notes.length > 0 && mode !== "active" && (
        <div className="mb-3 px-3 py-2 bg-[#F3F2FD] rounded-xl border border-[#C9C5EE]">
          {workout.movementReadiness.notes.slice(0, 2).map((n, i) => (
            <p key={i} className="text-[11px] text-[#3C3489] leading-relaxed">{n}</p>
          ))}
        </div>
      )}

      {/* Exercise list — idle: prescription view; active: logging rows */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
        {mode === "active" ? "Log your sets" : `Exercises · ${exercises.length} movements`}
      </div>

      <div>
        {mode === "active"
          ? exercises.map((ex, i) => (
              <ActiveExerciseRow
                key={i}
                ex={ex}
                sets={actuals[i] ?? defaultSets(ex)}
                onChange={sets => setActuals(prev => ({ ...prev, [i]: sets }))}
              />
            ))
          : exercises.map((ex, i) => (
              <ExerciseRow
                key={i}
                ex={ex}
                exerciseIdx={i}
                environment={environment}
                onSwap={handleSwap}
              />
            ))
        }
      </div>

      {/* Overall difficulty — only shown in active mode */}
      {mode === "active" && (
        <div className="mt-4 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#1C1B18]">Overall difficulty</span>
            <span className="text-[11px] text-[#9B9690]">{overallDifficulty}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={overallDifficulty}
            onChange={e => setOverallDifficulty(Number(e.target.value))}
            className="w-full accent-[#534AB7] cursor-pointer"
          />
          <div className="flex justify-between">
            <span className="text-[10px] text-[#9B9690]">Easy</span>
            <span className="text-[10px] text-[#9B9690]">Hard</span>
          </div>
        </div>
      )}

      {/* Workout rationale — hide during active logging */}
      {mode !== "active" && (
        <div className="mt-4 px-3 py-2.5 bg-[#F5F3EE] rounded-xl">
          <p className="text-[11px] text-[#6B6860] leading-relaxed italic">
            {workout.workoutRationale}
          </p>
        </div>
      )}

      {/* ── Recovery Finisher ─────────────────────────────────────────────────── */}
      {workout.recoveryBlock && mode !== "active" && (
        <div className="mt-3">
          <PrepSection
            label="Recovery Finisher"
            recovery={workout.recoveryBlock}
            defaultOpen={false}
          />
        </div>
      )}

      <div className="mt-4">
        <CompletionSection />
      </div>
    </div>
  );
}
