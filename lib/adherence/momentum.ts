// ─── lib/adherence/momentum.ts ───────────────────────────────────────────────
// Phase 35E — Momentum Score.
// Momentum is trend-aware: a user improving from 20%→70% has excellent momentum
// even if their consistency average is only 42%.
// Computed from weekly training completion rates over the last 8 weeks.

import type { AdherenceEntry } from "./adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentumLevel = "declining" | "flat" | "improving" | "strong";

export interface MomentumScore {
  level:       MomentumLevel;
  weeklyRates: number[];   // completion rates per week, oldest first (0–1)
  trend:       number;     // linear slope per week (positive = improving)
  description: string;
  weeksAnalysed: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday start
  return d.toISOString().slice(0, 10);
}

function linearSlope(rates: number[]): number {
  const n = rates.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = rates.reduce((s, r) => s + r, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (rates[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeMomentum(
  adherenceHistory: AdherenceEntry[],
  today:            string,
  weeksBack:        number = 8,
): MomentumScore {
  if (adherenceHistory.length === 0) {
    return {
      level: "flat", weeklyRates: [], trend: 0,
      description: "Not enough history yet to assess momentum.",
      weeksAnalysed: 0,
    };
  }

  // Build weekly buckets (week start → entries)
  const buckets = new Map<string, AdherenceEntry[]>();
  const cutoff  = new Date(today);
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  for (const e of adherenceHistory) {
    if (e.date < cutoffStr || e.date > today) continue;
    const ws = weekStart(new Date(e.date));
    const bucket = buckets.get(ws) ?? [];
    bucket.push(e);
    buckets.set(ws, bucket);
  }

  if (buckets.size < 2) {
    return {
      level: "flat", weeklyRates: [], trend: 0,
      description: "Tracking for more weeks will reveal your momentum trend.",
      weeksAnalysed: buckets.size,
    };
  }

  // Sort weeks oldest → newest and compute rates
  const sortedWeeks = Array.from(buckets.keys()).sort();
  const weeklyRates: number[] = sortedWeeks.map(ws => {
    const entries  = buckets.get(ws)!;
    const resolved = entries.filter(e => e.status !== "pending");
    if (resolved.length === 0) return 0;
    const done = resolved.filter(e => e.status === "completed" || e.status === "partially_completed").length;
    return done / resolved.length;
  });

  const trend = linearSlope(weeklyRates);

  // Classify momentum
  const recentRate = weeklyRates[weeklyRates.length - 1];
  let level: MomentumLevel;
  if (trend >= 0.07) {
    level = "strong";
  } else if (trend >= 0.02) {
    level = "improving";
  } else if (trend <= -0.05) {
    level = "declining";
  } else {
    level = "flat";
  }

  const DESCRIPTIONS: Record<MomentumLevel, string> = {
    strong:    "Your consistency is building week over week — excellent trend.",
    improving: "Training frequency is trending upward — keep building.",
    flat:      recentRate >= 0.6
      ? "Consistency is stable at a good level."
      : "Consistency is stable but there's room to build.",
    declining: "Training frequency has been dropping — rescue mode may help.",
  };

  return {
    level,
    weeklyRates,
    trend,
    description:   DESCRIPTIONS[level],
    weeksAnalysed: weeklyRates.length,
  };
}
