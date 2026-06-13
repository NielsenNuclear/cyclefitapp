// ─── lib/cycle/cycleUtils.ts ──────────────────────────────────────────────────
// Shared cycle arithmetic helpers used across the cycle intelligence modules.

import type { PeriodEntry } from "./cycleAccuracy";

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / msPerDay,
  );
}

/**
 * Maps a calendar date to a 1-indexed cycle day using the nearest preceding
 * period start. Returns null when no prior period is found.
 * Uses modular arithmetic so dates that fall beyond one cycle length wrap
 * correctly into the next cycle.
 */
export function toCycleDay(
  date:          string,
  sortedPeriods: PeriodEntry[],
  cycleLength:   number,
): number | null {
  const periodStart = [...sortedPeriods].filter(p => p.startDate <= date).pop();
  if (!periodStart) return null;
  const days = daysBetween(periodStart.startDate, date);
  return (days % cycleLength) + 1;
}

/**
 * Returns the period-start string that anchors the given date's cycle.
 * Used when the caller also needs the cycle identity (not just the day number).
 */
export function getPeriodStartForDate(
  date:          string,
  sortedPeriods: PeriodEntry[],
): string | null {
  const entry = [...sortedPeriods].filter(p => p.startDate <= date).pop();
  return entry?.startDate ?? null;
}

/**
 * Maps a 1-indexed cycle day to a named phase label.
 * Boundaries are proportional to cycleLength so they work for any cycle.
 */
export function toCyclePhaseName(cycleDay: number, cycleLength: number): string {
  if (cycleDay <= 5)                                   return "Menstrual Phase";
  if (cycleDay <= Math.round(cycleLength * 0.45))      return "Follicular Phase";
  if (cycleDay <= Math.round(cycleLength * 0.55))      return "Ovulation Phase";
  if (cycleDay <= cycleLength - 5)                     return "Luteal Phase";
  return "Pre-Menstrual Phase";
}
