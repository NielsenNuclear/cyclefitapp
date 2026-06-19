// ─── lib/periodization/achievementForecast.ts ─────────────────────────────────
// Produces a directional coaching forecast: where the user is on their goal
// trajectory and a rough time-to-milestone estimate.
// Deliberately NOT exact prediction — just actionable direction.

import type { GoalType }             from "@/lib/exercises/goalBasedSelection";
import type { ReadinessTrend }       from "@/lib/readiness/readinessHistory";
import type { PeriodizationPhase }   from "./goalProfiles";
import type { PeriodizationProfile } from "./goalProfiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AchievementTrajectory = "ahead" | "on_track" | "behind" | "stalled";

export interface AchievementForecast {
  progressPercent:           number;               // 0–100 rough estimate
  trajectory:                AchievementTrajectory;
  estimatedWeeksToMilestone: number | null;        // null when < 3 weeks of data
  coachingNote:              string;
  currentPhaseContribution:  string;               // how the current block phase helps the goal
}

// ─── Phase → goal contribution descriptions ───────────────────────────────────

const PHASE_CONTRIBUTION: Record<PeriodizationPhase, Record<GoalType, string>> = {
  accumulation: {
    strength:             "Volume accumulation building the base for heavier lifts.",
    hypertrophy:          "High-volume weeks are your primary muscle-building stimulus.",
    fat_loss:             "Increasing work capacity creates the metabolic conditions for fat loss.",
    general_fitness:      "Consistent work across movement patterns builds a well-rounded base.",
    athletic_performance: "Base conditioning supports speed, power, and injury resilience.",
  },
  intensification: {
    strength:             "Intensity is rising — your nervous system is adapting for heavier loads.",
    hypertrophy:          "Higher intensity overload creates a different growth stimulus than volume alone.",
    fat_loss:             "Higher-intensity sessions elevate EPOC and metabolic rate post-workout.",
    general_fitness:      "Modest intensity increase maintains adaptation without excessive fatigue.",
    athletic_performance: "Sharpening power and reactive strength for sport-specific performance.",
  },
  peak: {
    strength:             "Peak week — low volume, maximal intensity. Express the strength you've built.",
    hypertrophy:          "Peak phase rarely used for hypertrophy; maintains neural drive during taper.",
    fat_loss:             "Maintain intensity while tapering — preserves muscle during a cut.",
    general_fitness:      "Peak phase — a brief window of high output before planned recovery.",
    athletic_performance: "Peaking for best athletic output — trust the process.",
  },
  deload: {
    strength:             "Deload clears fatigue so next block's heavier loads can produce adaptation.",
    hypertrophy:          "Recovery week restores anabolic sensitivity — muscle grows during deloads.",
    fat_loss:             "Rest week reduces cortisol, which directly aids fat metabolism.",
    general_fitness:      "Planned rest maintains long-term consistency by preventing burnout.",
    athletic_performance: "Recovery week is when athletic adaptation consolidates.",
  },
};

// ─── Trajectory from completion rate + readiness ──────────────────────────────

function computeTrajectory(
  completionRate: number,
  readinessTrend: ReadinessTrend | null,
  totalTrainingWeeks: number,
): AchievementTrajectory {
  if (totalTrainingWeeks < 2) return "on_track"; // too early to judge

  if (completionRate >= 0.85 && (readinessTrend === "improving" || readinessTrend === "stable")) {
    return "ahead";
  }
  if (completionRate >= 0.65 && readinessTrend !== "declining") {
    return "on_track";
  }
  if (completionRate >= 0.40 || readinessTrend === "declining") {
    return "behind";
  }
  return "stalled";
}

// ─── Progress estimation ──────────────────────────────────────────────────────

const GOAL_MILESTONE_WEEKS: Record<GoalType, number> = {
  strength:             12,
  hypertrophy:          12,
  fat_loss:             8,
  general_fitness:      8,
  athletic_performance: 10,
};

const TRAJECTORY_NOTES: Record<AchievementTrajectory, string> = {
  ahead:    "You're ahead of a typical timeline — training consistency and recovery are both strong. Keep this rhythm.",
  on_track: "Trajectory looks solid. Maintain session consistency and the results will compound.",
  behind:   "You're slightly behind pace, likely from missed sessions or recovery dips. This block is a reset opportunity.",
  stalled:  "Progress has stalled. Axis will prioritise quality over quantity this week — consistency now is the unlock.",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeAchievementForecast(input: {
  goal:                  GoalType;
  profile:               PeriodizationProfile;
  currentPhase:          PeriodizationPhase;
  totalTrainingWeeks:    number;
  recentCompletionRate:  number;   // 0–1 (sessions completed / sessions planned last 4 wks)
  readinessTrend:        ReadinessTrend | null;
}): AchievementForecast {
  const { goal, profile, currentPhase, totalTrainingWeeks, recentCompletionRate, readinessTrend } = input;

  const milestoneWeeks = GOAL_MILESTONE_WEEKS[goal];
  const trajectory     = computeTrajectory(recentCompletionRate, readinessTrend, totalTrainingWeeks);

  // Rough progress: weeks elapsed relative to milestone, modulated by completion rate
  const rawProgress = Math.min(95,
    (totalTrainingWeeks / milestoneWeeks) * 100 * Math.max(0.5, recentCompletionRate),
  );
  const progressPercent = Math.round(rawProgress);

  // Estimated weeks to milestone
  let estimatedWeeksToMilestone: number | null = null;
  if (totalTrainingWeeks >= 3 && trajectory !== "stalled") {
    const weeksLeft = Math.max(1, milestoneWeeks - totalTrainingWeeks);
    const multiplier = trajectory === "ahead" ? 0.85 : trajectory === "behind" ? 1.25 : 1.0;
    estimatedWeeksToMilestone = Math.round(weeksLeft * multiplier);
  }

  const phaseContribMap = PHASE_CONTRIBUTION[currentPhase];
  const currentPhaseContribution = phaseContribMap[goal];

  return {
    progressPercent,
    trajectory,
    estimatedWeeksToMilestone,
    coachingNote: TRAJECTORY_NOTES[trajectory],
    currentPhaseContribution,
  };
}
