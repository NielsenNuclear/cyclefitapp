// ─── lib/exercises/customExercises.ts ────────────────────────────────────────
// User-defined exercises that don't exist in the built-in library (e.g.
// Pendulum Squat, Belt Squat, JM Press, Hatfield Squat, Sissy Squat).
// Pure logic — no React, no side effects.

import type { DifficultyLevel } from "@/lib/exercises/exerciseLibrary";

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
