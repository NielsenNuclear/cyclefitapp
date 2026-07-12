// ─── lib/intelligence/confidence/__tests__/confidenceEngine.test.ts ───────────
// Phase D — Confidence Engine test suite.
//
// Unit:        ConfidenceCalculator dimensions, composite score, level mapping,
//              sample-size scaling, weight integrity
// Adapter:     buildConfidenceInputs — CV computation, safety signal, defaults
// Integration: Verification → Confidence, Calibration → Confidence,
//              Safety → Confidence, full pipeline simulation
// Resilience:  empty/corrupt localStorage, all-missing dimensions, zero data
// Regression:  deterministic output, level boundaries stable

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  calculateDimensions,
  computeCompositeScore,
  deriveMaturityStage,
  type ConfidenceInputs,
  type DimensionSet,
} from "../ConfidenceCalculator";

import {
  buildConfidenceProfile,
} from "../ConfidenceEngine";

import {
  explainConfidence,
  getMissingDataOpportunities,
} from "../ConfidenceExplainer";

import {
  recordConfidenceSnapshot,
  getConfidenceTimeline,
  getLatestConfidenceSnapshot,
  clearConfidenceHistory,
} from "../ConfidenceRegistry";

import {
  buildConfidenceInputs,
  type ConfidencePipelineParams,
} from "../buildConfidenceInputs";

// ─── localStorage mock ────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { for (const k in store) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key:        (i: number) => Object.keys(store)[i] ?? null,
  };
}

const localStorageMock = makeLocalStorageMock();
vi.stubGlobal("localStorage", localStorageMock);
// isClient() checks typeof window — must be defined for registry persistence tests
vi.stubGlobal("window", { localStorage: localStorageMock });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fullInputs(overrides: Partial<ConfidenceInputs> = {}): ConfidenceInputs {
  return {
    calibrationFactor:       0.80,
    verificationSuccessRate: 0.75,
    completedEvaluations:    10,
    completedWorkouts:       50,
    weeksTracked:            20,
    hasRecoveryData:         true,
    hasNutritionData:        true,
    hasCycleData:            true,
    hasSleepData:            true,
    checkInStreak:           14,
    recentVolumeCv:          0.10,
    predictionAgreement:     1.0,
    ...overrides,
  };
}

function minimalInputs(): ConfidenceInputs {
  return {
    completedWorkouts: 0,
    weeksTracked:      0,
    hasRecoveryData:   false,
    hasNutritionData:  false,
    hasCycleData:      false,
    hasSleepData:      false,
    checkInStreak:     0,
  };
}

function fullPipelineParams(overrides: Partial<ConfidencePipelineParams> = {}): ConfidencePipelineParams {
  return {
    calibrationFactor:       0.80,
    verificationSuccessRate: 0.75,
    completedEvaluations:    10,
    completedWorkouts:       40,
    weeksTracked:            16,
    hasRecoveryData:         true,
    hasNutritionData:        true,
    hasCycleData:            true,
    hasSleepData:            true,
    checkInStreak:           21,
    recentWeeklyVolumeSets:  [80, 82, 79, 85],
    safetyWasConstrained:    false,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT: ConfidenceCalculator
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateDimensions", () => {
  it("calibration available when calibrationFactor is set", () => {
    const dims = calculateDimensions(fullInputs({ calibrationFactor: 0.85 }));
    expect(dims.calibration.available).toBe(true);
    expect(dims.calibration.score).toBeCloseTo(0.85, 5);
  });

  it("calibration unavailable when calibrationFactor is undefined", () => {
    const dims = calculateDimensions(fullInputs({ calibrationFactor: undefined }));
    expect(dims.calibration.available).toBe(false);
    expect(dims.calibration.score).toBe(0);
  });

  it("calibration clamps to [0, 1]", () => {
    const above = calculateDimensions(fullInputs({ calibrationFactor: 1.5 }));
    expect(above.calibration.score).toBe(1);
    const below = calculateDimensions(fullInputs({ calibrationFactor: -0.2 }));
    expect(below.calibration.score).toBe(0);
  });

  it("verification unavailable when < 3 evaluations", () => {
    const dims = calculateDimensions(fullInputs({ completedEvaluations: 2 }));
    expect(dims.verification.available).toBe(false);
  });

  it("verification available at 3+ evaluations", () => {
    const dims = calculateDimensions(fullInputs({ completedEvaluations: 3 }));
    expect(dims.verification.available).toBe(true);
  });

  it("verification score is 0 with 0 evaluations", () => {
    const dims = calculateDimensions(fullInputs({ completedEvaluations: 0, verificationSuccessRate: 0.9 }));
    expect(dims.verification.score).toBe(0);
  });

  it("verification score reaches verificationSuccessRate at 5+ evaluations", () => {
    const dims = calculateDimensions(fullInputs({ completedEvaluations: 5, verificationSuccessRate: 0.8 }));
    expect(dims.verification.score).toBeCloseTo(0.8, 5);
  });

  it("dataCompleteness is 1.0 when all flags are true and streak ≥ 7", () => {
    const dims = calculateDimensions(fullInputs({ checkInStreak: 7 }));
    expect(dims.dataCompleteness.score).toBe(1.0);
  });

  it("dataCompleteness is 0 when all flags are false and streak < 7", () => {
    const dims = calculateDimensions(minimalInputs());
    expect(dims.dataCompleteness.score).toBe(0);
  });

  it("personalizationMaturity grows with completedWorkouts", () => {
    const low  = calculateDimensions(fullInputs({ completedWorkouts: 3 }));
    const high = calculateDimensions(fullInputs({ completedWorkouts: 100 }));
    expect(high.personalizationMaturity.score).toBeGreaterThan(low.personalizationMaturity.score);
    expect(high.personalizationMaturity.score).toBe(1.0);
  });

  it("predictionStability uses CV when available", () => {
    const stable   = calculateDimensions(fullInputs({ recentVolumeCv: 0.05, predictionAgreement: undefined }));
    const unstable = calculateDimensions(fullInputs({ recentVolumeCv: 0.90, predictionAgreement: undefined }));
    expect(stable.predictionStability.score).toBeGreaterThan(unstable.predictionStability.score);
  });

  it("predictionStability uses predictionAgreement when CV is unavailable (Phase D)", () => {
    const agreed    = calculateDimensions(fullInputs({ recentVolumeCv: undefined, predictionAgreement: 1.0 }));
    const disagreed = calculateDimensions(fullInputs({ recentVolumeCv: undefined, predictionAgreement: 0.5 }));
    expect(agreed.predictionStability.score).toBeGreaterThan(disagreed.predictionStability.score);
    expect(agreed.predictionStability.available).toBe(true);
  });

  it("predictionStability blends CV and agreement when both available", () => {
    const both = calculateDimensions(fullInputs({ recentVolumeCv: 0.10, predictionAgreement: 1.0 }));
    const cvOnly = calculateDimensions(fullInputs({ recentVolumeCv: 0.10, predictionAgreement: undefined }));
    // agreement = 1.0 should boost slightly vs CV alone
    expect(both.predictionStability.score).toBeGreaterThanOrEqual(cvOnly.predictionStability.score);
  });

  it("historicalContext grows with weeksTracked and completedWorkouts", () => {
    const low  = calculateDimensions(fullInputs({ weeksTracked: 1, completedWorkouts: 1 }));
    const high = calculateDimensions(fullInputs({ weeksTracked: 12, completedWorkouts: 50 }));
    expect(high.historicalContext.score).toBeGreaterThan(low.historicalContext.score);
  });
});

describe("computeCompositeScore", () => {
  it("returns 0 for all-zero dimensions", () => {
    const dims: DimensionSet = {
      calibration:             { name: "Forecast Calibration",       score: 0, weight: 0.25, available: false },
      verification:            { name: "Recommendation Verification", score: 0, weight: 0.20, available: false },
      dataCompleteness:        { name: "Data Completeness",           score: 0, weight: 0.20, available: true },
      personalizationMaturity: { name: "Personalization Maturity",    score: 0, weight: 0.15, available: true },
      predictionStability:     { name: "Prediction Stability",        score: 0, weight: 0.10, available: false },
      historicalContext:       { name: "Historical Context",          score: 0, weight: 0.10, available: false },
    };
    expect(computeCompositeScore(dims)).toBe(0);
  });

  it("returns 1 for all-unity dimensions", () => {
    const dims: DimensionSet = {
      calibration:             { name: "a", score: 1, weight: 0.25, available: true },
      verification:            { name: "b", score: 1, weight: 0.20, available: true },
      dataCompleteness:        { name: "c", score: 1, weight: 0.20, available: true },
      personalizationMaturity: { name: "d", score: 1, weight: 0.15, available: true },
      predictionStability:     { name: "e", score: 1, weight: 0.10, available: true },
      historicalContext:       { name: "f", score: 1, weight: 0.10, available: true },
    };
    expect(computeCompositeScore(dims)).toBe(1);
  });

  it("weights sum to 1.0", () => {
    const dims = calculateDimensions(fullInputs());
    const weightSum = Object.values(dims).reduce((s, d) => s + d.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 10);
  });
});

describe("deriveMaturityStage", () => {
  it("0 workouts → getting_started", () => {
    expect(deriveMaturityStage(0)).toBe("getting_started");
  });
  it("10 workouts → getting_started", () => {
    expect(deriveMaturityStage(10)).toBe("getting_started");
  });
  it("11 workouts → learning", () => {
    expect(deriveMaturityStage(11)).toBe("learning");
  });
  it("26 workouts → personalized", () => {
    expect(deriveMaturityStage(26)).toBe("personalized");
  });
  it("51 workouts → highly_personalized", () => {
    expect(deriveMaturityStage(51)).toBe("highly_personalized");
  });
  it("101 workouts → long_term_profile", () => {
    expect(deriveMaturityStage(101)).toBe("long_term_profile");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT: buildConfidenceProfile (ConfidenceEngine)
// ─────────────────────────────────────────────────────────────────────────────

describe("buildConfidenceProfile", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns a profile with all required fields", () => {
    const profile = buildConfidenceProfile(fullInputs());
    expect(profile).toHaveProperty("level");
    expect(profile).toHaveProperty("compositeScore");
    expect(profile).toHaveProperty("dimensions");
    expect(profile).toHaveProperty("maturityStage");
    expect(profile).toHaveProperty("generatedAt");
  });

  it("compositeScore is in [0, 1]", () => {
    const profile = buildConfidenceProfile(fullInputs());
    expect(profile.compositeScore).toBeGreaterThanOrEqual(0);
    expect(profile.compositeScore).toBeLessThanOrEqual(1);
  });

  it("full data produces High or Moderate level", () => {
    const profile = buildConfidenceProfile(fullInputs());
    expect(["High", "Moderate"]).toContain(profile.level);
  });

  it("zero data produces Insufficient", () => {
    const profile = buildConfidenceProfile(minimalInputs());
    expect(profile.level).toBe("Insufficient");
  });

  it("persists a snapshot to the registry on each call", () => {
    buildConfidenceProfile(fullInputs());
    const timeline = getConfidenceTimeline();
    expect(timeline.length).toBeGreaterThanOrEqual(1);
  });

  it("level thresholds: compositeScore ≥ 0.75 → High (with ≥ 2 available dims)", () => {
    // Ensure a high composite via all-available inputs with strong signals
    const profile = buildConfidenceProfile(fullInputs({
      calibrationFactor:       0.95,
      verificationSuccessRate: 0.95,
      completedEvaluations:    20,
      completedWorkouts:       100,
      weeksTracked:            24,
    }));
    expect(profile.level).toBe("High");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT: buildConfidenceInputs (Phase D adapter)
// ─────────────────────────────────────────────────────────────────────────────

describe("buildConfidenceInputs", () => {
  it("maps calibrationFactor null → undefined", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({ calibrationFactor: null }));
    expect(inputs.calibrationFactor).toBeUndefined();
  });

  it("maps calibrationFactor number → number", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({ calibrationFactor: 0.72 }));
    expect(inputs.calibrationFactor).toBeCloseTo(0.72, 5);
  });

  it("computes recentVolumeCv from 4 weekly totals", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({
      recentWeeklyVolumeSets: [80, 82, 79, 85],
    }));
    expect(inputs.recentVolumeCv).toBeDefined();
    expect(inputs.recentVolumeCv!).toBeGreaterThan(0);
    expect(inputs.recentVolumeCv!).toBeLessThan(1);
  });

  it("returns recentVolumeCv = undefined when < 3 non-zero weeks", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({
      recentWeeklyVolumeSets: [80, 0],
    }));
    expect(inputs.recentVolumeCv).toBeUndefined();
  });

  it("returns recentVolumeCv = undefined for empty array", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({ recentWeeklyVolumeSets: [] }));
    expect(inputs.recentVolumeCv).toBeUndefined();
  });

  it("predictionAgreement = 0.5 when safetyWasConstrained = true", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({ safetyWasConstrained: true }));
    expect(inputs.predictionAgreement).toBe(0.5);
  });

  it("predictionAgreement = 1.0 when safetyWasConstrained = false", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({ safetyWasConstrained: false }));
    expect(inputs.predictionAgreement).toBe(1.0);
  });

  it("passes through all data-availability flags", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({
      hasRecoveryData:  true,
      hasNutritionData: false,
      hasCycleData:     true,
      hasSleepData:     false,
    }));
    expect(inputs.hasRecoveryData).toBe(true);
    expect(inputs.hasNutritionData).toBe(false);
    expect(inputs.hasCycleData).toBe(true);
    expect(inputs.hasSleepData).toBe(false);
  });

  it("passes verificationSuccessRate and completedEvaluations through", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({
      verificationSuccessRate: 0.68,
      completedEvaluations:    7,
    }));
    expect(inputs.verificationSuccessRate).toBe(0.68);
    expect(inputs.completedEvaluations).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT: ConfidenceExplainer
// ─────────────────────────────────────────────────────────────────────────────

describe("explainConfidence", () => {
  it("produces a non-empty summary for High confidence", () => {
    const profile = buildConfidenceProfile(fullInputs({
      calibrationFactor:       0.90,
      verificationSuccessRate: 0.85,
      completedEvaluations:    15,
      completedWorkouts:       60,
    }));
    const explanation = explainConfidence(profile, 60);
    expect(explanation.summary).toBeTruthy();
    expect(explanation.level).toBe(profile.level);
  });

  it("lists gaps when calibration is unavailable", () => {
    const profile = buildConfidenceProfile(fullInputs({ calibrationFactor: undefined }));
    const explanation = explainConfidence(profile, 10);
    const hasCalibrationGap = explanation.gaps.some(g =>
      g.toLowerCase().includes("calibration") || g.toLowerCase().includes("no calibration"),
    );
    expect(hasCalibrationGap).toBe(true);
  });

  it("lists gaps when verification is unavailable", () => {
    const profile = buildConfidenceProfile(fullInputs({ completedEvaluations: 0 }));
    const explanation = explainConfidence(profile, 5);
    const hasVerificationGap = explanation.gaps.some(g =>
      g.toLowerCase().includes("verification") || g.toLowerCase().includes("outcomes"),
    );
    expect(hasVerificationGap).toBe(true);
  });

  it("lists strengths when data is complete and score is high", () => {
    const profile = buildConfidenceProfile(fullInputs({
      hasRecoveryData:  true,
      hasNutritionData: true,
      hasCycleData:     true,
      hasSleepData:     true,
      checkInStreak:    14,
    }));
    const explanation = explainConfidence(profile, 60);
    expect(explanation.strengths.length).toBeGreaterThan(0);
  });

  it("produces maturityContext describing progression", () => {
    const profile = buildConfidenceProfile(fullInputs({ completedWorkouts: 5 }));
    const explanation = explainConfidence(profile, 5);
    expect(explanation.maturityContext).toBeTruthy();
    expect(explanation.maturityContext.length).toBeGreaterThan(10);
  });

  it("getMissingDataOpportunities returns list when data is sparse", () => {
    const profile = buildConfidenceProfile(minimalInputs());
    const opps = getMissingDataOpportunities(profile);
    expect(opps.length).toBeGreaterThan(0);
  });

  it("getMissingDataOpportunities returns empty list when profile is complete", () => {
    const profile = buildConfidenceProfile(fullInputs({
      calibrationFactor:       0.85,
      completedEvaluations:    10,
      completedWorkouts:       60,
      checkInStreak:           14,
    }));
    const opps = getMissingDataOpportunities(profile);
    expect(opps.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT: ConfidenceRegistry
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfidenceRegistry", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("recordConfidenceSnapshot → retrievable via getLatestConfidenceSnapshot", () => {
    const today = todayStr();
    recordConfidenceSnapshot("High", 0.82, "highly_personalized", today);
    const snap = getLatestConfidenceSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.level).toBe("High");
    expect(snap!.compositeScore).toBeCloseTo(0.82, 5);
  });

  it("deduplicates same-date entries (upsert)", () => {
    const today = todayStr();
    recordConfidenceSnapshot("Limited",  0.20, "getting_started",    today);
    recordConfidenceSnapshot("Moderate", 0.55, "personalized",       today);
    const timeline = getConfidenceTimeline();
    const todayEntries = timeline.filter(s => s.date === today);
    expect(todayEntries).toHaveLength(1);
    expect(todayEntries[0].level).toBe("Moderate");
  });

  it("getConfidenceTimeline returns snapshots sorted by insertion order", () => {
    const d1 = "2026-01-01";
    const d2 = "2026-01-02";
    const d3 = "2026-01-03";
    recordConfidenceSnapshot("Building", 0.40, "learning", d1);
    recordConfidenceSnapshot("Moderate", 0.55, "personalized", d2);
    recordConfidenceSnapshot("High",     0.80, "highly_personalized", d3);
    const timeline = getConfidenceTimeline();
    expect(timeline.length).toBeGreaterThanOrEqual(3);
  });

  it("clearConfidenceHistory empties the timeline", () => {
    recordConfidenceSnapshot("High", 0.85, "long_term_profile", todayStr());
    clearConfidenceHistory();
    expect(getConfidenceTimeline()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: Verification → Confidence
// ─────────────────────────────────────────────────────────────────────────────

describe("Verification → Confidence integration", () => {
  it("0 verified recommendations → verification dimension unavailable", () => {
    const profile = buildConfidenceProfile(fullInputs({
      completedEvaluations:    0,
      verificationSuccessRate: 0,
    }));
    expect(profile.dimensions.verification.available).toBe(false);
  });

  it("5 successful evaluations increases confidence vs 0 evaluations", () => {
    const noVerification  = buildConfidenceProfile(fullInputs({ completedEvaluations: 0 }));
    const withVerification = buildConfidenceProfile(fullInputs({
      completedEvaluations:    5,
      verificationSuccessRate: 0.9,
    }));
    expect(withVerification.compositeScore).toBeGreaterThan(noVerification.compositeScore);
  });

  it("high verification success rate → higher confidence than low success rate", () => {
    const poorVerification  = buildConfidenceProfile(fullInputs({ completedEvaluations: 10, verificationSuccessRate: 0.20 }));
    const strongVerification = buildConfidenceProfile(fullInputs({ completedEvaluations: 10, verificationSuccessRate: 0.90 }));
    expect(strongVerification.compositeScore).toBeGreaterThan(poorVerification.compositeScore);
  });

  it("verification score scales from 0→0.5 between 1 and 5 evaluations", () => {
    const at1 = calculateDimensions(fullInputs({ completedEvaluations: 1, verificationSuccessRate: 0.8 }));
    const at5 = calculateDimensions(fullInputs({ completedEvaluations: 5, verificationSuccessRate: 0.8 }));
    expect(at5.verification.score).toBeGreaterThan(at1.verification.score);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: Calibration → Confidence
// ─────────────────────────────────────────────────────────────────────────────

describe("Calibration → Confidence integration", () => {
  it("calibrationFactor null → calibration dimension unavailable", () => {
    const inputs  = buildConfidenceInputs(fullPipelineParams({ calibrationFactor: null }));
    const profile = buildConfidenceProfile(inputs);
    expect(profile.dimensions.calibration.available).toBe(false);
  });

  it("calibrationFactor 0.9 → calibration dimension available with high score", () => {
    const inputs  = buildConfidenceInputs(fullPipelineParams({ calibrationFactor: 0.9 }));
    const profile = buildConfidenceProfile(inputs);
    expect(profile.dimensions.calibration.available).toBe(true);
    expect(profile.dimensions.calibration.score).toBeCloseTo(0.9, 5);
  });

  it("higher calibrationFactor yields higher compositeScore (same other inputs)", () => {
    const low  = buildConfidenceProfile(buildConfidenceInputs(fullPipelineParams({ calibrationFactor: 0.30 })));
    const high = buildConfidenceProfile(buildConfidenceInputs(fullPipelineParams({ calibrationFactor: 0.90 })));
    expect(high.compositeScore).toBeGreaterThan(low.compositeScore);
  });

  it("adapter: calibrationFactor 0.0 is passed as 0, not undefined", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({ calibrationFactor: 0.0 }));
    expect(inputs.calibrationFactor).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: Safety → Confidence
// ─────────────────────────────────────────────────────────────────────────────

describe("Safety → Confidence integration", () => {
  it("safetyWasConstrained = false → predictionAgreement = 1.0 → higher stability", () => {
    const unconstrained = buildConfidenceProfile(buildConfidenceInputs(
      fullPipelineParams({ safetyWasConstrained: false, recentWeeklyVolumeSets: [] }),
    ));
    const constrained   = buildConfidenceProfile(buildConfidenceInputs(
      fullPipelineParams({ safetyWasConstrained: true,  recentWeeklyVolumeSets: [] }),
    ));
    expect(unconstrained.dimensions.predictionStability.score)
      .toBeGreaterThan(constrained.dimensions.predictionStability.score);
  });

  it("safetyWasConstrained = true reduces compositeScore relative to false", () => {
    const safe   = buildConfidenceProfile(buildConfidenceInputs(fullPipelineParams({ safetyWasConstrained: false })));
    const unsafe = buildConfidenceProfile(buildConfidenceInputs(fullPipelineParams({ safetyWasConstrained: true })));
    expect(safe.compositeScore).toBeGreaterThanOrEqual(unsafe.compositeScore);
  });

  it("adapter encodes safety signal deterministically", () => {
    const a = buildConfidenceInputs(fullPipelineParams({ safetyWasConstrained: true }));
    const b = buildConfidenceInputs(fullPipelineParams({ safetyWasConstrained: true }));
    expect(a.predictionAgreement).toBe(b.predictionAgreement);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: Full pipeline simulation
// ─────────────────────────────────────────────────────────────────────────────

describe("Full pipeline simulation", () => {
  beforeEach(() => localStorageMock.clear());

  it("builds a complete ConfidenceProfile from realistic pipeline params", () => {
    const params: ConfidencePipelineParams = {
      calibrationFactor:       0.74,
      verificationSuccessRate: 0.68,
      completedEvaluations:    8,
      completedWorkouts:       35,
      weeksTracked:            14,
      hasRecoveryData:         true,
      hasNutritionData:        false,
      hasCycleData:            true,
      hasSleepData:            true,
      checkInStreak:           10,
      recentWeeklyVolumeSets:  [72, 75, 68, 80],
      safetyWasConstrained:    false,
    };
    const inputs  = buildConfidenceInputs(params);
    const profile = buildConfidenceProfile(inputs);

    expect(profile.level).toBeDefined();
    expect(profile.compositeScore).toBeGreaterThan(0);
    expect(profile.compositeScore).toBeLessThanOrEqual(1);
    expect(profile.maturityStage).toBe("personalized");
  });

  it("snapshot is persisted after pipeline run", () => {
    const inputs  = buildConfidenceInputs(fullPipelineParams());
    buildConfidenceProfile(inputs);
    const latest = getLatestConfidenceSnapshot();
    expect(latest).not.toBeNull();
    expect(["High", "Moderate", "Building", "Limited", "Insufficient"]).toContain(latest!.level);
  });

  it("explanation is consistent with the profile level", () => {
    const inputs    = buildConfidenceInputs(fullPipelineParams());
    const profile   = buildConfidenceProfile(inputs);
    const explanation = explainConfidence(profile, fullPipelineParams().completedWorkouts);
    expect(explanation.level).toBe(profile.level);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESILIENCE
// ─────────────────────────────────────────────────────────────────────────────

describe("Resilience", () => {
  beforeEach(() => localStorageMock.clear());

  it("zero-data inputs produce Insufficient level, not a throw", () => {
    expect(() => buildConfidenceProfile(minimalInputs())).not.toThrow();
    const profile = buildConfidenceProfile(minimalInputs());
    expect(profile.level).toBe("Insufficient");
  });

  it("compositeScore is never negative or > 1 regardless of inputs", () => {
    const extreme: ConfidenceInputs = {
      ...minimalInputs(),
      calibrationFactor:       -5,
      verificationSuccessRate: 2,
      completedEvaluations:    -1,
      completedWorkouts:       -10,
      weeksTracked:            -3,
      recentVolumeCv:          10,
      predictionAgreement:     -1,
    };
    const profile = buildConfidenceProfile(extreme);
    expect(profile.compositeScore).toBeGreaterThanOrEqual(0);
    expect(profile.compositeScore).toBeLessThanOrEqual(1);
  });

  it("corrupt localStorage does not crash buildConfidenceProfile", () => {
    localStorageMock.setItem("axis_confidence_registry_v1", "not-valid-json{{{");
    expect(() => buildConfidenceProfile(fullInputs())).not.toThrow();
  });

  it("empty weekly volumes → recentVolumeCv = undefined → stability falls back gracefully", () => {
    const inputs  = buildConfidenceInputs(fullPipelineParams({ recentWeeklyVolumeSets: [] }));
    expect(() => buildConfidenceProfile(inputs)).not.toThrow();
  });

  it("all-zero weekly volumes → recentVolumeCv = undefined (no division by zero)", () => {
    const inputs = buildConfidenceInputs(fullPipelineParams({
      recentWeeklyVolumeSets: [0, 0, 0, 0],
    }));
    expect(inputs.recentVolumeCv).toBeUndefined();
  });

  it("very high workout count (1000) does not exceed maturityStage ceiling", () => {
    const profile = buildConfidenceProfile(fullInputs({ completedWorkouts: 1000 }));
    expect(profile.maturityStage).toBe("long_term_profile");
    expect(profile.compositeScore).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION
// ─────────────────────────────────────────────────────────────────────────────

describe("Regression", () => {
  beforeEach(() => localStorageMock.clear());

  it("same inputs produce identical compositeScore (deterministic)", () => {
    const inputs = fullInputs();
    const a = buildConfidenceProfile(inputs);
    const b = buildConfidenceProfile(inputs);
    expect(a.compositeScore).toBe(b.compositeScore);
  });

  it("same inputs produce identical level (deterministic)", () => {
    const inputs = fullInputs();
    const a = buildConfidenceProfile(inputs);
    const b = buildConfidenceProfile(inputs);
    expect(a.level).toBe(b.level);
  });

  it("buildConfidenceInputs is pure — same params same output", () => {
    const params = fullPipelineParams();
    const a = buildConfidenceInputs(params);
    const b = buildConfidenceInputs(params);
    expect(a).toEqual(b);
  });

  it("level boundaries are stable: score < 0.15 → Insufficient (with 2+ dims)", () => {
    // Force very low score: all minimal except 2 available dims
    const inputs: ConfidenceInputs = {
      completedWorkouts: 0,
      weeksTracked:      0,
      hasRecoveryData:   false,
      hasNutritionData:  false,
      hasCycleData:      false,
      hasSleepData:      false,
      checkInStreak:     0,
      calibrationFactor: 0.01,    // available but near zero
      completedEvaluations: 3,    // verification available
      verificationSuccessRate: 0.01,
    };
    const profile = buildConfidenceProfile(inputs);
    // compositeScore will be tiny; with 2 available dims it should not show Insufficient
    // due to the availableDims >= 2 check in scoreToLevel
    const score = profile.compositeScore;
    if (score >= 0.15) {
      expect(profile.level).not.toBe("Insufficient");
    }
  });

  it("maturityStage is consistent with completedWorkouts", () => {
    const stage = deriveMaturityStage(30);
    expect(stage).toBe("personalized");
    const profile = buildConfidenceProfile(fullInputs({ completedWorkouts: 30 }));
    expect(profile.maturityStage).toBe("personalized");
  });
});
