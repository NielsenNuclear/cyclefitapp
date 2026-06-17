// ─── lib/goals/goalTracking.ts ────────────────────────────────────────────────
// Maps GoalType to the right metric source and computes a current snapshot.
// All reads are from existing stores — no new persistence here.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import { getAllExerciseHistory } from "@/lib/progression/exerciseHistory";
import { getWorkoutHistory }     from "@/lib/history/workoutHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalMetricType =
  | "strength_1rm"      // peak Epley 1RM across tracked lifts (kg)
  | "volume_load"       // weekly volume load proxy (sets × reps × (weight+1))
  | "session_frequency" // sessions per week (rolling 4-week)
  | "readiness_trend";  // average readiness score over 4 weeks (0–100)

export interface GoalSnapshot {
  goalType:        GoalType;
  metricType:      GoalMetricType;
  metricLabel:     string;       // user-facing label
  currentValue:    number;       // latest measured value
  baselineValue:   number;       // starting point (first 3-session average)
  targetValue:     number;       // derived target (20% above baseline for strength etc)
  unit:            string;       // e.g. "kg", "sets/wk", "sessions/wk"
  sessionCount:    number;       // how many tracked sessions contribute
  hasEnoughData:   boolean;      // need ≥ 3 sessions
}

// ─── Epley 1RM ────────────────────────────────────────────────────────────────

function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// ─── Metric computers ─────────────────────────────────────────────────────────

function computeStrengthSnapshot(goalType: GoalType): GoalSnapshot {
  const history = getAllExerciseHistory().filter(e => e.completed && e.weight > 0);
  const sessionCount = new Set(history.map(e => `${e.exerciseName}:${e.date}`)).size;

  if (sessionCount < 3) {
    return {
      goalType, metricType: "strength_1rm", metricLabel: "Peak estimated 1RM",
      currentValue: 0, baselineValue: 0, targetValue: 0, unit: "kg",
      sessionCount, hasEnoughData: false,
    };
  }

  // Group all 1RMs by date, sum across exercises on that day
  const byDate = new Map<string, number>();
  for (const e of history) {
    const rm = epley1RM(e.weight, e.reps);
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + rm);
  }
  const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const earlyAvg = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0) / Math.min(sorted.length, 3);
  const lateAvg  = sorted.slice(-3).reduce((s, [, v]) => s + v, 0) / Math.min(sorted.length, 3);

  return {
    goalType, metricType: "strength_1rm", metricLabel: "Peak estimated 1RM",
    currentValue:  Math.round(lateAvg),
    baselineValue: Math.round(earlyAvg),
    targetValue:   Math.round(earlyAvg * 1.20),   // +20% from baseline
    unit:          "kg",
    sessionCount,
    hasEnoughData: true,
  };
}

function computeVolumeSnapshot(goalType: GoalType): GoalSnapshot {
  const history = getAllExerciseHistory().filter(e => e.completed);

  // Roll up into weekly buckets (7-day windows)
  const weeklyVolumes: number[] = [];
  for (let w = 0; w < 8; w++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - w * 7);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
    const endStr   = endDate.toISOString().slice(0, 10);
    const startStr = startDate.toISOString().slice(0, 10);
    const weekEntries = history.filter(e => e.date >= startStr && e.date < endStr);
    if (weekEntries.length > 0) {
      const vol = weekEntries.reduce((s, e) => s + (e.weight + 1) * e.reps * e.sets, 0);
      weeklyVolumes.push(vol);
    }
  }

  const sessionCount = history.length;

  if (weeklyVolumes.length < 2) {
    return {
      goalType, metricType: "volume_load", metricLabel: "Weekly volume load",
      currentValue: 0, baselineValue: 0, targetValue: 0, unit: "arb. units",
      sessionCount, hasEnoughData: false,
    };
  }

  const currentValue  = weeklyVolumes[0];
  const baselineValue = weeklyVolumes[weeklyVolumes.length - 1];
  const targetValue   = Math.round(baselineValue * 1.25);  // +25% from earliest

  return {
    goalType, metricType: "volume_load", metricLabel: "Weekly volume load",
    currentValue:  Math.round(currentValue),
    baselineValue: Math.round(baselineValue),
    targetValue,
    unit:          "arb. units",
    sessionCount,
    hasEnoughData: true,
  };
}

function computeFrequencySnapshot(goalType: GoalType, targetSessions: number): GoalSnapshot {
  const history  = getWorkoutHistory();
  const completed = history.filter(
    h => h.status === "completed" || h.status === "partially_completed"
  );
  const sessionCount = completed.length;

  if (sessionCount < 3) {
    return {
      goalType, metricType: "session_frequency", metricLabel: "Sessions per week",
      currentValue: 0, baselineValue: 0, targetValue: targetSessions, unit: "sessions/wk",
      sessionCount, hasEnoughData: false,
    };
  }

  // Rolling 4-week average
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksStr = fourWeeksAgo.toISOString().slice(0, 10);
  const recent = completed.filter(h => h.id >= fourWeeksStr);
  const currentValue = Math.round((recent.length / 4) * 10) / 10;

  // Baseline: earliest 4 weeks
  const sorted = [...completed].sort((a, b) => a.id.localeCompare(b.id));
  const earliestDate = new Date(sorted[0].id);
  const baselineEnd  = new Date(earliestDate);
  baselineEnd.setDate(earliestDate.getDate() + 28);
  const baselineEndStr = baselineEnd.toISOString().slice(0, 10);
  const baselineEntries = sorted.filter(h => h.id <= baselineEndStr);
  const baselineValue   = Math.round((baselineEntries.length / 4) * 10) / 10;

  return {
    goalType, metricType: "session_frequency", metricLabel: "Sessions per week",
    currentValue,
    baselineValue,
    targetValue:  targetSessions,
    unit:         "sessions/wk",
    sessionCount,
    hasEnoughData: true,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeGoalSnapshot(
  goalType:      GoalType,
  targetSessions: number = 3,
): GoalSnapshot {
  switch (goalType) {
    case "strength":
      return computeStrengthSnapshot(goalType);
    case "hypertrophy":
      return computeVolumeSnapshot(goalType);
    case "fat_loss":
    case "general_fitness":
      return computeFrequencySnapshot(goalType, targetSessions);
    case "athletic_performance":
      return computeStrengthSnapshot(goalType);  // strength proxy for performance
  }
}
