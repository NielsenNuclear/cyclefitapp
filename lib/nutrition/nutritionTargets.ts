// ─── lib/nutrition/nutritionTargets.ts ───────────────────────────────────────
// Phase 32A — Explicit daily macro, calorie, hydration, and fiber targets.
// Builds on FuelTargets (Phase 24) by adding concrete numeric estimates.
// Targets are calibrated for an active adult (55–75 kg). They are directional
// guidance, not clinical prescriptions.

import type { PhaseData }        from "@/types/recommendation";
import type { ReadinessScore }   from "@/lib/readiness/calculateReadiness";
import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";
import type { RecoveryCapacity } from "@/lib/adaptive/recoveryCapacity";
import type { SymptomEntry }     from "@/lib/symptoms/symptomHistory";
import type { GoalType }         from "@/lib/exercises/goalBasedSelection";
import { computeFuelTargets, type FuelTargets, type FuelingLevel } from "./fuelTargets";
import type { BodyMetrics } from "./tdee";
import { computeBMR, computeTDEE, applyGoalAdjustment, fatGramsFromWeight } from "./tdee";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NutritionTargets extends FuelTargets {
  calories:        number;   // estimated kcal
  protein:         number;   // grams (midpoint of proteinRange)
  carbs:           number;   // grams
  fats:            number;   // grams
  fiber:           number;   // grams
  hydrationLiters: number;
  phaseNote:       string;   // cycle phase nutrition note
  isPersonalized:  boolean;  // true when computed from real body metrics (BMR/TDEE), false when using the flat-table fallback
}

// ─── Calorie base by fueling level ───────────────────────────────────────────

const BASE_CALORIES: Record<FuelingLevel, number> = {
  recovery:    1800,
  maintenance: 2100,
  performance: 2400,
  high_output: 2700,
};

// ─── Carb percentage by priority ─────────────────────────────────────────────

const CARB_PCT: Record<string, number> = {
  high:     0.55,
  moderate: 0.45,
  low:      0.35,
};

// ─── Hydration base by fueling level ─────────────────────────────────────────

const HYDRATION_BASE: Record<FuelingLevel, number> = {
  recovery:    2.0,
  maintenance: 2.2,
  performance: 2.5,
  high_output: 3.0,
};

// ─── Fiber by fueling level ───────────────────────────────────────────────────

const FIBER_TARGET: Record<FuelingLevel, number> = {
  recovery:    28,
  maintenance: 30,
  performance: 32,
  high_output: 35,
};

// ─── Phase nutrition notes ────────────────────────────────────────────────────

const PHASE_NUTRITION_NOTES: Record<string, string> = {
  Follicular:    "Rising estrogen supports carbohydrate use — prioritise complex carbs around your session.",
  Ovulatory:     "Peak glycogen utilisation window. Pre-workout carbs and post-workout protein are especially effective today.",
  Luteal:        "Higher satiety needs — distribute protein and healthy fats evenly to manage cravings and blood sugar.",
  "Late Luteal": "Increase magnesium-rich foods (dark chocolate, nuts, seeds) to support mood and reduce PMS symptoms.",
  Menstrual:     "Iron, hydration, and omega-3 fats take priority. Gentle anti-inflammatory focus today.",
};

// ─── Goal-based calorie adjustments ──────────────────────────────────────────

const GOAL_CALORIE_OFFSET: Record<GoalType, number> = {
  fat_loss:             -200,
  general_fitness:          0,
  hypertrophy:          +250,
  strength:             +100,
  athletic_performance: +150,
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes explicit daily nutrition targets from all available signals.
 * Returns FuelTargets fields plus concrete macro, calorie, fiber, and
 * hydration numbers. When `bodyMetrics` is supplied, calories come from a
 * real BMR/TDEE calculation and fats are floored at 0.8g/kg bodyweight —
 * otherwise both fall back to the legacy flat-table behavior, unchanged.
 */
export function computeNutritionTargets(
  phase:            PhaseData,
  readinessScore:   ReadinessScore | null,
  workout:          GeneratedWorkout | null,
  recoveryCapacity: RecoveryCapacity | null,
  todaySymptoms:    SymptomEntry[],
  goalType:         GoalType,
  bodyMetrics?:     BodyMetrics,
  trainingStyles?:  string[],
): NutritionTargets {
  const base = computeFuelTargets(phase, readinessScore, workout, recoveryCapacity, todaySymptoms, goalType, bodyMetrics, trainingStyles);

  const level = base.fuelingLevel;
  const isPersonalized = !!bodyMetrics;
  const baseKcal = isPersonalized
    ? applyGoalAdjustment(computeTDEE(computeBMR(bodyMetrics.weightKg, bodyMetrics.heightCm, bodyMetrics.age, bodyMetrics.sex), bodyMetrics.activityLevel), goalType)
    : BASE_CALORIES[level] + (GOAL_CALORIE_OFFSET[goalType] ?? 0);

  // Protein midpoint — for personalized users, proteinRange is already
  // narrowly centered on the g/kg-derived, FuelingLevel-positioned target
  // (see fuelTargets.ts's proteinRange()), so the midpoint here is correct
  // for both paths without special-casing.
  const protein = Math.round((base.proteinRange.min + base.proteinRange.max) / 2);

  // Carbs from calorie budget — same phase-driven % logic for both paths,
  // now fed the personalized calorie budget when available.
  const carbPct = CARB_PCT[base.carbPriority] ?? 0.45;
  let carbs = Math.round((baseKcal * carbPct) / 4);

  // Fats: remaining calories after protein + carbs
  const proteinKcal = protein * 4;
  let carbKcal      = carbs   * 4;
  let fatKcal        = Math.max(0, baseKcal - proteinKcal - carbKcal);
  let fats           = Math.round(fatKcal / 9);

  // Personalized users: enforce the 0.8g/kg fat floor (hormone production,
  // satiety, fat-soluble vitamin absorption) if the remainder undershoots
  // it — raise fat to the floor and reduce carbs by the equivalent kcal,
  // floored at a reasonable minimum so this never drives carbs pathologically low.
  const MIN_CARB_GRAMS = 50;
  if (isPersonalized) {
    const fatFloor = fatGramsFromWeight(bodyMetrics.weightKg, base.fatPriority).min;
    if (fats < fatFloor) {
      const deficitKcal = (fatFloor - fats) * 9;
      const reducedCarbs = Math.max(MIN_CARB_GRAMS, carbs - Math.round(deficitKcal / 4));
      carbs   = reducedCarbs;
      carbKcal = carbs * 4;
      fatKcal  = Math.max(0, baseKcal - proteinKcal - carbKcal);
      fats     = Math.round(fatKcal / 9);
    }
  }

  // Hydration: base + extra if high output or menstrual
  let hydration = HYDRATION_BASE[level];
  if (base.ironFocus)        hydration += 0.3;  // menstrual — extra fluids
  if (base.electrolyteFocus) hydration += 0.3;  // ovulatory/high-output

  const phaseNote = PHASE_NUTRITION_NOTES[phase.name] ?? "";

  return {
    ...base,
    calories:        baseKcal,
    protein,
    carbs,
    fats,
    fiber:           FIBER_TARGET[level],
    hydrationLiters: Math.round(hydration * 10) / 10,
    isPersonalized,
    phaseNote,
  };
}
