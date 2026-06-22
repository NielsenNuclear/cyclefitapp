// ─── lib/accuracy/predictionHistory.ts ───────────────────────────────────────
// 41A — Prediction History
// Log predicted vs actual values for readiness, recovery, and performance.
// Provides the raw material for calibration (41B) and accuracy scoring (41C).

const STORAGE_KEY    = "axis_prediction_log";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PredictionType = "readiness" | "recovery" | "performance";

export interface PredictionLogEntry {
  id:        string;    // `${date}_${type}` — idempotent key
  date:      string;
  type:      PredictionType;
  predicted: number;    // 0–100
  actual?:   number;
  error?:    number;    // predicted – actual (signed)
  direction: "over" | "under" | "accurate" | "pending";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): PredictionLogEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PredictionLogEntry[]) : [];
  } catch { return []; }
}

function persist(entries: PredictionLogEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function logPrediction(date: string, type: PredictionType, predicted: number): void {
  const entries = load();
  const id      = `${date}_${type}`;
  if (entries.some(e => e.id === id)) return; // idempotent — score actual later
  persist([{ id, date, type, predicted, direction: "pending" }, ...entries]);
}

export function scoreActual(date: string, type: PredictionType, actual: number): void {
  const entries = load();
  const entry   = entries.find(e => e.id === `${date}_${type}`);
  if (!entry) return;
  const error        = entry.predicted - actual;
  entry.actual       = actual;
  entry.error        = error;
  entry.direction    = Math.abs(error) <= 5 ? "accurate" : error > 0 ? "over" : "under";
  persist(entries);
}

export function getPredictionHistory(type?: PredictionType): PredictionLogEntry[] {
  const all = load();
  return type ? all.filter(e => e.type === type) : all;
}
