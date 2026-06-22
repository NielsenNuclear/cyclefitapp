// ─── lib/planning/goalRoadmap.ts ──────────────────────────────────────────────
// Phase 38A — Goal Roadmap Engine.
// Translates current velocity into a concrete roadmap: where the user is,
// where they're going, and labelled milestones along the way.
// Pure function — no storage, no React.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { GoalVelocity } from "@/lib/performance/goalVelocity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoadmapMilestone {
  label:             string;   // e.g. "Month 2: avg 1RM 88 kg"
  targetValue:       number;
  percentOfJourney:  number;   // 0–100 through the gap start→target
  estimatedDate:     string;   // YYYY-MM-DD
  achieved:          boolean;
}

export interface GoalRoadmap {
  goalType:          GoalType;
  metricLabel:       string;
  startValue:        number;   // baseline value (4–8 weeks ago)
  currentValue:      number;
  targetValue:       number;   // startValue × targetMultiplier
  completionPercent: number;   // 0–100 of start→target gap already covered
  estimatedWeeks:    number;   // weeks from today to reach target at current rate
  estimatedEndDate:  string;   // YYYY-MM-DD
  milestones:        RoadmapMilestone[];
  weeklyRate:        number;   // % per week
  onTrack:           boolean;
  dataReady:         boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// How far above the baseline each goal targets (relative to startValue)
const TARGET_GAIN: Record<GoalType, number> = {
  strength:             0.20,   // +20%
  athletic_performance: 0.18,   // +18%
  hypertrophy:          0.25,   // +25%
  fat_loss:             0.15,   // +15% improvement in vol density
  general_fitness:      0.20,   // +20%
};

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d.toISOString().slice(0, 10);
}

function metricUnitLabel(goalType: GoalType): string {
  switch (goalType) {
    case "strength":
    case "athletic_performance": return "avg 1RM (kg)";
    default:                      return "session volume";
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildGoalRoadmap(
  goalType:  GoalType,
  velocity:  GoalVelocity,
  today:     string,
): GoalRoadmap {
  const empty: GoalRoadmap = {
    goalType,
    metricLabel:       metricUnitLabel(goalType),
    startValue:        0,
    currentValue:      0,
    targetValue:       0,
    completionPercent: 0,
    estimatedWeeks:    52,
    estimatedEndDate:  addWeeks(today, 52),
    milestones:        [],
    weeklyRate:        0,
    onTrack:           false,
    dataReady:         false,
  };

  if (!velocity || velocity.currentValue === 0 || velocity.baselineValue === 0) return empty;

  const startValue   = velocity.baselineValue;
  const currentValue = velocity.currentValue;
  const weeklyRate   = velocity.weeklyRatePercent;
  const targetMult   = 1 + TARGET_GAIN[goalType];
  const targetValue  = Math.round(startValue * targetMult * 10) / 10;

  // Total gap from start to target; how much is already covered
  const totalGap   = targetValue - startValue;
  const coveredGap = Math.max(0, currentValue - startValue);
  const completionPercent = totalGap > 0
    ? Math.min(100, Math.round((coveredGap / totalGap) * 100))
    : 0;

  // Remaining gap from current value to target
  const remaining  = Math.max(0, targetValue - currentValue);
  const remainPct  = currentValue > 0 ? (remaining / currentValue) * 100 : 0;

  let estimatedWeeks: number;
  if (completionPercent >= 100) {
    estimatedWeeks = 0;
  } else if (weeklyRate > 0) {
    estimatedWeeks = Math.ceil(remainPct / weeklyRate);
  } else {
    estimatedWeeks = 52;
  }

  const onTrack = velocity.onTrack && weeklyRate > 0;

  // Build 4 intermediate milestones evenly spaced between current and target
  const milestones: RoadmapMilestone[] = [];
  const milestoneCount = 4;
  for (let i = 1; i <= milestoneCount; i++) {
    const pct         = (i / milestoneCount) * 100;
    const mValue      = Math.round((startValue + (totalGap * i / milestoneCount)) * 10) / 10;
    const weekOffset  = estimatedWeeks * (i / milestoneCount);
    const achieved    = currentValue >= mValue;
    const unitLabel   = metricUnitLabel(goalType);
    const monthOffset = Math.round(weekOffset / 4.3);
    const label       = `Month ${Math.max(1, monthOffset)}: ${unitLabel.includes("1RM") ? `${mValue} kg` : `+${Math.round(pct)}% volume`}`;
    milestones.push({
      label,
      targetValue:      mValue,
      percentOfJourney: pct,
      estimatedDate:    addWeeks(today, weekOffset),
      achieved,
    });
  }

  return {
    goalType,
    metricLabel:       metricUnitLabel(goalType),
    startValue,
    currentValue,
    targetValue,
    completionPercent,
    estimatedWeeks:    Math.min(estimatedWeeks, 104),
    estimatedEndDate:  addWeeks(today, Math.min(estimatedWeeks, 104)),
    milestones,
    weeklyRate,
    onTrack,
    dataReady:         true,
  };
}
