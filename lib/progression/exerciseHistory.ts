// ─── lib/progression/exerciseHistory.ts ───────────────────────────────────────
// Dedicated long-term exercise performance store.
// Source of truth for the progression engine (29D), plateau detection (29E),
// and ProgressInsightsCard (29G).
//
// Distinct from lib/history/exerciseHistory.ts which is a read-only aggregate
// view from axis_workout_log. This store persists independently with 18-month
// retention and survives axis_workout_log pruning.

const STORAGE_KEY    = "axis_exercise_history";
const RETENTION_DAYS = 548; // 18 months

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExercisePerformance {
  exerciseId:   string;   // exercise name used as stable id
  exerciseName: string;
  date:         string;   // YYYY-MM-DD
  weight:       number;   // kg; 0 = bodyweight
  reps:         number;   // best / mean reps across completed sets
  sets:         number;   // completed set count
  rpe?:         number;   // 0 = not recorded; omit if unknown
  completed:    boolean;  // false = planned but not completed
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ─── Internal I/O ─────────────────────────────────────────────────────────────

function load(): ExercisePerformance[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(records: ExercisePerformance[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

// ─── Retention pruning ────────────────────────────────────────────────────────

function pruneOld(records: ExercisePerformance[]): ExercisePerformance[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return records.filter(r => r.date >= cutoffStr);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves one performance record per exercise. Upserts by (exerciseName + date)
 * so re-completing the same workout doesn't create duplicates.
 */
export function saveExercisePerformance(perf: ExercisePerformance): void {
  const existing = pruneOld(load());
  const idx = existing.findIndex(
    r => r.exerciseName === perf.exerciseName && r.date === perf.date
  );
  if (idx >= 0) {
    existing[idx] = perf; // overwrite same day
  } else {
    existing.unshift(perf);
  }
  persist(existing);
}

/**
 * Saves an array of performances in one pass — used by WorkoutCard on completion.
 */
export function saveExercisePerformances(perfs: ExercisePerformance[]): void {
  let records = pruneOld(load());

  for (const perf of perfs) {
    const idx = records.findIndex(
      r => r.exerciseName === perf.exerciseName && r.date === perf.date
    );
    if (idx >= 0) {
      records[idx] = perf;
    } else {
      records.unshift(perf);
    }
  }

  persist(records);
}

/**
 * All performance entries for a specific exercise, newest first.
 * Returns [] when no history exists.
 */
export function getExercisePerformanceHistory(exerciseName: string): ExercisePerformance[] {
  return pruneOld(load())
    .filter(r => r.exerciseName === exerciseName)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * All performance records across all exercises, newest first.
 */
export function getAllExerciseHistory(): ExercisePerformance[] {
  return pruneOld(load()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Most recent performance entry for a specific exercise. Null if none.
 */
export function getLastExercisePerformance(exerciseName: string): ExercisePerformance | null {
  return getExercisePerformanceHistory(exerciseName)[0] ?? null;
}

/**
 * Deletes all exercise history. Used for data reset / account clear.
 */
export function deleteExerciseHistory(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Returns unique exercise names that have at least one completed record.
 */
export function getTrackedExerciseNames(): string[] {
  const records = pruneOld(load()).filter(r => r.completed);
  return [...new Set(records.map(r => r.exerciseName))];
}
