"use client";

import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";

// ─── Shared atoms (mirrors RecommendationCards.tsx) ───────────────────────────

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
}: {
  environment: TrainingEnvironment;
  onChange: (env: TrainingEnvironment) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {ENV_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
            environment === opt.value
              ? "bg-[#1C1B18] text-[#F5F3EE] border-[#1C1B18]"
              : "bg-[#F5F3EE] text-[#6B6860] border-[#E0DDD4] hover:border-[#A09C94]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Single exercise row ──────────────────────────────────────────────────────

function ExerciseRow({ ex }: { ex: WorkoutExercise }) {
  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[13px] font-medium text-[#1C1B18] leading-snug">
          {ex.name}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <StatPill>{ex.sets} × {ex.reps}</StatPill>
          {ex.rpe !== undefined && <RpePill rpe={ex.rpe} />}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-[#9B9690] font-medium uppercase tracking-wider">Rest</span>
        <span className="text-[10px] text-[#5C5850]">{ex.rest}</span>
        <span className="text-[#D8D4CC]">·</span>
        <span className="text-[10px] text-[#9B9690]">{ex.exercise.equipment}</span>
      </div>

      {ex.notes && (
        <div className="mt-1.5 px-2.5 py-1.5 bg-[#FDF6EC] rounded-lg border border-[#E8C98A]">
          <p className="text-[10px] text-[#633806] leading-relaxed">{ex.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout:             GeneratedWorkout;
  environment:         TrainingEnvironment;
  onEnvironmentChange: (env: TrainingEnvironment) => void;
  completionStatus?:   WorkoutCompletionStatus;
  onMarkComplete:      () => void;
  onMarkSkip:          () => void;
}

export function WorkoutCard({
  workout,
  environment,
  onEnvironmentChange,
  completionStatus = "pending",
  onMarkComplete,
  onMarkSkip,
}: WorkoutCardProps) {
  const stateWarning =
    workout.trainingState === "overreached"
      ? "Deload session — volume and intensity significantly reduced. Prioritise nervous system recovery."
      : workout.trainingState === "fatigued"
      ? "Fatigue detected — volume reduced. Focus on movement quality over load."
      : null;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Today's Workout</CardLabel>
      <EnvironmentSelector environment={environment} onChange={onEnvironmentChange} />

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

      {/* Training state warning */}
      {stateWarning && (
        <div className="mb-3 px-3 py-2 bg-[#FDF6EC] rounded-xl border border-[#E8C98A]">
          <p className="text-[11px] text-[#633806] leading-relaxed">{stateWarning}</p>
        </div>
      )}

      {/* Phase note */}
      {workout.phaseNote && (
        <div className="mb-4 px-3 py-2 bg-[#F3F2FD] rounded-xl border border-[#C9C5EE]">
          <p className="text-[11px] text-[#3C3489] leading-relaxed">{workout.phaseNote}</p>
        </div>
      )}

      {/* Exercise list */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9690] mb-1">
        Exercises · {workout.totalExercises} movements
      </div>
      <div>
        {workout.exercises.map((ex, i) => (
          <ExerciseRow key={i} ex={ex} />
        ))}
      </div>

      {/* Workout rationale */}
      <div className="mt-4 px-3 py-2.5 bg-[#F5F3EE] rounded-xl">
        <p className="text-[11px] text-[#6B6860] leading-relaxed italic">
          {workout.workoutRationale}
        </p>
      </div>

      {/* Completion actions */}
      <div className="mt-4">
        {completionStatus === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={onMarkComplete}
              className="flex-1 py-2.5 rounded-xl bg-[#1C1B18] text-white text-[12px] font-semibold hover:bg-[#2E2D2A] transition-colors"
            >
              Mark complete
            </button>
            <button
              onClick={onMarkSkip}
              className="px-4 py-2.5 rounded-xl bg-[#F5F3EE] text-[#6B6860] text-[12px] font-medium border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
            >
              Skip
            </button>
          </div>
        )}
        {(completionStatus === "completed" || completionStatus === "partially_completed") && (
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E1F5EE] border border-[#A3DCCA]">
            <span className="text-[12px] font-semibold text-[#085041]">Logged</span>
            <span className="text-[11px] text-[#2A7D62]">✓</span>
          </div>
        )}
        {completionStatus === "skipped" && (
          <div className="flex items-center justify-center py-2.5 rounded-xl bg-[#F5F3EE] border border-[#E0DDD4]">
            <span className="text-[12px] font-medium text-[#9B9690]">Skipped</span>
          </div>
        )}
      </div>
    </div>
  );
}
