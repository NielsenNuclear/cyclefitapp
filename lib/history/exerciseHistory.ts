// ─── lib/history/exerciseHistory.ts ──────────────────────────────────────────
// Aggregates per-exercise statistics from the workout log.
// Reads from axis_workout_log (lib/workoutExecution/workoutLogging.ts).
// Pure logic — no React, no side effects.

import { getWorkoutLog } from "@/lib/workoutExecution/workoutLogging";

const RECENT_WINDOW = 3; // sessions for trend comparison

export interface ExerciseSetRecord {
  date:   string;  // YYYY-MM-DD
  reps:   number;
  weight: number;  // kg; 0 = bodyweight
  rpe:    number;  // 0 = not recorded
}

export interface ExerciseTrend {
  direction: "improving" | "stable" | "declining";
  metric:    "volume" | "weight" | "rpe";
}

export interface ExerciseHistorySummary {
  exerciseName:    string;
  completionCount: number;           // total sessions with this exercise completed
  bestSet:         ExerciseSetRecord | null;
  lastPerformed:   string | null;    // YYYY-MM-DD
  trend:           ExerciseTrend | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weightedVolume(reps: number, weight: number): number {
  return reps * Math.max(1, weight);
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function getExerciseHistory(exerciseName: string): ExerciseHistorySummary {
  const log = getWorkoutLog();

  // Only count sessions where the exercise was completed (at least 1 set done)
  const sessions = log
    .filter(w => w.completionStatus !== "skipped")
    .flatMap(w =>
      w.exercises
        .filter(e => e.exerciseName === exerciseName && e.completedSets > 0)
        .map(e => ({
          date:   w.date,
          sets:   e.completedSets,
          reps:   e.actualReps ?? (parseInt(e.completedReps, 10) || 0),
          weight: e.weight ?? 0,
          rpe:    e.actualRPE ?? 0,
        }))
    )
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  if (sessions.length === 0) {
    return { exerciseName, completionCount: 0, bestSet: null, lastPerformed: null, trend: null };
  }

  // Best set: highest volume (reps × weight; bodyweight uses reps only)
  const bestSession = sessions.reduce((best, cur) => {
    const curVol  = weightedVolume(cur.reps, cur.weight);
    const bestVol = weightedVolume(best.reps, best.weight);
    return curVol > bestVol ? cur : best;
  });

  const bestSet: ExerciseSetRecord = {
    date:   bestSession.date,
    reps:   bestSession.reps,
    weight: bestSession.weight,
    rpe:    bestSession.rpe,
  };

  // Trend: compare average volume of RECENT_WINDOW newest vs. same number of older sessions
  let trend: ExerciseTrend | null = null;
  if (sessions.length >= RECENT_WINDOW * 2) {
    const recent = sessions.slice(0, RECENT_WINDOW);
    const older  = sessions.slice(RECENT_WINDOW, RECENT_WINDOW * 2);

    const avgRecent = recent.reduce((s, e) => s + weightedVolume(e.reps, e.weight), 0) / RECENT_WINDOW;
    const avgOlder  = older.reduce((s, e)  => s + weightedVolume(e.reps, e.weight), 0) / RECENT_WINDOW;

    const delta = avgOlder > 0 ? (avgRecent - avgOlder) / avgOlder : 0;

    trend = {
      direction: delta > 0.05 ? "improving" : delta < -0.05 ? "declining" : "stable",
      metric:    "volume",
    };
  }

  return {
    exerciseName,
    completionCount: sessions.length,
    bestSet,
    lastPerformed: sessions[0]?.date ?? null,
    trend,
  };
}
