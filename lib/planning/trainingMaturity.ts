// ─── lib/planning/trainingMaturity.ts ─────────────────────────────────────────
// Phase 38F — Training Maturity Score.
// Computes a dynamic maturity level from workout history, performance consistency,
// exercise complexity, and progression signals.
// Pure function — no storage, no React.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { ExercisePerformanceEntry } from "@/lib/progression/exercisePerformanceLog";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import type { ConsistencyScore } from "@/lib/adherence/consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaturityLevel = "beginner" | "developing" | "intermediate" | "advanced";

export interface MaturityComponents {
  volume:      number;   // 0–100 (workout count contribution)
  consistency: number;   // 0–100 (adherence/composite contribution)
  complexity:  number;   // 0–100 (exercise difficulty/variety)
  progression: number;   // 0–100 (performance improvement signal)
}

export interface TrainingMaturity {
  level:            MaturityLevel;
  score:            number;             // 0–100 composite
  daysTrainingAge:  number;
  trend:            "improving" | "stable" | "declined";
  components:       MaturityComponents;
  insight:          string;
  nextLevel:        MaturityLevel | null;
  weeksToNextLevel: number | null;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const LEVEL_MIN_SCORE: Record<MaturityLevel, number> = {
  beginner:     0,
  developing:   28,
  intermediate: 52,
  advanced:     75,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function levelFromScore(score: number, totalWorkouts: number): MaturityLevel {
  // Workout count floors provide a hard minimum training age gate
  if (totalWorkouts < 15 || score < LEVEL_MIN_SCORE.developing)   return "beginner";
  if (totalWorkouts < 50 || score < LEVEL_MIN_SCORE.intermediate) return "developing";
  if (totalWorkouts < 120 || score < LEVEL_MIN_SCORE.advanced)    return "intermediate";
  return "advanced";
}

function nextLevel(current: MaturityLevel): MaturityLevel | null {
  const map: Record<MaturityLevel, MaturityLevel | null> = {
    beginner:     "developing",
    developing:   "intermediate",
    intermediate: "advanced",
    advanced:     null,
  };
  return map[current];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeTrainingMaturity(
  rawHistory:        WorkoutHistoryEntry[],
  perfHistory:       ExercisePerformanceEntry[],
  exerciseSummaries: ExerciseProgressSummary[],
  consistency:       ConsistencyScore,
): TrainingMaturity {
  const totalWorkouts = rawHistory.filter(
    h => h.status === "completed" || h.status === "partially_completed",
  ).length;

  // ── Training age (days since first workout) ───────────────────────────────
  const sorted = [...rawHistory].sort((a, b) => a.id.localeCompare(b.id));
  const firstDate = sorted.length > 0 ? new Date(sorted[0].id) : new Date();
  const daysTrainingAge = Math.max(
    0,
    Math.floor((Date.now() - firstDate.getTime()) / 86_400_000),
  );

  // ── Volume component (log-scaled from workout count) ──────────────────────
  // 200+ workouts → 100; fewer → proportional
  const volumeRaw    = clamp(totalWorkouts / 200, 0, 1);
  const volumeScore  = Math.round(Math.sqrt(volumeRaw) * 100);

  // ── Consistency component ─────────────────────────────────────────────────
  const consistencyScore = consistency ? clamp(consistency.composite, 0, 100) : 0;

  // ── Complexity component (variety and difficulty of exercises) ────────────
  // Use the number of distinct exercises relative to a ceiling of 30
  const distinctExercises = exerciseSummaries.length;
  const avgRPE = exerciseSummaries.length > 0
    ? exerciseSummaries.reduce((s, e) => s + (e.averageRPE ?? 0), 0) / exerciseSummaries.length
    : 0;
  const varietyScore    = clamp((distinctExercises / 30) * 100, 0, 100);
  const rpeScore        = clamp((avgRPE / 8) * 100, 0, 100);   // RPE 8 = top of scale
  const complexityScore = Math.round(varietyScore * 0.6 + rpeScore * 0.4);

  // ── Progression component (are key lifts trending up?) ───────────────────
  const improving   = exerciseSummaries.filter(e => e.trend === "improving").length;
  const stable      = exerciseSummaries.filter(e => e.trend === "stable").length;
  const total       = exerciseSummaries.length;
  const progressionScore = total > 0
    ? Math.round(((improving + stable * 0.5) / total) * 100)
    : 0;

  // ── Composite (weighted) ─────────────────────────────────────────────────
  const composite = Math.round(
    volumeScore      * 0.35 +
    consistencyScore * 0.30 +
    complexityScore  * 0.20 +
    progressionScore * 0.15,
  );

  const level = levelFromScore(composite, totalWorkouts);
  const next  = nextLevel(level);

  // ── Trend (compare last 4 weeks consistency vs prior 4 weeks) ────────────
  const recentConsistency = consistency?.composite ?? 0;
  const trend: "improving" | "stable" | "declined" =
    recentConsistency >= 65 ? "improving"
    : recentConsistency >= 40 ? "stable"
    : "declined";

  // ── Weeks to next level ───────────────────────────────────────────────────
  let weeksToNextLevel: number | null = null;
  if (next && consistency?.composite > 0) {
    const needed = LEVEL_MIN_SCORE[next] - composite;
    if (needed > 0) {
      const weeklyGain = (recentConsistency / 100) * 1.5;
      weeksToNextLevel = weeklyGain > 0 ? Math.ceil(needed / weeklyGain) : null;
    } else {
      weeksToNextLevel = 0;
    }
  }

  const insight =
    level === "beginner"
      ? `You're ${totalWorkouts} sessions in — every workout adds to your training foundation.`
      : level === "developing"
        ? `Solid base building — consistency is your biggest lever right now.`
        : level === "intermediate"
          ? `Established training history. Focus on performance milestones and periodisation.`
          : `Advanced training age. Marginal gains require precise periodisation and recovery.`;

  return {
    level,
    score:            composite,
    daysTrainingAge,
    trend,
    components: {
      volume:      volumeScore,
      consistency: consistencyScore,
      complexity:  complexityScore,
      progression: progressionScore,
    },
    insight,
    nextLevel:        next,
    weeksToNextLevel: weeksToNextLevel !== null ? Math.min(weeksToNextLevel, 52) : null,
  };
}
