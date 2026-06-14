// ─── lib/recovery/recoveryTrend.ts ───────────────────────────────────────────
// Analyses rolling recovery score history to detect improving, stable,
// declining, or rapidly declining trends over 7, 14, and 28-day windows.
// A single day's score is noisy; trends are what matter.

import type { RecoveryScore }       from "./recoveryScore";
import type { RecoveryTrend, RecoveryTrendStatus } from "./recoveryTypes";

export type { RecoveryTrend };

// ─── Constants ────────────────────────────────────────────────────────────────

// Minimum data points required before a window's status is meaningful
const MIN_POINTS: Record<string, number> = { "7": 3, "14": 5, "28": 7 };

// Slope thresholds (points per day)
const RAPID_DECLINE_SLOPE = -1.4;   // ≈ -10 points over 7 days
const DECLINE_SLOPE       = -0.5;   // ≈ -3.5 points over 7 days
const IMPROVE_SLOPE       =  0.5;

// ─── Linear regression slope ──────────────────────────────────────────────────

/**
 * Returns the least-squares slope (points per day) for an ordered series.
 * x = day index (0 = oldest), y = score.
 */
function leastSquaresSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += i;
    sumY  += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

// ─── Status from slope ────────────────────────────────────────────────────────

function statusFromSlope(slope: number): RecoveryTrendStatus {
  if (slope <= RAPID_DECLINE_SLOPE) return "rapidly_declining";
  if (slope <= DECLINE_SLOPE)       return "declining";
  if (slope >= IMPROVE_SLOPE)       return "improving";
  return "stable";
}

// ─── Window analysis ──────────────────────────────────────────────────────────

function analyseWindow(
  scores:  RecoveryScore[],   // all scores, newest first
  days:    number,
): { status: RecoveryTrendStatus; slope: number } {
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Filter to window and sort oldest → newest for slope calculation
  const window = scores
    .filter(s => s.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const minRequired = MIN_POINTS[String(days)] ?? 3;
  if (window.length < minRequired) {
    return { status: "stable", slope: 0 };
  }

  const values = window.map(s => s.score);
  const slope  = leastSquaresSlope(values);

  return { status: statusFromSlope(slope), slope: Math.round(slope * 100) / 100 };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes recovery trends over 7, 14, and 28-day windows.
 * Returns "stable" for any window with insufficient data rather than
 * alarming the user prematurely.
 */
export function computeRecoveryTrend(scores: RecoveryScore[]): RecoveryTrend {
  if (scores.length === 0) {
    return {
      status7d:  "stable",
      status14d: "stable",
      status28d: "stable",
      slope7d:   0,
      dataPoints: 0,
    };
  }

  const w7  = analyseWindow(scores, 7);
  const w14 = analyseWindow(scores, 14);
  const w28 = analyseWindow(scores, 28);

  return {
    status7d:   w7.status,
    status14d:  w14.status,
    status28d:  w28.status,
    slope7d:    w7.slope,
    dataPoints: scores.length,
  };
}
