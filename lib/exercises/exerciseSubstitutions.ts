// ─── lib/exercises/exerciseSubstitutions.ts ──────────────────────────────────
// Equipment-awareness and substitution engine.
// Pure logic — no React, no side effects.

import type {
  Exercise,
  EquipmentCategory,
  TrainingEnvironment,
  DifficultyLevel,
  LoadingType,
} from "./exerciseLibrary";
import { getMergedExercisePool } from "./customExercises";
import { getRestrictedExerciseNames } from "./exerciseRestrictions";

// ─── Equipment derivation ─────────────────────────────────────────────────────
// Derives structured metadata from the free-text `equipment` string without
// requiring every exercise object to be annotated manually.

export function deriveEquipmentCategory(equipment: string): EquipmentCategory {
  const e = equipment.toLowerCase();
  if (e.includes("cable")) return "cable";
  if (e.includes("machine"))  return "machine";
  if (e.includes("barbell") || e.includes("ez-bar") || e.includes("trap bar")) return "barbell";
  if (e.includes("dumbbell")) return "dumbbell";
  if (e.includes("kettlebell")) return "kettlebell";
  if (e.includes("resistance band")) return "resistance_band";
  if (e.includes("pull-up bar")) return "pullup_bar";
  // Parallel bars, bodyweight, foam roller, medicine ball, etc.
  return "bodyweight";
}

// Workout Engine Sprint — Phase A.2 (UX Stabilization Issue #14). Derives
// what the logging UI should ask for from the same free-text `equipment`
// field, plus movementPattern/category for the cases equipment text alone
// can't distinguish. Checked BEFORE deriveEquipmentCategory's keyword match
// for "weight belt"/"weighted": e.g. "Parallel Bars, Weight Belt" (weighted
// dips) contains no barbell/dumbbell/etc keyword and would otherwise fall
// through to the bodyweight default despite being a weighted variant — the
// exact edge case flagged when this was first audited.
export function deriveLoadingType(exercise: Exercise): LoadingType {
  const e = exercise.equipment.toLowerCase();

  if (e.includes("assisted")) return "assisted";
  if (e.includes("weight belt") || e.includes("weighted")) return "weighted";

  if (exercise.movementPattern === "Carry") return "distance";
  if (exercise.movementPattern === "Isometric" || exercise.category === "Mobility") return "timed";

  const cat = deriveEquipmentCategory(exercise.equipment);
  if (cat === "bodyweight" || cat === "pullup_bar") return "bodyweight";
  if (cat === "resistance_band") return "repetitions";
  return "weighted"; // barbell, dumbbell, cable, machine, kettlebell
}

/** Hand-authored override (Exercise.loadingType) takes precedence over the derived default. */
export function getLoadingType(exercise: Exercise): LoadingType {
  return exercise.loadingType ?? deriveLoadingType(exercise);
}

export function deriveTrainingEnvironments(equipment: string): TrainingEnvironment[] {
  const e   = equipment.toLowerCase();
  const cat = deriveEquipmentCategory(equipment);

  // Resistance bands are universally portable
  if (cat === "resistance_band") return ["gym", "home_gym", "dumbbells_only", "bodyweight_only"];

  // Cable machines that also note a band alternative can run at home
  if (cat === "cable" && e.includes("resistance band")) {
    return ["gym", "home_gym", "dumbbells_only", "bodyweight_only"];
  }

  // Cables = gym only
  if (cat === "cable") return ["gym"];

  // Fixed machines = gym only
  if (cat === "machine") return ["gym"];

  // Gym-specific equipment with no home equivalent
  const gymOnlyKeywords = [
    "sled", "battle ropes", "plyometric box", "medicine ball", "sandbag",
    "hip pad", "glute-ham", "back extension bench", "landmine",
    "t-bar row machine", "parallel bars", "deficit platform",
    "anchor point", "ab wheel",
  ];
  if (gymOnlyKeywords.some(k => e.includes(k))) return ["gym"];

  // Barbell in any form = gym or home gym (assumes basic rack setup)
  if (cat === "barbell") return ["gym", "home_gym"];

  // Dumbbell requiring a bench = gym or home gym (bench may not be present)
  if (cat === "dumbbell" && (e.includes("bench") || e.includes("box"))) {
    return ["gym", "home_gym"];
  }

  // Dumbbell without bench = works with dumbbells only
  if (cat === "dumbbell") return ["gym", "home_gym", "dumbbells_only"];

  // Kettlebell = gym or home gym
  if (cat === "kettlebell") return ["gym", "home_gym"];

  // Pull-up bar = gym or home gym (doorframe bar)
  if (cat === "pullup_bar") return ["gym", "home_gym"];

  // Bodyweight with props (bench, box, wall)
  if (e.includes("bench") || e.includes("box") || e.includes("wall")) {
    return ["gym", "home_gym"];
  }

  // Pure bodyweight / foam roller / mat
  return ["gym", "home_gym", "bodyweight_only", "dumbbells_only"];
}

// ─── Compatibility check ──────────────────────────────────────────────────────

export function isCompatibleWith(exercise: Exercise, environment: TrainingEnvironment): boolean {
  const environments = exercise.trainingEnvironment ?? deriveTrainingEnvironments(exercise.equipment);
  return environments.includes(environment);
}

// ─── Substitution engine ──────────────────────────────────────────────────────

export interface SubstitutionQuery {
  exercise:    Exercise;
  environment: TrainingEnvironment;
  difficulty?: DifficultyLevel;
}

export function getExerciseSubstitutions({
  exercise,
  environment,
  difficulty,
}: SubstitutionQuery): Exercise[] {
  const targetDifficulty = difficulty ?? exercise.difficulty;
  const tiers: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];
  const targetIdx = tiers.indexOf(targetDifficulty);

  const restricted = new Set(getRestrictedExerciseNames());
  const candidates = getMergedExercisePool().filter(candidate => {
    if (candidate.name === exercise.name) return false;
    if (restricted.has(candidate.name)) return false;

    // Must match movement pattern exactly to preserve the movement stimulus
    if (candidate.movementPattern !== exercise.movementPattern) return false;

    // Must share at least one primary muscle
    const muscleMatch = candidate.primaryMuscles.some(m =>
      exercise.primaryMuscles.includes(m)
    );
    if (!muscleMatch) return false;

    // Must work in the target environment
    if (!isCompatibleWith(candidate, environment)) return false;

    // Allow same difficulty tier or one tier away
    const candidateIdx = tiers.indexOf(candidate.difficulty);
    if (Math.abs(targetIdx - candidateIdx) > 1) return false;

    return true;
  });

  // Sort: same difficulty first, then adjacent tier
  candidates.sort((a, b) => {
    const aGap = Math.abs(tiers.indexOf(a.difficulty) - targetIdx);
    const bGap = Math.abs(tiers.indexOf(b.difficulty) - targetIdx);
    return aGap - bGap;
  });

  return candidates;
}

// ─── Best-fit substitute (single exercise) ───────────────────────────────────

export function findSubstitute(
  exercise:    Exercise,
  environment: TrainingEnvironment,
  difficulty?: DifficultyLevel,
): Exercise | null {
  const results = getExerciseSubstitutions({ exercise, environment, difficulty });
  return results[0] ?? null;
}
