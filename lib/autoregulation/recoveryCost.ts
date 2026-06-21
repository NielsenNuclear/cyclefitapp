// ─── lib/autoregulation/recoveryCost.ts ──────────────────────────────────────
// Phase 37H — Recovery cost estimation for a generated workout.
// Tags each session with how much recovery it demands, used by future
// workout decisions to maintain recovery budget across the week.

import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryCostLevel = "minimal" | "low" | "medium" | "high";

export interface WorkoutRecoveryCost {
  level:    RecoveryCostLevel;
  score:    number;           // 0–100 internal score
  rationale: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEAVY_PATTERNS = ["hinge", "squat", "horizontal_push", "horizontal_pull", "vertical_pull"];

function costLevel(score: number): RecoveryCostLevel {
  if (score <= 20) return "minimal";
  if (score <= 45) return "low";
  if (score <= 70) return "medium";
  return "high";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeWorkoutRecoveryCost(workout: GeneratedWorkout): WorkoutRecoveryCost {
  const exercises = workout.exercises;

  // Total prescribed sets
  const totalSets = exercises.reduce((s, ex) => s + ex.sets, 0);

  // Mean RPE
  const rpeSamples = exercises.map(ex => ex.rpe ?? 0).filter(r => r > 0);
  const meanRPE    = rpeSamples.length > 0
    ? rpeSamples.reduce((s, r) => s + r, 0) / rpeSamples.length
    : 5;

  // Proportion of high-demand movement patterns
  const heavyCount = exercises.filter(ex =>
    HEAVY_PATTERNS.includes(ex.exercise.movementPattern),
  ).length;
  const heavyRatio = exercises.length > 0 ? heavyCount / exercises.length : 0;

  // Estimated duration weighting
  const durationFactor = Math.min(1.0, workout.estimatedDurationMin / 60);

  // Composite score
  const setComponent      = Math.min(40, (totalSets / 20) * 40);
  const rpeComponent      = Math.min(30, ((meanRPE - 4) / 6) * 30);
  const patternComponent  = Math.min(20, heavyRatio * 20);
  const durationComponent = Math.min(10, durationFactor * 10);

  const score = Math.round(setComponent + rpeComponent + patternComponent + durationComponent);
  const level = costLevel(score);

  const rationale =
    level === "high"    ? `${totalSets} sets at ~RPE ${Math.round(meanRPE)} with ${heavyCount} heavy compound lifts — allow 48–72h before the next demanding session`
    : level === "medium" ? `Moderate load (${totalSets} sets, ~RPE ${Math.round(meanRPE)}) — target 24–48h recovery`
    : level === "low"    ? `Lighter session — recovery within 24h`
    : "Minimal load — ready again tomorrow";

  return { level, score, rationale };
}
