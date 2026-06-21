// ─── lib/autoregulation/exerciseAdjustments.ts ───────────────────────────────
// Phase 37B — Readiness-based exercise swaps.
// When complexity is reduced, high-demand compound lifts are swapped to
// supported / lower-load alternatives that preserve movement pattern.

import { allExercises } from "@/lib/exercises/exerciseLibrary";
import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { TrainingDecision } from "./trainingDecisionEngine";

// ─── Manual swap table (high-demand → lower-demand alternative) ───────────────

const COMPLEXITY_SWAP_TABLE: Record<string, { reduced: string; minimal: string }> = {
  "Back Squat":         { reduced: "Goblet Squat",          minimal: "Bodyweight Squat"      },
  "Front Squat":        { reduced: "Goblet Squat",          minimal: "Bodyweight Squat"      },
  "Deadlift":           { reduced: "Romanian Deadlift",     minimal: "Hip Hinge (Bodyweight)" },
  "Sumo Deadlift":      { reduced: "Romanian Deadlift",     minimal: "Hip Hinge (Bodyweight)" },
  "Barbell Row":        { reduced: "Chest Supported Row",   minimal: "Dumbbell Row"          },
  "Pendlay Row":        { reduced: "Chest Supported Row",   minimal: "Dumbbell Row"          },
  "Bench Press":        { reduced: "Dumbbell Press",        minimal: "Push-Up"               },
  "Incline Bench Press":{ reduced: "Incline Dumbbell Press",minimal: "Incline Push-Up"       },
  "Overhead Press":     { reduced: "Dumbbell Shoulder Press",minimal: "Lateral Raise"        },
  "Push Press":         { reduced: "Dumbbell Shoulder Press",minimal: "Arnold Press"         },
  "Pull-Up":            { reduced: "Assisted Pull-Up",      minimal: "Lat Pulldown"          },
  "Weighted Pull-Up":   { reduced: "Pull-Up",               minimal: "Lat Pulldown"          },
  "Power Clean":        { reduced: "Dumbbell Clean",        minimal: "Kettlebell Swing"      },
  "Hang Clean":         { reduced: "Dumbbell Clean",        minimal: "Kettlebell Swing"      },
  "Barbell Hip Thrust": { reduced: "Dumbbell Hip Thrust",   minimal: "Glute Bridge"          },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findLibraryAlternative(
  exercise: WorkoutExercise,
  targetDifficulty: "Beginner" | "Intermediate",
): WorkoutExercise | null {
  const ex = exercise.exercise;
  const candidate = allExercises.find(
    e =>
      e.name !== ex.name &&
      e.difficulty === targetDifficulty &&
      e.movementPattern === ex.movementPattern &&
      e.primaryMuscles.some(m => ex.primaryMuscles.includes(m)),
  );
  if (!candidate) return null;
  return {
    ...exercise,
    name:      candidate.name,
    exercise:  candidate,
    rationale: `Auto-regulated: swapped to ${candidate.name} to reduce joint demand`,
    notes:     exercise.notes,
  };
}

function swapExercise(
  we:           WorkoutExercise,
  complexitySc: number,
): WorkoutExercise {
  const name = we.exercise.name;

  // Manual table lookup first — more reliable than library search
  if (complexitySc < 0.65 && COMPLEXITY_SWAP_TABLE[name]?.minimal) {
    const altName = COMPLEXITY_SWAP_TABLE[name].minimal;
    const alt     = allExercises.find(e => e.name === altName);
    if (alt) {
      return {
        ...we,
        name:      alt.name,
        exercise:  alt,
        rpe:       we.rpe !== undefined ? Math.max(5, we.rpe - 2) : we.rpe,
        rationale: `Auto-regulated: swapped to ${alt.name} (low readiness / high symptoms)`,
      };
    }
  }

  if (complexitySc < 0.80 && COMPLEXITY_SWAP_TABLE[name]?.reduced) {
    const altName = COMPLEXITY_SWAP_TABLE[name].reduced;
    const alt     = allExercises.find(e => e.name === altName);
    if (alt) {
      return {
        ...we,
        name:      alt.name,
        exercise:  alt,
        rpe:       we.rpe !== undefined ? Math.max(6, we.rpe - 1) : we.rpe,
        rationale: `Auto-regulated: swapped to ${alt.name} for load management`,
      };
    }
  }

  // Library-based swap for advanced exercises not in the manual table
  if (complexitySc < 0.80 && we.exercise.difficulty === "Advanced") {
    const alt = findLibraryAlternative(we, "Intermediate");
    if (alt) return alt;
  }
  if (complexitySc < 0.60 && we.exercise.difficulty !== "Beginner") {
    const alt = findLibraryAlternative(we, "Beginner");
    if (alt) return alt;
  }

  return we;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function applyExerciseAdjustments(
  workout:   GeneratedWorkout,
  decision:  Pick<TrainingDecision, "complexityScale" | "shouldSwapExercises">,
): GeneratedWorkout {
  if (!decision.shouldSwapExercises || decision.complexityScale >= 1.0) {
    return workout;
  }

  const adjustedExercises = workout.exercises.map(ex =>
    swapExercise(ex, decision.complexityScale),
  );

  const swappedCount = adjustedExercises.filter(
    (ex, i) => ex.name !== workout.exercises[i].name,
  ).length;

  return {
    ...workout,
    exercises: adjustedExercises,
    workoutRationale: swappedCount > 0
      ? `${workout.workoutRationale} ${swappedCount} exercise${swappedCount > 1 ? "s" : ""} auto-regulated to match today's capacity.`
      : workout.workoutRationale,
  };
}
