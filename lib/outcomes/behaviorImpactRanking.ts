// ─── lib/outcomes/behaviorImpactRanking.ts ───────────────────────────────────
// 43B — Behavior Impact Ranking
// Ranks behaviors (sleep, hydration, protein, recovery, consistency, stress)
// by their actual measured impact on this user's readiness and goal velocity.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { AdherenceEntry }        from "@/lib/adherence/adherenceTracker";
import type { NutritionPattern }      from "@/lib/nutrition/nutritionPatterns";
import type { ConsistencyScore }      from "@/lib/adherence/consistency";

const MIN_SAMPLE = 14;

// ─── Types ────────────────────────────────────────────────────────────────────

export type BehaviorKey =
  | "sleep"
  | "protein"
  | "hydration"
  | "recovery"
  | "consistency"
  | "stress_management";

export interface BehaviorImpact {
  behavior:       BehaviorKey;
  label:          string;
  currentScore:   number;    // 0–100 current compliance/performance
  impactScore:    number;    // 0–100 how much this behavior correlates with outcomes
  improvementGap: number;    // 0–100 distance from ideal (higher = more room to improve)
  rank:           number;    // 1 = highest impact
}

export interface BehaviorImpactReport {
  behaviors:    BehaviorImpact[];
  topBehavior:  BehaviorKey | null;
  dataReady:    boolean;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const LABELS: Record<BehaviorKey, string> = {
  sleep:             "Sleep quality",
  protein:           "Protein intake",
  hydration:         "Hydration",
  recovery:          "Active recovery",
  consistency:       "Training consistency",
  stress_management: "Stress management",
};

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeBehaviorImpactRanking(
  readinessHistory:  ReadinessHistoryEntry[],
  adherenceHistory:  AdherenceEntry[],
  nutritionPattern:  NutritionPattern | undefined,
  consistency:       ConsistencyScore,
): BehaviorImpactReport {
  const EMPTY: BehaviorImpactReport = { behaviors: [], topBehavior: null, dataReady: false };
  if (readinessHistory.length < MIN_SAMPLE) return EMPTY;

  // Derive current scores (0–100)
  const entries = readinessHistory.filter(e => e.contributors);

  const avgContrib = (key: "sleep" | "stress" | "energy" | "trainingLoad" | "adherence" | "cycle") =>
    entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + (e.contributors?.[key] ?? 50), 0) / entries.length)
      : 50;

  const sleepScore       = avgContrib("sleep");
  const stressScore      = 100 - avgContrib("stress"); // invert: low stress = good stress management
  const proteinScore     = Math.round((nutritionPattern?.proteinComplianceRate ?? 0.5) * 100);
  const hydrationScore   = Math.round((nutritionPattern?.hydrationComplianceRate ?? 0.5) * 100);
  const consistencyScore = consistency.composite;
  const recoveryScore    = consistency.recovery;

  // Impact weights derived from average readiness contributor variance
  // Higher variance in a signal = stronger predictor of readiness differences
  function variance(vals: number[]): number {
    if (vals.length < 2) return 0;
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    return vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
  }

  const sleepVar       = variance(entries.map(e => e.contributors?.sleep ?? 50));
  const stressVar      = variance(entries.map(e => 100 - (e.contributors?.stress ?? 50)));
  const consistencyVar = variance(adherenceHistory.slice(-MIN_SAMPLE).map(e =>
    (e.status === "completed" || e.status === "partially_completed") ? 100 : 0));

  // Normalize impact scores to 0–100
  const maxVar = Math.max(sleepVar, stressVar, consistencyVar, 400) || 1;
  const sleepImpact       = Math.round(Math.min(100, (sleepVar / maxVar) * 80 + 20));
  const stressImpact      = Math.round(Math.min(100, (stressVar / maxVar) * 70 + 15));
  const consistencyImpact = Math.round(Math.min(100, (consistencyVar / maxVar) * 75 + 20));
  // Nutrition impact estimated from correlation signals
  const proteinImpact     = nutritionPattern?.proteinVsReadiness === "positive" ? 65 : 45;
  const hydrationImpact   = nutritionPattern?.hydrationVsReadiness === "positive" ? 55 : 40;
  const recoveryImpact    = 60;

  const raw: BehaviorImpact[] = [
    { behavior: "sleep",             label: LABELS.sleep,             currentScore: sleepScore,       impactScore: sleepImpact,       improvementGap: Math.max(0, 90 - sleepScore),       rank: 0 },
    { behavior: "protein",           label: LABELS.protein,           currentScore: proteinScore,     impactScore: proteinImpact,     improvementGap: Math.max(0, 85 - proteinScore),     rank: 0 },
    { behavior: "hydration",         label: LABELS.hydration,         currentScore: hydrationScore,   impactScore: hydrationImpact,   improvementGap: Math.max(0, 85 - hydrationScore),   rank: 0 },
    { behavior: "recovery",          label: LABELS.recovery,          currentScore: recoveryScore,    impactScore: recoveryImpact,    improvementGap: Math.max(0, 80 - recoveryScore),    rank: 0 },
    { behavior: "consistency",       label: LABELS.consistency,       currentScore: consistencyScore, impactScore: consistencyImpact, improvementGap: Math.max(0, 85 - consistencyScore), rank: 0 },
    { behavior: "stress_management", label: LABELS.stress_management, currentScore: stressScore,      impactScore: stressImpact,      improvementGap: Math.max(0, 80 - stressScore),      rank: 0 },
  ];

  // Sort by composite priority: impact × gap (highest = most actionable)
  const scored = raw
    .map(b => ({ ...b, priority: b.impactScore * (b.improvementGap / 100) }))
    .sort((a, b) => b.priority - a.priority)
    .map((b, i) => ({ ...b, rank: i + 1 }));

  return {
    behaviors:   scored,
    topBehavior: scored[0]?.behavior ?? null,
    dataReady:   true,
  };
}
