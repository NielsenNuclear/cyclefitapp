// ─── lib/analytics/trainingLoad.ts ───────────────────────────────────────────
// Training-load estimation layer.
// Pure logic — no React, no side effects.
// All values are estimates for informational purposes only.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { TrainingState } from "@/lib/exercises/generateWorkout";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryStatus = "Recovered" | "Normal" | "Elevated Fatigue" | "High Fatigue";
export type WorkloadTrend  = "Increasing" | "Stable" | "Decreasing";

export interface TrainingLoadInput {
  history:               WorkoutHistoryEntry[];
  currentTrainingState?: TrainingState;
  currentEnergyLevel?:   number;             // 0–4 from deriveEnergyLevel()
}

export interface TrainingLoadReport {
  recoveryStatus:       RecoveryStatus;
  workloadTrend:        WorkloadTrend;
  weeklyVolume:         number;              // total sets from completed workouts this week
  previousWeekVolume:   number;              // same metric, prior 7-day window
  completedWorkouts:    number;              // completed/partially_completed this week
  recentCompletionRate: number;              // 0–1, last 14 days non-pending entries
  trainingDensity:      number;              // completed workouts per 7 days over last 14
  currentStreak:        number;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

// ─── Volume calculation ───────────────────────────────────────────────────────
// Total sets across all exercises in an entry (proxy metric — history stores
// slimmed StoredExercise records without muscle data).

function entryVolume(entry: WorkoutHistoryEntry): number {
  return entry.exercises.reduce((sum, ex) => sum + ex.sets, 0);
}

// ─── Streak calculation ───────────────────────────────────────────────────────

function currentStreak(history: WorkoutHistoryEntry[]): number {
  const trained = new Set(
    history
      .filter(e => e.status === "completed" || e.status === "partially_completed")
      .map(e => e.id)
  );

  if (trained.size === 0) return 0;

  const cursor = new Date();
  if (!trained.has(toDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (trained.has(toDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─── Recovery status scoring ──────────────────────────────────────────────────
// Points accumulate from multiple signals; final score maps to status tier.

function scoreRecoveryStatus(
  workoutsLast7:    number,
  completionRate14: number,
  trainingState?:   TrainingState,
  energyLevel?:     number,
): RecoveryStatus {
  let score = 0;

  // Training frequency this week
  if (workoutsLast7 >= 5) score += 3;
  else if (workoutsLast7 === 4) score += 2;
  else if (workoutsLast7 === 3) score += 1;
  else if (workoutsLast7 <= 1) score -= 1;

  // Training state from today's generation context
  if (trainingState === "overreached") score += 3;
  else if (trainingState === "fatigued") score += 2;
  else if (trainingState === "loaded")  score += 1;

  // Energy level signal
  if (energyLevel !== undefined && energyLevel <= 1) score += 1;

  // Completion quality over last 14 days
  if (completionRate14 < 0.7) score += 1;

  if (score >= 6) return "High Fatigue";
  if (score >= 4) return "Elevated Fatigue";
  if (score >= 2) return "Normal";
  return "Recovered";
}

// ─── Workload trend ───────────────────────────────────────────────────────────

function calcWorkloadTrend(thisWeek: number, prevWeek: number): WorkloadTrend {
  if (thisWeek === 0 && prevWeek === 0) return "Stable";
  if (prevWeek === 0) return thisWeek > 0 ? "Increasing" : "Stable";
  const ratio = thisWeek / prevWeek;
  if (ratio > 1.1) return "Increasing";
  if (ratio < 0.9) return "Decreasing";
  return "Stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateTrainingLoadReport(input: TrainingLoadInput): TrainingLoadReport {
  const { history, currentTrainingState, currentEnergyLevel } = input;

  const todayStr    = toDateString(new Date());
  const day7Ago     = daysAgo(7);
  const day14Ago    = daysAgo(14);
  const day8Ago     = daysAgo(8);   // start of previous 7-day window

  const isCompleted = (e: WorkoutHistoryEntry) =>
    e.status === "completed" || e.status === "partially_completed";

  // This week: last 7 days (inclusive of today)
  const thisWeekEntries = history.filter(e => e.id >= day7Ago && e.id <= todayStr);
  const completedThisWeek = thisWeekEntries.filter(isCompleted);

  // Previous 7-day window: days 8–14 ago
  const prevWeekEntries = history.filter(e => e.id >= day14Ago && e.id < day8Ago);
  const completedPrevWeek = prevWeekEntries.filter(isCompleted);

  // Volume: total sets from completed entries only
  const weeklyVolume       = completedThisWeek.reduce((s, e) => s + entryVolume(e), 0);
  const previousWeekVolume = completedPrevWeek.reduce((s, e) => s + entryVolume(e), 0);

  // Completion rate: last 14 days, non-pending entries only
  const last14NonPending = history.filter(
    e => e.id >= day14Ago && e.id <= todayStr && e.status !== "pending"
  );
  const recentCompletionRate =
    last14NonPending.length > 0
      ? last14NonPending.filter(isCompleted).length / last14NonPending.length
      : 1.0;

  // Training density: completed workouts per 7 days over last 14
  const completedLast14 = history.filter(
    e => e.id >= day14Ago && e.id <= todayStr && isCompleted(e)
  );
  const trainingDensity = completedLast14.length / 2; // per-7-day average over 14 days

  const recoveryStatus = scoreRecoveryStatus(
    completedThisWeek.length,
    recentCompletionRate,
    currentTrainingState,
    currentEnergyLevel,
  );

  return {
    recoveryStatus,
    workloadTrend:        calcWorkloadTrend(weeklyVolume, previousWeekVolume),
    weeklyVolume,
    previousWeekVolume,
    completedWorkouts:    completedThisWeek.length,
    recentCompletionRate,
    trainingDensity,
    currentStreak:        currentStreak(history),
  };
}
