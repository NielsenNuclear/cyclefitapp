// ─── lib/accuracy/forecastAccuracy.ts ────────────────────────────────────────
// 41C/41F — Forecast Accuracy Scores + Horizon Testing
// Per-engine accuracy scores (readiness, recovery, performance) and trend.

import type { PredictionLogEntry, PredictionType } from "./predictionHistory";
import type { PredictionAccuracyReport }           from "@/lib/autoregulation/outcomeValidation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccuracyTrend = "improving" | "stable" | "declining" | "insufficient";

export interface EngineAccuracy {
  accuracy:   number;       // 0–100 (100 – mean absolute error)
  sampleSize: number;
  trend:      AccuracyTrend;
}

export interface ForecastAccuracyReport {
  readiness:   EngineAccuracy;
  recovery:    EngineAccuracy;
  performance: EngineAccuracy;
  overall:     number;
  dataReady:   boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function engineAccuracy(entries: PredictionLogEntry[]): EngineAccuracy {
  const scored = entries.filter(e => e.error !== undefined && e.actual !== undefined);
  if (scored.length < 3) {
    return { accuracy: 0, sampleSize: scored.length, trend: "insufficient" };
  }

  const mae      = scored.reduce((s, e) => s + Math.abs(e.error ?? 0), 0) / scored.length;
  const accuracy = Math.round(Math.max(0, 100 - mae));

  // Compare old vs recent MAE for trend
  const half    = Math.floor(scored.length / 2);
  const oldMAE  = scored.slice(half).reduce((s, e) => s + Math.abs(e.error ?? 0), 0) / Math.max(1, scored.length - half);
  const newMAE  = scored.slice(0, half).reduce((s, e) => s + Math.abs(e.error ?? 0), 0) / Math.max(1, half);
  const trend: AccuracyTrend =
    scored.length < 6 ? "insufficient"
    : newMAE < oldMAE - 2 ? "improving"
    : newMAE > oldMAE + 2 ? "declining"
    : "stable";

  return { accuracy, sampleSize: scored.length, trend };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeForecastAccuracy(
  predictionHistory: PredictionLogEntry[],
  performanceReport: PredictionAccuracyReport | undefined,
): ForecastAccuracyReport {
  const byType = (t: PredictionType) => predictionHistory.filter(e => e.type === t);

  const readiness  = engineAccuracy(byType("readiness"));
  const recovery   = engineAccuracy(byType("recovery"));
  const performance: EngineAccuracy = {
    accuracy:   performanceReport?.overallAccuracy ?? 0,
    sampleSize: performanceReport?.sampleSize      ?? 0,
    trend:      (performanceReport?.trend as AccuracyTrend | undefined) ?? "insufficient",
  };

  const active = [readiness, recovery, performance].filter(e => e.sampleSize >= 3);
  const overall = active.length > 0
    ? Math.round(active.reduce((s, e) => s + e.accuracy, 0) / active.length)
    : 0;

  return { readiness, recovery, performance, overall, dataReady: overall > 0 };
}
