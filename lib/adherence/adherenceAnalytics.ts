// ─── lib/adherence/adherenceAnalytics.ts ─────────────────────────────────────
// Phase 34C — Adherence analytics.
// Completion rates (7 / 30 / 90 day), consistency score (0–100),
// streak health, and resilience tracking.

import type { AdherenceEntry } from "./adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletionRates {
  rate7d:  number;   // 0–1
  rate30d: number;   // 0–1
  rate90d: number;   // 0–1
  count7d:  number;  // sessions completed in window
  total7d:  number;  // days in window with a recorded entry
  count30d: number;
  total30d: number;
  count90d: number;
  total90d: number;
}

export interface StreakHealth {
  currentStreak:  number;   // consecutive completed/partial days
  longestStreak:  number;
  lastSkipDate:   string | null;
  quality:        "excellent" | "good" | "building" | "fragile";
}

export interface AdherenceAnalytics {
  completionRates:   CompletionRates;
  consistencyScore:  number;     // 0–100 composite
  streakHealth:      StreakHealth;
  resilience:        number;     // 0–1: fraction of skips followed by a completed session
  sampleSize:        number;
  dataMaturity:      "early" | "growing" | "mature";  // <14 / 14–60 / >60 days
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCompleted(status: AdherenceEntry["status"]): boolean {
  return status === "completed" || status === "partially_completed";
}

function windowRates(
  entries: AdherenceEntry[],
  today: string,
  days: number,
): { count: number; total: number; rate: number } {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const window = entries.filter(e => e.date >= cutoffStr && e.date <= today);
  const count  = window.filter(e => isCompleted(e.status)).length;
  return { count, total: window.length, rate: window.length > 0 ? count / window.length : 0 };
}

function calcStreaks(entries: AdherenceEntry[]): StreakHealth {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  let current = 0;
  let longest = 0;
  let lastSkipDate: string | null = null;
  let streak = 0;

  for (const e of sorted) {
    if (isCompleted(e.status)) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      if (e.status === "skipped" && !lastSkipDate) lastSkipDate = e.date;
      streak = 0;
    }
  }

  // Current streak: count from most recent entry forward while completed
  for (const e of sorted) {
    if (isCompleted(e.status)) {
      current++;
    } else {
      break;
    }
  }

  const quality: StreakHealth["quality"] =
    current >= 14 ? "excellent"
    : current >= 7  ? "good"
    : current >= 3  ? "building"
    : "fragile";

  return { currentStreak: current, longestStreak: longest, lastSkipDate, quality };
}

// Resilience: fraction of skip sessions followed (next day) by a completed session
function calcResilience(entries: AdherenceEntry[]): number {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let bouncebacks = 0;
  let skipsWithNext = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].status === "skipped") {
      skipsWithNext++;
      if (isCompleted(sorted[i + 1].status)) bouncebacks++;
    }
  }
  return skipsWithNext > 0 ? bouncebacks / skipsWithNext : 1;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeAdherenceAnalytics(
  history: AdherenceEntry[],
  today: string,
): AdherenceAnalytics {
  if (history.length === 0) {
    return {
      completionRates:  { rate7d: 0, rate30d: 0, rate90d: 0, count7d: 0, total7d: 0, count30d: 0, total30d: 0, count90d: 0, total90d: 0 },
      consistencyScore: 0,
      streakHealth:     { currentStreak: 0, longestStreak: 0, lastSkipDate: null, quality: "fragile" },
      resilience:       1,
      sampleSize:       0,
      dataMaturity:     "early",
    };
  }

  const w7  = windowRates(history, today, 7);
  const w30 = windowRates(history, today, 30);
  const w90 = windowRates(history, today, 90);

  const completionRates: CompletionRates = {
    rate7d:  w7.rate,  count7d:  w7.count,  total7d:  w7.total,
    rate30d: w30.rate, count30d: w30.count, total30d: w30.total,
    rate90d: w90.rate, count90d: w90.count, total90d: w90.total,
  };

  const streakHealth = calcStreaks(history);
  const resilience   = calcResilience(history);

  // Consistency score: weighted blend of completion rate + streak + resilience
  const completionComponent = w30.rate * 60;                              // max 60
  const streakComponent     = Math.min(streakHealth.currentStreak / 14, 1) * 25; // max 25
  const resilienceComponent = resilience * 15;                            // max 15
  const consistencyScore    = Math.round(completionComponent + streakComponent + resilienceComponent);

  const dataMaturity: AdherenceAnalytics["dataMaturity"] =
    history.length < 14 ? "early"
    : history.length < 60 ? "growing"
    : "mature";

  return {
    completionRates,
    consistencyScore,
    streakHealth,
    resilience,
    sampleSize:  history.length,
    dataMaturity,
  };
}
