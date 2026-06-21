// ─── lib/performance/goalVelocity.ts ─────────────────────────────────────────
// Phase 36H — Goal velocity: rate of progress and estimated time to goal.

import { getPerformanceDatabase } from "./performanceDatabase";
import { epley1RM } from "./strengthEngine";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoalVelocity {
  goalType:        GoalType;
  metric:          string;           // what is being measured (e.g. "avg estimated 1RM")
  currentValue:    number;           // today's value
  baselineValue:   number;           // 4-week-ago value
  changePercent:   number;           // % change vs baseline
  weeklyRatePercent: number;         // projected % gain per week
  onTrack:         boolean;
  etaWeeks:        number | null;    // null = no target / already there / no data
  targetPercent:   number;           // target % above baseline (goal-specific benchmark)
  message:         string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Benchmark weekly gain rates per goal type (literature-informed, conservative)
const TARGET_WEEKLY_RATE: Record<GoalType, number> = {
  strength:            0.75,   // % gain in 1RM per week
  hypertrophy:         0.50,   // % gain in volume per week
  fat_loss:            0.25,   // % gain in density (vol/time) per week
  athletic_performance: 0.60,
  general_fitness:     0.30,
};

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function metricValue(records: ReturnType<typeof getPerformanceDatabase>, goalType: GoalType): number {
  if (records.length === 0) return 0;
  switch (goalType) {
    case "strength":
    case "athletic_performance":
      return mean(records.filter(r => r.weight > 0).map(r => epley1RM(r.weight, r.actualReps)));
    case "hypertrophy":
    case "general_fitness":
    case "fat_loss":
    default:
      return mean(records.map(r => (r.weight + 1) * r.actualReps * r.completedSets));
  }
}

function metricLabel(goalType: GoalType): string {
  switch (goalType) {
    case "strength":
    case "athletic_performance": return "avg estimated 1RM (kg)";
    default:                      return "avg session volume";
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeGoalVelocity(goalType: GoalType, today: string): GoalVelocity {
  const db = getPerformanceDatabase();

  const d4w = new Date(today); d4w.setDate(d4w.getDate() - 28);
  const d8w = new Date(today); d8w.setDate(d8w.getDate() - 56);
  const d4wStr = d4w.toISOString().slice(0, 10);
  const d8wStr = d8w.toISOString().slice(0, 10);

  const recentRecords   = db.filter(r => r.date >= d4wStr);
  const baselineRecords = db.filter(r => r.date >= d8wStr && r.date < d4wStr);

  const empty: GoalVelocity = {
    goalType, metric: metricLabel(goalType),
    currentValue: 0, baselineValue: 0, changePercent: 0,
    weeklyRatePercent: 0, onTrack: false, etaWeeks: null,
    targetPercent: TARGET_WEEKLY_RATE[goalType] * 4,
    message: "Log at least 4 weeks of sessions to calculate goal velocity.",
  };

  if (recentRecords.length < 2 || baselineRecords.length < 2) return empty;

  const current  = metricValue(recentRecords, goalType);
  const baseline = metricValue(baselineRecords, goalType);

  if (baseline === 0) return empty;

  const changePercent    = Math.round(((current - baseline) / baseline) * 1000) / 10;
  const weeklyRate       = Math.round((changePercent / 4) * 10) / 10; // per week over 4 weeks
  const targetWeeklyRate = TARGET_WEEKLY_RATE[goalType];
  const onTrack          = weeklyRate >= targetWeeklyRate * 0.75;

  // ETA: how many more weeks to hit +15% above current baseline
  const targetGain    = 15; // % above baseline — aspirational milestone
  const remaining     = targetGain - changePercent;
  const etaWeeks      = weeklyRate > 0 && remaining > 0
    ? Math.round(remaining / weeklyRate)
    : null;

  const message = onTrack
    ? `Progressing at ${weeklyRate}%/wk — on track for your ${goalType.replace("_", " ")} goal.`
    : weeklyRate <= 0
    ? `No measurable progress in 4 weeks — consider adjusting training stimulus.`
    : `Progressing at ${weeklyRate}%/wk. Target is ${targetWeeklyRate}%/wk — push intensity slightly.`;

  return {
    goalType,
    metric:           metricLabel(goalType),
    currentValue:     Math.round(current * 10) / 10,
    baselineValue:    Math.round(baseline * 10) / 10,
    changePercent,
    weeklyRatePercent: weeklyRate,
    onTrack,
    etaWeeks,
    targetPercent:    TARGET_WEEKLY_RATE[goalType] * 4,
    message,
  };
}
