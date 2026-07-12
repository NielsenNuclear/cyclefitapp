// ─── lib/intelligence/confidence/ConfidenceCalculator.ts ─────────────────────
// Phase 67 — derives individual confidence dimensions from available signals.

import type { ConfidenceDimension, MaturityStage } from "./ConfidenceTypes";

export interface ConfidenceInputs {
  // From Phase 57 calibration
  calibrationFactor?:       number;    // 0–1

  // From Phase 64 verification
  verificationSuccessRate?: number;    // 0–1
  completedEvaluations?:    number;

  // Training history
  completedWorkouts:        number;
  weeksTracked:             number;

  // Data completeness
  hasRecoveryData:          boolean;
  hasNutritionData:         boolean;
  hasCycleData:             boolean;
  hasSleepData:             boolean;
  checkInStreak:            number;    // consecutive daily check-ins

  // Prediction stability
  recentVolumeCv?:          number;    // coefficient of variation — lower = more stable
  predictionAgreement?:     number;    // 0–1
}

// Weights must sum to 1.0
const WEIGHTS = {
  calibration:             0.25,
  verification:            0.20,
  dataCompleteness:        0.20,
  personalizationMaturity: 0.15,
  predictionStability:     0.10,
  historicalContext:       0.10,
} as const;

function maturityScore(n: number): number {
  if (n >= 100) return 1.00;
  if (n >= 50)  return 0.80;
  if (n >= 25)  return 0.60;
  if (n >= 10)  return 0.40;
  if (n >= 3)   return 0.20;
  return 0.05;
}

export function deriveMaturityStage(completedWorkouts: number): MaturityStage {
  if (completedWorkouts >= 101) return "long_term_profile";
  if (completedWorkouts >= 51)  return "highly_personalized";
  if (completedWorkouts >= 26)  return "personalized";
  if (completedWorkouts >= 11)  return "learning";
  return "getting_started";
}

export interface DimensionSet {
  calibration:             ConfidenceDimension;
  verification:            ConfidenceDimension;
  dataCompleteness:        ConfidenceDimension;
  personalizationMaturity: ConfidenceDimension;
  predictionStability:     ConfidenceDimension;
  historicalContext:       ConfidenceDimension;
}

export function calculateDimensions(inputs: ConfidenceInputs): DimensionSet {
  // Calibration (Phase 57)
  const calScore = inputs.calibrationFactor ?? null;
  const calibration: ConfidenceDimension = {
    name:      "Forecast Calibration",
    score:     calScore !== null ? Math.max(0, Math.min(1, calScore)) : 0,
    weight:    WEIGHTS.calibration,
    available: calScore !== null,
    notes:     calScore === null ? "No calibration data yet" : undefined,
  };

  // Verification (Phase 64)
  const evals = inputs.completedEvaluations ?? 0;
  const verificationScore =
    evals >= 5 ? (inputs.verificationSuccessRate ?? 0.5)
    : evals >= 1 ? (evals / 5) * 0.5
    : 0;
  const verification: ConfidenceDimension = {
    name:      "Recommendation Verification",
    score:     verificationScore,
    weight:    WEIGHTS.verification,
    available: evals >= 3,
    notes:     evals < 3 ? "Need 3+ evaluated recommendations" : undefined,
  };

  // Data completeness
  const flags = [
    inputs.hasRecoveryData,
    inputs.hasNutritionData,
    inputs.hasCycleData,
    inputs.hasSleepData,
    inputs.checkInStreak >= 7,
  ];
  const dataCompleteness: ConfidenceDimension = {
    name:      "Data Completeness",
    score:     flags.filter(Boolean).length / flags.length,
    weight:    WEIGHTS.dataCompleteness,
    available: true,
  };

  // Personalization maturity
  const personalizationMaturity: ConfidenceDimension = {
    name:      "Personalization Maturity",
    score:     maturityScore(inputs.completedWorkouts),
    weight:    WEIGHTS.personalizationMaturity,
    available: true,
  };

  // Prediction stability — blends volume consistency (CV) with
  // adaptive/safety agreement (predictionAgreement, Phase D).
  const cv        = inputs.recentVolumeCv;
  const agreement = inputs.predictionAgreement;   // 0–1 (1 = engines agreed)
  const cvScore   = cv !== undefined ? Math.max(0, 1 - cv) : null;
  const stabilityScore =
    cvScore !== null && agreement !== undefined
      ? cvScore * 0.75 + agreement * 0.25
      : cvScore !== null
        ? cvScore
        : agreement !== undefined
          ? agreement * 0.5 + 0.25  // agreement alone → conservative mid-range
          : 0.5;
  const stabilityAvailable = cv !== undefined || agreement !== undefined;
  const predictionStability: ConfidenceDimension = {
    name:      "Prediction Stability",
    score:     Math.max(0, Math.min(1, stabilityScore)),
    weight:    WEIGHTS.predictionStability,
    available: stabilityAvailable,
    notes:     !stabilityAvailable ? "Not enough history to measure stability" : undefined,
  };

  // Historical context
  const histScore = Math.min(
    1,
    (inputs.weeksTracked / 12) * 0.6 + (inputs.completedWorkouts / 50) * 0.4,
  );
  const historicalContext: ConfidenceDimension = {
    name:      "Historical Context",
    score:     histScore,
    weight:    WEIGHTS.historicalContext,
    available: inputs.weeksTracked > 0,
  };

  return {
    calibration,
    verification,
    dataCompleteness,
    personalizationMaturity,
    predictionStability,
    historicalContext,
  };
}

export function computeCompositeScore(dims: DimensionSet): number {
  let total = 0;
  for (const dim of Object.values(dims)) {
    total += dim.score * dim.weight;
  }
  return Math.max(0, Math.min(1, total));
}
