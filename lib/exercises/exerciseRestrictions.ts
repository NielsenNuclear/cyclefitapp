// ─── lib/exercises/exerciseRestrictions.ts ───────────────────────────────────
// User-blocked exercises. Restricted exercises are never selected during
// workout generation and never appear as substitution alternatives.
// Pure logic — no React, no side effects except localStorage.

const STORAGE_KEY = "axis_exercise_restrictions";
const MAX_ENTRIES = 100;

export type RestrictionReason = "pain" | "dislike" | "equipment_issue" | "other";

export interface ExerciseRestriction {
  exerciseName: string;
  reason:       RestrictionReason;
  notes?:       string;
  addedAt:      string; // ISO timestamp
}

export const RESTRICTION_LABELS: Record<RestrictionReason, string> = {
  pain:             "Pain / Injury",
  dislike:          "Dislike",
  equipment_issue:  "Equipment Issue",
  other:            "Other",
};

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getRestrictions(): ExerciseRestriction[] {
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

function saveRestrictions(items: ExerciseRestriction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function isRestricted(exerciseName: string): boolean {
  return getRestrictions().some(r => r.exerciseName === exerciseName);
}

export function addRestriction(
  exerciseName: string,
  reason: RestrictionReason,
  notes?: string,
): void {
  const existing = getRestrictions();
  if (existing.some(r => r.exerciseName === exerciseName)) {
    // Update reason/notes if already restricted
    saveRestrictions(
      existing.map(r =>
        r.exerciseName === exerciseName ? { ...r, reason, notes, addedAt: new Date().toISOString() } : r
      )
    );
    return;
  }
  saveRestrictions([...existing, { exerciseName, reason, notes, addedAt: new Date().toISOString() }]);
}

export function removeRestriction(exerciseName: string): void {
  saveRestrictions(getRestrictions().filter(r => r.exerciseName !== exerciseName));
}

export function getRestrictedExerciseNames(): string[] {
  return getRestrictions().map(r => r.exerciseName);
}
