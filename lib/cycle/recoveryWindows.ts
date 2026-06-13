// ─── lib/cycle/recoveryWindows.ts ────────────────────────────────────────────
// Detects the user's historically lowest-readiness days within the cycle.
// Enables proactive recovery planning before the window arrives.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { PeriodEntry } from "./cycleAccuracy";
import { toCycleDay, getPeriodStartForDate } from "./cycleUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryWindow {
  startDay:      number;
  endDay:        number;
  nadirDay:      number;   // cycle day with lowest mean readiness in window
  meanReadiness: number;   // mean across all days in window (0–100, 1 dp)
  confidence:    "low" | "moderate" | "high";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function percentile25(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx    = Math.floor(sorted.length * 0.25);
  return sorted[Math.min(idx, sorted.length - 1)];
}

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
 * Identifies the recovery window: the multi-day span within the cycle where
 * mean readiness is historically in the bottom 25%.
 *
 * Returns null when fewer than 2 period entries exist or when there is
 * insufficient readiness data to form a qualifying window.
 */
export function detectRecoveryWindow(
  readinessHistory: ReadinessHistoryEntry[],
  periodHistory:    PeriodEntry[],
  cycleLength:      number,
): RecoveryWindow | null {
  if (periodHistory.length < 2 || readinessHistory.length < 7) return null;

  const sortedPeriods = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));

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

  const dayMeans = new Map<number, number>();
  for (const [day, scores] of dayBuckets) {
    dayMeans.set(day, scores.reduce((s, v) => s + v, 0) / scores.length);
  }

  const allMeans  = [...dayMeans.values()];
  const threshold = percentile25(allMeans);

  const qualifyingDays = [...dayMeans.entries()]
    .filter(([, mean]) => mean <= threshold)
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (qualifyingDays.length === 0) return null;

  const windows = mergeIntoWindows(qualifyingDays, 2);

  const scored = windows.map(w => {
    const means      = w.map(d => dayMeans.get(d) ?? 100);
    const windowMean = means.reduce((s, v) => s + v, 0) / means.length;
    const nadirDay   = w[means.indexOf(Math.min(...means))];
    return { window: w, mean: windowMean, nadirDay };
  });

  // Longest window wins; ties broken by lowest mean (worst recovery)
  scored.sort((a, b) => b.window.length - a.window.length || a.mean - b.mean);
  const best = scored[0];

  const cycleCount = cycleSet.size;
  const confidence: RecoveryWindow["confidence"] =
    cycleCount >= 5 ? "high" :
    cycleCount >= 2 ? "moderate" :
    "low";

  return {
    startDay:      best.window[0],
    endDay:        best.window[best.window.length - 1],
    nadirDay:      best.nadirDay,
    meanReadiness: Math.round(best.mean * 10) / 10,
    confidence,
  };
}
