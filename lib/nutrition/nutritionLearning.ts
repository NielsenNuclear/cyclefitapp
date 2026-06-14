// ─── lib/nutrition/nutritionLearning.ts ──────────────────────────────────────
// Observes which fueling level recommendations correlate with better next-day
// readiness. Writes to localStorage; SSR-safe via isClient().
//
// Storage key:  axis_nutrition_log
// Retention:    180 days
// Min samples:  4 scored observations before an outcome is reported

import type { FuelingLevel } from "./fuelTargets";

const STORAGE_KEY    = "axis_nutrition_log";
const RETENTION_DAYS = 180;
const MIN_SAMPLES    = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

interface NutritionLogEntry {
  id:               string;         // YYYY-MM-DD (idempotent key)
  date:             string;
  fuelingLevel:     FuelingLevel;
  scored:           boolean;
  nextDayReadiness?: number;
  scoredDate?:      string;
}

export interface NutritionOutcome {
  fuelingLevel:     FuelingLevel;
  meanNextDayScore: number;
  sampleSize:       number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function loadLog(): NutritionLogEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NutritionLogEntry[]) : [];
  } catch {
    return [];
  }
}

function persistLog(entries: NutritionLogEntry[]): void {
  if (!isClient()) return;
  const cutoff = cutoffDate(RETENTION_DAYS);
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.filter(e => e.date >= cutoff)),
    );
  } catch {
    // Storage quota exceeded — fail silently
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Records today's fueling level. Idempotent — same date is a no-op.
 */
export function logNutritionDay(fuelingLevel: FuelingLevel, date?: string): void {
  const d   = date ?? new Date().toISOString().slice(0, 10);
  const log = loadLog();
  if (log.some(e => e.id === d)) return;
  persistLog([...log, { id: d, date: d, fuelingLevel, scored: false }]);
}

/**
 * Scores a past fueling entry with the next-day readiness score.
 * Idempotent — already-scored entries are not overwritten.
 *
 * @param date             YYYY-MM-DD of the fueling entry to score
 * @param nextDayReadiness readiness score observed the following day
 * @param scoredDate       YYYY-MM-DD when scoring occurred (today)
 */
export function scoreNutritionDay(
  date:             string,
  nextDayReadiness: number,
  scoredDate:       string,
): void {
  const log     = loadLog();
  const updated = log.map(e => {
    if (e.id !== date || e.scored) return e;
    return { ...e, scored: true, nextDayReadiness, scoredDate };
  });
  persistLog(updated);
}

/**
 * Aggregates scored entries into per-fueling-level outcomes.
 * Only returns levels that have ≥ MIN_SAMPLES scored observations.
 * Sorted best mean score first.
 */
export function getNutritionOutcomes(): NutritionOutcome[] {
  const scored = loadLog().filter(e => e.scored && e.nextDayReadiness !== undefined);

  const byLevel = new Map<FuelingLevel, number[]>();
  for (const e of scored) {
    const list = byLevel.get(e.fuelingLevel) ?? [];
    list.push(e.nextDayReadiness!);
    byLevel.set(e.fuelingLevel, list);
  }

  const outcomes: NutritionOutcome[] = [];
  for (const [fuelingLevel, scores] of byLevel) {
    if (scores.length < MIN_SAMPLES) continue;
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    outcomes.push({
      fuelingLevel,
      meanNextDayScore: Math.round(mean),
      sampleSize:       scores.length,
    });
  }

  return outcomes.sort((a, b) => b.meanNextDayScore - a.meanNextDayScore);
}
