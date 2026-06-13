// ─── lib/progression/exerciseProgress.ts ─────────────────────────────────────
// Per-exercise performance tracking from logged workout data.

import type { LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseTrend = "improving" | "stable" | "declining" | "insufficient_data";

export type ProgressionState = "progressing" | "stalled" | "regressing" | "new";

export interface ExerciseProgressEntry {
  date:      string;  // YYYY-MM-DD
  sets:      number;
  rpe:       number;  // 0 = not recorded
  volume:    number;  // completedSets (set-count proxy)
}

export interface ExerciseProgressSummary {
  exerciseName:      string;
  appearances:       number;         // total times exercise appeared (completed + skipped)
  completedCount:    number;         // appearances where completedSets > 0
  skippedCount:      number;         // appearances where completedSets === 0
  frequency:         number;         // = completedCount — kept for downstream compatibility
  averageRPE:        number;         // mean actualRPE across completed appearances (0 if none)
  averageSets:       number;         // mean completedSets across completed appearances
  averageReps:       string;         // prescribedReps from most recent appearance
  trend:             ExerciseTrend;  // RPE-based adaptation signal
  progressionStatus: ProgressionState; // completion-rate-based behavioural signal
  lastPerformed:     string;         // most recent date with completedSets > 0
  entries:           ExerciseProgressEntry[];
}

// ─── Trend detection ──────────────────────────────────────────────────────────
//
// Compare mean RPE of first half vs second half of completed entries.
// Declining RPE over time = improvement (same effort → easier).
// Requires ≥ 4 data points for a reliable signal.

function detectTrend(entries: ExerciseProgressEntry[]): ExerciseTrend {
  const withRPE = entries.filter(e => e.rpe > 0);
  if (withRPE.length < 4) return "insufficient_data";

  const mid      = Math.floor(withRPE.length / 2);
  const earlyRPE = withRPE.slice(0, mid).map(e => e.rpe);
  const lateRPE  = withRPE.slice(mid).map(e => e.rpe);

  const earlyMean = earlyRPE.reduce((s, v) => s + v, 0) / earlyRPE.length;
  const lateMean  = lateRPE.reduce((s, v) =>  s + v, 0) / lateRPE.length;

  const delta = lateMean - earlyMean;

  if (delta <= -0.75) return "improving";   // effort decreasing = exercise becoming easier
  if (delta >=  0.75) return "declining";   // effort increasing = exercise getting harder
  return "stable";
}

// ─── Progression status detection ─────────────────────────────────────────────
//
// Answers: is the user showing up for this exercise?
//   new        → < 3 appearances (not enough data)
//   regressing → skipped > 50 % of appearances (repeated avoidance)
//   progressing → completed ≥ 75 % of appearances (consistent execution)
//   stalled     → between 50–74 % completion (inconsistent)

function detectProgressionStatus(
  appearances:    number,
  completedCount: number,
  skippedCount:   number,
): ProgressionState {
  if (appearances < 3) return "new";
  if (skippedCount / appearances > 0.5) return "regressing";
  if (completedCount / appearances >= 0.75) return "progressing";
  return "stalled";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Aggregates exercise performance from the logged workout history.
 * All workouts are included regardless of completionStatus — skip detection
 * happens per-exercise via completedSets === 0.
 * Returns one summary per unique exercise name, sorted by appearances desc.
 */
export function getExerciseProgress(
  log:          LoggedWorkout[],
  lookbackDays: number = 30,
): ExerciseProgressSummary[] {
  if (log.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  const cutoff = cutoffDate.toISOString().slice(0, 10);

  const recent = log.filter(w => w.date >= cutoff);

  const completedByExercise  = new Map<string, ExerciseProgressEntry[]>();
  const appearancesByExercise = new Map<string, number>();
  const skippedByExercise    = new Map<string, number>();
  const lastRepsByExercise   = new Map<string, string>();
  const lastDateByExercise   = new Map<string, string>();

  for (const workout of recent) {
    for (const ex of workout.exercises) {
      if (!ex.exerciseName) continue;

      const name = ex.exerciseName;
      appearancesByExercise.set(name, (appearancesByExercise.get(name) ?? 0) + 1);
      lastRepsByExercise.set(name, ex.prescribedReps);

      if (ex.completedSets > 0) {
        const entry: ExerciseProgressEntry = {
          date:   workout.date,
          sets:   ex.completedSets,
          rpe:    ex.actualRPE ?? 0,
          volume: ex.completedSets,
        };
        const list = completedByExercise.get(name) ?? [];
        list.push(entry);
        completedByExercise.set(name, list);

        // Track most recent completion date
        const prev = lastDateByExercise.get(name);
        if (!prev || workout.date > prev) {
          lastDateByExercise.set(name, workout.date);
        }
      } else {
        skippedByExercise.set(name, (skippedByExercise.get(name) ?? 0) + 1);
      }
    }
  }

  const summaries: ExerciseProgressSummary[] = [];

  for (const exerciseName of appearancesByExercise.keys()) {
    const entries      = (completedByExercise.get(exerciseName) ?? [])
      .sort((a, b) => a.date.localeCompare(b.date));
    const appearances  = appearancesByExercise.get(exerciseName) ?? 0;
    const completed    = entries.length;
    const skipped      = skippedByExercise.get(exerciseName) ?? 0;

    const withRPE = entries.filter(e => e.rpe > 0);
    const avgRPE  = withRPE.length > 0
      ? withRPE.reduce((s, e) => s + e.rpe, 0) / withRPE.length
      : 0;

    const avgSets = completed > 0
      ? entries.reduce((s, e) => s + e.sets, 0) / completed
      : 0;

    summaries.push({
      exerciseName,
      appearances,
      completedCount:    completed,
      skippedCount:      skipped,
      frequency:         completed,
      averageRPE:        Math.round(avgRPE  * 10) / 10,
      averageSets:       Math.round(avgSets * 10) / 10,
      averageReps:       lastRepsByExercise.get(exerciseName) ?? "",
      trend:             detectTrend(entries),
      progressionStatus: detectProgressionStatus(appearances, completed, skipped),
      lastPerformed:     lastDateByExercise.get(exerciseName) ?? "",
      entries,
    });
  }

  return summaries.sort((a, b) => b.appearances - a.appearances);
}
