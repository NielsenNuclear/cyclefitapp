// ─── lib/readiness/readinessHistory.ts ───────────────────────────────────────
// Local readiness history using localStorage only.
// Pure logic — no React, no side effects beyond localStorage.

import type { ReadinessCategory, ReadinessContributors } from "./calculateReadiness";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadinessHistoryEntry {
  date:          string;            // YYYY-MM-DD — one entry per calendar day
  score:         number;            // 0–100
  category:      ReadinessCategory;
  contributors?: ReadinessContributors; // stored from Phase 13C onward; absent on older entries
}

export type ReadinessTrend = "improving" | "declining" | "stable" | "insufficient_data";

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_readiness_history";
const RETENTION_DAYS = 365;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function loadHistory(): ReadinessHistoryEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReadinessHistoryEntry[];
  } catch {
    return [];
  }
}

function persistHistory(entries: ReadinessHistoryEntry[]): void {
  if (!isClient()) return;
  const pruned = entries.filter(e => e.date >= cutoffDate(RETENTION_DAYS));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Upserts today's entry — replaces if already present (score recalculates after check-in).
export function saveReadiness(
  score:        number,
  category:     ReadinessCategory,
  contributors?: ReadinessContributors,
): void {
  const date    = new Date().toISOString().slice(0, 10);
  const entries = loadHistory().filter(e => e.date !== date);
  const entry: ReadinessHistoryEntry = contributors
    ? { date, score, category, contributors }
    : { date, score, category };
  persistHistory([entry, ...entries]);
}

export function getReadinessHistory(): ReadinessHistoryEntry[] {
  return loadHistory().sort((a, b) => b.date.localeCompare(a.date));
}

// Compares avg of most recent 3 entries vs. the 3 before that.
// Threshold: ±5 points = meaningful direction signal.
export function getReadinessTrend(): ReadinessTrend {
  const entries = getReadinessHistory();
  if (entries.length < 4) return "insufficient_data";

  const recent = entries.slice(0, 3).map(e => e.score);
  const prior  = entries.slice(3, 6).map(e => e.score);
  if (prior.length < 2) return "insufficient_data";

  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const priorAvg  = prior.reduce((s, v) => s + v, 0) / prior.length;
  const delta     = recentAvg - priorAvg;

  if (delta >=  5) return "improving";
  if (delta <= -5) return "declining";
  return "stable";
}
