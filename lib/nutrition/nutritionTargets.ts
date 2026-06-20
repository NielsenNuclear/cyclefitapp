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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NutritionTargets extends FuelTargets {
  calories:        number;   // estimated kcal
  protein:         number;   // grams (midpoint of proteinRange)
  carbs:           number;   // grams
  fats:            number;   // grams
  fiber:           number;   // grams
  hydrationLiters: number;
  phaseNote:       string;   // cycle phase nutrition note
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
 * hydration numbers.
 */
export function computeNutritionTargets(
  phase:            PhaseData,
  readinessScore:   ReadinessScore | null,
  workout:          GeneratedWorkout | null,
  recoveryCapacity: RecoveryCapacity | null,
  todaySymptoms:    SymptomEntry[],
  goalType:         GoalType,
): NutritionTargets {
  const base = computeFuelTargets(phase, readinessScore, workout, recoveryCapacity, todaySymptoms, goalType);

  const level    = base.fuelingLevel;
  const baseKcal = BASE_CALORIES[level] + (GOAL_CALORIE_OFFSET[goalType] ?? 0);

  // Protein midpoint
  const protein = Math.round((base.proteinRange.min + base.proteinRange.max) / 2);

  // Carbs from calorie budget
  const carbPct = CARB_PCT[base.carbPriority] ?? 0.45;
  const carbs   = Math.round((baseKcal * carbPct) / 4);

  // Fats: remaining calories after protein + carbs
  const proteinKcal = protein * 4;
  const carbKcal    = carbs   * 4;
  const fatKcal     = Math.max(0, baseKcal - proteinKcal - carbKcal);
  const fats        = Math.round(fatKcal / 9);

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
    phaseNote,
  };
}
