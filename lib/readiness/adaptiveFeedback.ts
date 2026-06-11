// ─── lib/readiness/adaptiveFeedback.ts ───────────────────────────────────────
// Analyses contributor history to refine AdaptiveProfile readiness weights.
// Pure logic — no localStorage, no React, no side effects.
//
// Algorithm:
//   – Requires ≥14 entries with contributor data (2 full weeks minimum)
//   – Runs every 7 entries after the threshold (weekly cadence)
//   – "Stuck-low" signal (mean ≤25, stddev ≤10): always at floor, not
//     differentiating readiness → reduce weight 20%, redistribute to the
//     highest-variance contributor
//   – "High-variance" signal (stddev ≥20): meaningful predictor → +10%
//   – All weights capped at 5–40 and renormalised to the original total

import type { ReadinessHistoryEntry } from "./readinessHistory";
import type { AdaptiveProfile }       from "@/lib/adaptive-profile";

type APWeightKey = keyof AdaptiveProfile["readinessWeights"];

// ─── Stats helpers ────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[], m: number): number {
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ─── Contributor → AdaptiveProfile key mapping ───────────────────────────────
// ReadinessContributors has 6 keys; AdaptiveProfile has 5.
// "recovery" in the profile is 60% trainingLoad + 40% adherence.

function toAPScores(entries: Required<ReadinessHistoryEntry>[]): Record<APWeightKey, number[]> {
  return {
    sleep:      entries.map(e => e.contributors.sleep),
    stress:     entries.map(e => e.contributors.stress),
    energy:     entries.map(e => e.contributors.energy),
    cyclePhase: entries.map(e => e.contributors.cycle),
    recovery:   entries.map(e =>
      e.contributors.trainingLoad * 0.6 + e.contributors.adherence * 0.4
    ),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeReadinessFeedback(
  history: ReadinessHistoryEntry[],
  profile: AdaptiveProfile,
): AdaptiveProfile["readinessWeights"] | null {
  // Only use entries that have contributor data (Phase 13C+)
  const withContrib = history.filter(
    (e): e is Required<ReadinessHistoryEntry> => e.contributors !== undefined
  );

  if (withContrib.length < 14)          return null;   // insufficient data
  if (withContrib.length % 7 !== 0)     return null;   // not on a weekly boundary

  const scores = toAPScores(withContrib);
  const keys   = Object.keys(scores) as APWeightKey[];

  const stats = Object.fromEntries(
    keys.map(k => {
      const m = avg(scores[k]);
      return [k, { mean: m, std: std(scores[k], m) }];
    })
  ) as Record<APWeightKey, { mean: number; std: number }>;

  const originalTotal = keys.reduce((s, k) => s + profile.readinessWeights[k], 0);
  const updated       = { ...profile.readinessWeights };

  // Highest-variance key receives weight redistributed from stuck-low signals
  const highestVar = keys.reduce((best, k) =>
    stats[k].std > stats[best].std ? k : best
  );

  for (const key of keys) {
    const { mean: m, std: s } = stats[key];

    if (m <= 25 && s <= 10) {
      // Stuck-low: signal is always near the floor — not informative
      const cut = Math.round(updated[key] * 0.20);
      updated[key] = Math.max(5, updated[key] - cut);
      if (key !== highestVar) {
        updated[highestVar] = Math.min(40, updated[highestVar] + cut);
      }
    } else if (s >= 20) {
      // High-variance: signal meaningfully discriminates readiness → up-weight
      updated[key] = Math.min(40, Math.round(updated[key] * 1.10));
    }
  }

  // Renormalise to original total
  const newTotal = keys.reduce((s, k) => s + updated[k], 0);
  if (newTotal === 0) return null;

  const scale = originalTotal / newTotal;
  for (const key of keys) {
    updated[key] = Math.max(5, Math.min(40, Math.round(updated[key] * scale)));
  }

  // Return null when weights are unchanged (no write needed)
  if (keys.every(k => updated[k] === profile.readinessWeights[k])) return null;

  return updated;
}
