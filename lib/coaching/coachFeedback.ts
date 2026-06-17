// ─── lib/coaching/coachFeedback.ts ────────────────────────────────────────────
// Stores which coaching message types the user dismisses or engages with.
// Weights are used to suppress repetitive or ignored message types.

const STORAGE_KEY    = "axis_coach_feedback";
const RETENTION_DAYS = 90;

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageType =
  | "daily_recovery"
  | "daily_readiness"
  | "daily_load"
  | "daily_fatigue"
  | "weekly_win"
  | "weekly_miss"
  | "weekly_focus"
  | "monthly_insight"
  | "monthly_grade";

export type FeedbackAction = "dismissed" | "engaged";

export interface CoachFeedbackEntry {
  date:        string;         // YYYY-MM-DD
  messageType: MessageType;
  action:      FeedbackAction;
}

export interface MessageWeight {
  messageType: MessageType;
  weight:      number;         // 0–1 — lower means suppress
  dismissRate: number;         // fraction of dismissals in last 30 days
  sampleSize:  number;
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function load(): CoachFeedbackEntry[] {
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

function persist(entries: CoachFeedbackEntry[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function pruneOld(entries: CoachFeedbackEntry[]): CoachFeedbackEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordCoachFeedback(
  messageType: MessageType,
  action:      FeedbackAction,
): void {
  const existing = pruneOld(load());
  existing.unshift({
    date:        new Date().toISOString().slice(0, 10),
    messageType,
    action,
  });
  persist(existing);
}

/**
 * Returns a weight (0–1) for each message type based on recent dismissal rate.
 * A message type dismissed >70% of the time gets weight 0.25 (suppressed but not removed).
 */
export function getMessageWeights(): MessageWeight[] {
  const entries = pruneOld(load());
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const thirtyStr = thirtyAgo.toISOString().slice(0, 10);
  const recent = entries.filter(e => e.date >= thirtyStr);

  const messageTypes: MessageType[] = [
    "daily_recovery", "daily_readiness", "daily_load", "daily_fatigue",
    "weekly_win", "weekly_miss", "weekly_focus",
    "monthly_insight", "monthly_grade",
  ];

  return messageTypes.map(messageType => {
    const typed      = recent.filter(e => e.messageType === messageType);
    const dismissed  = typed.filter(e => e.action === "dismissed").length;
    const sampleSize = typed.length;
    const dismissRate = sampleSize > 0 ? dismissed / sampleSize : 0;
    // Suppress heavily-dismissed types; give full weight to unknown or accepted types
    const weight = sampleSize < 3 ? 1.0 : Math.max(0.25, 1 - dismissRate * 0.75);
    return { messageType, weight, dismissRate, sampleSize };
  });
}

export function getWeightForType(type: MessageType): number {
  return getMessageWeights().find(w => w.messageType === type)?.weight ?? 1.0;
}
