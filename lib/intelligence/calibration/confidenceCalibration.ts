// ─── lib/intelligence/calibration/confidenceCalibration.ts ───────────────────
// Phase 57E — Confidence Level Calibration
// Checks whether "high/medium/low confidence" predictions hit their expected
// accuracy thresholds. OBSERVABILITY ONLY — no auto-correction.

import type { StoredPrediction } from "./predictionRegistry";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfidenceTierAccuracy {
  level:          "high" | "medium" | "low";
  count:          number;
  accuracy:       number;          // 0-1 mean accuracy across predictions at this tier
  wellCalibrated: boolean;
}

export interface ConfidenceCalibration {
  tiers:              ConfidenceTierAccuracy[];
  overallReliability: "reliable" | "moderate" | "unreliable";
  dataReady:          boolean;
}

// Expected minimum accuracy per tier
const EXPECTED: Record<"high" | "medium" | "low", number> = {
  high:   0.85,
  medium: 0.65,
  low:    0.45,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function calibrateConfidenceLevels(registry: StoredPrediction[]): ConfidenceCalibration {
  const scored = registry.filter(p => p.evaluated && p.accuracyScore !== undefined);

  const tiers: ConfidenceTierAccuracy[] = (["high", "medium", "low"] as const).map(level => {
    const group = scored.filter(p => p.confidence === level);
    if (group.length === 0) return { level, count: 0, accuracy: 0, wellCalibrated: false };
    const accuracy = group.reduce((s, p) => s + (p.accuracyScore ?? 0), 0) / group.length;
    return {
      level,
      count:          group.length,
      accuracy:       Math.round(accuracy * 1000) / 1000,
      wellCalibrated: accuracy >= EXPECTED[level],
    };
  });

  const active           = tiers.filter(t => t.count >= 3);
  const calibratedCount  = active.filter(t => t.wellCalibrated).length;
  const overallReliability: ConfidenceCalibration["overallReliability"] =
    active.length === 0       ? "moderate"
    : calibratedCount / active.length >= 0.67 ? "reliable"
    : calibratedCount / active.length >= 0.33 ? "moderate"
    : "unreliable";

  return { tiers, overallReliability, dataReady: active.length >= 1 };
}
