// ─── lib/intelligence/confidence/buildConfidenceInputs.ts ─────────────────────
// Phase D — adapter mapping live dashboard pipeline state → ConfidenceInputs.
// Called once per session after the Verification Registry gate.

import type { ConfidenceInputs } from "./ConfidenceCalculator";

export interface ConfidencePipelineParams {
  // Phase 57 calibration — overall accuracy, null when < MIN_SAMPLES
  calibrationFactor:        number | null;

  // Phase C verification — from getVerifierOutput().summary
  verificationSuccessRate:  number;   // 0–1
  completedEvaluations:     number;   // total evaluated records

  // Training history
  completedWorkouts:        number;   // completed + partially_completed entries
  weeksTracked:             number;   // ≥ 1

  // Data availability
  hasRecoveryData:          boolean;
  hasNutritionData:         boolean;
  hasCycleData:             boolean;
  hasSleepData:             boolean;
  checkInStreak:            number;   // readiness check-in history count (proxy)

  // Volume stability — last N weeks' total set counts, most-recent first
  recentWeeklyVolumeSets:   number[];

  // Phase A safety — whether safety constrained the delivered recommendation
  safetyWasConstrained:     boolean;
}

// Coefficient of variation: stdDev / mean. Lower = more stable recommendations.
function computeVolumeCv(weeklyTotals: number[]): number | undefined {
  const nonZero = weeklyTotals.filter(v => v > 0);
  if (nonZero.length < 3) return undefined;
  const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
  if (mean === 0) return undefined;
  const variance = nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZero.length;
  return Math.sqrt(variance) / mean;
}

export function buildConfidenceInputs(
  params: ConfidencePipelineParams,
): ConfidenceInputs {
  return {
    calibrationFactor:       params.calibrationFactor ?? undefined,
    verificationSuccessRate: params.verificationSuccessRate,
    completedEvaluations:    params.completedEvaluations,
    completedWorkouts:       params.completedWorkouts,
    weeksTracked:            params.weeksTracked,
    hasRecoveryData:         params.hasRecoveryData,
    hasNutritionData:        params.hasNutritionData,
    hasCycleData:            params.hasCycleData,
    hasSleepData:            params.hasSleepData,
    checkInStreak:           params.checkInStreak,
    recentVolumeCv:          computeVolumeCv(params.recentWeeklyVolumeSets),
    // Safety-agreement signal: if safety overrode the adaptive recommendation,
    // the two engines disagreed — reflects a less certain prediction.
    predictionAgreement:     params.safetyWasConstrained ? 0.5 : 1.0,
  };
}
