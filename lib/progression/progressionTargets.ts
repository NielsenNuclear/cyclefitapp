// ─── lib/progression/progressionTargets.ts ───────────────────────────────────
// Computes next-session load targets per exercise from performance history.
// Pure function — no storage reads. Callers pass all data in.

import type { ExercisePerformanceEntry } from "./exercisePerformanceLog";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressionType = "load" | "reps" | "maintain" | "deload";

export interface ProgressionTarget {
  exerciseName:    string;
  targetWeight:    number;
  targetReps:      number;
  targetSets:      number;
  progressionType: ProgressionType;
  note:            string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

// Parse the lower bound from a prescribed-reps string ("8-12" → 8, "10" → 10)
function parseLowerRep(repsStr: string): number {
  const n = parseInt(repsStr, 10);
  return isNaN(n) ? 0 : n;
}

// Parse the upper bound from a prescribed-reps string ("8-12" → 12, "10" → 10)
function parseUpperRep(repsStr: string): number {
  const parts = repsStr.split("-");
  const last  = parseInt(parts[parts.length - 1], 10);
  return isNaN(last) ? 0 : last;
}

// ─── Goal-specific rules ──────────────────────────────────────────────────────

function computeStrengthTarget(entry: ExercisePerformanceEntry): ProgressionTarget {
  const allSets    = entry.completedSets >= Math.ceil(entry.completedSets);
  const rpeOnTarget = entry.prescribedRPE === 0 || entry.actualRPE <= entry.prescribedRPE;
  const canProgress = allSets && rpeOnTarget && entry.completedSets > 0;

  if (canProgress) {
    const newWeight = roundToIncrement(entry.weight * 1.025, 0.5) || entry.weight + 2.5;
    return {
      exerciseName:    entry.exerciseName,
      targetWeight:    Math.max(newWeight, entry.weight + 0.5),
      targetReps:      entry.actualReps,
      targetSets:      entry.completedSets,
      progressionType: "load",
      note:            `Load up ${(((Math.max(newWeight, entry.weight + 0.5) - entry.weight) / (entry.weight || 1)) * 100).toFixed(1)}% — strong session at RPE ${entry.actualRPE}`,
    };
  }

  return {
    exerciseName:    entry.exerciseName,
    targetWeight:    entry.weight,
    targetReps:      entry.actualReps,
    targetSets:      entry.completedSets,
    progressionType: "maintain",
    note:            entry.actualRPE > entry.prescribedRPE && entry.prescribedRPE !== 0
      ? `Hold weight — RPE ${entry.actualRPE} exceeded target (${entry.prescribedRPE})`
      : "Maintain load — consolidate the pattern before adding weight",
  };
}

function computeHypertrophyTarget(
  entry:           ExercisePerformanceEntry,
  prescribedReps?: string,
  weightIncrement = 1.05,
): ProgressionTarget {
  const upperBound = prescribedReps ? parseUpperRep(prescribedReps) : entry.actualReps;
  const lowerBound = prescribedReps ? parseLowerRep(prescribedReps) : Math.max(1, entry.actualReps - 4);

  // At or beyond top of rep range — increase load, reset reps
  if (entry.actualReps >= upperBound + 2) {
    const newWeight = roundToIncrement(entry.weight * weightIncrement, 0.5) || entry.weight + 1;
    return {
      exerciseName:    entry.exerciseName,
      targetWeight:    Math.max(newWeight, entry.weight + 0.5),
      targetReps:      lowerBound,
      targetSets:      entry.completedSets,
      progressionType: "load",
      note:            `Rep ceiling reached — add weight and return to ${lowerBound} reps`,
    };
  }

  // Within range — add one rep, hold weight
  return {
    exerciseName:    entry.exerciseName,
    targetWeight:    entry.weight,
    targetReps:      entry.actualReps + 1,
    targetSets:      entry.completedSets,
    progressionType: "reps",
    note:            `Add 1 rep this session (${entry.actualReps} → ${entry.actualReps + 1})`,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Derives next-session progression targets for each exercise that has
 * at least one prior logged performance entry.
 *
 * Exercises with no history are silently omitted — the caller decides how
 * to handle the no-data case (typically by showing default prescription).
 */
export function computeProgressionTargets(
  performanceHistory: ExercisePerformanceEntry[],
  goalType:           GoalType,
): ProgressionTarget[] {
  if (performanceHistory.length === 0) return [];

  // Latest entry per exercise
  const latestByExercise = new Map<string, ExercisePerformanceEntry>();
  for (const entry of performanceHistory) {
    if (!latestByExercise.has(entry.exerciseName)) {
      latestByExercise.set(entry.exerciseName, entry);
    }
  }

  const targets: ProgressionTarget[] = [];

  for (const [, entry] of latestByExercise) {
    if (entry.actualReps === 0) continue;

    let target: ProgressionTarget;

    switch (goalType) {
      case "strength":
      case "athletic_performance":
        target = computeStrengthTarget(entry);
        break;

      case "hypertrophy":
        target = computeHypertrophyTarget(entry, undefined, 1.05);
        break;

      case "fat_loss":
      case "general_fitness":
      default:
        target = computeHypertrophyTarget(entry, undefined, 1.025);
        break;
    }

    targets.push(target);
  }

  return targets.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
