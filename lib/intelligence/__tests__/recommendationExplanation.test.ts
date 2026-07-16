// ─── lib/intelligence/__tests__/recommendationExplanation.test.ts ────────────
// UX Stabilization Batch 5b — regression coverage for the calibration-scale
// instability (Finding E1: near-zero rawSum against a normal-sized
// actualDelta previously produced +1200%/-1800%-class displayed impacts).

import { describe, it, expect } from "vitest";
import { generateRecommendationExplanation, type ExplanationInput } from "../recommendationExplanation";

function baseInput(overrides: Partial<ExplanationInput> = {}): ExplanationInput {
  return {
    readinessScore:      70,
    readinessCategory:   "ready",
    recoveryScore:        70,
    cyclePhase:           "Follicular",
    adherenceScale:       1.0,
    uncertaintyModifier:  1.0,
    burnoutRiskScore:     30,
    fatigueScore:         50,
    symptomCount:         0,
    symptomSeverityMean:  0,
    momentumLevel:        "flat",
    finalVolumeScale:     1.0,
    confidenceLevel:      "high",
    todayDate:            "2026-07-16",
    ...overrides,
  };
}

const MAX_IMPACT_PP = 60;

describe("generateRecommendationExplanation — calibration-scale stability (Batch 5b)", () => {
  it("bounds every per-signal impact even when raw signals nearly cancel but the real delta is large", () => {
    // Constructed to reproduce the exact failure mode documented in
    // docs/intelligence/RecommendationExplainability.md §1.2: signals that
    // roughly cancel (rawSum near zero) combined with a real, unremarkable
    // finalVolumeScale delta (-0.30) previously produced a scale factor in
    // the hundreds.
    const explanation = generateRecommendationExplanation(baseInput({
      readinessScore: 70,       // rawReadiness ≈ 0 (at neutral)
      recoveryScore:  70,       // rawRecovery ≈ 0 (at neutral)
      burnoutRiskScore: 30,     // rawBurnout ≈ 0 (at neutral)
      fatigueScore: 50,         // rawFatigue ≈ 0 (at neutral)
      cyclePhase: "Ovulatory",  // small nonzero rawCycle contribution
      finalVolumeScale: 0.70,   // a real, large 30% reduction the tiny raw signals can't explain
    }));

    for (const impact of [
      explanation.readinessImpact,
      explanation.recoveryImpact,
      explanation.cycleImpact,
      explanation.adherenceImpact,
      explanation.uncertaintyImpact,
      explanation.momentumImpact,
      explanation.symptomImpact,
      explanation.burnoutImpact,
    ]) {
      expect(Math.abs(impact)).toBeLessThanOrEqual(MAX_IMPACT_PP);
      expect(Number.isFinite(impact)).toBe(true);
    }
  });

  it("still produces a sensible, non-zero direction for a normal, well-explained case", () => {
    const explanation = generateRecommendationExplanation(baseInput({
      readinessScore: 40,      // clearly low
      finalVolumeScale: 0.85,  // a real reduction readiness alone plausibly explains
    }));

    expect(explanation.readinessImpact).toBeLessThan(0);
    expect(Math.abs(explanation.readinessImpact)).toBeLessThanOrEqual(MAX_IMPACT_PP);
    expect(explanation.explanationSummary.length).toBeGreaterThan(0);
  });

  it("handles a truly zero rawSum (all signals exactly neutral) without NaN or Infinity", () => {
    const explanation = generateRecommendationExplanation(baseInput({
      readinessScore: 70, recoveryScore: 70, burnoutRiskScore: 30, fatigueScore: 50,
      cyclePhase: "unmapped-phase", momentumLevel: "flat",
      finalVolumeScale: 0.75,
    }));

    for (const impact of [
      explanation.readinessImpact, explanation.recoveryImpact, explanation.cycleImpact,
      explanation.adherenceImpact, explanation.uncertaintyImpact, explanation.momentumImpact,
      explanation.symptomImpact, explanation.burnoutImpact,
    ]) {
      expect(Number.isFinite(impact)).toBe(true);
    }
  });
});
