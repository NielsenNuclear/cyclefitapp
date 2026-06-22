// ─── lib/evidence/recommendationValidation.ts ────────────────────────────────
// 42E — Recommendation Validation
// Collects explicit user feedback on recommendations as a training signal.
// "Was today's recommendation helpful?" becomes a ground-truth label.

const STORAGE_KEY    = "axis_recommendation_feedback";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecommendationFeedback = "helpful" | "too_easy" | "too_hard" | "perfect";

export interface FeedbackEntry {
  id:             string;
  date:           string;
  feedback:       RecommendationFeedback;
  recommendation: string;
}

export interface FeedbackSummary {
  total:       number;
  helpfulRate: number;
  tooHardRate: number;
  tooEasyRate: number;
  perfectRate: number;
  trend:       "improving" | "stable" | "degrading" | "insufficient";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): FeedbackEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch { return []; }
}

function persist(entries: FeedbackEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function saveRecommendationFeedback(
  date:           string,
  recommendation: string,
  feedback:       RecommendationFeedback,
): void {
  persist([{ id: date, date, feedback, recommendation }, ...load().filter(e => e.id !== date)]);
}

export function getFeedbackSummary(): FeedbackSummary {
  const entries = load();
  const total   = entries.length;
  if (total === 0) {
    return { total: 0, helpfulRate: 0, tooHardRate: 0, tooEasyRate: 0, perfectRate: 0, trend: "insufficient" };
  }
  const pct = (f: RecommendationFeedback) => Math.round((entries.filter(e => e.feedback === f).length / total) * 100);

  const half    = Math.floor(entries.length / 2);
  const isPos   = (e: FeedbackEntry) => e.feedback === "perfect" || e.feedback === "helpful";
  const recPos  = entries.slice(0, half).filter(isPos).length / Math.max(1, half);
  const oldPos  = entries.slice(half).filter(isPos).length / Math.max(1, entries.length - half);
  const trend   =
    total < 6 ? "insufficient"
    : recPos > oldPos + 0.10 ? "improving"
    : recPos < oldPos - 0.10 ? "degrading"
    : "stable";

  return {
    total,
    helpfulRate: pct("helpful"),
    tooHardRate: pct("too_hard"),
    tooEasyRate: pct("too_easy"),
    perfectRate: pct("perfect"),
    trend,
  };
}

export function getRecentFeedback(days = 30): FeedbackEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return load().filter(e => e.date >= cutoff.toISOString().slice(0, 10));
}
