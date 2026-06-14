// ─── lib/nutrition/workoutFueling.ts ─────────────────────────────────────────
// Generates timed pre-, post-, and evening fueling windows for a workout day.
// Pure function — callers pass all data in; no localStorage reads here.

import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";
import type { FuelingLevel }     from "./fuelTargets";

export interface FuelingWindow {
  timing:         string;
  recommendation: string;
}

export interface WorkoutFuelingPlan {
  preWorkout:  FuelingWindow | null;
  postWorkout: FuelingWindow | null;
  evening:     { recommendation: string } | null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeWorkoutFueling(
  workout:      GeneratedWorkout | null,
  fuelingLevel: FuelingLevel,
): WorkoutFuelingPlan {
  // No training today — return a rest-day note when recovery is the goal
  if (!workout) {
    return {
      preWorkout:  null,
      postWorkout: null,
      evening:
        fuelingLevel === "recovery"
          ? { recommendation: "Prioritise protein and magnesium-rich foods this evening to support overnight recovery." }
          : null,
    };
  }

  const { energyLevel, estimatedDurationMin } = workout;

  // ── Pre-workout window ─────────────────────────────────────────────────────

  let preWorkout: FuelingWindow | null = null;

  if (energyLevel >= 3 && estimatedDurationMin >= 60) {
    preWorkout = {
      timing:         "2–3 hours before",
      recommendation: "Moderate carbohydrate meal (oats, rice, sweet potato) with a palm of protein. Avoid high-fat, high-fibre foods that slow digestion.",
    };
  } else if (energyLevel >= 2 && estimatedDurationMin >= 40) {
    preWorkout = {
      timing:         "1–2 hours before",
      recommendation: "Light carbohydrate snack (banana, rice cake, or toast) to top up glycogen without causing discomfort.",
    };
  } else if (energyLevel >= 1) {
    preWorkout = {
      timing:         "30–60 minutes before",
      recommendation: "Small snack optional — fruit or a handful of crackers if appetite allows. Hydrate well.",
    };
  }

  // ── Post-workout window (always present when a workout exists) ─────────────

  const proteinTarget =
    fuelingLevel === "high_output" ? "30–40 g" :
    fuelingLevel === "performance" ? "25–35 g" :
    "20–30 g";

  const postWorkout: FuelingWindow = {
    timing:         "within 45–60 minutes",
    recommendation: `${proteinTarget} protein with fast-digesting carbohydrates. Greek yogurt and fruit, a protein shake with banana, or chicken and rice all work well.`,
  };

  // ── Evening fueling ────────────────────────────────────────────────────────

  let eveningNote: string | null = null;

  if (fuelingLevel === "high_output") {
    eveningNote = "Include a casein-rich protein source before bed (cottage cheese, Greek yogurt, or milk) to support overnight muscle repair.";
  } else if (fuelingLevel === "performance") {
    eveningNote = "A protein-rich evening meal supports recovery — aim for a complete protein source (poultry, fish, legumes, eggs).";
  } else if (fuelingLevel === "recovery") {
    eveningNote = "Prioritise magnesium-rich foods this evening (dark chocolate, nuts, leafy greens) to support sleep quality and overnight repair.";
  }

  return {
    preWorkout,
    postWorkout,
    evening: eveningNote ? { recommendation: eveningNote } : null,
  };
}
