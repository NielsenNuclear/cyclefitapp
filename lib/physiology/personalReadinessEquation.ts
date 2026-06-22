// ─── lib/physiology/personalReadinessEquation.ts ─────────────────────────────
// 40E — Personal Readiness Equation
// Builds a custom readiness weight vector from this user's observed signal
// correlations. Replaces the single-population model with an individual one.

import type { PredictorRankingProfile, ReadinessFactor } from "./readinessPredictorRanking";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalReadinessWeights {
  sleep:        number;
  stress:       number;
  cycle:        number;
  energy:       number;
  trainingLoad: number;
  adherence:    number;
}

export interface PersonalReadinessEquation {
  weights:        PersonalReadinessWeights;
  dominantFactor: ReadinessFactor | null;
  dominantLabel:  string;
  confidence:     "low" | "moderate" | "high";
  applied:        boolean;
}

// ─── Defaults (population-derived) ───────────────────────────────────────────

const DEFAULT_WEIGHTS: PersonalReadinessWeights = {
  sleep:        0.25,
  stress:       0.20,
  cycle:        0.20,
  energy:       0.15,
  trainingLoad: 0.10,
  adherence:    0.10,
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildPersonalReadinessEquation(
  ranking: PredictorRankingProfile,
): PersonalReadinessEquation {
  if (!ranking.dataReady || ranking.rankings.length === 0) {
    return {
      weights:        DEFAULT_WEIGHTS,
      dominantFactor: null,
      dominantLabel:  "Balanced (population default)",
      confidence:     "low",
      applied:        false,
    };
  }

  const total = ranking.rankings.reduce((s, r) => s + r.weight, 0);
  const weights: PersonalReadinessWeights = {
    sleep: 0, stress: 0, cycle: 0, energy: 0, trainingLoad: 0, adherence: 0,
  };
  for (const r of ranking.rankings) {
    weights[r.factor] = total > 0 ? Math.round((r.weight / total) * 100) / 100 : 0;
  }

  const top        = ranking.rankings[0];
  const confidence =
    top.normalized > 35 ? "high"
    : top.normalized > 20 ? "moderate"
    : "low";

  return {
    weights,
    dominantFactor: ranking.dominantFactor,
    dominantLabel:  top.label,
    confidence,
    applied:        confidence !== "low",
  };
}
