// ─── lib/performance/exerciseProgressTracking.ts ─────────────────────────────
// Phase 36B — Four-dimensional exercise progress analysis.
// Strength (1RM trend), Volume (total load), Density (volume/time), Skill (RPE quality).

import { getPerformanceDatabaseForExercise } from "./performanceDatabase";
import { epley1RM } from "./strengthEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressDirection = "up" | "down" | "flat" | "insufficient_data";

export interface ProgressDimension {
  direction:    ProgressDirection;
  changePercent: number;   // + = improvement; - = regression
  description:  string;
}

export interface ExerciseProgressDimensions {
  exerciseName:     string;
  strength:         ProgressDimension;
  volume:           ProgressDimension;
  skill:            ProgressDimension;
  overallDirection: ProgressDirection;
  sessionCount:     number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_SESSIONS = 4;
const LOOKBACK_SESSIONS = 6;

function direction(change: number): ProgressDirection {
  if (change > 2)  return "up";
  if (change < -2) return "down";
  return "flat";
}

function pct(recent: number, prior: number): number {
  if (prior === 0) return 0;
  return Math.round(((recent - prior) / prior) * 1000) / 10;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function trackExerciseProgress(exerciseName: string): ExerciseProgressDimensions {
  const records = getPerformanceDatabaseForExercise(exerciseName);

  const insufficient: ExerciseProgressDimensions = {
    exerciseName,
    strength:         { direction: "insufficient_data", changePercent: 0, description: "Not enough sessions yet" },
    volume:           { direction: "insufficient_data", changePercent: 0, description: "Not enough sessions yet" },
    skill:            { direction: "insufficient_data", changePercent: 0, description: "Not enough sessions yet" },
    overallDirection: "insufficient_data",
    sessionCount:     records.length,
  };

  if (records.length < MIN_SESSIONS) return insufficient;

  const recent = records.slice(0, Math.ceil(LOOKBACK_SESSIONS / 2));
  const prior  = records.slice(Math.ceil(LOOKBACK_SESSIONS / 2), LOOKBACK_SESSIONS);

  if (prior.length === 0) return insufficient;

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  // Strength: estimated 1RM
  const recentStrength = mean(recent.map(r => epley1RM(r.weight, r.actualReps)));
  const priorStrength  = mean(prior.map(r => epley1RM(r.weight, r.actualReps)));
  const strengthPct    = pct(recentStrength, priorStrength);

  // Volume: weight × reps × sets
  const recentVol = mean(recent.map(r => (r.weight + 1) * r.actualReps * r.completedSets));
  const priorVol  = mean(prior.map(r => (r.weight + 1) * r.actualReps * r.completedSets));
  const volPct    = pct(recentVol, priorVol);

  // Skill: RPE accuracy (lower deviation = better; prescribedRPE 0 = skip)
  const rpeDeviation = (r: typeof records[0]) =>
    r.prescribedRPE > 0 ? Math.abs(r.actualRPE - r.prescribedRPE) : null;
  const recentDevsRaw = recent.map(rpeDeviation).filter((v): v is number => v !== null);
  const priorDevsRaw  = prior.map(rpeDeviation).filter((v): v is number => v !== null);
  const skillPct =
    recentDevsRaw.length > 0 && priorDevsRaw.length > 0
      ? pct(mean(priorDevsRaw), mean(recentDevsRaw)) // lower dev = better, so flip
      : 0;

  const strengthDim: ProgressDimension = {
    direction:    records[0].weight === 0 ? "insufficient_data" : direction(strengthPct),
    changePercent: strengthPct,
    description:   records[0].weight === 0
      ? "Bodyweight exercise — strength dimension N/A"
      : `Est. 1RM ${strengthPct >= 0 ? "+" : ""}${strengthPct}% vs prior block`,
  };

  const volumeDim: ProgressDimension = {
    direction:    direction(volPct),
    changePercent: volPct,
    description:  `Total volume ${volPct >= 0 ? "+" : ""}${volPct}% vs prior block`,
  };

  const skillDim: ProgressDimension = {
    direction:    recentDevsRaw.length > 0 ? direction(skillPct) : "insufficient_data",
    changePercent: skillPct,
    description:   recentDevsRaw.length > 0
      ? `RPE accuracy ${skillPct >= 0 ? "improved" : "declined"} vs prior block`
      : "No RPE data for this exercise",
  };

  const positiveCount = [strengthDim, volumeDim, skillDim]
    .filter(d => d.direction === "up").length;
  const negativeCount = [strengthDim, volumeDim, skillDim]
    .filter(d => d.direction === "down").length;

  const overallDirection: ProgressDirection =
    positiveCount >= 2 ? "up"
    : negativeCount >= 2 ? "down"
    : "flat";

  return {
    exerciseName,
    strength:         strengthDim,
    volume:           volumeDim,
    skill:            skillDim,
    overallDirection,
    sessionCount:     records.length,
  };
}
