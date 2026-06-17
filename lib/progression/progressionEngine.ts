// ─── lib/progression/progressionEngine.ts ────────────────────────────────────
// Per-exercise progression recommendation engine.
// Reads from axis_exercise_history (long-term durable store, 18 months).
// Distinct from progressionTargets.ts which reads from axis_workout_log.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { DifficultyLevel } from "@/lib/exercises/exerciseLibrary";
import {
  getExercisePerformanceHistory,
  type ExercisePerformance,
} from "./exerciseHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressionAction = "increase" | "maintain" | "deload" | "regress";

export interface ProgressionRecommendation {
  exerciseName:   string;
  action:         ProgressionAction;
  targetWeight:   number;           // kg; 0 = bodyweight / no suggestion
  targetReps:     number;           // suggested rep target
  targetSets:     number;
  confidence:     number;           // 0–1; rises with session count
  rationale:      string;
  sessionCount:   number;           // completed sessions used for this decision
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SESSIONS_TO_ACT = 2; // below this, always "maintain"
const PLATEAU_SESSIONS    = 3; // sessions with no improvement = plateau trigger
const REGRESS_SESSIONS    = 3; // sessions of declining volume = regress trigger

// Volume proxy: (weight + 1) × reps × sets — +1 so bodyweight stays non-zero
function volumeProxy(p: ExercisePerformance): number {
  return (p.weight + 1) * p.reps * p.sets;
}

// ─── Confidence (0–1) ─────────────────────────────────────────────────────────

function calcConfidence(sessionCount: number): number {
  if (sessionCount === 0) return 0.0;
  if (sessionCount <= 1)  return 0.10;
  if (sessionCount <= 3)  return 0.30;
  if (sessionCount <= 5)  return 0.50;
  if (sessionCount <= 9)  return 0.65;
  if (sessionCount <= 14) return 0.78;
  if (sessionCount <= 20) return 0.87;
  return 0.95;
}

// ─── Load increment by goal and level ─────────────────────────────────────────
// Beginners progress faster; advanced athletes need conservative jumps.

interface IncrementSpec {
  weightMultiplier: number;   // e.g. 1.025 = 2.5%
  minWeightAdd:     number;   // minimum kg increment regardless of %
  repAdd:           number;   // reps to add per step
}

const GOAL_INCREMENTS: Record<GoalType, IncrementSpec> = {
  strength:             { weightMultiplier: 1.025, minWeightAdd: 2.5, repAdd: 0 },
  hypertrophy:          { weightMultiplier: 1.025, minWeightAdd: 1.0, repAdd: 1 },
  fat_loss:             { weightMultiplier: 1.025, minWeightAdd: 1.0, repAdd: 1 },
  general_fitness:      { weightMultiplier: 1.025, minWeightAdd: 1.0, repAdd: 1 },
  athletic_performance: { weightMultiplier: 1.030, minWeightAdd: 2.5, repAdd: 0 },
};

const LEVEL_MULTIPLIER: Record<DifficultyLevel, number> = {
  Beginner:     1.20,  // beginners can jump more aggressively
  Intermediate: 1.00,
  Advanced:     0.80,  // conservative — close to true max
};

function calcTargetWeight(
  current:  number,
  goal:     GoalType,
  level:    DifficultyLevel,
): number {
  if (current <= 0) return 0; // bodyweight exercise
  const spec = GOAL_INCREMENTS[goal];
  const mult = LEVEL_MULTIPLIER[level];
  const raw  = current * (1 + (spec.weightMultiplier - 1) * mult);
  const min  = current + spec.minWeightAdd * mult;
  // Round to nearest 0.5kg increment
  return Math.round(Math.max(raw, min) * 2) / 2;
}

// ─── Core action logic ────────────────────────────────────────────────────────

function detectAction(
  completed: ExercisePerformance[],  // newest first
  goal:      GoalType,
): ProgressionAction {
  if (completed.length < MIN_SESSIONS_TO_ACT) return "maintain";

  const volumes = completed.map(volumeProxy);

  // Regress: last REGRESS_SESSIONS all show declining volume
  if (completed.length >= REGRESS_SESSIONS) {
    const recent = volumes.slice(0, REGRESS_SESSIONS);
    const allDecline = recent.every((v, i) =>
      i === 0 || v < recent[i - 1] * 0.97
    );
    if (allDecline) return "regress";
  }

  // Deload: volume flat or declining for PLATEAU_SESSIONS + RPE elevated
  if (completed.length >= PLATEAU_SESSIONS) {
    const recent     = completed.slice(0, PLATEAU_SESSIONS);
    const recentVols = recent.map(volumeProxy);
    const baseline   = recentVols[recentVols.length - 1];
    const noneImproved = recentVols.every(v => v <= baseline * 1.03);
    const avgRpe = recent
      .filter(p => p.rpe && p.rpe > 0)
      .reduce((s, p) => s + (p.rpe ?? 0), 0) /
      Math.max(1, recent.filter(p => p.rpe && p.rpe > 0).length);

    // Plateau + high effort = deload signal
    if (noneImproved && avgRpe >= 8.5) return "deload";
  }

  // Goal-specific increase trigger
  const last    = completed[0];
  const prevTwo = completed.slice(0, 2);

  if (goal === "strength") {
    // Strength: consecutive sessions at or above rep target with controlled RPE
    const bothHitReps = prevTwo.length >= 2 &&
      prevTwo.every(p => p.reps >= last.reps) &&
      (last.rpe === undefined || last.rpe <= 8);
    if (bothHitReps) return "increase";

  } else if (goal === "hypertrophy" || goal === "fat_loss" || goal === "general_fitness") {
    // Hypertrophy: hit rep ceiling on most recent session → load increase
    // Rep ceiling approximated as ≥ current reps (user is handling the load)
    if (prevTwo.length >= 2) {
      const recentVol    = volumes.slice(0, 2);
      const priorVol     = volumes.slice(2, 4);
      const volumeGrew   = priorVol.length > 0 &&
        (recentVol.reduce((s, v) => s + v, 0) / recentVol.length) >=
        (priorVol.reduce((s, v) => s + v, 0) / priorVol.length) * 1.03;
      if (volumeGrew) return "increase";
    }

  } else if (goal === "athletic_performance") {
    // Athletic: volume grew compared to 4 sessions ago
    if (volumes.length >= 4) {
      const recentMean = (volumes[0] + volumes[1]) / 2;
      const priorMean  = (volumes[2] + volumes[3]) / 2;
      if (recentMean >= priorMean * 1.03) return "increase";
    }
  }

  return "maintain";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateProgressionRecommendation(
  exerciseName: string,
  goalType:     GoalType,
  level:        DifficultyLevel = "Intermediate",
): ProgressionRecommendation {
  const history   = getExercisePerformanceHistory(exerciseName);
  const completed = history.filter(p => p.completed);
  const last      = completed[0];
  const count     = completed.length;
  const confidence = calcConfidence(count);

  const noDataResult: ProgressionRecommendation = {
    exerciseName,
    action:       "maintain",
    targetWeight: 0,
    targetReps:   0,
    targetSets:   0,
    confidence:   0,
    rationale:    "No logged sessions yet. Complete 2–3 sessions to unlock progression recommendations.",
    sessionCount: 0,
  };

  if (!last || count === 0) return noDataResult;

  const action = detectAction(completed, goalType);
  const spec   = GOAL_INCREMENTS[goalType];

  let targetWeight = last.weight;
  let targetReps   = last.reps;
  let targetSets   = last.sets;
  let rationale    = "";

  switch (action) {
    case "increase": {
      const isBodyweight = last.weight === 0;
      if (isBodyweight) {
        // Bodyweight: add reps instead of weight
        targetReps = last.reps + spec.repAdd + 1;
        rationale  =
          `${count} sessions logged. Volume trending up — add ${spec.repAdd + 1} reps this session ` +
          `(${last.reps} → ${targetReps}) to continue progressing.`;
      } else {
        targetWeight = calcTargetWeight(last.weight, goalType, level);
        rationale    =
          `${count} sessions logged. Load progression triggered — increase to ` +
          `${targetWeight}kg (from ${last.weight}kg, +${(targetWeight - last.weight).toFixed(1)}kg). ` +
          `${level === "Beginner" ? "Beginners respond well to frequent small jumps." : ""}`;
      }
      break;
    }

    case "deload": {
      targetWeight = Math.round(last.weight * 0.80 * 2) / 2;
      targetReps   = Math.max(1, Math.round(last.reps * 0.80));
      targetSets   = Math.max(1, last.sets - 1);
      rationale    =
        `Effort has been high (avg RPE ≥ 8.5) with no volume growth over the last ` +
        `${PLATEAU_SESSIONS} sessions. A structured deload — reduce weight ~20%, ` +
        `1 fewer set — restores adaptation capacity. This is training, not rest.`;
      break;
    }

    case "regress": {
      targetWeight = Math.round(last.weight * 0.90 * 2) / 2;
      targetReps   = last.reps;
      targetSets   = last.sets;
      rationale    =
        `Volume has declined for ${REGRESS_SESSIONS} consecutive sessions. ` +
        `Pulling weight back 10% resets the trajectory without losing the pattern. ` +
        `Focus on movement quality before reloading.`;
      break;
    }

    default: {
      // maintain
      rationale =
        count < MIN_SESSIONS_TO_ACT
          ? `${count} session${count === 1 ? "" : "s"} logged — completing ${MIN_SESSIONS_TO_ACT - count} more ` +
            `enables progression decisions.`
          : `Volume is building steadily. Hold current weight (${last.weight > 0 ? `${last.weight}kg` : "bodyweight"}) ` +
            `and focus on hitting all prescribed sets and reps cleanly.`;
      break;
    }
  }

  return {
    exerciseName,
    action,
    targetWeight,
    targetReps,
    targetSets,
    confidence,
    rationale,
    sessionCount: count,
  };
}

// ─── Batch helper ─────────────────────────────────────────────────────────────

/**
 * Returns recommendations for multiple exercises in one call.
 * Exercises with no history are omitted from results.
 */
export function getProgressionRecommendations(
  exerciseNames: string[],
  goalType:      GoalType,
  level:         DifficultyLevel = "Intermediate",
): ProgressionRecommendation[] {
  return exerciseNames
    .map(name => calculateProgressionRecommendation(name, goalType, level))
    .filter(r => r.sessionCount > 0);
}
