// ─── lib/cycle/effectiveCycleLength.ts ───────────────────────────────────────
// Derives a weighted average cycle length from observed inter-period gaps.
// More recent cycles receive higher weight; outliers outside the physiological
// range are discarded. Falls back to the onboarding-reported value when fewer
// than 2 period entries are available.

import type { PeriodEntry } from "./cycleAccuracy";

const MIN_CYCLE = 21;   // days — shortest physiologically valid cycle
const MAX_CYCLE = 45;   // days — longest physiologically valid cycle
const MAX_GAPS  = 6;    // consider at most the last 6 cycles

export function deriveEffectiveCycleLength(
  periodHistory: PeriodEntry[],
  fallback: number,
): number {
  const sorted = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (sorted.length < 2) return fallback;

  // Compute inter-period gaps, discard physiological outliers
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (new Date(sorted[i].startDate).getTime() - new Date(sorted[i - 1].startDate).getTime())
      / 86_400_000,
    );
    if (days >= MIN_CYCLE && days <= MAX_CYCLE) gaps.push(days);
  }

  if (gaps.length === 0) return fallback;

  // Most-recent MAX_GAPS cycles only
  const recent = gaps.slice(-MAX_GAPS);
  const n = recent.length;

  // Linear recency weights: weight[i] = i + 1 (oldest = 1, newest = n)
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const w = i + 1;
    weightedSum += recent[i] * w;
    totalWeight += w;
  }

  return Math.max(MIN_CYCLE, Math.min(MAX_CYCLE, Math.round(weightedSum / totalWeight)));
}
