// ─── lib/adherence/patternEngine.ts ──────────────────────────────────────────
// 46A — Adherence Pattern Engine
// Meta-layer over workout history. Discovers which days, durations, and split
// types actually result in completed workouts for THIS user.
// Does not generate recommendations — only surfaces evidence.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";

const MIN_SAMPLE = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekdayPattern {
  weekday: number;          // 0 = Sunday … 6 = Saturday
  label:   string;
  completionRate: number;   // 0–1
  sampleSize:     number;
}

export interface DurationBucket {
  label:          string;   // "≤30 min" etc.
  minMin:         number;
  maxMin:         number;
  completionRate: number;
  sampleSize:     number;
}

export interface SplitPattern {
  splitType:      string;
  completionRate: number;
  sampleSize:     number;
}

export interface AdherencePatternReport {
  bestWeekday:           string | null;
  worstWeekday:          string | null;
  optimalDuration:       { min: number; max: number } | null;
  bestSplitType:         string | null;
  weekdayPatterns:       WeekdayPattern[];
  durationBuckets:       DurationBucket[];
  splitPatterns:         SplitPattern[];
  completionDelta:       number | null;  // best duration vs worst duration completion gap
  dataReady:             boolean;
  insight:               string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DURATION_BUCKETS: { label: string; minMin: number; maxMin: number }[] = [
  { label: "≤30 min",  minMin: 0,  maxMin: 30  },
  { label: "31–45 min", minMin: 31, maxMin: 45  },
  { label: "46–60 min", minMin: 46, maxMin: 60  },
  { label: "61–75 min", minMin: 61, maxMin: 75  },
  { label: "75+ min",   minMin: 76, maxMin: 9999 },
];

function completionRate(entries: WorkoutHistoryEntry[]): number {
  const actionable = entries.filter(e => e.status !== "pending");
  if (actionable.length === 0) return 0;
  const done = actionable.filter(e => e.status === "completed" || e.status === "partially_completed");
  return done.length / actionable.length;
}

function weekdayFromDateStr(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay();
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeAdherencePatterns(
  history: WorkoutHistoryEntry[],
): AdherencePatternReport {
  const actionable = history.filter(e => e.status !== "pending");
  const EMPTY: AdherencePatternReport = {
    bestWeekday: null, worstWeekday: null, optimalDuration: null,
    bestSplitType: null, weekdayPatterns: [], durationBuckets: [],
    splitPatterns: [], completionDelta: null, dataReady: false,
    insight: "Not enough history to detect patterns yet.",
  };

  if (actionable.length < MIN_SAMPLE) return EMPTY;

  // ── Weekday patterns ──────────────────────────────────────────────────────
  const byWeekday = new Map<number, WorkoutHistoryEntry[]>();
  for (let d = 0; d < 7; d++) byWeekday.set(d, []);
  for (const e of actionable) {
    const wd = weekdayFromDateStr(e.id);
    byWeekday.get(wd)?.push(e);
  }

  const weekdayPatterns: WeekdayPattern[] = Array.from(byWeekday.entries())
    .filter(([, entries]) => entries.length >= 2)
    .map(([wd, entries]) => ({
      weekday:        wd,
      label:          WEEKDAY_LABELS[wd],
      completionRate: Math.round(completionRate(entries) * 100) / 100,
      sampleSize:     entries.length,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  const bestWeekday  = weekdayPatterns[0]?.label ?? null;
  const worstWeekday = weekdayPatterns[weekdayPatterns.length - 1]?.label ?? null;

  // ── Duration patterns ─────────────────────────────────────────────────────
  const durationBuckets: DurationBucket[] = DURATION_BUCKETS
    .map(b => {
      const matches = actionable.filter(
        e => e.estimatedDurationMin >= b.minMin && e.estimatedDurationMin <= b.maxMin,
      );
      return {
        label:          b.label,
        minMin:         b.minMin,
        maxMin:         b.maxMin,
        completionRate: matches.length >= 2 ? Math.round(completionRate(matches) * 100) / 100 : 0,
        sampleSize:     matches.length,
      };
    })
    .filter(b => b.sampleSize >= 2);

  const rankedDurations = [...durationBuckets].sort((a, b) => b.completionRate - a.completionRate);
  const bestBucket      = rankedDurations[0];
  const worstBucket     = rankedDurations[rankedDurations.length - 1];
  const optimalDuration = bestBucket
    ? { min: bestBucket.minMin, max: Math.min(bestBucket.maxMin, 90) }
    : null;
  const completionDelta = bestBucket && worstBucket && bestBucket !== worstBucket
    ? Math.round((bestBucket.completionRate - worstBucket.completionRate) * 100)
    : null;

  // ── Split patterns ────────────────────────────────────────────────────────
  const bySplit = new Map<string, WorkoutHistoryEntry[]>();
  for (const e of actionable) {
    const k = e.splitType ?? "unknown";
    if (!bySplit.has(k)) bySplit.set(k, []);
    bySplit.get(k)!.push(e);
  }

  const splitPatterns: SplitPattern[] = Array.from(bySplit.entries())
    .filter(([, entries]) => entries.length >= 2)
    .map(([type, entries]) => ({
      splitType:      type,
      completionRate: Math.round(completionRate(entries) * 100) / 100,
      sampleSize:     entries.length,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  const bestSplitType = splitPatterns[0]?.splitType ?? null;

  // ── Summary insight ───────────────────────────────────────────────────────
  const insightParts: string[] = [];
  if (bestWeekday) insightParts.push(`${bestWeekday}s are your most consistent day`);
  if (optimalDuration) insightParts.push(`${optimalDuration.min}–${optimalDuration.max} min sessions complete at the highest rate`);
  if (completionDelta !== null && completionDelta > 20) {
    insightParts.push(`${completionDelta}% gap between best and worst session length`);
  }
  const insight = insightParts.length > 0
    ? insightParts.join(". ") + "."
    : "Keep logging to reveal your training patterns.";

  return {
    bestWeekday, worstWeekday, optimalDuration, bestSplitType,
    weekdayPatterns, durationBuckets, splitPatterns,
    completionDelta, dataReady: true, insight,
  };
}
