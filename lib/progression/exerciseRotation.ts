// ─── lib/progression/exerciseRotation.ts ─────────────────────────────────────
// Bridges plateau detection (29E) with the substitution engine (28F).
// When a plateau is detected, proposes specific exercise alternatives and an
// intervention strategy matched to the user's goal.

import type { Exercise, TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { GoalType }                       from "@/lib/exercises/goalBasedSelection";
import { allExercises }                        from "@/lib/exercises/exerciseLibrary";
import { getMergedExercisePool }               from "@/lib/exercises/customExercises";
import { getExerciseSubstitutions }            from "@/lib/exercises/exerciseSubstitutions";
import { generatePlateauInterventions }        from "@/lib/progression/plateauIntervention";
import { detectPlateau, type PlateauResult }   from "@/lib/progression/plateauDetection";
import { detectPerformanceTrends }             from "@/lib/analytics/performanceTrends";
import { getExercisePerformanceHistory }       from "@/lib/progression/exerciseHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RotationSuggestion {
  exerciseName:       string;
  plateauResult:      PlateauResult;
  alternatives:       Exercise[];       // up to 5, ordered best-fit first
  interventionText:   string;           // human-readable coaching suggestion
  interventionReason: string;
  shouldRotate:       boolean;          // false when plateau confidence is low
}

// ─── Plateau reason → user-facing label ───────────────────────────────────────

const REASON_LABELS: Record<PlateauResult["reason"], string> = {
  volume_flat:      "Volume has been flat for several sessions.",
  weight_stuck:     "Weight hasn't moved in recent sessions.",
  rpe_rising:       "The same load is getting harder — signs of accumulated fatigue.",
  incomplete_sets:  "Prescribed sets aren't being completed consistently.",
  insufficient_data: "",
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns a rotation suggestion for a single exercise.
 * shouldRotate = false when the plateau is not detected or confidence < 0.5.
 */
export function getRotationSuggestion(
  exerciseName: string,
  environment:  TrainingEnvironment,
  goalType:     GoalType,
): RotationSuggestion {
  const plateau = detectPlateau(exerciseName);

  const base: RotationSuggestion = {
    exerciseName,
    plateauResult:      plateau,
    alternatives:       [],
    interventionText:   "",
    interventionReason: "",
    shouldRotate:       false,
  };

  if (!plateau.plateauDetected || plateau.confidence < 0.50) return base;

  // Find the Exercise object for the exercise
  const pool     = getMergedExercisePool();
  const exercise = pool.find(e => e.name === exerciseName) ??
                   allExercises.find(e => e.name === exerciseName);

  if (!exercise) return base;

  // Get substitutions filtered for the user's environment
  const alternatives = getExerciseSubstitutions({ exercise, environment }).slice(0, 5);

  // Build a fake PerformanceTrend so we can reuse generatePlateauInterventions
  const history = getExercisePerformanceHistory(exerciseName);
  const fakePerf = history.map(p => ({
    exerciseName:  p.exerciseName,
    date:          p.date,
    weight:        p.weight,
    actualReps:    p.reps,
    completedSets: p.sets,
    actualRPE:     p.rpe ?? 0,
    prescribedRPE: 0,
  }));

  const trends    = detectPerformanceTrends(fakePerf);
  const platTrend = trends.find(t => t.exerciseName === exerciseName);
  const intervention = platTrend
    ? generatePlateauInterventions([platTrend], goalType)[0]
    : null;

  return {
    ...base,
    alternatives,
    interventionText:   intervention?.suggestion   ?? "",
    interventionReason: intervention?.rationale    ?? REASON_LABELS[plateau.reason],
    shouldRotate:       alternatives.length > 0,
  };
}

/**
 * Returns rotation suggestions for a list of exercises, filtering to only
 * those where a plateau was detected with sufficient confidence.
 */
export function getRotationSuggestions(
  exerciseNames: string[],
  environment:   TrainingEnvironment,
  goalType:      GoalType,
): RotationSuggestion[] {
  return exerciseNames
    .map(name => getRotationSuggestion(name, environment, goalType))
    .filter(s => s.plateauResult.plateauDetected && s.plateauResult.confidence >= 0.50);
}
