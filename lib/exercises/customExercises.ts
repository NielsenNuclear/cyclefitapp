// ─── lib/exercises/customExercises.ts ────────────────────────────────────────
// User-defined exercises that don't exist in the built-in library (e.g.
// Pendulum Squat, Belt Squat, JM Press, Hatfield Squat, Sissy Squat).
// Pure logic — no React, no side effects.

import type { Exercise, DifficultyLevel, MovementPattern, MuscleCategory } from "@/lib/exercises/exerciseLibrary";
import { allExercises } from "@/lib/exercises/exerciseLibrary";

const STORAGE_KEY = "axis_custom_exercises";
const MAX_ENTRIES  = 100;

export interface CustomExercise {
  id:                string;
  name:              string;
  primaryMuscles:    string[];
  secondaryMuscles:  string[];
  difficulty:        DifficultyLevel;
  equipmentRequired: string[];
  notes?:            string;
}

export interface CustomExerciseResult {
  ok:     boolean;
  error?: string;
  item?:  CustomExercise;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getCustomExercises(): CustomExercise[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomExercises(items: CustomExercise[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function addCustomExercise(input: {
  name:              string;
  primaryMuscles:    string[];
  secondaryMuscles:  string[];
  difficulty:        DifficultyLevel;
  equipmentRequired: string[];
  notes?:            string;
}): CustomExerciseResult {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { ok: false, error: "Exercise name cannot be empty." };
  if (input.primaryMuscles.length === 0) {
    return { ok: false, error: "Select at least one primary muscle." };
  }

  const existing = getCustomExercises();
  if (existing.length >= MAX_ENTRIES) {
    return { ok: false, error: `You can track up to ${MAX_ENTRIES} custom exercises.` };
  }
  if (existing.some(e => normalizeName(e.name) === normalizeName(trimmedName))) {
    return { ok: false, error: "An exercise with this name already exists." };
  }

  const item: CustomExercise = {
    id:                `customex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name:              trimmedName,
    primaryMuscles:    input.primaryMuscles,
    secondaryMuscles:  input.secondaryMuscles,
    difficulty:        input.difficulty,
    equipmentRequired: input.equipmentRequired,
    notes:             input.notes?.trim() || undefined,
  };
  saveCustomExercises([...existing, item]);
  return { ok: true, item };
}

export function updateCustomExercise(
  id:     string,
  update: Partial<Omit<CustomExercise, "id">>,
): CustomExerciseResult {
  const existing = getCustomExercises();
  const target    = existing.find(e => e.id === id);
  if (!target) return { ok: false, error: "Exercise not found." };

  let nextUpdate = update;
  if (update.name !== undefined) {
    const trimmedName = update.name.trim();
    if (!trimmedName) return { ok: false, error: "Exercise name cannot be empty." };
    if (existing.some(e => e.id !== id && normalizeName(e.name) === normalizeName(trimmedName))) {
      return { ok: false, error: "An exercise with this name already exists." };
    }
    nextUpdate = { ...update, name: trimmedName };
  }
  if (update.primaryMuscles !== undefined && update.primaryMuscles.length === 0) {
    return { ok: false, error: "Select at least one primary muscle." };
  }

  const updated = existing.map(e => (e.id === id ? { ...e, ...nextUpdate } : e));
  saveCustomExercises(updated);
  return { ok: true, item: updated.find(e => e.id === id) };
}

export function deleteCustomExercise(id: string): void {
  const existing = getCustomExercises();
  saveCustomExercises(existing.filter(e => e.id !== id));
}

// ─── Generator integration ────────────────────────────────────────────────────
// Custom exercises don't carry movementPattern/category — the built-in
// library's organizing fields — so we infer them from primaryMuscles using
// the same muscle groupings the built-in library uses, letting custom
// exercises slot into the same scoring/substitution/selection machinery.

const MUSCLE_TO_CATEGORY: Record<string, MuscleCategory> = {
  "pectoralis major": "Upper Push", "anterior deltoid": "Upper Push",
  "lateral deltoid": "Upper Push", "deltoid": "Upper Push", "triceps": "Upper Push",
  "triceps brachii": "Upper Push",
  "latissimus dorsi": "Upper Pull", "biceps": "Upper Pull", "biceps brachii": "Upper Pull",
  "rhomboids": "Upper Pull", "trapezius": "Upper Pull", "posterior deltoid": "Upper Pull",
  "rear deltoid": "Upper Pull", "forearms": "Upper Pull",
  "quadriceps": "Lower Quad", "quads": "Lower Quad", "hip flexors": "Lower Quad",
  "hamstrings": "Lower Posterior", "glutes": "Lower Posterior", "gluteus maximus": "Lower Posterior",
  "calves": "Lower Posterior", "tibialis anterior": "Lower Posterior", "adductors": "Lower Posterior",
  "rectus abdominis": "Core", "obliques": "Core", "abdominals": "Core", "core": "Core",
  "erector spinae": "Core", "transverse abdominis": "Core",
};

const CATEGORY_TO_PATTERN: Record<MuscleCategory, MovementPattern> = {
  "Upper Push":      "Horizontal Push",
  "Upper Pull":      "Horizontal Pull",
  "Lower Quad":      "Squat",
  "Lower Posterior": "Hinge",
  "Core":            "Anti-Rotation",
  "Full Body":       "Explosive",
  "Mobility":        "Mobility",
};

function inferCategory(primaryMuscles: string[]): MuscleCategory {
  for (const muscle of primaryMuscles) {
    const match = MUSCLE_TO_CATEGORY[muscle.trim().toLowerCase()];
    if (match) return match;
  }
  return "Full Body";
}

export function toExercise(custom: CustomExercise): Exercise {
  const category = inferCategory(custom.primaryMuscles);
  return {
    name:              custom.name,
    primaryMuscles:    custom.primaryMuscles,
    secondaryMuscles:  custom.secondaryMuscles,
    movementPattern:   CATEGORY_TO_PATTERN[category],
    difficulty:        custom.difficulty,
    equipment:         custom.equipmentRequired.join(", ") || "Bodyweight",
    biomechanicalNote: custom.notes ?? "User-defined exercise.",
    category,
    customEquipmentRequired: custom.equipmentRequired,
  };
}

export function getMergedExercisePool(): Exercise[] {
  return [...allExercises, ...getCustomExercises().map(toExercise)];
}
