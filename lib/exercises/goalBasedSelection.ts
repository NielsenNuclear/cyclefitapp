// ─── lib/exercises/goalBasedSelection.ts ─────────────────────────────────────
// Goal-based exercise scoring and selection.
// Pure logic — no React, no side effects.

import type { Exercise, MovementPattern, DifficultyLevel, EquipmentCategory } from "./exerciseLibrary";
import { deriveEquipmentCategory } from "./exerciseSubstitutions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalType =
  | "general_fitness"
  | "fat_loss"
  | "hypertrophy"
  | "strength"
  | "athletic_performance";

export interface GoalProfile {
  type:  GoalType;
  label: string;  // user-facing name
  focus: string;  // goalFocus string surfaced in GeneratedWorkout
}

export type GoalModifier = Record<MovementPattern, number>;  // 0–3 per pattern

export interface GoalSelectionStrategy {
  profile:        GoalProfile;
  movementScores: GoalModifier;
  equipmentScores: Record<EquipmentCategory, number>;  // 0–2 per category
}

// ─── Movement pattern scores (0–3) ───────────────────────────────────────────

const MOVEMENT_SCORES: Record<GoalType, GoalModifier> = {
  general_fitness: {
    "Squat":            2.5,
    "Hinge":            2.5,
    "Horizontal Push":  2.0,
    "Vertical Push":    2.0,
    "Horizontal Pull":  2.0,
    "Vertical Pull":    2.0,
    "Explosive":        2.0,
    "Carry":            2.0,
    "Rotation":         1.5,
    "Anti-Rotation":    1.5,
    "Isometric":        1.5,
    "Stability":        1.5,
    "Mobility":         1.5,
  },
  fat_loss: {
    "Explosive":        3.0,
    "Squat":            3.0,
    "Hinge":            3.0,
    "Horizontal Pull":  2.5,
    "Horizontal Push":  2.5,
    "Vertical Pull":    2.5,
    "Carry":            2.5,
    "Vertical Push":    2.0,
    "Rotation":         2.0,
    "Anti-Rotation":    1.5,
    "Isometric":        1.5,
    "Stability":        0.5,
    "Mobility":         0.5,
  },
  hypertrophy: {
    "Horizontal Push":  3.0,
    "Vertical Push":    3.0,
    "Horizontal Pull":  3.0,
    "Vertical Pull":    3.0,
    "Squat":            2.5,
    "Hinge":            2.5,
    "Isometric":        2.0,
    "Rotation":         1.5,
    "Anti-Rotation":    1.5,
    "Carry":            1.0,
    "Explosive":        1.0,
    "Stability":        0.5,
    "Mobility":         0.5,
  },
  strength: {
    "Squat":            3.0,
    "Hinge":            3.0,
    "Horizontal Push":  3.0,
    "Vertical Push":    3.0,
    "Horizontal Pull":  3.0,
    "Vertical Pull":    3.0,
    "Explosive":        2.0,
    "Carry":            1.5,
    "Isometric":        1.0,
    "Anti-Rotation":    0.5,
    "Rotation":         0.5,
    "Stability":        0.5,
    "Mobility":         0.0,
  },
  athletic_performance: {
    "Explosive":        3.0,
    "Carry":            3.0,
    "Rotation":         3.0,
    "Anti-Rotation":    3.0,
    "Stability":        2.5,
    "Squat":            2.0,
    "Hinge":            2.0,
    "Vertical Pull":    2.0,
    "Horizontal Pull":  2.0,
    "Mobility":         1.5,
    "Horizontal Push":  1.5,
    "Vertical Push":    1.5,
    "Isometric":        1.0,
  },
};

// ─── Equipment category scores (0–2) ─────────────────────────────────────────

const EQUIPMENT_SCORES: Record<GoalType, Record<EquipmentCategory, number>> = {
  general_fitness: {
    dumbbell:         2.0,
    bodyweight:       2.0,
    barbell:          1.5,
    machine:          1.5,
    cable:            1.5,
    pullup_bar:       1.5,
    kettlebell:       1.5,
    resistance_band:  1.0,
    other:            1.0,
  },
  fat_loss: {
    bodyweight:       2.0,
    kettlebell:       2.0,
    dumbbell:         1.5,
    barbell:          1.5,
    pullup_bar:       1.5,
    cable:            1.0,
    resistance_band:  1.0,
    other:            1.0,
    machine:          0.5,
  },
  hypertrophy: {
    machine:          2.0,
    dumbbell:         2.0,
    cable:            1.5,
    pullup_bar:       1.5,
    barbell:          1.0,
    bodyweight:       1.0,
    kettlebell:       1.0,
    resistance_band:  0.5,
    other:            0.5,
  },
  strength: {
    barbell:          2.0,
    pullup_bar:       1.5,
    dumbbell:         1.0,
    bodyweight:       1.0,
    kettlebell:       1.0,
    cable:            0.5,
    machine:          0.5,
    resistance_band:  0.5,
    other:            0.5,
  },
  athletic_performance: {
    bodyweight:       2.0,
    kettlebell:       2.0,
    other:            1.5,
    dumbbell:         1.5,
    barbell:          1.5,
    pullup_bar:       1.5,
    resistance_band:  1.0,
    cable:            0.5,
    machine:          0.5,
  },
};

// ─── Goal profiles (label + goalFocus string) ─────────────────────────────────

export const GOAL_PROFILES: Record<GoalType, GoalProfile> = {
  general_fitness:      { type: "general_fitness",      label: "General Fitness",      focus: "Balanced Fitness"       },
  fat_loss:             { type: "fat_loss",             label: "Fat Loss",             focus: "Metabolic Emphasis"     },
  hypertrophy:          { type: "hypertrophy",          label: "Hypertrophy",          focus: "Hypertrophy Emphasis"   },
  strength:             { type: "strength",             label: "Strength",             focus: "Strength Development"   },
  athletic_performance: { type: "athletic_performance", label: "Athletic Performance", focus: "Athletic Performance"   },
};

// ─── Bundled strategies ───────────────────────────────────────────────────────

export const GOAL_STRATEGIES: Record<GoalType, GoalSelectionStrategy> = Object.fromEntries(
  (Object.keys(GOAL_PROFILES) as GoalType[]).map(g => [
    g,
    {
      profile:         GOAL_PROFILES[g],
      movementScores:  MOVEMENT_SCORES[g],
      equipmentScores: EQUIPMENT_SCORES[g],
    },
  ])
) as Record<GoalType, GoalSelectionStrategy>;

// ─── Scoring ──────────────────────────────────────────────────────────────────

function difficultyFitScore(exerciseDiff: DifficultyLevel, target: DifficultyLevel): number {
  const tiers: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];
  const dist = Math.abs(tiers.indexOf(exerciseDiff) - tiers.indexOf(target));
  return [1.0, 0.5, 0.0][dist] ?? 0.0;
}

export function scoreExercise(
  exercise:   Exercise,
  goalType:   GoalType,
  targetDiff: DifficultyLevel,
): number {
  const strategy    = GOAL_STRATEGIES[goalType];
  const movScore    = strategy.movementScores[exercise.movementPattern] ?? 1.0;
  const equipCat    = deriveEquipmentCategory(exercise.equipment);
  const equipScore  = strategy.equipmentScores[equipCat] ?? 1.0;
  const diffScore   = difficultyFitScore(exercise.difficulty, targetDiff);
  return movScore + equipScore + diffScore;
}

// ─── Goal-aware pool selection ────────────────────────────────────────────────
// Scores all candidates, picks from the top-scoring cohort, rotates within
// that cohort via sessionIndex to maintain session-to-session variety.

export function pickByGoal(
  pool:         Exercise[],
  count:        number,
  goalType:     GoalType,
  targetDiff:   DifficultyLevel,
  sessionIndex: number,
): Exercise[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return pool;

  // Score and stable-sort (tie-break by original index for determinism)
  const scored = pool.map((ex, idx) => ({
    ex,
    score: scoreExercise(ex, goalType, targetDiff),
    idx,
  }));
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  // Candidate window: best (count × 2) or at least (count + 2) exercises
  // This preserves goal bias while allowing variety across sessions
  const windowSize = Math.min(scored.length, Math.max(count * 2, count + 2));
  const window     = scored.slice(0, windowSize);

  const offset = sessionIndex % window.length;
  const result: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    result.push(window[(offset + i) % window.length].ex);
  }
  return result;
}

// ─── Onboarding goal → GoalType mapping ──────────────────────────────────────
// Checks the goals array from OnboardingData against known onboarding values.
// Priority: strength > athletic > hypertrophy > fat_loss > general_fitness

export function mapOnboardingGoalToGoalType(goals: string[]): GoalType {
  if (!goals || goals.length === 0) return "general_fitness";

  if (goals.includes("build_strength"))       return "strength";
  if (goals.includes("improve_performance"))  return "athletic_performance";
  if (goals.includes("body_composition"))     return "hypertrophy";
  if (goals.includes("improve_endurance"))    return "fat_loss";

  return "general_fitness";
}
