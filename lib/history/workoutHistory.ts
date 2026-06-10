// ─── lib/history/workoutHistory.ts ───────────────────────────────────────────
// Local workout history using localStorage only.
// Pure logic — no React, no side effects beyond localStorage.

import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";
import type { SplitType } from "@/lib/exercises/workoutSplits";
import type { TrainingState } from "@/types/recommendation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkoutCompletionStatus =
  | "pending"
  | "completed"
  | "partially_completed"
  | "skipped";

export interface StoredExercise {
  name:              string;
  sets:              number;
  reps:              string;
  rest:              string;
  rpe?:              number;
  primaryMuscles?:   string[];
  secondaryMuscles?: string[];
}

export interface WorkoutHistoryEntry {
  id:                   string;   // YYYY-MM-DD — one entry per calendar day
  date:                 string;   // ISO timestamp (saved at)
  workoutName:          string;
  splitType:            SplitType;
  phaseName:            string;
  energyLevel:          number;
  trainingState:        TrainingState;
  estimatedDurationMin: number;
  exercises:            StoredExercise[];
  status:               WorkoutCompletionStatus;
  savedAt:              string;   // ISO timestamp
  completedAt?:         string;   // ISO timestamp, set when status → completed
}

export interface WorkoutHistorySummary {
  totalWorkouts:     number;
  totalCompleted:    number;
  workoutsThisWeek:  number;
  workoutsThisMonth: number;
  completionRate:    number;    // 0–1: (completed + partially) / all non-pending
  skippedRate:       number;    // 0–1: skipped / all non-pending
  currentStreak:     number;    // consecutive calendar days with completed/partially
  longestStreak:     number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "axis_workout_history";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadHistory(): WorkoutHistoryEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutHistoryEntry[];
  } catch {
    return [];
  }
}

function persistHistory(entries: WorkoutHistoryEntry[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayString(): string {
  return toDateString(new Date());
}

function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return toDateString(d);
}

function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function saveWorkout(workout: GeneratedWorkout): void {
  const id      = todayString();
  const entries = loadHistory();
  if (entries.some(e => e.id === id)) return; // idempotent: one entry per day

  const now = new Date().toISOString();

  const entry: WorkoutHistoryEntry = {
    id,
    date:                 now,
    workoutName:          workout.workoutName,
    splitType:            workout.splitType,
    phaseName:            workout.phase.name,
    energyLevel:          workout.energyLevel,
    trainingState:        workout.trainingState,
    estimatedDurationMin: workout.estimatedDurationMin,
    exercises:            workout.exercises.map(ex => ({
      name:              ex.name,
      sets:              ex.sets,
      reps:              ex.reps,
      rest:              ex.rest,
      rpe:               ex.rpe,
      primaryMuscles:    ex.exercise.primaryMuscles,
      secondaryMuscles:  ex.exercise.secondaryMuscles,
    })),
    status:  "pending",
    savedAt: now,
  };

  persistHistory([entry, ...entries]);
}

export function getWorkoutHistory(): WorkoutHistoryEntry[] {
  return loadHistory().sort((a, b) => b.id.localeCompare(a.id));
}

export function markWorkoutCompleted(date: string): void {
  const entries = loadHistory();
  const idx     = entries.findIndex(e => e.id === date);
  if (idx === -1) return;
  entries[idx] = {
    ...entries[idx],
    status:      "completed",
    completedAt: new Date().toISOString(),
  };
  persistHistory(entries);
}

export function markWorkoutPartiallyCompleted(date: string): void {
  const entries = loadHistory();
  const idx     = entries.findIndex(e => e.id === date);
  if (idx === -1) return;
  entries[idx] = {
    ...entries[idx],
    status:      "partially_completed",
    completedAt: new Date().toISOString(),
  };
  persistHistory(entries);
}

export function markWorkoutSkipped(date: string): void {
  const entries = loadHistory();
  const idx     = entries.findIndex(e => e.id === date);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], status: "skipped" };
  persistHistory(entries);
}

// ─── Streak calculation ───────────────────────────────────────────────────────

function calcStreaks(entries: WorkoutHistoryEntry[]): { current: number; longest: number } {
  const trained = new Set(
    entries
      .filter(e => e.status === "completed" || e.status === "partially_completed")
      .map(e => e.id)
  );

  if (trained.size === 0) return { current: 0, longest: 0 };

  // Current streak: walk back from today; if today untrained, start from yesterday
  const cursor = new Date();
  if (!trained.has(toDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (trained.has(toDateString(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak: iterate sorted dates, count consecutive days
  const sorted = [...trained].sort();
  let longest = 0;
  let run     = 0;
  let prev: string | null = null;

  for (const ds of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      const next = new Date(prev + "T00:00:00");
      next.setDate(next.getDate() + 1);
      run = toDateString(next) === ds ? run + 1 : 1;
    }
    if (run > longest) longest = run;
    prev = ds;
  }

  return { current, longest };
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function getWorkoutHistorySummary(): WorkoutHistorySummary {
  const entries = loadHistory();
  const today   = new Date();
  const todayStr     = toDateString(today);
  const weekStart    = mondayOfWeek(today);
  const monthStart   = firstOfMonth(today);

  const nonPending  = entries.filter(e => e.status !== "pending");
  const completed   = nonPending.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  );
  const skipped     = nonPending.filter(e => e.status === "skipped");

  const thisWeek  = completed.filter(e => e.id >= weekStart  && e.id <= todayStr);
  const thisMonth = completed.filter(e => e.id >= monthStart && e.id <= todayStr);

  const { current, longest } = calcStreaks(entries);

  return {
    totalWorkouts:     nonPending.length,
    totalCompleted:    completed.length,
    workoutsThisWeek:  thisWeek.length,
    workoutsThisMonth: thisMonth.length,
    completionRate:    nonPending.length > 0 ? completed.length / nonPending.length : 0,
    skippedRate:       nonPending.length > 0 ? skipped.length  / nonPending.length : 0,
    currentStreak:     current,
    longestStreak:     longest,
  };
}
