"use client";

// ─── components/workout/WorkoutHeroView.tsx ───────────────────────────────────
// Phase UX-1 — pre-workout hero card.
// One primary action: Start Workout. Comprehensible within 5 seconds.

import { useState } from "react";
import type { GeneratedWorkout }   from "@/lib/exercises/generateWorkout";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";

// ─── Environment selector ─────────────────────────────────────────────────────

const ENV_OPTIONS: { value: TrainingEnvironment; label: string }[] = [
  { value: "gym",             label: "Full Gym"   },
  { value: "home_gym",        label: "Home Gym"   },
  { value: "dumbbells_only",  label: "Dumbbells"  },
  { value: "bodyweight_only", label: "Bodyweight" },
];

// ─── Muscle summary ───────────────────────────────────────────────────────────

function getMuscles(workout: GeneratedWorkout): string {
  const seen = new Set<string>();
  for (const ex of workout.exercises) {
    for (const m of ex.exercise.primaryMuscles.slice(0, 2)) {
      seen.add(m);
      if (seen.size >= 4) return [...seen].join(", ");
    }
  }
  return [...seen].join(", ") || workout.focus;
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 bg-[#F5F3EE] rounded-2xl border border-[#E0DDD4] flex-1">
      <span className="text-[17px] font-bold text-[#1C1B18] tabular-nums leading-none">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9B9690] mt-0.5">{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkoutHeroViewProps {
  workout:              GeneratedWorkout;
  environment:          TrainingEnvironment;
  onEnvironmentChange:  (env: TrainingEnvironment) => void;
  completionStatus:     WorkoutCompletionStatus;
  stateWarning:         string | null;
  onStart:              () => void;
  onQuickMarkComplete:  () => void;
  onQuickMarkPartial:   () => void;
  onMarkSkip:           () => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function WorkoutHeroView({
  workout,
  environment,
  onEnvironmentChange,
  completionStatus,
  stateWarning,
  onStart,
  onQuickMarkComplete,
  onQuickMarkPartial,
  onMarkSkip,
}: WorkoutHeroViewProps) {
  const [showExercises, setShowExercises] = useState(false);
  const [showQuickMark, setShowQuickMark] = useState(false);

  const muscles = getMuscles(workout);

  // Already completed today
  if (completionStatus !== "pending") {
    const isComplete = completionStatus === "completed" || completionStatus === "partially_completed";
    return (
      <div className={`flex items-center justify-center gap-2 py-3 rounded-2xl border ${
        isComplete ? "bg-[#E1F5EE] border-[#A3DCCA]" : "bg-[#F5F3EE] border-[#E0DDD4]"
      }`}>
        <span className={`text-[13px] font-semibold ${isComplete ? "text-[#085041]" : "text-[#9B9690]"}`}>
          {isComplete ? "Logged today" : "Skipped today"}
        </span>
        {isComplete && <span className="text-[12px] text-[#085041]">✓</span>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Environment selector */}
      <div className="flex flex-wrap gap-1.5">
        {ENV_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onEnvironmentChange(opt.value)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              environment === opt.value
                ? "bg-[#1C1B18] text-[#F5F3EE] border-[#1C1B18]"
                : "bg-[#F5F3EE] text-[#6B6860] border-[#E0DDD4] hover:border-[#A09C94]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Safety / state warning */}
      {stateWarning && (
        <div
          className="px-4 py-3 bg-[#FDF6EC] rounded-2xl border border-[#E8C98A]"
          role="note"
          aria-label="Training adjustment note"
        >
          <p className="text-[11px] text-[#633806] leading-relaxed">{stateWarning}</p>
        </div>
      )}

      {/* Phase note */}
      {workout.phaseNote && !stateWarning && (
        <div className="px-4 py-3 bg-[#F3F2FD] rounded-2xl border border-[#C9C5EE]">
          <p className="text-[11px] text-[#3C3489] leading-relaxed">{workout.phaseNote}</p>
        </div>
      )}

      {/* Hero: workout name */}
      <div>
        <h2
          className="text-[1.55rem] font-light text-[#1C1B18] leading-tight mb-1"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {workout.workoutName}
        </h2>
        <p className="text-[12px] text-[#9B9690] leading-relaxed">{workout.focus}</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-2">
        <Stat label="Min" value={`~${workout.estimatedDurationMin}`} />
        <Stat label="Exercises" value={String(workout.exercises.length)} />
      </div>

      {/* Dashboard 2.0 — Layer 1. Muscles + session structure condensed into
          one compact caption row so the primary CTA sits closer to the fold
          on mobile. Confidence moved to WorkoutCard's TrainingHeader
          (Dashboard 3.0) — this used to also render a confidence caption
          here via a lowercase-keyed lookup that never matched the real
          capitalized ConfidenceLevel values, so it was silently dead code. */}
      {(muscles || workout.warmupBlock || workout.recoveryBlock) && (
        <p className="text-[10px] text-[#9B9690] leading-relaxed">
          {muscles && <><span className="font-semibold text-[#6B6860]">Focus · </span>{muscles}</>}
          {(workout.warmupBlock || workout.recoveryBlock) && (
            <>
              {muscles && "  ·  "}
              {[
                workout.warmupBlock && `~${workout.warmupBlock.totalMinutes}m warmup`,
                "main",
                workout.recoveryBlock && `~${workout.recoveryBlock.totalMinutes}m cooldown`,
              ].filter(Boolean).join(" → ")}
            </>
          )}
        </p>
      )}

      {/* Exercise preview (collapsed by default) — workout rationale folded
          in here rather than shown as its own always-visible line. */}
      <div>
        <button
          type="button"
          onClick={() => setShowExercises(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F5F3EE] border border-[#E0DDD4] hover:border-[#A09C94] transition-colors min-h-[44px]"
        >
          <span className="text-[11px] font-semibold text-[#5C5850]">
            Preview exercises ({workout.exercises.length})
          </span>
          <span className="text-[10px] text-[#9B9690]">{showExercises ? "▲" : "▼"}</span>
        </button>

        {showExercises && (
          <div className="mt-2 space-y-1">
            {workout.workoutRationale && (
              <p className="text-[11px] text-[#9B9690] italic leading-relaxed border-l-2 border-[#E0DDD4] pl-3 pb-1">
                {workout.workoutRationale}
              </p>
            )}
            {workout.exercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA]"
              >
                <span className="text-[12px] font-medium text-[#1C1B18] leading-snug truncate">
                  {ex.name}
                </span>
                <span className="flex-shrink-0 text-[10px] text-[#9B9690]">
                  {ex.sets} × {ex.reps}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PRIMARY CTA ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[16px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(83,74,183,0.25)]"
        aria-label="Start today's workout"
      >
        Start Workout
      </button>

      {/* Quick mark (collapsed) */}
      <div>
        <button
          type="button"
          onClick={() => setShowQuickMark(s => !s)}
          className="w-full text-center text-[10px] text-[#9B9690] hover:text-[#5C5850] transition-colors"
        >
          {showQuickMark ? "▲ Hide" : "Mark without logging"}
        </button>

        {showQuickMark && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <button
              onClick={onQuickMarkComplete}
              className="text-[11px] font-semibold text-[#5C5850] px-3 py-1.5 rounded-lg border border-[#E0DDD4] bg-[#F5F3EE] hover:border-[#A09C94] transition-colors"
            >
              Done
            </button>
            <button
              onClick={onQuickMarkPartial}
              className="text-[11px] font-semibold text-[#5C5850] px-3 py-1.5 rounded-lg border border-[#E0DDD4] bg-[#F5F3EE] hover:border-[#A09C94] transition-colors"
            >
              Partial
            </button>
            <button
              onClick={onMarkSkip}
              className="text-[11px] font-semibold text-[#9B9690] px-3 py-1.5 rounded-lg border border-[#E0DDD4] bg-[#F5F3EE] hover:border-[#A09C94] transition-colors"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
