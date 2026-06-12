// ─── lib/progression/exerciseProgress.ts ─────────────────────────────────────
// Per-exercise performance tracking from logged workout data.

import type { LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseTrend = "improving" | "stable" | "declining" | "insufficient_data";

export interface ExerciseProgressEntry {
  date:      string;  // YYYY-MM-DD
  sets:      number;
  rpe:       number;  // 0 = not recorded
  volume:    number;  // completedSets × 1 (volume proxy — reps are strings so we count sets)
}

export interface ExerciseProgressSummary {
  exerciseName:  string;
  frequency:     number;         // sessions in period
  averageRPE:    number;         // mean actual RPE across logged sessions (0 if none)
  trend:         ExerciseTrend;
  lastSeen:      string;         // most recent date
  entries:       ExerciseProgressEntry[];
}

// ─── Trend detection ──────────────────────────────────────────────────────────
//
// Compare mean RPE of first half vs second half of recent entries.
// Declining RPE over time = improvement (same effort → easier).
// Requires ≥4 data points for a reliable signal.

function detectTrend(entries: ExerciseProgressEntry[]): ExerciseTrend {
  const withRPE = entries.filter(e => e.rpe > 0);
  if (withRPE.length < 4) return "insufficient_data";

  const mid      = Math.floor(withRPE.length / 2);
  const earlyRPE = withRPE.slice(0, mid).map(e => e.rpe);
  const lateRPE  = withRPE.slice(mid).map(e => e.rpe);

  const earlyMean = earlyRPE.reduce((s, v) => s + v, 0) / earlyRPE.length;
  const lateMean  = lateRPE.reduce((s, v)  => s + v, 0) / lateRPE.length;

  const delta = lateMean - earlyMean;

  if (delta <= -0.75) return "improving";   // effort decreasing = easier = improving
  if (delta >=  0.75) return "declining";   // effort increasing = harder = declining
  return "stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Aggregates exercise performance from the logged workout history.
 * Returns one summary per unique exercise name, sorted by frequency desc.
 */
export function getExerciseProgress(
  log:        LoggedWorkout[],
  lookbackDays: number = 30,
): ExerciseProgressSummary[] {
  if (log.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  const cutoff = cutoffDate.toISOString().slice(0, 10);

  const recent = log.filter(w => w.date >= cutoff && w.completionStatus !== "skipped");

  // Group by exercise name
  const byExercise = new Map<string, ExerciseProgressEntry[]>();

  for (const workout of recent) {
    for (const ex of workout.exercises) {
      if (!ex.exerciseName) continue;
      const entry: ExerciseProgressEntry = {
        date:   workout.date,
        sets:   ex.completedSets,
        rpe:    ex.actualRPE ?? 0,
        volume: ex.completedSets,
      };
      const list = byExercise.get(ex.exerciseName) ?? [];
      list.push(entry);
      byExercise.set(ex.exerciseName, list);
    }
  }

  const summaries: ExerciseProgressSummary[] = [];

  for (const [exerciseName, entries] of byExercise) {
    const sorted   = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const withRPE  = sorted.filter(e => e.rpe > 0);
    const avgRPE   = withRPE.length > 0
      ? withRPE.reduce((s, e) => s + e.rpe, 0) / withRPE.length
      : 0;

    summaries.push({
      exerciseName,
      frequency:   sorted.length,
      averageRPE:  Math.round(avgRPE * 10) / 10,
      trend:       detectTrend(sorted),
      lastSeen:    sorted[sorted.length - 1].date,
      entries:     sorted,
    });
  }

  return summaries.sort((a, b) => b.frequency - a.frequency);
}
