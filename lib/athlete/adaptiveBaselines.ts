// ─── lib/athlete/adaptiveBaselines.ts ────────────────────────────────────────
// Phase 62B — Personal Baselines
// Replaces generic population averages with each athlete's own history.
// All recommendations that compare "today vs normal" draw from here.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryScore }         from "@/lib/recovery/recoveryScore";
import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BaselineConfidence = "insufficient" | "building" | "established" | "solid";

export interface PersonalBaselines {
  avgReadiness:           number;     // 0–100
  avgRecovery:            number;     // 0–100
  avgSessionDurationMin:  number;     // minutes
  avgWeeklyFrequency:     number;     // sessions/week
  avgWeeklyVolumeSets:    number;     // sets/week
  readinessP25:           number;     // 25th percentile ("low day")
  readinessP75:           number;     // 75th percentile ("good day")
  recoveryP25:            number;
  recoveryP75:            number;
  readinessTodayVsBaseline: "above" | "at" | "below" | "unknown";
  recoveryTodayVsBaseline:  "above" | "at" | "below" | "unknown";
  confidence:             BaselineConfidence;
  samplesUsed:            number;
  dataReady:              boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function confidenceLevel(n: number): BaselineConfidence {
  if (n < 7)  return "insufficient";
  if (n < 21) return "building";
  if (n < 42) return "established";
  return "solid";
}

function compareToBaseline(today: number | undefined, avg: number, spread: number): "above" | "at" | "below" | "unknown" {
  if (today === undefined || avg === 0) return "unknown";
  if (today >= avg + spread * 0.5) return "above";
  if (today <= avg - spread * 0.5) return "below";
  return "at";
}

// ─── Weeks grouping ───────────────────────────────────────────────────────────

function sessionsPerWeek(history: WorkoutHistoryEntry[]): number {
  if (history.length < 2) return 0;
  const completed = history.filter(e => e.status === "completed" || e.status === "partially_completed");
  const dates = completed.map(e => new Date(e.id).getTime()).sort((a, b) => a - b);
  if (dates.length < 2) return 0;
  const weeks = (dates[dates.length - 1] - dates[0]) / (7 * 24 * 3600 * 1000);
  return weeks < 1 ? completed.length : completed.length / weeks;
}

function setsPerWeek(history: WorkoutHistoryEntry[]): number {
  const completed = history.filter(e => e.status === "completed" || e.status === "partially_completed");
  if (completed.length < 7) return 0;
  const totalSets = completed.reduce((s, e) =>
    s + e.exercises.reduce((es, ex) => es + ex.sets, 0), 0);
  const dates = completed.map(e => new Date(e.id).getTime()).sort((a, b) => a - b);
  const weeks = Math.max(1, (dates[dates.length - 1] - dates[0]) / (7 * 24 * 3600 * 1000));
  return totalSets / weeks;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computePersonalBaselines(
  readinessHistory:  ReadinessHistoryEntry[],
  recoveryScores:    RecoveryScore[],
  workoutHistory:    WorkoutHistoryEntry[],
  todayReadiness?:   number,
  todayRecovery?:    number,
): PersonalBaselines {
  const EMPTY: PersonalBaselines = {
    avgReadiness: 65, avgRecovery: 65,
    avgSessionDurationMin: 0, avgWeeklyFrequency: 0, avgWeeklyVolumeSets: 0,
    readinessP25: 50, readinessP75: 80,
    recoveryP25: 50, recoveryP75: 80,
    readinessTodayVsBaseline: "unknown",
    recoveryTodayVsBaseline: "unknown",
    confidence: "insufficient",
    samplesUsed: 0,
    dataReady: false,
  };

  const rdxScores = readinessHistory.map(e => e.score).sort((a, b) => a - b);
  const recScores = recoveryScores.map(s => s.score).sort((a, b) => a - b);

  const n = Math.min(rdxScores.length, recScores.length);
  if (n < 3) return EMPTY;

  const avgReadiness = rdxScores.reduce((s, v) => s + v, 0) / rdxScores.length;
  const avgRecovery  = recScores.reduce((s, v) => s + v, 0) / recScores.length;

  const rdxP25 = percentile(rdxScores, 25);
  const rdxP75 = percentile(rdxScores, 75);
  const recP25 = percentile(recScores, 25);
  const recP75 = percentile(recScores, 75);
  const rdxSpread = rdxP75 - rdxP25;
  const recSpread = recP75 - recP25;

  const avgDuration = workoutHistory.length > 0
    ? workoutHistory.reduce((s, e) => s + e.estimatedDurationMin, 0) / workoutHistory.length
    : 0;

  return {
    avgReadiness:            Math.round(avgReadiness),
    avgRecovery:             Math.round(avgRecovery),
    avgSessionDurationMin:   Math.round(avgDuration),
    avgWeeklyFrequency:      Math.round(sessionsPerWeek(workoutHistory) * 10) / 10,
    avgWeeklyVolumeSets:     Math.round(setsPerWeek(workoutHistory)),
    readinessP25:            Math.round(rdxP25),
    readinessP75:            Math.round(rdxP75),
    recoveryP25:             Math.round(recP25),
    recoveryP75:             Math.round(recP75),
    readinessTodayVsBaseline: compareToBaseline(todayReadiness, avgReadiness, rdxSpread),
    recoveryTodayVsBaseline:  compareToBaseline(todayRecovery,  avgRecovery,  recSpread),
    confidence:              confidenceLevel(n),
    samplesUsed:             n,
    dataReady:               n >= 7,
  };
}
