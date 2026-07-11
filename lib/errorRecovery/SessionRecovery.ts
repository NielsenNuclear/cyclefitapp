// ─── lib/errorRecovery/SessionRecovery.ts ────────────────────────────────────
// Phase B — Captures and restores session state around error events.
// Protects: workout in progress, daily check-in, today's symptoms, recommendation.

import type { SessionSnapshot } from "@/types/ErrorTypes";

// Keys that represent user in-progress work — worth restoring after a crash.
// Read-only snapshot; never corrupted by recovery itself.
const SESSION_KEYS = [
  "axis_workout_log_v1",          // logged exercises / sets / RPE
  "axis_checkin_v1",              // today's check-in data
  "axis_daily_symptoms_v1",       // today's symptom log
  "axis_history_v1",              // completed workout history
  "axis_readiness_history_v1",    // readiness score history
  "axis_recovery_scores",         // recovery score history
  "axis_onboarding",              // user profile (never lose this)
];

const SNAPSHOT_KEY = "axis_session_snapshot_v1";
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Capture current values of all session keys into a snapshot. */
export function captureSessionSnapshot(): SessionSnapshot {
  const keys: Record<string, string | null> = {};
  if (isClient()) {
    for (const key of SESSION_KEYS) {
      try { keys[key] = localStorage.getItem(key); }
      catch { keys[key] = null; }
    }
  }
  return { capturedAt: new Date().toISOString(), keys };
}

/** Persist a snapshot to localStorage for recovery use. */
export function saveSessionSnapshot(snapshot: SessionSnapshot): void {
  if (!isClient()) return;
  try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch {}
}

/** Load the most recent saved snapshot, or null if none / expired. */
export function loadSessionSnapshot(): SessionSnapshot | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as SessionSnapshot;
    const age = Date.now() - new Date(snap.capturedAt).getTime();
    return age <= MAX_SNAPSHOT_AGE_MS ? snap : null;
  } catch {
    return null;
  }
}

/** Restore snapshot keys back to localStorage (non-destructive: skips null values). */
export function restoreSessionSnapshot(snapshot: SessionSnapshot): void {
  if (!isClient()) return;
  for (const [key, value] of Object.entries(snapshot.keys)) {
    if (value !== null) {
      try { localStorage.setItem(key, value); } catch {}
    }
  }
}

/**
 * Returns true if there was an in-progress workout session that may have
 * been interrupted (workout log exists but no history entry for today).
 */
export function detectInterruptedSession(): boolean {
  if (!isClient()) return false;
  try {
    const log = localStorage.getItem("axis_workout_log_v1");
    if (!log) return false;
    const entries: Array<{ date?: string }> = JSON.parse(log);
    if (!Array.isArray(entries) || entries.length === 0) return false;
    const today = new Date().toISOString().slice(0, 10);
    return entries.some(e => e.date === today);
  } catch {
    return false;
  }
}

/** Clear the saved snapshot (call after successful recovery). */
export function clearSessionSnapshot(): void {
  if (!isClient()) return;
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch {}
}
