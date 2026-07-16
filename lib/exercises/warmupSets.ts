// ─── lib/exercises/warmupSets.ts ──────────────────────────────────────────────
// Workout Engine Sprint — Phase A.1. Progressive-loading warm-up sets for the
// specific lift about to be worked (e.g. 50/70/85% before a heavy squat).
//
// Distinct from lib/movement/generateWarmup.ts's warmupBlock, which is general
// movement-prep (mobility/activation drills shown once per session, before any
// exercise). This generates a per-exercise loading ramp and is logged
// separately from working sets — see components/dashboard/WorkoutCard.tsx's
// warmupActuals — so warm-up sets never count as working volume in progression
// or history tracking.
//
// Pure logic — no React, no side effects.

import type { Exercise, MovementPattern } from "./exerciseLibrary";
import { deriveEquipmentCategory, getLoadingType } from "./exerciseSubstitutions";

export type WarmupTier = "heavy_compound" | "medium_compound" | "isolation" | "accessory";

const COMPOUND_PATTERNS: MovementPattern[] = [
  "Squat", "Hinge", "Horizontal Push", "Vertical Push", "Horizontal Pull", "Vertical Pull", "Explosive",
];

// Well-known single-joint isolation movement names. Checked BEFORE the
// movement-pattern/muscle-count heuristic below: this library tags "Bicep
// Curl" and "Tricep Pushdown" with the same movementPattern ("Vertical
// Pull"/"Vertical Push") as genuine compounds, and a curl's synergist
// muscles (brachialis, brachioradialis alongside biceps) push
// secondaryMuscles.length to 2 — over the compound threshold — even though
// it's clearly a single-joint lift. Name matching is the more reliable
// signal here, not a fallback.
const ISOLATION_NAME_PATTERN = /\b(curl|extension|raise|fly|flye|pushdown|kickback|pullover|crunch|shrug)\b/i;

/**
 * Classifies an exercise for warm-up-ramp purposes. There's no explicit
 * compound/isolation field in the exercise library, so this combines a
 * name-pattern check (see ISOLATION_NAME_PATTERN) with movement pattern and
 * secondaryMuscles.length (a proxy for how many joints/muscle groups a
 * genuine compound recruits) as a fallback for exercises the name pattern
 * doesn't catch.
 */
export function getWarmupTier(exercise: Exercise): WarmupTier {
  const loadingType = getLoadingType(exercise);
  if (loadingType !== "weighted" && loadingType !== "assisted") return "accessory";
  if (exercise.category === "Mobility") return "accessory";
  if (ISOLATION_NAME_PATTERN.test(exercise.name)) return "isolation";
  if (!COMPOUND_PATTERNS.includes(exercise.movementPattern)) return "isolation";

  const equipmentCategory = deriveEquipmentCategory(exercise.equipment);
  const recruitment = exercise.secondaryMuscles.length;

  if (equipmentCategory === "barbell" && recruitment >= 2) return "heavy_compound";
  if (recruitment >= 2) return "medium_compound";
  return "isolation";
}

export interface WarmupSet {
  weight:  number;   // rounded to the nearest 2.5kg plate increment
  reps:    string;
  percent: number;   // of workingWeight, for display ("50%" etc.)
}

const TIER_RAMPS: Record<WarmupTier, number[]> = {
  heavy_compound:  [0.50, 0.70, 0.85],
  medium_compound: [0.60, 0.80],
  isolation:       [0.60],
  accessory:       [],
};

function roundToPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

function repsForPercent(percent: number): string {
  if (percent <= 0.60) return "8";
  if (percent <= 0.80) return "5";
  return "3";
}

/**
 * Generates progressive-loading warm-up sets ramping toward `workingWeight`
 * (typically the athlete's last logged weight for this exercise — see
 * WorkoutCard.tsx's defaultSets()). Returns an empty array when there's no
 * reference weight (a genuinely new lift has no ramp to compute — the athlete
 * starts light and builds up manually, which is the realistic behavior, not
 * a gap) or the exercise is accessory/mobility-tier and doesn't need one.
 */
export function generateWarmupSets(exercise: Exercise, workingWeight: number | undefined): WarmupSet[] {
  if (!workingWeight || workingWeight <= 0) return [];

  const tier = getWarmupTier(exercise);
  if (tier === "accessory") return [];

  // Isolation gets a second, lighter warm-up set only once the working
  // weight is heavy enough that a single ramp set undersells it — matches
  // the brief's "1–2" range for isolation rather than always defaulting high.
  const percents = tier === "isolation" && workingWeight >= 20
    ? [0.50, 0.75]
    : TIER_RAMPS[tier];

  return percents.map(percent => ({
    weight:  roundToPlate(workingWeight * percent),
    reps:    repsForPercent(percent),
    percent: Math.round(percent * 100),
  }));
}
