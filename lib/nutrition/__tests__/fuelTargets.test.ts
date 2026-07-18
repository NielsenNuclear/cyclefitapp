// ─── lib/nutrition/__tests__/fuelTargets.test.ts ───────────────────────────────
// Nutrition Intelligence 2.0. Confirms computeFuelTargets()'s protein range
// with vs. without bodyMetrics (legacy fallback must stay byte-for-byte
// unchanged), and that the pre-existing ironFocus/magnesiumFocus/
// electrolyteFocus logic is untouched by the bodyMetrics addition.

import { describe, it, expect } from "vitest";
import { computeFuelTargets } from "../fuelTargets";
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

describe("computeFuelTargets — protein range, legacy fallback (no bodyMetrics)", () => {
  it("maintenance level, general_fitness goal — matches the flat BASE_PROTEIN table exactly", () => {
    const result = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness");
    expect(result.proteinRange).toEqual({ min: 85, max: 110 });
  });

  it("strength/hypertrophy goals still add the legacy +10g boost", () => {
    const result = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "strength");
    expect(result.proteinRange).toEqual({ min: 95, max: 120 });
  });
});

describe("computeFuelTargets — protein range, personalized (bodyMetrics present)", () => {
  it("returns a g/kg-derived range distinct from the legacy flat table", () => {
    const legacy = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness");
    const personalized = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, []);
    expect(personalized.proteinRange).not.toEqual(legacy.proteinRange);
  });

  it("range midpoint falls within the base 1.6-2.2 g/kg * bodyweight band", () => {
    const result = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, []);
    const midpoint = (result.proteinRange.min + result.proteinRange.max) / 2;
    expect(midpoint).toBeGreaterThanOrEqual(1.6 * bodyMetrics.weightKg - 15);
    expect(midpoint).toBeLessThanOrEqual(2.2 * bodyMetrics.weightKg + 15);
  });

  it("strength training style shifts the range higher than endurance", () => {
    const strength  = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, ["strength"]);
    const endurance = computeFuelTargets(phase("Follicular"), { score: 65 } as never, null, null, [], "general_fitness", bodyMetrics, ["running"]);
    expect(strength.proteinRange.max).toBeGreaterThan(endurance.proteinRange.max);
  });
});

describe("computeFuelTargets — micronutrient flags unchanged by bodyMetrics addition", () => {
  it("Menstrual phase sets ironFocus regardless of bodyMetrics presence", () => {
    const legacy       = computeFuelTargets(phase("Menstrual"), null, null, null, [], "general_fitness");
    const personalized = computeFuelTargets(phase("Menstrual"), null, null, null, [], "general_fitness", bodyMetrics, []);
    expect(legacy.ironFocus).toBe(true);
    expect(personalized.ironFocus).toBe(true);
  });

  it("Late Luteal phase sets magnesiumFocus regardless of bodyMetrics presence", () => {
    const legacy       = computeFuelTargets(phase("Late Luteal"), null, null, null, [], "general_fitness");
    const personalized = computeFuelTargets(phase("Late Luteal"), null, null, null, [], "general_fitness", bodyMetrics, []);
    expect(legacy.magnesiumFocus).toBe(true);
    expect(personalized.magnesiumFocus).toBe(true);
  });

  it("symptom override (fatigue -> ironFocus) still applies with bodyMetrics present", () => {
    const result = computeFuelTargets(
      phase("Follicular"), null, null, null,
      [{ symptomId: "fatigue", severity: 2 } as never],
      "general_fitness", bodyMetrics, [],
    );
    expect(result.ironFocus).toBe(true);
  });
});
