// ─── lib/lifestyle/workoutModes.ts ────────────────────────────────────────────
// Phase 39F — Flexible Workout Modes.
// Maps the life context to an appropriate session format and trims the
// generated workout to fit the selected mode's time and exercise budget.
// No storage — pure transformation.

import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkoutMode = "full" | "condensed" | "minimum_effective" | "recovery";

export interface WorkoutModeConfig {
  mode:           WorkoutMode;
  label:          string;
  targetMinutes:  number;
  maxExercises:   number;
  maxSets:        number | null;   // null = no cap
  description:    string;
}

// ─── Mode definitions ─────────────────────────────────────────────────────────

export const WORKOUT_MODE_CONFIGS: Record<WorkoutMode, WorkoutModeConfig> = {
  full: {
    mode:           "full",
    label:          "Full Session",
    targetMinutes:  60,
    maxExercises:   8,
    maxSets:        null,
    description:    "Complete session — no time constraints.",
  },
  condensed: {
    mode:           "condensed",
    label:          "Condensed Session",
    targetMinutes:  30,
    maxExercises:   4,
    maxSets:        3,
    description:    "High-value movements, shorter rest periods.",
  },
  minimum_effective: {
    mode:           "minimum_effective",
    label:          "Minimum Effective Dose",
    targetMinutes:  15,
    maxExercises:   3,
    maxSets:        2,
    description:    "The least that maintains progress — better than zero.",
  },
  recovery: {
    mode:           "recovery",
    label:          "Recovery Session",
    targetMinutes:  15,
    maxExercises:   2,
    maxSets:        2,
    description:    "Mobility, breathing, and light movement only.",
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function applyWorkoutMode(workout: GeneratedWorkout, mode: WorkoutMode): GeneratedWorkout {
  if (mode === "full") return workout;

  const cfg       = WORKOUT_MODE_CONFIGS[mode];
  const trimmed   = workout.exercises.slice(0, cfg.maxExercises).map(ex => ({
    ...ex,
    sets: cfg.maxSets !== null ? Math.min(ex.sets, cfg.maxSets) : ex.sets,
  }));

  const note =
    mode === "condensed"
      ? "Condensed to fit your available time — all key movements included."
      : mode === "minimum_effective"
        ? "Minimum effective dose — your most important exercises, nothing wasted."
        : "Recovery-focused session — prioritise how you feel over performance today.";

  return {
    ...workout,
    exercises:            trimmed,
    totalExercises:       trimmed.length,
    estimatedDurationMin: cfg.targetMinutes,
    phaseNote:            note,
  };
}
