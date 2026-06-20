// ─── lib/workoutExecution/workoutLogging.ts ───────────────────────────────────
// Detailed per-session exercise logging.
// Supplements (does not replace) axis_workout_history.

const LOG_KEY    = "axis_workout_log";
const ACTIVE_KEY = "axis_workout_active";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoggedExercise {
  exerciseName:   string;
  prescribedSets: number;
  completedSets:  number;
  prescribedReps: string;
  completedReps:  string;
  prescribedRPE:  number;  // 0 = not applicable (mobility)
  actualRPE:             number;  // 0 = not applicable
  perceivedDifficulty?:  number;  // 1–10 subjective difficulty (Phase 31A)
  weight?:               number;  // kg — 0 or absent = bodyweight
  actualReps?:           number;  // numeric rep count (first number from completedReps string)
}

export interface LoggedWorkout {
  id:                string;  // YYYY-MM-DD
  date:              string;
  workoutName:       string;
  completionStatus:  "completed" | "partial" | "skipped";
  exercises:         LoggedExercise[];
  durationMinutes:   number;
  overallDifficulty: number;  // 1–10
}

export interface ActiveWorkoutFlag {
  date:      string;  // YYYY-MM-DD
  startedAt: string;  // ISO timestamp
}

// ─── Active flag (persists workout-in-progress across re-renders) ─────────────

export function setActiveWorkout(date: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({
      date,
      startedAt: new Date().toISOString(),
    } satisfies ActiveWorkoutFlag));
  } catch {}
}

export function getActiveWorkout(): ActiveWorkoutFlag | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveWorkoutFlag;
  } catch {
    return null;
  }
}

export function clearActiveWorkout(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

// ─── Workout log CRUD ─────────────────────────────────────────────────────────

function loadLog(): LoggedWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLog(log: LoggedWorkout[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {}
}

export function saveLoggedWorkout(workout: LoggedWorkout): void {
  const existing = loadLog().filter(e => e.id !== workout.id);
  persistLog([workout, ...existing]);
}

export function getLoggedWorkout(date: string): LoggedWorkout | null {
  return loadLog().find(e => e.id === date) ?? null;
}

export function getWorkoutLog(): LoggedWorkout[] {
  return loadLog();
}
