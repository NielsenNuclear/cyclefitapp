// ─── lib/nutrition/__tests__/nutritionTargets.test.ts ──────────────────────────
// Nutrition Intelligence 2.0. Confirms the personalized-path calorie/macro
// math, the fat-floor clamp, isPersonalized correctness, and that
// applyNutritionPeriodization still produces a well-formed NutritionTargets
// from the new personalized output (periodization-compatibility check).

import { describe, it, expect } from "vitest";
import { computeNutritionTargets } from "../nutritionTargets";
import { applyNutritionPeriodization } from "../nutritionPeriodization";
import { computeBMR, computeTDEE, applyGoalAdjustment } from "../tdee";
import type { PhaseData } from "@/types/recommendation";
import type { BodyMetrics } from "../tdee";

function phase(name: PhaseData["name"], overrides: Partial<PhaseData> = {}): PhaseData {
  return {
    name, cycleDay: 3, cycleLength: 28, dayInPhase: 1,
    energyTrend: "Rising", hormonalContext: "", physiologicalNote: "",
    daysUntilNextPhase: 5, hasCycleData: true,
    ...overrides,
  };
}

const bodyMetrics: BodyMetrics = { age: 29, heightCm: 170, weightKg: 68, sex: "female", activityLevel: "moderate" };

describe("computeNutritionTargets — legacy fallback (no bodyMetrics)", () => {
  it("isPersonalized is false", () => {
    const result = computeNutritionTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness");
    expect(result.isPersonalized).toBe(false);
  });

  it("calories match the flat BASE_CALORIES + GOAL_CALORIE_OFFSET table", () => {
    // Follicular, score 65, no workout -> "maintenance" fueling level (per deriveFuelingLevel)
    const result = computeNutritionTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness");
    expect(result.calories).toBe(2100); // BASE_CALORIES.maintenance + 0 offset
  });
});

describe("computeNutritionTargets — personalized path", () => {
  it("isPersonalized is true", () => {
    const result = computeNutritionTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, []);
    expect(result.isPersonalized).toBe(true);
  });

  it("calories match a real BMR -> TDEE -> goal-adjustment calculation, not the flat table", () => {
    const result = computeNutritionTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, []);
    const expectedCalories = applyGoalAdjustment(
      computeTDEE(computeBMR(bodyMetrics.weightKg, bodyMetrics.heightCm, bodyMetrics.age, bodyMetrics.sex), bodyMetrics.activityLevel),
      "general_fitness",
    );
    expect(result.calories).toBe(expectedCalories);
    expect(result.calories).not.toBe(2100); // must not accidentally match the legacy flat value
  });

  it("protein/carbs/fats are all positive and calorie-consistent (within rounding)", () => {
    const result = computeNutritionTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, []);
    expect(result.protein).toBeGreaterThan(0);
    expect(result.carbs).toBeGreaterThan(0);
    expect(result.fats).toBeGreaterThan(0);
    const reconstructed = result.protein * 4 + result.carbs * 4 + result.fats * 9;
    expect(Math.abs(reconstructed - result.calories)).toBeLessThan(50); // rounding slack
  });

  it("fat floor clamp: a low-weight user with high carb priority still gets at least 0.8g/kg fat", () => {
    const lightMetrics: BodyMetrics = { age: 25, heightCm: 155, weightKg: 45, sex: "female", activityLevel: "sedentary" };
    // Ovulatory -> high carbPriority, pushing the naive remainder-fat calc down
    const result = computeNutritionTargets(phase("Ovulatory"), { score: 80 } as never, null, null, [], "fat_loss", lightMetrics, []);
    const floorGrams = Math.round(0.8 * lightMetrics.weightKg);
    expect(result.fats).toBeGreaterThanOrEqual(floorGrams);
  });

  it("fat floor clamp never drives carbs below the 50g safety minimum", () => {
    const lightMetrics: BodyMetrics = { age: 25, heightCm: 150, weightKg: 40, sex: "female", activityLevel: "sedentary" };
    const result = computeNutritionTargets(phase("Ovulatory"), { score: 80 } as never, null, null, [], "fat_loss", lightMetrics, []);
    expect(result.carbs).toBeGreaterThanOrEqual(50);
  });
});

describe("periodization compatibility — personalized output still works downstream", () => {
  it("applyNutritionPeriodization produces a well-formed NutritionTargets from a personalized base", () => {
    const base = computeNutritionTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, []);
    const { targets } = applyNutritionPeriodization(base, "accumulation");
    expect(targets.isPersonalized).toBe(true); // spread from base, untouched by periodization
    expect(targets.calories).toBeGreaterThan(0);
    expect(targets.protein).toBeGreaterThan(0);
    expect(Number.isFinite(targets.carbs)).toBe(true);
    expect(Number.isFinite(targets.fats)).toBe(true);
  });
});
