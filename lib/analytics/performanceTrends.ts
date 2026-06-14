// ─── lib/analytics/performanceTrends.ts ──────────────────────────────────────
// Detects whether per-exercise performance is improving, stable, plateauing,
// or regressing based on absolute load data (weight × reps × sets).

import type { ExercisePerformanceEntry } from "@/lib/progression/exercisePerformanceLog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PerformanceTrendStatus =
  | "improving"
  | "stable"
  | "plateau"
  | "regressing"
  | "insufficient_data";

export interface PerformanceTrend {
  exerciseName: string;
  status:       PerformanceTrendStatus;
  recentVolume: number;   // mean volume proxy of most recent 2 sessions
  priorVolume:  number;   // mean volume proxy of 2 sessions before that
  sessionCount: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const MIN_SESSIONS   = 4;
const IMPROVE_THRESH = 1.03;  // +3% = improving
const REGRESS_THRESH = 0.97;  // -3% = regressing

function volumeProxy(entry: ExercisePerformanceEntry): number {
  // Use weight + 1 so bodyweight (weight=0) exercises still produce a non-zero proxy
  return (entry.weight + 1) * entry.actualReps * entry.completedSets;
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function detectStatus(entries: ExercisePerformanceEntry[]): PerformanceTrendStatus {
  // Entries should already be sorted newest-first
  const recent = entries.slice(0, 2).map(volumeProxy);
  const prior  = entries.slice(2, 4).map(volumeProxy);

  const recentMean = mean(recent);
  const priorMean  = mean(prior);

  if (recentMean >= priorMean * IMPROVE_THRESH) return "improving";
  if (recentMean <= priorMean * REGRESS_THRESH) return "regressing";

  // Within ±3% — check for plateau: no session in the last 4 exceeded the
  // earliest of those 4 in volume
  const last4         = entries.slice(0, 4);
  const baseline      = volumeProxy(last4[last4.length - 1]);  // oldest of the 4
  const anyImproved   = last4.slice(0, -1).some(e => volumeProxy(e) > baseline * IMPROVE_THRESH);

  return anyImproved ? "stable" : "plateau";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns a performance trend for each exercise that has ≥ 4 logged sessions
 * with weight/rep data. Exercises with fewer sessions return "insufficient_data".
 *
 * Input must be the full flattened performance history (all exercises, newest first).
 */
export function detectPerformanceTrends(
  performanceHistory: ExercisePerformanceEntry[],
): PerformanceTrend[] {
  if (performanceHistory.length === 0) return [];

  // Group by exercise, preserving newest-first order from the input
  const grouped = new Map<string, ExercisePerformanceEntry[]>();
  for (const entry of performanceHistory) {
    const list = grouped.get(entry.exerciseName) ?? [];
    list.push(entry);
    grouped.set(entry.exerciseName, list);
  }

  const trends: PerformanceTrend[] = [];

  for (const [exerciseName, entries] of grouped) {
    if (entries.length < MIN_SESSIONS) {
      trends.push({
        exerciseName,
        status:       "insufficient_data",
        recentVolume: 0,
        priorVolume:  0,
        sessionCount: entries.length,
      });
      continue;
    }

    const recent = entries.slice(0, 2).map(volumeProxy);
    const prior  = entries.slice(2, 4).map(volumeProxy);

    trends.push({
      exerciseName,
      status:       detectStatus(entries),
      recentVolume: Math.round(mean(recent) * 10) / 10,
      priorVolume:  Math.round(mean(prior)  * 10) / 10,
      sessionCount: entries.length,
    });
  }

  return trends.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
