// ─── lib/goals/goalProgress.ts ────────────────────────────────────────────────
// Derives % complete, weekly velocity, and ETA from a GoalSnapshot.
// Pure function — no localStorage access.

import type { GoalSnapshot } from "./goalTracking";
import type { GoalType }     from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoalProgress {
  goalType:         GoalType;
  percentComplete:  number;     // 0–100 (capped at 100)
  weeklyVelocity:   number;     // gain per week (in the metric's unit)
  etaWeeks:         number | null; // null = already at/past target or no signal
  changeFromBase:   number;     // absolute change from baseline (can be negative)
  changePercent:    number;     // % change from baseline
  isComplete:       boolean;
  hasEnoughData:    boolean;
  coachingMessage:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

// ─── Coaching messages ────────────────────────────────────────────────────────

function buildCoachingMessage(
  goalType:       GoalType,
  percentComplete: number,
  etaWeeks:       number | null,
  velocity:       number,
  isComplete:     boolean,
): string {
  if (isComplete) {
    return "Goal reached! Consider setting a new target or increasing difficulty.";
  }

  if (!etaWeeks && velocity <= 0) {
    const tip: Record<GoalType, string> = {
      strength:            "Focus on progressive overload — add 1–2 reps or a small weight increment each week.",
      hypertrophy:         "Increase your weekly volume by adding one set per muscle group.",
      fat_loss:            "Try to add one additional workout session this week.",
      general_fitness:     "Aim for at least one more session this week to build consistency.",
      athletic_performance: "Ensure you're training compound movements with enough intensity.",
    };
    return tip[goalType];
  }

  if (percentComplete < 25) {
    return etaWeeks
      ? `Early progress — you're ${Math.round(percentComplete)}% of the way there. On track to reach your goal in ~${etaWeeks} weeks.`
      : "Building momentum — keep showing up consistently.";
  }

  if (percentComplete < 75) {
    return etaWeeks
      ? `Good progress at ${Math.round(percentComplete)}%. Estimated ${etaWeeks} weeks to goal.`
      : `Steady progress at ${Math.round(percentComplete)}%. Keep the consistency going.`;
  }

  return etaWeeks
    ? `Almost there — ${Math.round(percentComplete)}% complete. ~${etaWeeks} weeks to go.`
    : `${Math.round(percentComplete)}% complete — final push to the goal.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeGoalProgress(snapshot: GoalSnapshot): GoalProgress {
  const { goalType, currentValue, baselineValue, targetValue, hasEnoughData, sessionCount } = snapshot;

  if (!hasEnoughData || sessionCount < 3) {
    return {
      goalType,
      percentComplete: 0,
      weeklyVelocity:  0,
      etaWeeks:        null,
      changeFromBase:  0,
      changePercent:   0,
      isComplete:      false,
      hasEnoughData:   false,
      coachingMessage: `Track ${3 - sessionCount} more sessions to see your goal progress.`,
    };
  }

  const range          = targetValue - baselineValue;
  const gained         = currentValue - baselineValue;
  const changeFromBase = Math.round(gained * 10) / 10;
  const changePercent  = Math.round(safeDiv(gained, baselineValue) * 1000) / 10;
  const pct            = clamp(range > 0 ? safeDiv(gained, range) * 100 : 0, 0, 100);
  const isComplete     = pct >= 100;

  // Weekly velocity: approximate from change / elapsed weeks
  // Assume sessions span roughly sessionCount / targetSessions weeks
  // Use a simpler proxy: total gain / (sessionCount / 2.5) where 2.5 sessions/wk is average
  const elapsedWeeks   = Math.max(1, sessionCount / 2.5);
  const weeklyVelocity = Math.round(safeDiv(gained, elapsedWeeks) * 10) / 10;

  const etaWeeks: number | null =
    isComplete || weeklyVelocity <= 0
      ? null
      : clamp(Math.ceil(safeDiv(targetValue - currentValue, weeklyVelocity)), 1, 52);

  const coachingMessage = buildCoachingMessage(goalType, pct, etaWeeks, weeklyVelocity, isComplete);

  return {
    goalType,
    percentComplete:  Math.round(pct * 10) / 10,
    weeklyVelocity,
    etaWeeks,
    changeFromBase,
    changePercent,
    isComplete,
    hasEnoughData:   true,
    coachingMessage,
  };
}
