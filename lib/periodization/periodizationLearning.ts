// ─── lib/periodization/periodizationLearning.ts ───────────────────────────────
// Tracks block outcomes over time and surfaces which block structures
// have worked best for this specific user.
// Storage: axis_periodization_learning (365-day retention)

import type { GoalType }           from "@/lib/exercises/goalBasedSelection";
import type { PeriodizationPhase } from "./goalProfiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlockOutcome {
  date:              string;               // YYYY-MM-DD when recorded
  goal:              GoalType;
  blockLengthWeeks:  number;
  avgReadiness:      number;               // 0–100 average readiness during block
  completionRate:    number;               // 0–1
  peakPhaseReached:  PeriodizationPhase;  // how far user got (deload = full block)
  effectiveness:     number;              // computed: avgReadiness × completionRate × phaseWeight
}

export interface PeriodizationInsight {
  optimalBlockLength: number | null;
  insight:            string;
  supportingBlocks:   number;
  confidence:         "early" | "growing" | "established";
}

// ─── Phase weight for effectiveness scoring ───────────────────────────────────

const PHASE_WEIGHTS: Record<PeriodizationPhase, number> = {
  accumulation:    0.6,
  intensification: 0.8,
  peak:            0.9,
  deload:          1.0,  // full block completion
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_periodization_learning";
const RETENTION_DAYS = 365;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function load(): BlockOutcome[] {
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

function persist(entries: BlockOutcome[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function pruneOld(entries: BlockOutcome[]): BlockOutcome[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordBlockOutcome(outcome: BlockOutcome): void {
  const existing = pruneOld(load());
  existing.unshift(outcome);
  persist(existing);
}

export function getPeriodizationInsight(goal: GoalType): PeriodizationInsight {
  const outcomes = pruneOld(load()).filter(o => o.goal === goal);
  const n        = outcomes.length;

  if (n < 2) {
    return {
      optimalBlockLength: null,
      insight:            "Complete 2+ training blocks to see personalised periodization insights.",
      supportingBlocks:   n,
      confidence:         "early",
    };
  }

  // Group by block length and compute average effectiveness
  const byLength: Record<number, number[]> = {};
  for (const o of outcomes) {
    byLength[o.blockLengthWeeks] ??= [];
    byLength[o.blockLengthWeeks].push(o.effectiveness);
  }

  const avgByLength: Array<{ weeks: number; avg: number; count: number }> = Object.entries(byLength)
    .map(([w, scores]) => ({
      weeks: Number(w),
      avg:   scores.reduce((s, x) => s + x, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const best = avgByLength[0];
  const confidence: PeriodizationInsight["confidence"] =
    n >= 6 ? "established" : n >= 3 ? "growing" : "early";

  const insight = avgByLength.length > 1
    ? `Your ${best.weeks}-week blocks have produced the best results for ${goal.replace("_", " ")}. Shorter/longer blocks tend to underperform for you.`
    : `You've completed ${n} block(s) so far. Keep logging to uncover your optimal training structure.`;

  return {
    optimalBlockLength: best.weeks,
    insight,
    supportingBlocks:   n,
    confidence,
  };
}

export function getAllBlockOutcomes(): BlockOutcome[] {
  return pruneOld(load());
}
