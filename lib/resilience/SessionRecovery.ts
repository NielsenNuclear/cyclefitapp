// ─── lib/resilience/SessionRecovery.ts ───────────────────────────────────────
// Phase 69 — saves and restores interrupted workout sessions.

const STORAGE_KEY = "axis_session_recovery_v1";

function isClient(): boolean { return typeof window !== "undefined"; }

export interface WorkoutSessionState {
  id:              string;
  workoutId:       string;
  startedAt:       string;          // ISO
  lastHeartbeat:   string;          // ISO — updated periodically
  completedSets:   CompletedSet[];
  totalSets:       number;
  isPaused:        boolean;
  resumeCount:     number;
}

export interface CompletedSet {
  exerciseId:  string;
  setIndex:    number;
  reps:        number | null;
  weight:      number | null;
  rpe:         number | null;
  completedAt: string;
}

function load(): WorkoutSessionState | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(state: WorkoutSessionState): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function beginSession(workoutId: string, totalSets: number): WorkoutSessionState {
  const state: WorkoutSessionState = {
    id:            `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    workoutId,
    startedAt:     new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    completedSets: [],
    totalSets,
    isPaused:      false,
    resumeCount:   0,
  };
  save(state);
  return state;
}

export function heartbeat(): void {
  const state = load();
  if (!state) return;
  save({ ...state, lastHeartbeat: new Date().toISOString() });
}

export function recordSet(set: CompletedSet): WorkoutSessionState | null {
  const state = load();
  if (!state) return null;
  const updated = {
    ...state,
    completedSets:   [...state.completedSets, set],
    lastHeartbeat: new Date().toISOString(),
  };
  save(updated);
  return updated;
}

export function pauseSession(): void {
  const state = load();
  if (state) save({ ...state, isPaused: true, lastHeartbeat: new Date().toISOString() });
}

export function resumeSession(): WorkoutSessionState | null {
  const state = load();
  if (!state) return null;
  const updated = { ...state, isPaused: false, resumeCount: state.resumeCount + 1, lastHeartbeat: new Date().toISOString() };
  save(updated);
  return updated;
}

export function endSession(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getInterruptedSession(): WorkoutSessionState | null {
  const state = load();
  if (!state) return null;
  const msSinceHeartbeat = Date.now() - new Date(state.lastHeartbeat).getTime();
  // Session is "interrupted" if heartbeat is stale by more than 60 seconds
  const isStale = msSinceHeartbeat > 60_000;
  return isStale ? state : null;
}

export function getActiveSession(): WorkoutSessionState | null {
  return load();
}

export function sessionProgressPercent(state: WorkoutSessionState): number {
  if (state.totalSets === 0) return 0;
  return Math.min(100, Math.round((state.completedSets.length / state.totalSets) * 100));
}
