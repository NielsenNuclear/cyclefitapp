// ─── lib/nutrition/nutritionPeriodization.ts ─────────────────────────────────
// Phase 32E — Adjusts NutritionTargets based on the current mesocycle block.
// Nutrition follows the same accumulation → intensification → peak → deload
// structure as the training block (Phase 30).

import type { PeriodizationPhase } from "@/lib/periodization/goalProfiles";
import type { NutritionTargets }    from "./nutritionTargets";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NutritionPeriodizationAdjustment {
  targets:       NutritionTargets;
  periodizationNote: string;
  modified:      boolean;
}

// ─── Phase-based adjustments ─────────────────────────────────────────────────

interface PeriodAdjust {
  calorieOffset:  number;
  proteinOffset:  number;
  carbPct:        number | null;   // null = use computed value unchanged
  note:           string;
}

const PERIOD_ADJUST: Record<PeriodizationPhase, PeriodAdjust> = {
  accumulation: {
    calorieOffset: +100,
    proteinOffset: +5,
    carbPct:       0.55,   // fuel the volume
    note: "Accumulation block — fuelling increased training volume. Carbohydrate availability is the priority.",
  },
  intensification: {
    calorieOffset: +50,
    proteinOffset: +10,
    carbPct:       0.58,   // peak carb demand during high-intensity work
    note: "Intensification block — performance nutrition focus. High-quality carbs before sessions; protein distributed across the day.",
  },
  peak: {
    calorieOffset: 0,
    proteinOffset: +10,
    carbPct:       0.60,   // glycogen-maximising
    note: "Peak block — maximum performance fuelling. Prioritise carbohydrate loading around training and protect protein intake.",
  },
  deload: {
    calorieOffset: -100,
    proteinOffset: 0,
    carbPct:       0.40,   // reduced training → reduced carb demand
    note: "Deload block — recovery nutrition focus. Slightly reduced calories with anti-inflammatory emphasis; maintain protein to support tissue repair.",
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Applies mesocycle-phase adjustments to computed NutritionTargets.
 * Accumulation: more calories + carbs. Deload: fewer calories + lower carbs.
 * Peak: glycogen maximisation. Does not alter hydration or micro-nutrient flags.
 */
export function applyNutritionPeriodization(
  targets:           NutritionTargets,
  periodizationPhase: PeriodizationPhase,
): NutritionPeriodizationAdjustment {
  const adj = PERIOD_ADJUST[periodizationPhase];

  const newCalories = Math.max(1200, targets.calories + adj.calorieOffset);
  const newProtein  = Math.max(60, targets.protein + adj.proteinOffset);

  let newCarbs = targets.carbs;
  if (adj.carbPct !== null) {
    newCarbs = Math.round((newCalories * adj.carbPct) / 4);
  }

  const proteinKcal = newProtein * 4;
  const carbKcal    = newCarbs   * 4;
  const fatKcal     = Math.max(0, newCalories - proteinKcal - carbKcal);
  const newFats     = Math.round(fatKcal / 9);

  return {
    targets: {
      ...targets,
      calories: newCalories,
      protein:  newProtein,
      carbs:    newCarbs,
      fats:     Math.max(30, newFats),
    },
    periodizationNote: adj.note,
    modified: true,
  };
}
