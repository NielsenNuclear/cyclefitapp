// ─── lib/accuracy/calibrationEngine.ts ───────────────────────────────────────
// 41B — Calibration Engine
// Detects systematic over/under-prediction bias across each engine type and
// computes correction offsets. Axis self-corrects as data accumulates.

import type { PredictionLogEntry, PredictionType } from "./predictionHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BiasSummary {
  bias:       number;    // mean(predicted – actual); positive = overestimates
  type:       "over" | "under" | "calibrated";
  correction: number;    // subtract from future predictions to compensate
  sampleSize: number;
}

export interface CalibrationReport {
  readiness:      BiasSummary;
  recovery:       BiasSummary;
  performance:    BiasSummary;
  overall:        BiasSummary;
  selfCorrecting: boolean;   // true when >= 20 scored entries
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeBias(entries: PredictionLogEntry[]): BiasSummary {
  const scored = entries.filter(e => e.error !== undefined);
  if (scored.length < 3) {
    return { bias: 0, type: "calibrated", correction: 0, sampleSize: scored.length };
  }
  const bias    = scored.reduce((s, e) => s + (e.error ?? 0), 0) / scored.length;
  const rounded = Math.round(bias * 10) / 10;
  return {
    bias:       rounded,
    type:       Math.abs(rounded) < 3 ? "calibrated" : rounded > 0 ? "over" : "under",
    correction: rounded,
    sampleSize: scored.length,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeCalibrationReport(
  history: PredictionLogEntry[],
): CalibrationReport {
  const byType = (t: PredictionType) => history.filter(e => e.type === t);
  return {
    readiness:     computeBias(byType("readiness")),
    recovery:      computeBias(byType("recovery")),
    performance:   computeBias(byType("performance")),
    overall:       computeBias(history),
    selfCorrecting: history.filter(e => e.error !== undefined).length >= 20,
  };
}
