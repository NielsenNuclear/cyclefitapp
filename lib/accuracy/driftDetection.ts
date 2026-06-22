// ─── lib/accuracy/driftDetection.ts ──────────────────────────────────────────
// 41G — Drift Detection
// Detects when a user's baseline patterns have shifted significantly, signalling
// that old models should be rebuilt (e.g. after a job change, injury, life event).

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { AdherenceEntry }        from "@/lib/adherence/adherenceTracker";

const STORAGE_KEY = "axis_drift_signals";
const WINDOW      = 14;   // days per comparison window

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriftReport {
  driftDetected:       boolean;
  magnitude:           number;
  affectedSignals:     string[];
  rebuildRecommended:  boolean;
  lastDriftDate:       string | null;
  message:             string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }
function mean(arr: number[]): number { return arr.reduce((s, v) => s + v, 0) / arr.length; }

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectDrift(
  readinessHistory: ReadinessHistoryEntry[],
  adherenceHistory: AdherenceEntry[],
): DriftReport {
  const EMPTY: DriftReport = {
    driftDetected: false, magnitude: 0, affectedSignals: [],
    rebuildRecommended: false, lastDriftDate: null,
    message: "No significant pattern shift detected.",
  };

  if (readinessHistory.length < WINDOW * 2) return EMPTY;

  const sorted  = [...readinessHistory].sort((a, b) => b.date.localeCompare(a.date));
  const recent  = sorted.slice(0, WINDOW).map(e => e.score);
  const older   = sorted.slice(WINDOW, WINDOW * 2).map(e => e.score);
  const rdxShift = Math.abs(mean(recent) - mean(older));

  const affectedSignals: string[] = [];
  if (rdxShift >= 10) affectedSignals.push("Readiness baseline");

  if (adherenceHistory.length >= WINDOW * 2) {
    const sortedAdh    = [...adherenceHistory].sort((a, b) => b.date.localeCompare(a.date));
    const recentComp   = sortedAdh.slice(0, WINDOW).filter(e => e.status === "completed").length / WINDOW;
    const olderComp    = sortedAdh.slice(WINDOW, WINDOW * 2).filter(e => e.status === "completed").length / WINDOW;
    if (Math.abs(recentComp - olderComp) > 0.30) affectedSignals.push("Completion rate");
  }

  const driftDetected = affectedSignals.length > 0;
  const magnitude     = Math.round(rdxShift * 10) / 10;

  if (driftDetected && isClient()) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: new Date().toISOString().slice(0, 10), magnitude, affectedSignals }),
      );
    } catch {}
  }

  return {
    driftDetected,
    magnitude,
    affectedSignals,
    rebuildRecommended: magnitude >= 15,
    lastDriftDate:      driftDetected ? new Date().toISOString().slice(0, 10) : null,
    message: driftDetected
      ? `Pattern shift detected (${magnitude} pt readiness change). ${affectedSignals.join(", ")} affected. Axis is recalibrating.`
      : "No significant pattern shift detected.",
  };
}
