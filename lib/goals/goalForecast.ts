// ─── lib/goals/goalForecast.ts ────────────────────────────────────────────────
// Classifies goal trajectory as on-track, ahead, or behind and projects
// a 4-week outlook based on current velocity.
// Pure function — no localStorage access.

import type { GoalProgress } from "./goalProgress";
import type { GoalType }     from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrajectoryStatus = "ahead" | "on_track" | "behind" | "stalled" | "complete";

export interface GoalForecast {
  goalType:         GoalType;
  status:           TrajectoryStatus;
  statusLabel:      string;
  projectedIn4Wks:  number;     // projected metric value 4 weeks from now
  gapToTarget:      number;     // how far from target (positive = still below)
  weeklyTargetRate: number;     // what velocity is needed to hit target in etaWeeks
  isOnPace:         boolean;
  summaryLine:      string;     // single sentence shown in the card
  hasEnoughData:    boolean;
}

// ─── Trajectory logic ─────────────────────────────────────────────────────────

function classifyStatus(
  progress:         GoalProgress,
  weeklyTargetRate: number,
): TrajectoryStatus {
  if (progress.isComplete)                    return "complete";
  if (progress.weeklyVelocity <= 0)          return "stalled";
  if (progress.weeklyVelocity >= weeklyTargetRate * 1.15) return "ahead";
  if (progress.weeklyVelocity >= weeklyTargetRate * 0.85) return "on_track";
  return "behind";
}

const STATUS_LABELS: Record<TrajectoryStatus, string> = {
  complete:  "Goal reached",
  ahead:     "Ahead of pace",
  on_track:  "On track",
  behind:    "Behind pace",
  stalled:   "Stalled",
};

function buildSummary(
  status:       TrajectoryStatus,
  etaWeeks:     number | null,
  gapToTarget:  number,
  unit:         string,
): string {
  switch (status) {
    case "complete":  return "You've reached your goal — time to set a new one.";
    case "ahead":     return etaWeeks
      ? `Ahead of pace — you may hit your target ${Math.max(1, (etaWeeks ?? 0) - 1)} week(s) early.`
      : "Ahead of pace — keep the momentum going.";
    case "on_track":  return etaWeeks
      ? `On track to reach your goal in ~${etaWeeks} week${etaWeeks === 1 ? "" : "s"}.`
      : "Progress is on track — consistency is paying off.";
    case "behind":    return `Behind pace by ${Math.abs(Math.round(gapToTarget * 10) / 10)} ${unit}. Increase session frequency or intensity.`;
    case "stalled":   return "Progress has stalled. Review your workout intensity or add variety.";
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeGoalForecast(
  progress: GoalProgress,
  snapshot: { targetValue: number; currentValue: number; unit: string; baselineValue: number },
): GoalForecast {
  const { goalType, hasEnoughData, etaWeeks, weeklyVelocity } = progress;

  if (!hasEnoughData) {
    return {
      goalType,
      status:           "on_track",
      statusLabel:      "Tracking",
      projectedIn4Wks:  0,
      gapToTarget:      0,
      weeklyTargetRate: 0,
      isOnPace:         false,
      summaryLine:      progress.coachingMessage,
      hasEnoughData:    false,
    };
  }

  const { targetValue, currentValue, unit, baselineValue } = snapshot;
  const totalGain      = targetValue - baselineValue;
  const etaTarget      = etaWeeks ?? 26;  // default 26-week horizon if no ETA
  const weeklyTargetRate = totalGain > 0 ? totalGain / etaTarget : 0;

  const status          = classifyStatus(progress, weeklyTargetRate);
  const projectedIn4Wks = Math.round((currentValue + weeklyVelocity * 4) * 10) / 10;
  const gapToTarget     = Math.round((targetValue - currentValue) * 10) / 10;
  const isOnPace        = status === "ahead" || status === "on_track" || status === "complete";

  return {
    goalType,
    status,
    statusLabel:      STATUS_LABELS[status],
    projectedIn4Wks,
    gapToTarget,
    weeklyTargetRate: Math.round(weeklyTargetRate * 10) / 10,
    isOnPace,
    summaryLine:      buildSummary(status, etaWeeks, gapToTarget, unit),
    hasEnoughData:    true,
  };
}
