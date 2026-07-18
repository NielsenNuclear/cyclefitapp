// ─── lib/nutrition/tdee.ts ────────────────────────────────────────────────────
// Nutrition Intelligence 2.0. Personalized BMR/TDEE-based baseline —
// replaces the flat FuelingLevel-keyed lookup tables in fuelTargets.ts and
// nutritionTargets.ts when the user has supplied body metrics (onboarding
// step 12 or a profile-page backfill). Pure functions — no localStorage
// reads here, matching fuelTargets.ts's existing convention.
//
// See docs/nutrition/NutritionEngineArchitecture.md for the full rationale,
// including the "Sex Assumption" section referenced below.

import type { OnboardingData } from "@/lib/onboarding-types";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { FuelingLevel, NutritionPriority } from "./fuelTargets";

// ─── Body metrics guard ───────────────────────────────────────────────────────

export interface BodyMetrics {
  age:           number;
  heightCm:      number;
  weightKg:      number;
  sex?:          "female" | "male" | "prefer_not_to_say";
  activityLevel: string;
}

/** True (and narrows) when the user has supplied the required body-metric fields. */
export function hasBodyMetrics(data: OnboardingData): data is OnboardingData & BodyMetrics {
  return typeof data.age === "number" &&
    typeof data.heightCm === "number" &&
    typeof data.weightKg === "number" &&
    typeof data.activityLevel === "string" && data.activityLevel.length > 0;
}

// ─── BMR (Mifflin-St Jeor) ────────────────────────────────────────────────────

// Sex-based constant. This app has no product-wide requirement that every
// user identify as female, but the onboarding "sex" field is optional and
// defaults to the female constant when unset/"prefer_not_to_say" — the
// same implicit assumption the rest of the app already makes (it's a
// menstrual-cycle-tracking product). If a user selects "male", the male
// constant is used instead. Revisit here if this assumption changes.
export const MIFFLIN_ST_JEOR_CONSTANT: Record<"female" | "male", number> = {
  female: -161,
  male:   5,
};

/** Basal Metabolic Rate in kcal/day. `sex` unset or "prefer_not_to_say" → female constant. */
export function computeBMR(weightKg: number, heightCm: number, age: number, sex?: string): number {
  const constant = sex === "male" ? MIFFLIN_ST_JEOR_CONSTANT.male : MIFFLIN_ST_JEOR_CONSTANT.female;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + constant;
}

// ─── Activity multiplier ──────────────────────────────────────────────────────

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};
export const DEFAULT_ACTIVITY_MULTIPLIER = ACTIVITY_MULTIPLIERS.moderate;

/** Total Daily Energy Expenditure in kcal/day. Unknown activityLevel falls back to moderate. */
export function computeTDEE(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? DEFAULT_ACTIVITY_MULTIPLIER;
  return bmr * multiplier;
}

// ─── Goal adjustment ──────────────────────────────────────────────────────────
//
// Percentage-of-TDEE rather than flat kcal: the legacy flat offsets
// (-200..+250) were tuned against a narrow ~1800-2700kcal band. Applied to a
// real personalized TDEE (which can range roughly 1400-3200kcal depending on
// body size), a flat -200 is trivial for a 3000kcal TDEE and drastic for a
// 1500kcal one. These percentages are chosen to roughly match the old
// tuning's magnitude at the old ~2100kcal maintenance midpoint.

export const GOAL_TDEE_OFFSET_PCT: Record<GoalType, number> = {
  fat_loss:             -0.10,
  general_fitness:          0,
  hypertrophy:          +0.12,
  strength:             +0.05,
  athletic_performance: +0.07,
};

const MIN_CALORIES = 1200; // matches nutritionPeriodization.ts's existing floor

export function applyGoalAdjustment(tdee: number, goalType: GoalType): number {
  const pct = GOAL_TDEE_OFFSET_PCT[goalType] ?? 0;
  return Math.max(MIN_CALORIES, Math.round(tdee * (1 + pct)));
}

// ─── Protein (g/kg bodyweight) ────────────────────────────────────────────────

export const PROTEIN_G_PER_KG_BASE = { min: 1.6, max: 2.2 };

// Values match components/onboarding/Steps1to5.tsx's STYLES options — the
// same loose-coupling convention already accepted for goals/GoalType.
const ENDURANCE_STYLES = new Set(["running", "cycling", "swimming"]);
const STRENGTH_STYLES  = new Set(["strength", "crossfit"]);

/**
 * g/kg protein range, narrowed toward the low end for endurance-leaning
 * training styles and the high end for strength-leaning ones. Mixed or
 * unrecognized styles get the full 1.6-2.2 base range.
 */
export function trainingEmphasisProteinRangeKg(trainingStyles: string[]): { min: number; max: number } {
  const hasEndurance = trainingStyles.some(s => ENDURANCE_STYLES.has(s));
  const hasStrength  = trainingStyles.some(s => STRENGTH_STYLES.has(s));

  if (hasEndurance && !hasStrength) return { min: PROTEIN_G_PER_KG_BASE.min, max: 2.0 };
  if (hasStrength && !hasEndurance) return { min: 1.8, max: PROTEIN_G_PER_KG_BASE.max };
  return { ...PROTEIN_G_PER_KG_BASE };
}

const FUELING_LEVEL_POSITION: Record<FuelingLevel, number> = {
  recovery:    0,
  maintenance: 1 / 3,
  performance: 2 / 3,
  high_output: 1,
};

/**
 * Grams of protein for today: a g/kg range from training emphasis, scaled
 * by bodyweight, with today's FuelingLevel positioning the target within
 * that range (recovery day -> low end, high_output day -> high end) — this
 * preserves the day-to-day responsiveness the old flat BASE_PROTEIN table
 * had, while grounding the range itself in the user's actual bodyweight.
 * Goal boost matches fuelTargets.ts's existing +10g/kg-equivalent nudge for
 * strength/hypertrophy goals, expressed here as +0.15g/kg to both bounds.
 */
export function proteinGramsFromWeight(
  weightKg: number, trainingStyles: string[], fuelingLevel: FuelingLevel, goalType: GoalType,
): { min: number; max: number; target: number } {
  const range = trainingEmphasisProteinRangeKg(trainingStyles);
  const boost = (goalType === "strength" || goalType === "hypertrophy") ? 0.15 : 0;
  const minKg = range.min + boost;
  const maxKg = range.max + boost;

  const min = Math.round(minKg * weightKg);
  const max = Math.round(maxKg * weightKg);
  const position = FUELING_LEVEL_POSITION[fuelingLevel];
  const target = Math.round(min + (max - min) * position);

  return { min, max, target };
}

// ─── Fat (g/kg bodyweight) ────────────────────────────────────────────────────
//
// Floor rationale: fat below ~0.8g/kg risks under-supplying hormone
// production, satiety, and fat-soluble vitamin (A/D/E/K) absorption.

export const FAT_G_PER_KG = { min: 0.8, max: 1.2 };

const FAT_PRIORITY_POSITION: Record<NutritionPriority, number> = {
  low:      0,
  moderate: 0.5,
  high:     1,
};

export function fatGramsFromWeight(
  weightKg: number, fatPriority: NutritionPriority,
): { min: number; max: number; target: number } {
  const min = Math.round(FAT_G_PER_KG.min * weightKg);
  const max = Math.round(FAT_G_PER_KG.max * weightKg);
  const position = FAT_PRIORITY_POSITION[fatPriority];
  const target = Math.round(min + (max - min) * position);
  return { min, max, target };
}
