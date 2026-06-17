// ─── lib/adaptive/capacityAccuracy.ts ────────────────────────────────────────
// Tracks predicted vs actual recovery capacity to calibrate confidence over time.
// Keeps computeRecoveryCapacity() pure — all persistence lives here.

import type { CapacityLevel } from "./recoveryCapacity";

const STORAGE_KEY    = "axis_capacity_accuracy";
const RETENTION_DAYS = 90;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CapacityAccuracyEntry {
  date:      string;        // YYYY-MM-DD
  predicted: CapacityLevel; // what the engine predicted
  actual:    CapacityLevel; // what the user's next-day readiness/feedback revealed
  correct:   boolean;       // predicted === actual
}

export interface CapacityCalibration {
  accuracyRate:    number;          // 0–1: fraction of correct predictions
  sampleSize:      number;
  adjustedLevel:   CapacityLevel | null;  // override when accuracy is poor
  confidence:      "early" | "growing" | "established";
  insight:         string;
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function load(): CapacityAccuracyEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: CapacityAccuracyEntry[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function pruneOld(entries: CapacityAccuracyEntry[]): CapacityAccuracyEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Records one predicted → actual pair. Actual capacity is inferred from
 * the next day's readiness/recovery feedback (called by the dashboard on load).
 * Upserts by date so re-running the same day overwrites safely.
 */
export function trackCapacityAccuracy(
  date:      string,
  predicted: CapacityLevel,
  actual:    CapacityLevel,
): void {
  const existing = pruneOld(load());
  const idx = existing.findIndex(e => e.date === date);
  const entry: CapacityAccuracyEntry = {
    date,
    predicted,
    actual,
    correct: predicted === actual,
  };
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.unshift(entry);
  }
  persist(existing);
}

/**
 * Returns calibration metadata — how accurate predictions have been and
 * whether the confidence tier should be adjusted.
 */
export function getCapacityCalibration(): CapacityCalibration {
  const entries = pruneOld(load());

  if (entries.length < 5) {
    return {
      accuracyRate:  0,
      sampleSize:    entries.length,
      adjustedLevel: null,
      confidence:    "early",
      insight:       "Calibrating capacity prediction — continue logging check-ins.",
    };
  }

  const correct    = entries.filter(e => e.correct).length;
  const accuracy   = correct / entries.length;

  const confidence: CapacityCalibration["confidence"] =
    entries.length >= 20 ? "established" :
    entries.length >= 10 ? "growing" :
    "early";

  // If accuracy is low, check whether we are systematically over- or under-predicting
  let adjustedLevel: CapacityLevel | null = null;
  if (accuracy < 0.50 && entries.length >= 10) {
    const overPredicted = entries.filter(
      e => !e.correct &&
           (e.predicted === "high" && e.actual !== "high") ||
           (e.predicted === "moderate" && e.actual === "low")
    ).length;
    const underPredicted = entries.filter(
      e => !e.correct &&
           (e.predicted === "low" && e.actual !== "low") ||
           (e.predicted === "moderate" && e.actual === "high")
    ).length;

    // Systematic bias → nudge toward truth
    if (overPredicted > underPredicted * 1.5) {
      // We kept predicting too high — the user actually recovers slower
      const lastPredicted = entries[0]?.predicted ?? "moderate";
      adjustedLevel = lastPredicted === "high" ? "moderate" : "low";
    } else if (underPredicted > overPredicted * 1.5) {
      const lastPredicted = entries[0]?.predicted ?? "moderate";
      adjustedLevel = lastPredicted === "low" ? "moderate" : "high";
    }
  }

  const pct = Math.round(accuracy * 100);
  const insight =
    accuracy >= 0.75
      ? `Capacity model is accurate (${pct}% match over ${entries.length} sessions).`
      : accuracy >= 0.50
      ? `Capacity model is calibrating (${pct}% match). Accuracy improves with more sessions.`
      : `Capacity model is being recalibrated — predictions are being adjusted based on your actual recovery patterns.`;

  return { accuracyRate: accuracy, sampleSize: entries.length, adjustedLevel, confidence, insight };
}

export function getCapacityAccuracyEntries(): CapacityAccuracyEntry[] {
  return pruneOld(load()).sort((a, b) => b.date.localeCompare(a.date));
}
