// ─── lib/readiness/personalizedReadiness.ts ──────────────────────────────────
// 49B — Personalized Readiness Activation
// Adjusts AdaptiveProfile readiness weights based on empirically derived
// predictor rankings. Active only when ≥ 30 readiness history entries exist.
// Uses a 70/30 blend (current → empirical) with hard safety bounds.

import type { AdaptiveProfile }         from "@/lib/adaptive-profile";
import type { PredictorRankingProfile } from "@/lib/physiology/readinessPredictorRanking";

// Baseline percentages matching READINESS_WEIGHTS defaults
// recovery = trainingLoad (15) + adherence (10)
const DEFAULTS = {
  sleep:      25,
  stress:     20,
  energy:     20,
  recovery:   25,
  cyclePhase: 10,
} as const;

type WeightKey = keyof typeof DEFAULTS;

// Clamp: never below 50% of baseline, never above 150% of baseline,
// never exceed ±25 percentage points from baseline.
function clamp(value: number, key: WeightKey): number {
  const def = DEFAULTS[key];
  const min = Math.max(def * 0.5, def - 25, 1);
  const max = Math.min(def * 1.5, def + 25);
  return Math.round(Math.max(min, Math.min(max, value)));
}

export function applyPersonalizedReadinessWeights(
  ranking: PredictorRankingProfile,
  profile: AdaptiveProfile | undefined,
): AdaptiveProfile | undefined {
  if (!profile || !ranking.dataReady || ranking.rankings.length === 0) return profile;

  // Build factor → normalized-percentage lookup
  const rankMap: Record<string, number> = {};
  for (const entry of ranking.rankings) {
    rankMap[entry.factor] = entry.normalized;
  }

  // Map predictor factors → AdaptiveProfile weight keys
  const empirical: Record<WeightKey, number> = {
    sleep:      rankMap.sleep      ?? DEFAULTS.sleep,
    stress:     rankMap.stress     ?? DEFAULTS.stress,
    energy:     rankMap.energy     ?? DEFAULTS.energy,
    recovery:   (rankMap.trainingLoad ?? 15) + (rankMap.adherence ?? 10),
    cyclePhase: rankMap.cycle      ?? DEFAULTS.cyclePhase,
  };

  const cur = profile.readinessWeights;

  return {
    ...profile,
    readinessWeights: {
      sleep:      clamp(cur.sleep      * 0.7 + empirical.sleep      * 0.3, "sleep"),
      stress:     clamp(cur.stress     * 0.7 + empirical.stress     * 0.3, "stress"),
      energy:     clamp(cur.energy     * 0.7 + empirical.energy     * 0.3, "energy"),
      recovery:   clamp(cur.recovery   * 0.7 + empirical.recovery   * 0.3, "recovery"),
      cyclePhase: clamp(cur.cyclePhase * 0.7 + empirical.cyclePhase * 0.3, "cyclePhase"),
    },
  };
}
