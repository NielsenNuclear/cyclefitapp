// ─── lib/intelligence/calibration/predictionRegistry.ts ──────────────────────
// Phase 57A — Prediction Registry
// Stores every prediction before evaluation; provides load/save/register/query.
// OBSERVABILITY ONLY — no model changes.

const STORAGE_KEY    = "axis_prediction_registry";
const MAX_RECORDS    = 1000;
const RETENTION_DAYS = 90;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PredictionDomain = "readiness" | "recovery" | "adherence" | "cycle" | "outcome";

export interface StoredPrediction {
  id:                string;
  timestamp:         string;            // YYYY-MM-DD when registered
  domain:            PredictionDomain;
  predictedValue:    number;            // 0-100 for numeric; 0-1 for probability
  confidence:        "low" | "medium" | "high";
  horizonDays:       number;
  evaluationDueDate: string;            // YYYY-MM-DD
  evaluated:         boolean;
  actualValue?:      number;
  errorMagnitude?:   number;            // |predicted - actual|
  accuracyScore?:    number;            // 0-1
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

export function loadPredictionRegistry(): StoredPrediction[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as StoredPrediction[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cut = cutoff.toISOString().slice(0, 10);
    return all.filter(p => p.timestamp >= cut);
  } catch { return []; }
}

export function savePredictionRegistry(predictions: StoredPrediction[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions.slice(-MAX_RECORDS)));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function registerPrediction(
  domain:         PredictionDomain,
  predictedValue: number,
  confidence:     StoredPrediction["confidence"],
  horizonDays:    number,
  today:          string,
): StoredPrediction {
  const dueDate = (() => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() + horizonDays);
    return d.toISOString().slice(0, 10);
  })();

  const prediction: StoredPrediction = {
    id:                `${domain}_${today}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp:         today,
    domain,
    predictedValue,
    confidence,
    horizonDays,
    evaluationDueDate: dueDate,
    evaluated:         false,
  };

  const existing = loadPredictionRegistry();
  // One prediction per domain per day (idempotent)
  const deduped = existing.filter(p => !(p.domain === domain && p.timestamp === today));
  savePredictionRegistry([...deduped, prediction]);
  return prediction;
}

export function markPredictionEvaluated(
  id:             string,
  actualValue:    number,
  errorMagnitude: number,
  accuracyScore:  number,
): void {
  const all = loadPredictionRegistry();
  const updated = all.map(p =>
    p.id === id ? { ...p, evaluated: true, actualValue, errorMagnitude, accuracyScore } : p,
  );
  savePredictionRegistry(updated);
}

export function getPendingEvaluations(today: string): StoredPrediction[] {
  return loadPredictionRegistry().filter(p => !p.evaluated && p.evaluationDueDate <= today);
}

export function getEvaluatedPredictions(): StoredPrediction[] {
  return loadPredictionRegistry().filter(p => p.evaluated);
}
