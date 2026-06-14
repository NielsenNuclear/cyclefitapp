// ─── lib/progression/plateauIntervention.ts ──────────────────────────────────
// Generates goal-specific intervention suggestions for plateaued exercises.
// Pure function — no storage reads.

import type { PerformanceTrend } from "@/lib/analytics/performanceTrends";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterventionType = "intensity" | "variation" | "density" | "power";

export interface PlateauIntervention {
  exerciseName:     string;
  interventionType: InterventionType;
  suggestion:       string;
  rationale:        string;
}

// ─── Goal-specific intervention specs ────────────────────────────────────────

interface InterventionSpec {
  type:       InterventionType;
  suggestion: string;
  rationale:  string;
}

const GOAL_INTERVENTIONS: Record<GoalType, InterventionSpec> = {
  strength: {
    type:       "intensity",
    suggestion: "Reduce volume by 20% and work up to a heavy 3–5 rep set this session",
    rationale:
      "Strength plateaus respond best to intensity shifts — lower volume, higher load " +
      "recruits more motor units and breaks through neural adaptation stalls.",
  },
  hypertrophy: {
    type:       "variation",
    suggestion: "Apply a 3-second eccentric tempo this session, or swap to an incline/decline variant",
    rationale:
      "Hypertrophy plateaus respond to mechanical variation — a slower eccentric or " +
      "angle change creates new tension demands on the same muscle without changing the movement.",
  },
  fat_loss: {
    type:       "density",
    suggestion: "Reduce rest periods by 15 seconds and add a rest-pause set to the final set",
    rationale:
      "Density techniques increase metabolic demand without adding load — effective for " +
      "fat-loss goals where recovery between sessions may limit load progression.",
  },
  general_fitness: {
    type:       "density",
    suggestion: "Reduce rest by 15 seconds or add one extra set at moderate load",
    rationale:
      "Increasing training density is a low-risk progression option that keeps variety " +
      "high and avoids the injury risk of load jumps during general fitness training.",
  },
  athletic_performance: {
    type:       "power",
    suggestion: "Pair the final set with a plyometric superset — e.g. box jump or medicine ball throw",
    rationale:
      "Contrast loading (heavy + explosive) stimulates fast-twitch adaptation and " +
      "breaks strength-speed plateaus by training the full force-velocity spectrum.",
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns one intervention per plateaued exercise.
 * Exercises with any other status are silently skipped.
 * Returns an empty array when no plateaus exist.
 */
export function generatePlateauInterventions(
  trends:   PerformanceTrend[],
  goalType: GoalType,
): PlateauIntervention[] {
  const spec      = GOAL_INTERVENTIONS[goalType];
  const plateaus  = trends.filter(t => t.status === "plateau");

  return plateaus.map(t => ({
    exerciseName:     t.exerciseName,
    interventionType: spec.type,
    suggestion:       spec.suggestion,
    rationale:        spec.rationale,
  }));
}
