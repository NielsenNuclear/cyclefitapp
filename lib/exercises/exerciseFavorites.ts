// ─── lib/exercises/exerciseFavorites.ts ──────────────────────────────────────
// User-starred exercises. Favorited exercises are surfaced earlier in the
// workout pool so the generator selects them more often.
// Pure logic — no React, no side effects except localStorage.

const STORAGE_KEY = "axis_favorite_exercises";
const MAX_ENTRIES = 50;

export interface FavoriteExercise {
  exerciseName: string;
  addedAt:      string; // ISO timestamp
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getFavorites(): FavoriteExercise[] {
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

function saveFavorites(items: FavoriteExercise[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function isFavorite(exerciseName: string): boolean {
  return getFavorites().some(f => f.exerciseName === exerciseName);
}

export function addFavorite(exerciseName: string): void {
  const existing = getFavorites();
  if (existing.some(f => f.exerciseName === exerciseName)) return;
  saveFavorites([...existing, { exerciseName, addedAt: new Date().toISOString() }]);
}

export function removeFavorite(exerciseName: string): void {
  saveFavorites(getFavorites().filter(f => f.exerciseName !== exerciseName));
}

export function toggleFavorite(exerciseName: string): boolean {
  if (isFavorite(exerciseName)) {
    removeFavorite(exerciseName);
    return false;
  }
  addFavorite(exerciseName);
  return true;
}

export function getFavoritedExerciseNames(): string[] {
  return getFavorites().map(f => f.exerciseName);
}
