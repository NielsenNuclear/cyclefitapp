// ─── lib/progression/exerciseMastery.ts ─────────────────────────────────────
// Tracks how competent the user has become at each exercise and surfaces
// advancement suggestions when mastery is high.

import type { ExercisePerformanceEntry } from "./exercisePerformanceLog";
import type { DifficultyLevel, TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import { allExercises } from "@/lib/exercises/exerciseLibrary";
import { isCompatibleWith } from "@/lib/exercises/exerciseSubstitutions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MasteryLevel = "beginner" | "developing" | "competent" | "advanced" | "mastered";

export interface ExerciseMasteryEntry {
  exerciseName:           string;
  masteryLevel:           MasteryLevel;
  appearances:            number;
  rpeComplianceRate:      number;   // 0–1, 2 dp
  advancementSuggestion?: string;   // name of next harder exercise, when ready
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const DIFFICULTY_TIERS: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];

function computeMasteryLevel(appearances: number, rpeCompliance: number): MasteryLevel {
  if (appearances < 3)  return "beginner";
  if (appearances < 8)  return rpeCompliance >= 0.70 ? "competent"  : "developing";
  if (appearances < 15) return rpeCompliance >= 0.75 ? "advanced"   : "competent";
  return                       rpeCompliance >= 0.80 ? "mastered"   : "advanced";
}

function findAdvancementSuggestion(
  exerciseName: string,
  environment:  TrainingEnvironment,
): string | undefined {
  const exercise = allExercises.find(e => e.name === exerciseName);
  if (!exercise) return undefined;

  const tierIdx = DIFFICULTY_TIERS.indexOf(exercise.difficulty);
  if (tierIdx < 0 || tierIdx >= DIFFICULTY_TIERS.length - 1) return undefined;

  const nextTier = DIFFICULTY_TIERS[tierIdx + 1];

  const candidate = allExercises.find(e =>
    e.name !== exerciseName &&
    e.difficulty === nextTier &&
    e.movementPattern === exercise.movementPattern &&
    e.primaryMuscles.some(m => exercise.primaryMuscles.includes(m)) &&
    isCompatibleWith(e, environment),
  );

  return candidate?.name;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Derives a mastery level per exercise from logged performance history.
 *
 * RPE compliance = sessions where actualRPE ≤ prescribedRPE (or ≤ 7 when
 * no RPE target was set) / total sessions. Advancement suggestions are
 * only surfaced for "advanced" and "mastered" exercises.
 */
export function computeExerciseMastery(
  performanceHistory: ExercisePerformanceEntry[],
  environment:        TrainingEnvironment,
): ExerciseMasteryEntry[] {
  if (performanceHistory.length === 0) return [];

  const grouped = new Map<string, ExercisePerformanceEntry[]>();
  for (const entry of performanceHistory) {
    const list = grouped.get(entry.exerciseName) ?? [];
    list.push(entry);
    grouped.set(entry.exerciseName, list);
  }

  const results: ExerciseMasteryEntry[] = [];

  for (const [exerciseName, entries] of grouped) {
    const appearances = entries.length;
    const compliant   = entries.filter(e =>
      e.prescribedRPE > 0
        ? e.actualRPE <= e.prescribedRPE
        : e.actualRPE <= 7,
    ).length;
    const rpeComplianceRate = Math.round((compliant / appearances) * 100) / 100;
    const masteryLevel      = computeMasteryLevel(appearances, rpeComplianceRate);

    results.push({
      exerciseName,
      masteryLevel,
      appearances,
      rpeComplianceRate,
      advancementSuggestion:
        masteryLevel === "advanced" || masteryLevel === "mastered"
          ? findAdvancementSuggestion(exerciseName, environment)
          : undefined,
    });
  }

  return results.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
