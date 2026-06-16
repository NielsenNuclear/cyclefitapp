"use client";

import { useState, useEffect, useRef } from "react";
import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";
import type { LoggedExercise, LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import {
  saveLoggedWorkout,
  setActiveWorkout,
  getActiveWorkout,
  clearActiveWorkout,
} from "@/lib/workoutExecution/workoutLogging";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutMode = "idle" | "active" | "done";

interface ActualData {
  completedSets: number;
  completedReps: string;
  actualRPE:     number;
  weight?:       number;   // kg; absent = bodyweight
}

function parseReps(repsStr: string): number {
  const n = parseInt(repsStr, 10);
  return isNaN(n) ? 0 : n;
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

function ExerciseRow({ ex }: { ex: WorkoutExercise }) {
  const [expanded, setExpanded] = useState(false);

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
        </div>
      )}
    </div>
  );
}

// ─── Active exercise row (logging inputs) ─────────────────────────────────────

function ActiveExerciseRow({
  ex,
  actual,
  onChange,
}: {
  ex:       WorkoutExercise;
  actual:   ActualData;
  onChange: (data: ActualData) => void;
}) {
  const inputCls =
    "text-center text-[12px] font-medium text-[#1C1B18] bg-[#F5F3EE] border border-[#E0DDD4] rounded-lg px-1 py-1.5 focus:outline-none focus:border-[#534AB7] focus:bg-white transition-colors";

  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      <div className="text-[12px] font-medium text-[#1C1B18] mb-1">{ex.name}</div>
      <div className="text-[10px] text-[#9B9690] mb-2">
        Prescribed: {ex.sets} × {ex.reps}{ex.rpe !== undefined ? ` · RPE ${ex.rpe}` : ""}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-[#9B9690] uppercase tracking-wider">Sets</span>
          <input
            type="number"
            min="0"
            max="20"
            value={actual.completedSets}
            onChange={e => onChange({ ...actual, completedSets: Math.max(0, Number(e.target.value)) })}
            className={`w-12 ${inputCls}`}
          />
        </div>

        <span className="text-[#9B9690] mb-1.5">×</span>

        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span className="text-[9px] text-[#9B9690] uppercase tracking-wider">Reps</span>
          <input
            type="text"
            value={actual.completedReps}
            onChange={e => onChange({ ...actual, completedReps: e.target.value })}
            className={`w-full ${inputCls}`}
          />
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-[#9B9690] uppercase tracking-wider">kg</span>
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="—"
            value={actual.weight ?? ""}
            onChange={e => {
              const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value));
              onChange({ ...actual, weight: v });
            }}
            className={`w-14 ${inputCls}`}
          />
        </div>

        {ex.rpe !== undefined && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-[#9B9690] uppercase tracking-wider">RPE</span>
            <input
              type="number"
              min="1"
              max="10"
              value={actual.actualRPE || ""}
              onChange={e => onChange({ ...actual, actualRPE: Math.min(10, Math.max(1, Number(e.target.value))) })}
              className={`w-12 ${inputCls}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timer helpers ────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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

  const [actuals, setActuals] = useState<Record<number, ActualData>>(() =>
    Object.fromEntries(
      workout.exercises.map((ex, i) => [i, {
        completedSets: ex.sets,
        completedReps: ex.reps,
        actualRPE:     ex.rpe ?? 0,
      }])
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

  function buildLog(status: "completed" | "partial"): LoggedWorkout {
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const exercises: LoggedExercise[] = workout.exercises.map((ex, i) => {
      const a = actuals[i];
      const repsStr = a?.completedReps ?? ex.reps;
      return {
        exerciseName:   ex.name,
        prescribedSets: ex.sets,
        completedSets:  a?.completedSets ?? ex.sets,
        prescribedReps: ex.reps,
        completedReps:  repsStr,
        prescribedRPE:  ex.rpe ?? 0,
        actualRPE:      a?.actualRPE ?? (ex.rpe ?? 0),
        weight:         a?.weight,
        actualReps:     parseReps(repsStr) || undefined,
      };
    });
    return { id: today, date: today, workoutName: workout.workoutName, completionStatus: status, exercises, durationMinutes, overallDifficulty };
  }

  function handleFinish(status: "completed" | "partial") {
    const dur = Math.max(1, Math.round(elapsedSeconds / 60));
    setFinishedDuration(dur);
    const log = buildLog(status);
    saveLoggedWorkout(log);
    clearActiveWorkout();
    if (status === "completed") onMarkComplete(); else onMarkPartial();
    onWorkoutLogged?.(log);
    setMode("done");
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
            <button onClick={onMarkComplete} className="text-[10px] font-semibold text-[#5C5850] hover:text-[#1C1B18] transition-colors px-1.5 py-0.5 rounded border border-[#E0DDD4] bg-[#F5F3EE]">Done</button>
            <button onClick={onMarkPartial}  className="text-[10px] font-semibold text-[#5C5850] hover:text-[#1C1B18] transition-colors px-1.5 py-0.5 rounded border border-[#E0DDD4] bg-[#F5F3EE]">Partial</button>
            <button onClick={onMarkSkip}     className="text-[10px] font-semibold text-[#9B9690] hover:text-[#1C1B18] transition-colors px-1.5 py-0.5 rounded border border-[#E0DDD4] bg-[#F5F3EE]">Skip</button>
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
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
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

      {/* Exercise list — idle: prescription view; active: logging rows */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
        {mode === "active" ? "Log your sets" : `Exercises · ${workout.totalExercises} movements`}
      </div>

      <div>
        {mode === "active"
          ? workout.exercises.map((ex, i) => (
              <ActiveExerciseRow
                key={i}
                ex={ex}
                actual={actuals[i] ?? { completedSets: ex.sets, completedReps: ex.reps, actualRPE: ex.rpe ?? 0 }}
                onChange={data => setActuals(prev => ({ ...prev, [i]: data }))}
              />
            ))
          : workout.exercises.map((ex, i) => (
              <ExerciseRow key={i} ex={ex} />
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

      <div className="mt-4">
        <CompletionSection />
      </div>
    </div>
  );
}
