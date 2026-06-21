// ─── lib/autoregulation/outcomeValidation.ts ─────────────────────────────────
// Phase 37G — Validates pre-workout predictions against actual outcomes.
// Improves future prediction accuracy over time.

import { getOutcomePrediction } from "./outcomePrediction";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActualOutcome {
  completed:          boolean;
  sessionRPE:         number;    // 1–10 actual RPE from feedback
  overallDifficulty:  number;    // 1–10 from workout log
}

export interface PredictionValidationEntry {
  date:              string;
  predictedSuccess:  number;    // 0–100
  actualSuccess:     boolean;
  predictedQuality:  string;
  actualRPE:         number;
  accuracyScore:     number;    // 0–100
}

export interface PredictionAccuracyReport {
  overallAccuracy:   number;   // 0–100 mean accuracy score
  successAccuracy:   number;   // % of completed sessions that were predicted "high"
  sampleSize:        number;
  dataMaturity:      "low" | "medium" | "high";
  trend:             "improving" | "stable" | "declining" | "insufficient";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_prediction_accuracy";
const RETENTION_DAYS = 180;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadValidations(): PredictionValidationEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PredictionValidationEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: PredictionValidationEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const pruned = entries.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function validateOutcome(date: string, actual: ActualOutcome): void {
  const prediction = getOutcomePrediction(date);
  if (!prediction) return;

  // Accuracy: how close was our success probability to reality?
  // If predicted 80% and session was completed → strong match
  // If predicted 80% and session was skipped → miss
  const probScore = actual.completed
    ? prediction.successProbability        // high prob + completed = accurate
    : 100 - prediction.successProbability; // high prob + skipped = inaccurate

  // RPE alignment: expectedQuality maps to RPE range
  const expectedRPECenter =
    prediction.expectedQuality === "high"   ? 8
    : prediction.expectedQuality === "medium" ? 6.5
    : 5;
  const rpeDeviation = Math.abs(actual.sessionRPE - expectedRPECenter);
  const rpeScore = Math.max(0, 100 - rpeDeviation * 20);

  const accuracyScore = Math.round(probScore * 0.6 + rpeScore * 0.4);

  const entry: PredictionValidationEntry = {
    date,
    predictedSuccess:  prediction.successProbability,
    actualSuccess:     actual.completed,
    predictedQuality:  prediction.expectedQuality,
    actualRPE:         actual.sessionRPE,
    accuracyScore,
  };

  const existing = loadValidations().filter(e => e.date !== date);
  existing.push(entry);
  persist(existing);
}

export function getPredictionAccuracy(): PredictionAccuracyReport {
  const all = loadValidations().sort((a, b) => b.date.localeCompare(a.date));

  if (all.length === 0) {
    return { overallAccuracy: 0, successAccuracy: 0, sampleSize: 0, dataMaturity: "low", trend: "insufficient" };
  }

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const overallAccuracy = Math.round(mean(all.map(e => e.accuracyScore)));

  const completedWithHighPred = all.filter(e => e.actualSuccess && e.predictedSuccess >= 65).length;
  const successAccuracy = all.filter(e => e.actualSuccess).length > 0
    ? Math.round((completedWithHighPred / all.filter(e => e.actualSuccess).length) * 100)
    : 0;

  const dataMaturity: "low" | "medium" | "high" =
    all.length >= 30 ? "high"
    : all.length >= 10 ? "medium"
    : "low";

  // Trend: compare last 5 vs prior 5
  let trend: PredictionAccuracyReport["trend"] = "insufficient";
  if (all.length >= 10) {
    const recent = mean(all.slice(0, 5).map(e => e.accuracyScore));
    const prior  = mean(all.slice(5, 10).map(e => e.accuracyScore));
    trend = recent > prior + 5 ? "improving" : recent < prior - 5 ? "declining" : "stable";
  }

  return { overallAccuracy, successAccuracy, sampleSize: all.length, dataMaturity, trend };
}
