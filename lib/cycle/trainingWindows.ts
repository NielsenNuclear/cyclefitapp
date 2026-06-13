// ─── lib/cycle/trainingWindows.ts ────────────────────────────────────────────
// Detects the user's historically strongest training days within the cycle.
// Uses mean readiness per cycle day — no population norms, personal data only.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { PeriodEntry } from "./cycleAccuracy";
import { toCycleDay, getPeriodStartForDate } from "./cycleUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingWindow {
  startDay:      number;
  endDay:        number;
  peakDay:       number;   // cycle day with highest mean readiness in window
  meanReadiness: number;   // mean across all days in window (0–100, 1 dp)
  confidence:    "low" | "moderate" | "high";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function percentile75(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx    = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// Merge a sorted list of qualifying days into contiguous windows,
// allowing gaps of up to maxGap days between members.
function mergeIntoWindows(days: number[], maxGap: number): Array<number[]> {
  if (days.length === 0) return [];
  const windows: Array<number[]> = [[days[0]]];
  for (let i = 1; i < days.length; i++) {
    const current = windows[windows.length - 1];
    if (days[i] - current[current.length - 1] <= maxGap) {
      current.push(days[i]);
    } else {
      windows.push([days[i]]);
    }
  }
  return windows;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Identifies the prime training window: the multi-day span within the cycle
 * where mean readiness is historically in the top 25%.
 *
 * Returns null when there are fewer than 2 period entries (no complete cycle
 * to analyze) or when no qualifying window can be formed.
 */
export function detectPrimeTrainingWindow(
  readinessHistory: ReadinessHistoryEntry[],
  periodHistory:    PeriodEntry[],
  cycleLength:      number,
): TrainingWindow | null {
  if (periodHistory.length < 2 || readinessHistory.length < 7) return null;

  const sortedPeriods = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Accumulate readiness scores per cycle day
  const dayBuckets = new Map<number, number[]>();
  const cycleSet   = new Set<string>();

  for (const entry of readinessHistory) {
    const cd          = toCycleDay(entry.date, sortedPeriods, cycleLength);
    const periodStart = getPeriodStartForDate(entry.date, sortedPeriods);
    if (cd === null || periodStart === null) continue;

    const bucket = dayBuckets.get(cd) ?? [];
    bucket.push(entry.score);
    dayBuckets.set(cd, bucket);
    cycleSet.add(periodStart);
  }

  if (dayBuckets.size < 3) return null;

  // Compute mean per cycle day
  const dayMeans = new Map<number, number>();
  for (const [day, scores] of dayBuckets) {
    dayMeans.set(day, scores.reduce((s, v) => s + v, 0) / scores.length);
  }

  const allMeans    = [...dayMeans.values()];
  const threshold   = percentile75(allMeans);

  // Collect days at or above P75 threshold, sorted ascending
  const qualifyingDays = [...dayMeans.entries()]
    .filter(([, mean]) => mean >= threshold)
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (qualifyingDays.length === 0) return null;

  // Merge into contiguous windows (gap ≤ 2 days)
  const windows = mergeIntoWindows(qualifyingDays, 2);

  // Pick longest window; break ties by highest mean readiness
  const scored = windows.map(w => {
    const means    = w.map(d => dayMeans.get(d) ?? 0);
    const windowMean = means.reduce((s, v) => s + v, 0) / means.length;
    const peakDay  = w[means.indexOf(Math.max(...means))];
    return { window: w, mean: windowMean, peakDay };
  });

  scored.sort((a, b) => b.window.length - a.window.length || b.mean - a.mean);
  const best = scored[0];

  const cycleCount = cycleSet.size;
  const confidence: TrainingWindow["confidence"] =
    cycleCount >= 5 ? "high" :
    cycleCount >= 2 ? "moderate" :
    "low";

  return {
    startDay:      best.window[0],
    endDay:        best.window[best.window.length - 1],
    peakDay:       best.peakDay,
    meanReadiness: Math.round(best.mean * 10) / 10,
    confidence,
  };
}
