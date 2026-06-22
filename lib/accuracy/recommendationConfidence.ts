// ─── lib/accuracy/recommendationConfidence.ts ─────────────────────────────────
// 41D — Recommendation Confidence
// Composite confidence score for today's recommendation, based on physiology
// model maturity and historical forecast accuracy.

import type { PhysiologyConfidence }  from "@/lib/physiology/physiologyConfidence";
import type { ForecastAccuracyReport } from "./forecastAccuracy";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "low" | "moderate" | "high";

export interface RecommendationConfidence {
  score:       number;
  level:       ConfidenceLevel;
  reasons:     string[];
  dataQuality: "sparse" | "moderate" | "rich";
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeRecommendationConfidence(
  physiologyConf:  PhysiologyConfidence,
  forecastAccuracy: ForecastAccuracyReport,
  totalWorkouts:    number,
): RecommendationConfidence {
  let score    = 40;
  const reasons: string[] = [];

  // Physiology model depth (30%)
  score += Math.round(physiologyConf.overall * 0.30);
  if (physiologyConf.level === "established" || physiologyConf.level === "mature") {
    reasons.push("Your physiology model is well-established.");
  }

  // Forecast accuracy (30%)
  if (forecastAccuracy.dataReady) {
    score += Math.round(forecastAccuracy.overall * 0.30);
    if (forecastAccuracy.overall >= 75) {
      reasons.push("Recent predictions have been accurate.");
    }
  }

  // Data volume (up to 20 pts)
  const volumeBonus = Math.min(20, Math.round((totalWorkouts / 50) * 20));
  score += volumeBonus;
  if (totalWorkouts >= 50) {
    reasons.push(`${totalWorkouts} logged workouts provide strong training context.`);
  }

  score = Math.min(95, Math.max(20, score));

  const level: ConfidenceLevel = score >= 70 ? "high" : score >= 45 ? "moderate" : "low";
  const dataQuality             = totalWorkouts >= 50 ? "rich" : totalWorkouts >= 20 ? "moderate" : "sparse";

  if (reasons.length === 0) reasons.push("Building confidence — keep logging daily.");

  return { score, level, reasons, dataQuality };
}
