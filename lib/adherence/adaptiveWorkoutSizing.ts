// ─── lib/adherence/adaptiveWorkoutSizing.ts ──────────────────────────────────
// 46D — Adaptive Workout Sizing
// Uses measured completion rates by duration to bias session length toward what
// this user actually finishes. Reuses patternEngine outputs — does not re-read
// workout history.

import type { AdherencePatternReport } from "./patternEngine";
import type { AdherenceRiskForecast }  from "./adherenceRiskForecast";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutSizeRecommendation {
  recommendedMaxMin:  number;         // ceiling for today's session
  recommendedMinMin:  number;         // floor (minimum viable)
  rationale:          string;
  basedOnHistory:     boolean;
  confidence:         "low" | "moderate" | "high";
  appliedRiskAdjust:  boolean;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeAdaptiveWorkoutSize(
  patterns:        AdherencePatternReport,
  riskForecast:    AdherenceRiskForecast,
  standardDuration: number,            // what the workout generator proposed (min)
): WorkoutSizeRecommendation {
  // Default: pass through the standard duration
  const DEFAULT: WorkoutSizeRecommendation = {
    recommendedMaxMin:  standardDuration,
    recommendedMinMin:  Math.max(15, Math.round(standardDuration * 0.4)),
    rationale:          "Standard session duration.",
    basedOnHistory:     false,
    confidence:         "low",
    appliedRiskAdjust:  false,
  };

  if (!patterns.dataReady) return DEFAULT;

  // Find the duration bucket with the best completion rate (≥3 sample)
  const viable = patterns.durationBuckets.filter(b => b.sampleSize >= 3);
  if (viable.length === 0) return DEFAULT;

  const best = viable.sort((a, b) => b.completionRate - a.completionRate)[0];
  const optimalMax = Math.min(best.maxMin === 9999 ? 90 : best.maxMin, 90);
  const optimalMin = best.minMin;

  let maxMin  = optimalMax;
  let minMin  = optimalMin;
  let appliedRiskAdjust = false;

  // If risk is high or moderate → pull toward the minimum
  if (riskForecast.dataReady) {
    if (riskForecast.risk === "high") {
      maxMin = Math.min(maxMin, Math.max(20, Math.round(optimalMin * 0.75)));
      minMin = 15;
      appliedRiskAdjust = true;
    } else if (riskForecast.risk === "moderate") {
      maxMin = Math.min(maxMin, Math.round((optimalMin + optimalMax) / 2));
      appliedRiskAdjust = true;
    }
  }

  const gap = patterns.completionDelta ?? 0;
  const confidence: "low" | "moderate" | "high" =
    best.sampleSize >= 10 && gap >= 20 ? "high"
    : best.sampleSize >= 5 ? "moderate"
    : "low";

  const rationale = appliedRiskAdjust
    ? `${best.label} sessions complete at ${Math.round(best.completionRate * 100)}% for you — scaled down today given adherence risk.`
    : `${best.label} sessions have your highest completion rate (${Math.round(best.completionRate * 100)}%).`;

  return {
    recommendedMaxMin: maxMin,
    recommendedMinMin: minMin,
    rationale,
    basedOnHistory:     true,
    confidence,
    appliedRiskAdjust,
  };
}
