// ─── lib/periodization/goalProfiles.ts ────────────────────────────────────────
// Defines training block structure per goal type.
// Each goal maps to a mesocycle of N weeks, broken into named phases.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PeriodizationPhase = "accumulation" | "intensification" | "peak" | "deload";

export interface PhaseConfig {
  phase:       PeriodizationPhase;
  label:       string;
  weeks:       number;       // weeks this phase occupies within a block
  setsOffset:  number;       // added to base prescribed set count (can be negative)
  rpeOffset:   number;       // added to base prescribed RPE
  deloadReps?: string;       // overrides rep range during deload
}

export interface PeriodizationProfile {
  goal:                   GoalType;
  label:                  string;
  description:            string;
  blockLengthWeeks:       number;
  targetFrequencyPerWeek: number;
  progressionRate:        "aggressive" | "moderate" | "conservative";
  phases:                 PhaseConfig[];
}

// ─── Phase builders ───────────────────────────────────────────────────────────

const accumPhase = (weeks: number): PhaseConfig => ({
  phase: "accumulation", label: "Accumulation", weeks,
  setsOffset: 1, rpeOffset: 0,
});
const intensPhase = (weeks: number): PhaseConfig => ({
  phase: "intensification", label: "Intensification", weeks,
  setsOffset: 0, rpeOffset: 1,
});
const peakPhase = (weeks: number): PhaseConfig => ({
  phase: "peak", label: "Peak", weeks,
  setsOffset: -1, rpeOffset: 2,
});
const deloadPhase = (weeks: number): PhaseConfig => ({
  phase: "deload", label: "Deload", weeks,
  setsOffset: -2, rpeOffset: -2, deloadReps: "15–20",
});

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const PERIODIZATION_PROFILES: Record<GoalType, PeriodizationProfile> = {
  strength: {
    goal:                   "strength",
    label:                  "Strength",
    description:            "6-week block: build volume → sharpen intensity → peak performance → deload",
    blockLengthWeeks:       6,
    targetFrequencyPerWeek: 4,
    progressionRate:        "aggressive",
    phases:                 [accumPhase(3), intensPhase(1), peakPhase(1), deloadPhase(1)],
  },
  hypertrophy: {
    goal:                   "hypertrophy",
    label:                  "Hypertrophy",
    description:            "6-week block: sustained volume accumulation → intensification spike → deload",
    blockLengthWeeks:       6,
    targetFrequencyPerWeek: 4,
    progressionRate:        "moderate",
    phases:                 [accumPhase(4), intensPhase(1), deloadPhase(1)],
  },
  fat_loss: {
    goal:                   "fat_loss",
    label:                  "Fat Loss",
    description:            "4-week block: build work capacity → intensification → deload",
    blockLengthWeeks:       4,
    targetFrequencyPerWeek: 3,
    progressionRate:        "moderate",
    phases:                 [accumPhase(2), intensPhase(1), deloadPhase(1)],
  },
  general_fitness: {
    goal:                   "general_fitness",
    label:                  "General Fitness",
    description:            "4-week block: progressive overload → planned recovery",
    blockLengthWeeks:       4,
    targetFrequencyPerWeek: 3,
    progressionRate:        "conservative",
    phases:                 [accumPhase(3), deloadPhase(1)],
  },
  athletic_performance: {
    goal:                   "athletic_performance",
    label:                  "Athletic Performance",
    description:            "5-week block: build base → sharpen → peak power output → deload",
    blockLengthWeeks:       5,
    targetFrequencyPerWeek: 4,
    progressionRate:        "aggressive",
    phases:                 [accumPhase(2), intensPhase(1), peakPhase(1), deloadPhase(1)],
  },
};

export function getPeriodizationProfile(goal: GoalType): PeriodizationProfile {
  return PERIODIZATION_PROFILES[goal] ?? PERIODIZATION_PROFILES.general_fitness;
}

export const PHASE_COLORS: Record<PeriodizationPhase, string> = {
  accumulation:    "#4B8BFF",
  intensification: "#FF8C00",
  peak:            "#D9534F",
  deload:          "#3DAA6B",
};

export const PHASE_DESCRIPTIONS: Record<PeriodizationPhase, string> = {
  accumulation:    "Building volume and work capacity at moderate intensity.",
  intensification: "Increasing intensity while managing volume for strength adaptation.",
  peak:            "Low volume, maximal intensity — express your strength.",
  deload:          "Planned recovery week. Maintain movement quality, reduce load.",
};
