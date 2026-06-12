// ─── lib/workoutExecution/feedback.ts ────────────────────────────────────────
// Post-workout feedback capture — how the session was experienced.

const FEEDBACK_KEY = "axis_workout_feedback";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryRating =
  | "fully_recovered"
  | "slight_fatigue"
  | "moderate_fatigue"
  | "significant_fatigue";

export type PerformanceRating = "better" | "expected" | "worse";

export interface WorkoutFeedback {
  id:                 string;           // YYYY-MM-DD — aligns with LoggedWorkout.id
  date:               string;
  sessionRPE:         number;           // 1–10
  recoveryRating:     RecoveryRating;
  performanceRating:  PerformanceRating;
  savedAt:            string;           // ISO timestamp
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function loadFeedback(): WorkoutFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistFeedback(entries: WorkoutFeedback[]): void {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries));
  } catch {}
}

export function saveWorkoutFeedback(feedback: WorkoutFeedback): void {
  const existing = loadFeedback().filter(e => e.id !== feedback.id);
  persistFeedback([{ ...feedback, savedAt: new Date().toISOString() }, ...existing]);
}

export function getWorkoutFeedback(date: string): WorkoutFeedback | null {
  return loadFeedback().find(e => e.id === date) ?? null;
}

export function getAllFeedback(): WorkoutFeedback[] {
  return loadFeedback();
}
