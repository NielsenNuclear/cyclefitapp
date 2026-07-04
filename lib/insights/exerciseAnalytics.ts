// ─── lib/insights/exerciseAnalytics.ts ───────────────────────────────────────
// Phase 63F — Exercise Analytics
// Ranks exercises by productivity, adherence, and estimated fatigue cost.
// All signals derived from logged workout history — no external data required.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseMetrics {
  name:              string;
  timesAppeared:     number;     // sessions it was programmed
  completionRate:    number;     // 0–1 (session completed / appeared)
  avgSetsLogged:     number;
  avgRpe:            number | null;  // null if no RPE data
  estimatedFatigue:  number;    // 0–100, relative fatigue cost (RPE × sets)
  productivityScore: number;    // 0–100 composite
  primaryMuscles:    string[];
}

export interface ExerciseAnalyticsReport {
  exercises:       ExerciseMetrics[];
  topPerformers:   ExerciseMetrics[];   // top 3 by productivityScore
  highFatigue:     ExerciseMetrics[];   // top 3 by estimatedFatigue
  highAdherence:   ExerciseMetrics[];   // top 3 by completionRate (min 5 appearances)
  totalExercisesTracked: number;
  dataReady:       boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function productivityScore(completionRate: number, avgSets: number, avgRpe: number | null): number {
  // Completion rate contributes 50%, volume 30%, RPE efficacy 20%
  const completionPart = completionRate * 50;
  const volumePart     = Math.min(30, (avgSets / 5) * 30);
  const rpePart        = avgRpe !== null ? Math.min(20, ((avgRpe - 4) / 6) * 20) : 10;
  return Math.round(completionPart + volumePart + rpePart);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeExerciseAnalytics(history: WorkoutHistoryEntry[]): ExerciseAnalyticsReport {
  const EMPTY: ExerciseAnalyticsReport = {
    exercises: [], topPerformers: [], highFatigue: [], highAdherence: [],
    totalExercisesTracked: 0, dataReady: false,
  };

  const completed = history.filter(e => e.status === "completed" || e.status === "partially_completed");
  if (completed.length < 5) return EMPTY;

  // Build per-exercise aggregates
  const map = new Map<string, {
    appeared: number;
    completedSessions: number;
    totalSets: number;
    rpeSum: number;
    rpeCount: number;
    muscles: Set<string>;
  }>();

  history.forEach(entry => {
    const isCompleted = entry.status === "completed" || entry.status === "partially_completed";
    entry.exercises.forEach(ex => {
      if (!map.has(ex.name)) {
        map.set(ex.name, { appeared: 0, completedSessions: 0, totalSets: 0, rpeSum: 0, rpeCount: 0, muscles: new Set() });
      }
      const m = map.get(ex.name)!;
      m.appeared++;
      if (isCompleted) m.completedSessions++;
      m.totalSets += ex.sets;
      if (ex.rpe !== undefined) { m.rpeSum += ex.rpe; m.rpeCount++; }
      (ex.primaryMuscles ?? []).forEach(mu => m.muscles.add(mu));
    });
  });

  const exercises: ExerciseMetrics[] = Array.from(map.entries()).map(([name, m]) => {
    const completionRate = m.appeared > 0 ? m.completedSessions / m.appeared : 0;
    const avgSets        = m.completedSessions > 0 ? m.totalSets / m.completedSessions : 0;
    const avgRpe         = m.rpeCount > 0 ? Math.round((m.rpeSum / m.rpeCount) * 10) / 10 : null;
    const estimatedFatigue = Math.min(100, Math.round((avgRpe ?? 6) * avgSets * 2));
    return {
      name,
      timesAppeared:   m.appeared,
      completionRate:  Math.round(completionRate * 100) / 100,
      avgSetsLogged:   Math.round(avgSets * 10) / 10,
      avgRpe,
      estimatedFatigue,
      productivityScore: productivityScore(completionRate, avgSets, avgRpe),
      primaryMuscles: Array.from(m.muscles),
    };
  });

  exercises.sort((a, b) => b.productivityScore - a.productivityScore);

  return {
    exercises,
    topPerformers:  exercises.slice(0, 3),
    highFatigue:    [...exercises].sort((a, b) => b.estimatedFatigue - a.estimatedFatigue).slice(0, 3),
    highAdherence:  [...exercises]
      .filter(e => e.timesAppeared >= 5)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 3),
    totalExercisesTracked: exercises.length,
    dataReady: exercises.length > 0,
  };
}
