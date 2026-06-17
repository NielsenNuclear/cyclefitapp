// ─── lib/progression/progressiveOverload.ts ───────────────────────────────────
// Decides whether to increase, maintain, or reduce training load.
// Pure function — callers pass all data in; no localStorage reads here.

import type { ReadinessBadge } from "@/types/recommendation";
import type { LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import type { WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OverloadDecision = "increase" | "maintain" | "reduce";

export interface OverloadRecommendation {
  decision:   OverloadDecision;
  rationale:  string;
  suggestion: string;
}

export interface OverloadInput {
  recentLog:         LoggedWorkout[];          // last 14 days
  recentFeedback:    WorkoutFeedback[];        // last 14 days
  exerciseSummaries: ExerciseProgressSummary[];
  currentBadge:      ReadinessBadge;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RECOVERY_SCORES: Record<WorkoutFeedback["recoveryRating"], number> = {
  fully_recovered:      100,
  slight_fatigue:        67,
  moderate_fatigue:      33,
  significant_fatigue:    0,
};

function mean(values: number[]): number {
  if (values.length === 0) return -1;  // sentinel: no data
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeOverloadRecommendation(input: OverloadInput): OverloadRecommendation {
  const { recentLog, recentFeedback, exerciseSummaries, currentBadge } = input;

  // Need at least some data to make a meaningful recommendation
  if (recentLog.length === 0 && recentFeedback.length === 0) {
    return {
      decision:   "maintain",
      rationale:  "No logged sessions yet — check back after a few workouts.",
      suggestion: "Log workouts and post-session feedback to unlock overload guidance.",
    };
  }

  // ── Badge guard — never increase when Axis says to back off ──────────────────
  const badgeBlocked = currentBadge === "Watch" || currentBadge === "Recover";

  // ── Signals ──────────────────────────────────────────────────────────────────
  const completionRate = recentLog.length > 0
    ? recentLog.filter(l => l.completionStatus === "completed").length / recentLog.length
    : -1;

  const meanRPE      = mean(recentFeedback.map(f => f.sessionRPE));
  const meanRecovery = mean(recentFeedback.map(f => RECOVERY_SCORES[f.recoveryRating]));

  const improvingCount = exerciseSummaries.filter(s => s.trend === "improving").length;
  const decliningCount = exerciseSummaries.filter(s => s.trend === "declining").length;

  // ── Reduce triggers (any one is enough) ──────────────────────────────────────
  const reduceSignals: string[] = [];
  if (meanRPE !== -1 && meanRPE >= 8.5)               reduceSignals.push("sessions feel very hard");
  if (meanRecovery !== -1 && meanRecovery < 33)        reduceSignals.push("poor recovery between sessions");
  if (completionRate !== -1 && completionRate < 0.5)   reduceSignals.push("low workout completion");
  if (decliningCount >= 2)                             reduceSignals.push("multiple exercises declining");

  if (reduceSignals.length > 0 || (badgeBlocked && meanRPE !== -1 && meanRPE >= 7.5)) {
    const reasons = reduceSignals.length > 0
      ? reduceSignals.join(", ")
      : `${currentBadge.toLowerCase()} readiness state`;
    return {
      decision:   "reduce",
      rationale:  `Reducing load due to: ${reasons}.`,
      suggestion: "Drop volume by ~20% and keep intensity moderate this week.",
    };
  }

  if (badgeBlocked) {
    return {
      decision:   "maintain",
      rationale:  `Readiness is in ${currentBadge} state — holding current load until recovery improves.`,
      suggestion: "Keep current load and volume. Prioritise sleep and active recovery.",
    };
  }

  // ── Increase conditions (all must be met) ────────────────────────────────────
  const canIncrease =
    (completionRate === -1 || completionRate >= 0.85) &&
    (meanRPE === -1 || (meanRPE >= 5.5 && meanRPE <= 7.5)) &&
    (meanRecovery === -1 || meanRecovery >= 67) &&
    decliningCount === 0;

  if (canIncrease) {
    const reasons: string[] = [];
    if (completionRate !== -1 && completionRate >= 0.85) reasons.push(`${Math.round(completionRate * 100)}% completion rate`);
    if (meanRPE !== -1 && meanRPE >= 5.5 && meanRPE <= 7.5) reasons.push(`avg RPE ${meanRPE.toFixed(1)}`);
    if (improvingCount > 0) reasons.push(`${improvingCount} exercise${improvingCount > 1 ? "s" : ""} trending up`);
    return {
      decision:   "increase",
      rationale:  reasons.length > 0
        ? `Increase indicated: ${reasons.join(", ")}.`
        : "All performance signals support progression.",
      suggestion: "Add 1 working set to your main exercises this week.",
    };
  }

  // ── Default: maintain ────────────────────────────────────────────────────────
  return {
    decision:   "maintain",
    rationale:  "Signals are mixed — holding current load to let adaptation consolidate.",
    suggestion: "Keep current load and volume. Focus on execution quality.",
  };
}
