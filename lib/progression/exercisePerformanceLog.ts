// ─── lib/progression/exercisePerformanceLog.ts ───────────────────────────────
// Reads per-exercise performance data (weight, reps, sets) from the workout log.
// Source of truth for progressive overload target calculations.

import { getWorkoutLog } from "@/lib/workoutExecution/workoutLogging";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExercisePerformanceEntry {
  exerciseName:  string;
  date:          string;
  weight:        number;   // kg; 0 = bodyweight
  actualReps:    number;
  completedSets: number;
  actualRPE:     number;
  prescribedRPE: number;
}

// ─── Main exports ─────────────────────────────────────────────────────────────

/**
 * Returns all per-exercise performance entries from the workout log,
 * newest first. Only includes exercises where actualReps > 0.
 */
export function getExercisePerformanceHistory(): ExercisePerformanceEntry[] {
  const log = getWorkoutLog();
  const entries: ExercisePerformanceEntry[] = [];

  for (const workout of log) {
    if (workout.completionStatus === "skipped") continue;
    for (const ex of workout.exercises) {
      const reps = ex.actualReps ?? 0;
      if (reps === 0) continue;
      entries.push({
        exerciseName:  ex.exerciseName,
        date:          workout.date,
        weight:        ex.weight ?? 0,
        actualReps:    reps,
        completedSets: ex.completedSets,
        actualRPE:     ex.actualRPE,
        prescribedRPE: ex.prescribedRPE,
      });
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Most recent logged performance entry for a specific exercise.
 * Returns null when no entry exists.
 */
export function getLastPerformance(exerciseName: string): ExercisePerformanceEntry | null {
  return getExercisePerformanceHistory().find(e => e.exerciseName === exerciseName) ?? null;
}

/**
 * All performance entries for a specific exercise, newest first.
 */
export function getPerformanceHistory(exerciseName: string): ExercisePerformanceEntry[] {
  return getExercisePerformanceHistory().filter(e => e.exerciseName === exerciseName);
}
