// ─── lib/accuracy/uncertaintyDetection.ts ────────────────────────────────────
// 41E — Uncertainty Detection
// When recommendation confidence is low, Axis becomes conservative rather
// than maintaining (possibly wrong) high-intensity suggestions.

import type { RecommendationConfidence } from "./recommendationConfidence";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UncertaintySignal {
  conservativeMode:  boolean;
  reason:            string;
  volumeModifier:    number;    // 1.0 = normal, 0.85 = conservative
  intensityModifier: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectUncertainty(
  confidence: RecommendationConfidence,
): UncertaintySignal {
  switch (confidence.level) {
    case "high":
      return {
        conservativeMode:  false,
        reason:            "High confidence — proceed as recommended.",
        volumeModifier:    1.0,
        intensityModifier: 1.0,
      };
    case "moderate":
      return {
        conservativeMode:  false,
        reason:            "Moderate confidence — standard plan with slight caution.",
        volumeModifier:    0.95,
        intensityModifier: 1.0,
      };
    default:
      return {
        conservativeMode:  true,
        reason:            "Low confidence in prediction — maintaining conservative approach until more data is available.",
        volumeModifier:    0.85,
        intensityModifier: 0.90,
      };
  }
}
