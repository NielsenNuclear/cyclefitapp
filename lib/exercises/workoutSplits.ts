// ─── lib/exercises/workoutSplits.ts ──────────────────────────────────────────
// Maps the exercise library into structured workout day templates.
// Pure logic — no React, no side effects.
//
// Entry point: buildWorkoutDay(params) → WorkoutDay
// Supports: Upper/Lower | Push/Pull/Legs | Full Body | Bro Split

import type { Exercise, MuscleCategory, DifficultyLevel } from "./exerciseLibrary";
import { getMergedExercisePool } from "./customExercises";
import type { GoalType } from "./goalBasedSelection";
import { pickByGoal } from "./goalBasedSelection";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SplitType =
  | "upper_lower"
  | "push_pull_legs"
  | "full_body"
  | "bro_split";

export interface WorkoutDay {
  splitType: SplitType;
  dayName: string;
  focus: string;
  exercises: Exercise[];
  totalExercises: number;
  estimatedDurationMin: number;
}

// ─── Internal template types ──────────────────────────────────────────────────

interface ExerciseSlot {
  category: MuscleCategory;
  count: number;
  muscleFocus?: string[]; // primary muscle keyword filter within category
}

interface DayTemplate {
  dayName: string;
  focus: string;
  slots: ExerciseSlot[];
}

interface SplitTemplate {
  type: SplitType;
  label: string;
  daysPerWeek: number;
  days: DayTemplate[];
}

// ─── Split templates ──────────────────────────────────────────────────────────

const SPLIT_TEMPLATES: Record<SplitType, SplitTemplate> = {

  upper_lower: {
    type: "upper_lower",
    label: "Upper / Lower",
    daysPerWeek: 4,
    days: [
      {
        dayName: "Upper A",
        focus: "Push Emphasis",
        slots: [
          { category: "Upper Push", count: 3 },
          { category: "Upper Pull", count: 2 },
          { category: "Core",       count: 2 },
        ],
      },
      {
        dayName: "Lower A",
        focus: "Quad Dominant",
        slots: [
          { category: "Lower Quad",      count: 3 },
          { category: "Lower Posterior", count: 2 },
          { category: "Core",            count: 1 },
        ],
      },
      {
        dayName: "Upper B",
        focus: "Pull Emphasis",
        slots: [
          { category: "Upper Pull", count: 3 },
          { category: "Upper Push", count: 2 },
          { category: "Core",       count: 2 },
        ],
      },
      {
        dayName: "Lower B",
        focus: "Posterior Dominant",
        slots: [
          { category: "Lower Posterior", count: 3 },
          { category: "Lower Quad",      count: 2 },
          { category: "Core",            count: 1 },
        ],
      },
    ],
  },

  push_pull_legs: {
    type: "push_pull_legs",
    label: "Push / Pull / Legs",
    daysPerWeek: 3,
    days: [
      {
        dayName: "Push",
        focus: "Chest, Shoulders, Triceps",
        slots: [
          { category: "Upper Push", count: 4 },
          { category: "Core",       count: 2 },
        ],
      },
      {
        dayName: "Pull",
        focus: "Back, Biceps",
        slots: [
          { category: "Upper Pull", count: 4 },
          { category: "Core",       count: 2 },
        ],
      },
      {
        dayName: "Legs",
        focus: "Quads, Hamstrings, Glutes",
        slots: [
          { category: "Lower Quad",      count: 2 },
          { category: "Lower Posterior", count: 2 },
          { category: "Core",            count: 2 },
        ],
      },
    ],
  },

  full_body: {
    type: "full_body",
    label: "Full Body",
    daysPerWeek: 3,
    days: [
      {
        dayName: "Full Body A",
        focus: "Push + Quad",
        slots: [
          { category: "Full Body",       count: 1 },
          { category: "Upper Push",      count: 2 },
          { category: "Upper Pull",      count: 1 },
          { category: "Lower Quad",      count: 2 },
          { category: "Core",            count: 1 },
        ],
      },
      {
        dayName: "Full Body B",
        focus: "Pull + Posterior",
        slots: [
          { category: "Full Body",       count: 1 },
          { category: "Upper Pull",      count: 2 },
          { category: "Upper Push",      count: 1 },
          { category: "Lower Posterior", count: 2 },
          { category: "Core",            count: 1 },
        ],
      },
      {
        dayName: "Full Body C",
        focus: "Athletic + Mixed",
        slots: [
          { category: "Full Body",       count: 2 },
          { category: "Lower Quad",      count: 1 },
          { category: "Lower Posterior", count: 1 },
          { category: "Upper Push",      count: 1 },
          { category: "Upper Pull",      count: 1 },
        ],
      },
    ],
  },

  bro_split: {
    type: "bro_split",
    label: "Bro Split",
    daysPerWeek: 5,
    days: [
      {
        dayName: "Chest",
        focus: "Pectoral Hypertrophy",
        slots: [
          { category: "Upper Push", count: 4, muscleFocus: ["Pectoralis"] },
          { category: "Core",       count: 2 },
        ],
      },
      {
        dayName: "Back",
        focus: "Lat & Rhomboid Hypertrophy",
        slots: [
          { category: "Upper Pull", count: 4, muscleFocus: ["Latissimus", "Rhomboid", "Trapezius"] },
          { category: "Core",       count: 2 },
        ],
      },
      {
        dayName: "Legs",
        focus: "Full Lower Body",
        slots: [
          { category: "Lower Quad",      count: 2 },
          { category: "Lower Posterior", count: 2 },
          { category: "Core",            count: 2 },
        ],
      },
      {
        dayName: "Shoulders + Triceps",
        focus: "Deltoid & Tricep Hypertrophy",
        slots: [
          { category: "Upper Push", count: 3, muscleFocus: ["Deltoid"] },
          { category: "Upper Push", count: 2, muscleFocus: ["Triceps"] },
          { category: "Core",       count: 1 },
        ],
      },
      {
        dayName: "Biceps + Core",
        focus: "Bicep Hypertrophy + Core",
        slots: [
          { category: "Upper Pull", count: 3, muscleFocus: ["Biceps"] },
          { category: "Core",       count: 3 },
        ],
      },
    ],
  },
};

// ─── Exercise selection helpers ───────────────────────────────────────────────

const DIFFICULTY_ORDER: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];

function stepDifficulty(base: DifficultyLevel, delta: -1 | 0 | 1): DifficultyLevel {
  const idx = DIFFICULTY_ORDER.indexOf(base);
  return DIFFICULTY_ORDER[Math.max(0, Math.min(2, idx + delta))];
}

function buildPool(
  category: MuscleCategory,
  baseDifficulty: DifficultyLevel,
  energyLevel: number,
  muscleFocus?: string[],
): Exercise[] {
  let pool = getMergedExercisePool().filter(e => e.category === category);

  if (muscleFocus && muscleFocus.length > 0) {
    const focused = pool.filter(e =>
      e.primaryMuscles.some(m => muscleFocus.some(f => m.includes(f)))
    );
    if (focused.length >= 2) pool = focused;
  }

  // Energy adjusts effective difficulty tier
  const effectiveDifficulty: DifficultyLevel =
    energyLevel <= 1 ? stepDifficulty(baseDifficulty, -1) :
    energyLevel >= 4 ? stepDifficulty(baseDifficulty, +1) :
    baseDifficulty;

  const tiered = pool.filter(e => e.difficulty === effectiveDifficulty);

  // If the exact tier yields fewer than 2, fall back to full pool
  return tiered.length >= 2 ? tiered : pool;
}

function pickFromPool(
  pool: Exercise[],
  count: number,
  sessionIndex: number,
): Exercise[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return pool;
  const offset = (isNaN(sessionIndex) ? 0 : sessionIndex) % pool.length;
  const result: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[(offset + i) % pool.length]);
  }
  return result;
}

function estimateDuration(exercises: Exercise[], difficulty: DifficultyLevel): number {
  const minsPerExercise: Record<DifficultyLevel, number> = {
    Beginner:     6,
    Intermediate: 9,
    Advanced:     11,
  };
  const base = minsPerExercise[difficulty];
  return exercises.reduce((total, e) => {
    const mobilityMin = 3;
    return total + (e.category === "Mobility" ? mobilityMin : base);
  }, 0);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildWorkoutDay(params: {
  splitType: SplitType;
  dayIndex: number;        // 0-based index into the split's day array
  difficulty: DifficultyLevel;
  energyLevel: number;     // 0–4 from deriveEnergyLevel()
  sessionIndex?: number;   // increments across sessions for exercise variety
  goalType?: GoalType;     // if set, uses goal-aware scoring instead of round-robin
}): WorkoutDay {
  const { splitType, dayIndex, difficulty, energyLevel, sessionIndex = 0, goalType } = params;

  const template = SPLIT_TEMPLATES[splitType];
  const day = template.days[dayIndex % template.days.length];

  // Low energy override: swap non-mobility slots to lighter exercises
  // and append a mobility slot if none already present
  const effectiveSlots = [...day.slots];
  const hasMobilitySlot = effectiveSlots.some(s => s.category === "Mobility");
  if (energyLevel <= 1 && !hasMobilitySlot) {
    effectiveSlots.push({ category: "Mobility", count: 2 });
  }

  const exercises: Exercise[] = effectiveSlots.flatMap((slot, slotIdx) => {
    const pool = buildPool(slot.category, difficulty, energyLevel, slot.muscleFocus);
    const slotOffset = sessionIndex + slotIdx * 7;
    if (goalType) {
      const effectiveDifficulty: DifficultyLevel =
        energyLevel <= 1 ? stepDifficulty(difficulty, -1) :
        energyLevel >= 4 ? stepDifficulty(difficulty, +1) :
        difficulty;
      return pickByGoal(pool, slot.count, goalType, effectiveDifficulty, slotOffset);
    }
    return pickFromPool(pool, slot.count, slotOffset);
  });

  // De-duplicate by name (possible when muscleFocus filter is narrow and pool is small)
  const seen = new Set<string>();
  const unique = exercises.filter(e => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });

  return {
    splitType,
    dayName: day.dayName,
    focus:   day.focus,
    exercises: unique,
    totalExercises: unique.length,
    estimatedDurationMin: estimateDuration(unique, difficulty),
  };
}

// ─── Utility exports ──────────────────────────────────────────────────────────

export function getSplitTemplate(splitType: SplitType): SplitTemplate {
  return SPLIT_TEMPLATES[splitType];
}

export function recommendedSplitType(sessionsPerWeek: number): SplitType {
  if (sessionsPerWeek <= 2) return "full_body";
  if (sessionsPerWeek <= 3) return "full_body";
  if (sessionsPerWeek <= 4) return "upper_lower";
  if (sessionsPerWeek <= 5) return "push_pull_legs";
  return "bro_split";
}

export { SPLIT_TEMPLATES };
