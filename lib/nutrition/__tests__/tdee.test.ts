// ─── lib/nutrition/__tests__/tdee.test.ts ──────────────────────────────────────
// Nutrition Intelligence 2.0. Verifies the BMR/TDEE/goal-adjustment/g-per-kg
// math against known Mifflin-St Jeor reference values, and the hasBodyMetrics
// type guard's true/false/partial cases.

import { describe, it, expect } from "vitest";
import {
  computeBMR, computeTDEE, applyGoalAdjustment, hasBodyMetrics,
  trainingEmphasisProteinRangeKg, proteinGramsFromWeight, fatGramsFromWeight,
  ACTIVITY_MULTIPLIERS, GOAL_TDEE_OFFSET_PCT, PROTEIN_G_PER_KG_BASE, FAT_G_PER_KG,
} from "../tdee";
import { EMPTY_ONBOARDING, type OnboardingData } from "@/lib/onboarding-types";

describe("computeBMR — Mifflin-St Jeor reference values", () => {
  it("female, 29y/170cm/68kg — known reference calculation", () => {
    // 10*68 + 6.25*170 - 5*29 - 161 = 680 + 1062.5 - 145 - 161 = 1436.5
    expect(computeBMR(68, 170, 29, "female")).toBeCloseTo(1436.5, 1);
  });

  it("male, same body stats — differs by the +5/-161 constant delta (166)", () => {
    const female = computeBMR(68, 170, 29, "female");
    const male   = computeBMR(68, 170, 29, "male");
    expect(male - female).toBeCloseTo(166, 5);
  });

  it("sex unset defaults to the female constant", () => {
    expect(computeBMR(68, 170, 29)).toBeCloseTo(computeBMR(68, 170, 29, "female"), 5);
  });

  it('"prefer_not_to_say" defaults to the female constant', () => {
    expect(computeBMR(68, 170, 29, "prefer_not_to_say")).toBeCloseTo(computeBMR(68, 170, 29, "female"), 5);
  });
});

describe("computeTDEE", () => {
  const bmr = 1436.5;

  it("applies the correct multiplier per activity level", () => {
    expect(computeTDEE(bmr, "sedentary")).toBeCloseTo(bmr * 1.2, 5);
    expect(computeTDEE(bmr, "light")).toBeCloseTo(bmr * 1.375, 5);
    expect(computeTDEE(bmr, "moderate")).toBeCloseTo(bmr * 1.55, 5);
    expect(computeTDEE(bmr, "active")).toBeCloseTo(bmr * 1.725, 5);
    expect(computeTDEE(bmr, "very_active")).toBeCloseTo(bmr * 1.9, 5);
  });

  it("unknown activity level falls back to the moderate multiplier", () => {
    expect(computeTDEE(bmr, "not_a_real_level")).toBeCloseTo(bmr * ACTIVITY_MULTIPLIERS.moderate, 5);
  });
});

describe("applyGoalAdjustment", () => {
  const tdee = 2200;

  it("applies the correct percentage per goal", () => {
    expect(applyGoalAdjustment(tdee, "fat_loss")).toBe(Math.round(tdee * 0.90));
    expect(applyGoalAdjustment(tdee, "general_fitness")).toBe(tdee);
    expect(applyGoalAdjustment(tdee, "hypertrophy")).toBe(Math.round(tdee * 1.12));
    expect(applyGoalAdjustment(tdee, "strength")).toBe(Math.round(tdee * 1.05));
    expect(applyGoalAdjustment(tdee, "athletic_performance")).toBe(Math.round(tdee * 1.07));
  });

  it("floors at 1200 kcal for a very low TDEE with a fat_loss deficit", () => {
    expect(applyGoalAdjustment(1250, "fat_loss")).toBe(1200);
  });

  it("every GOAL_TDEE_OFFSET_PCT entry stays within a sane +/-20% band", () => {
    for (const pct of Object.values(GOAL_TDEE_OFFSET_PCT)) {
      expect(Math.abs(pct)).toBeLessThanOrEqual(0.2);
    }
  });
});

describe("hasBodyMetrics", () => {
  it("false for EMPTY_ONBOARDING (no body metrics ever set)", () => {
    expect(hasBodyMetrics(EMPTY_ONBOARDING)).toBe(false);
  });

  it("true when age/heightCm/weightKg/activityLevel are all present", () => {
    const data: OnboardingData = { ...EMPTY_ONBOARDING, age: 29, heightCm: 170, weightKg: 68, activityLevel: "moderate" };
    expect(hasBodyMetrics(data)).toBe(true);
  });

  it("true even when optional sex/dietaryPreference are absent", () => {
    const data: OnboardingData = { ...EMPTY_ONBOARDING, age: 29, heightCm: 170, weightKg: 68, activityLevel: "moderate" };
    expect(data.sex).toBeUndefined();
    expect(hasBodyMetrics(data)).toBe(true);
  });

  it("false when only some required fields are present (partial data)", () => {
    const data: OnboardingData = { ...EMPTY_ONBOARDING, age: 29, heightCm: 170 };
    expect(hasBodyMetrics(data)).toBe(false);
  });

  it("false when activityLevel is an empty string", () => {
    const data: OnboardingData = { ...EMPTY_ONBOARDING, age: 29, heightCm: 170, weightKg: 68, activityLevel: "" };
    expect(hasBodyMetrics(data)).toBe(false);
  });
});

describe("trainingEmphasisProteinRangeKg", () => {
  it("endurance-only styles narrow toward the low end", () => {
    const range = trainingEmphasisProteinRangeKg(["running", "cycling"]);
    expect(range).toEqual({ min: PROTEIN_G_PER_KG_BASE.min, max: 2.0 });
  });

  it("strength-only styles narrow toward the high end", () => {
    const range = trainingEmphasisProteinRangeKg(["strength"]);
    expect(range).toEqual({ min: 1.8, max: PROTEIN_G_PER_KG_BASE.max });
  });

  it("mixed endurance + strength styles get the full base range", () => {
    const range = trainingEmphasisProteinRangeKg(["running", "strength"]);
    expect(range).toEqual(PROTEIN_G_PER_KG_BASE);
  });

  it("unrecognized/neutral styles get the full base range", () => {
    const range = trainingEmphasisProteinRangeKg(["yoga", "pilates"]);
    expect(range).toEqual(PROTEIN_G_PER_KG_BASE);
  });

  it("empty styles array gets the full base range", () => {
    expect(trainingEmphasisProteinRangeKg([])).toEqual(PROTEIN_G_PER_KG_BASE);
  });
});

describe("proteinGramsFromWeight", () => {
  const weightKg = 68;

  it("recovery day lands at the low end of the range", () => {
    const { min, max, target } = proteinGramsFromWeight(weightKg, [], "recovery", "general_fitness");
    expect(target).toBe(min);
    expect(min).toBeLessThan(max);
  });

  it("high_output day lands at the high end of the range", () => {
    const { max, target } = proteinGramsFromWeight(weightKg, [], "high_output", "general_fitness");
    expect(target).toBe(max);
  });

  it("maintenance day lands strictly between min and max", () => {
    const { min, max, target } = proteinGramsFromWeight(weightKg, [], "maintenance", "general_fitness");
    expect(target).toBeGreaterThan(min);
    expect(target).toBeLessThan(max);
  });

  it("strength/hypertrophy goals boost both bounds relative to general_fitness", () => {
    const base   = proteinGramsFromWeight(weightKg, ["strength"], "maintenance", "general_fitness");
    const boosted = proteinGramsFromWeight(weightKg, ["strength"], "maintenance", "strength");
    expect(boosted.min).toBeGreaterThan(base.min);
    expect(boosted.max).toBeGreaterThan(base.max);
  });
});

describe("fatGramsFromWeight", () => {
  const weightKg = 68;

  it("low fat priority lands at the 0.8g/kg floor", () => {
    const { min, target } = fatGramsFromWeight(weightKg, "low");
    expect(target).toBe(min);
    expect(min).toBe(Math.round(FAT_G_PER_KG.min * weightKg));
  });

  it("high fat priority lands at the 1.2g/kg ceiling", () => {
    const { max, target } = fatGramsFromWeight(weightKg, "high");
    expect(target).toBe(max);
    expect(max).toBe(Math.round(FAT_G_PER_KG.max * weightKg));
  });

  it("moderate fat priority lands between min and max", () => {
    const { min, max, target } = fatGramsFromWeight(weightKg, "moderate");
    expect(target).toBeGreaterThan(min);
    expect(target).toBeLessThan(max);
  });
});
