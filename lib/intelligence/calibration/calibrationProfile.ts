// ─── lib/intelligence/calibration/calibrationProfile.ts ──────────────────────
// Phase 57C — Calibration Profile
// Aggregates per-domain prediction accuracy into a unified profile.
// Blends Phase 41 readiness/recovery data with Phase 57 multi-domain registry.
// OBSERVABILITY ONLY — no model changes.

import type { StoredPrediction } from "./predictionRegistry";
import type { ForecastAccuracyReport } from "@/lib/accuracy/forecastAccuracy";

const STORAGE_KEY = "axis_calibration_profile_v1";
const EXPIRY_DAYS = 14;
const MIN_SAMPLES = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalibrationTrend = "improving" | "stable" | "declining";

export interface DomainAccuracy {
  accuracy:   number;    // 0-1
  sampleSize: number;
  dataReady:  boolean;
}

export interface CalibrationProfile {
  readiness:       DomainAccuracy;
  recovery:        DomainAccuracy;
  adherence:       DomainAccuracy;
  cycle:           DomainAccuracy;
  outcome:         DomainAccuracy;
  overallAccuracy: number;          // 0-1, mean across domains with data
  trend:           CalibrationTrend;
  dataReady:       boolean;
  lastUpdated:     string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function registryDomainAccuracy(all: StoredPrediction[], domain: string): DomainAccuracy {
  const scored = all.filter(
    p => p.domain === domain && p.evaluated && p.accuracyScore !== undefined,
  );
  if (scored.length < MIN_SAMPLES) {
    return { accuracy: 0, sampleSize: scored.length, dataReady: false };
  }
  const mean = scored.reduce((s, p) => s + (p.accuracyScore ?? 0), 0) / scored.length;
  return { accuracy: Math.round(mean * 1000) / 1000, sampleSize: scored.length, dataReady: true };
}

function computeTrend(all: StoredPrediction[]): CalibrationTrend {
  const scored = all.filter(p => p.evaluated && p.accuracyScore !== undefined)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (scored.length < 10) return "stable";
  const half    = Math.floor(scored.length / 2);
  const oldMean = scored.slice(0, half).reduce((s, p) => s + (p.accuracyScore ?? 0), 0) / half;
  const newMean = scored.slice(half).reduce((s, p) => s + (p.accuracyScore ?? 0), 0) / (scored.length - half);
  if (newMean > oldMean + 0.05) return "improving";
  if (newMean < oldMean - 0.05) return "declining";
  return "stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildCalibrationProfile(
  registry:    StoredPrediction[],
  p41Accuracy: ForecastAccuracyReport | undefined,
  today:       string,
): CalibrationProfile {
  // Prefer Phase 41's richer readiness/recovery history when available
  const readiness: DomainAccuracy = (() => {
    if (p41Accuracy && p41Accuracy.readiness.sampleSize >= MIN_SAMPLES) {
      return {
        accuracy:   Math.max(0, Math.min(1, p41Accuracy.readiness.accuracy / 100)),
        sampleSize: p41Accuracy.readiness.sampleSize,
        dataReady:  true,
      };
    }
    return registryDomainAccuracy(registry, "readiness");
  })();

  const recovery: DomainAccuracy = (() => {
    if (p41Accuracy && p41Accuracy.recovery.sampleSize >= MIN_SAMPLES) {
      return {
        accuracy:   Math.max(0, Math.min(1, p41Accuracy.recovery.accuracy / 100)),
        sampleSize: p41Accuracy.recovery.sampleSize,
        dataReady:  true,
      };
    }
    return registryDomainAccuracy(registry, "recovery");
  })();

  const adherence = registryDomainAccuracy(registry, "adherence");
  const cycle     = registryDomainAccuracy(registry, "cycle");
  const outcome   = registryDomainAccuracy(registry, "outcome");

  const active = [readiness, recovery, adherence, cycle, outcome].filter(d => d.dataReady);
  const overallAccuracy = active.length > 0
    ? Math.round(active.reduce((s, d) => s + d.accuracy, 0) / active.length * 1000) / 1000
    : 0;

  return {
    readiness,
    recovery,
    adherence,
    cycle,
    outcome,
    overallAccuracy,
    trend:       computeTrend(registry),
    dataReady:   active.length >= 1,
    lastUpdated: today,
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

export function saveCalibrationProfile(profile: CalibrationProfile): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
}

export function loadCalibrationProfile(): CalibrationProfile | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CalibrationProfile;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);
    if (p.lastUpdated < cutoff.toISOString().slice(0, 10)) return null;
    return p;
  } catch { return null; }
}
