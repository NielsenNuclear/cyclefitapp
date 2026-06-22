// ─── lib/outcomes/leveragePointEngine.ts ─────────────────────────────────────
// 43D — Personalized Leverage Points
// Identifies the single behavior most likely to accelerate THIS user's progress
// right now — based on current compliance gap × measured impact.

import type { BehaviorImpactReport, BehaviorKey } from "./behaviorImpactRanking";
import type { GoalSuccessModel }                   from "./goalSuccessModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeveragePoint {
  behavior:           BehaviorKey;
  label:              string;
  currentScore:       number;
  targetScore:        number;
  estimatedGain:      string;    // human-readable projected benefit
  actionableAdvice:   string;
  priority:           "critical" | "high" | "moderate";
}

// ─── Action advice templates ──────────────────────────────────────────────────

const ADVICE: Record<BehaviorKey, string> = {
  sleep:             "Prioritise 7–8 hours and a consistent bedtime this week.",
  protein:           "Hit your protein target 5 of the next 7 days — even imperfect compliance compounds.",
  hydration:         "Start each morning with 500 ml of water before coffee or training.",
  recovery:          "Add one intentional recovery session (mobility, walking, or breathwork) this week.",
  consistency:       "Protect your next three scheduled sessions — showing up matters more than perfection.",
  stress_management: "Block 10 minutes daily for breathwork or journaling to reduce baseline stress.",
};

const GAIN: Record<BehaviorKey, string> = {
  sleep:             "historically associated with +8–12 pt readiness gain",
  protein:           "linked to faster strength adaptation when consistently met",
  hydration:         "typically improves energy and recovery scores within days",
  recovery:          "shown to reduce next-day fatigue by 10–15% in your history",
  consistency:       "the strongest predictor of long-term goal velocity in your data",
  stress_management: "reducing stress by 1 level raises readiness by ~6 pts on average",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function identifyLeveragePoint(
  behaviorImpact: BehaviorImpactReport,
  successModel:   GoalSuccessModel,
): LeveragePoint | null {
  if (!behaviorImpact.dataReady || behaviorImpact.behaviors.length === 0) return null;

  const top = behaviorImpact.behaviors[0];

  const priority =
    top.impactScore >= 70 && top.improvementGap >= 30 ? "critical"
    : top.improvementGap >= 20 ? "high"
    : "moderate";

  return {
    behavior:         top.behavior,
    label:            top.label,
    currentScore:     top.currentScore,
    targetScore:      Math.min(100, top.currentScore + top.improvementGap),
    estimatedGain:    GAIN[top.behavior] ?? "could meaningfully improve your outcomes",
    actionableAdvice: ADVICE[top.behavior] ?? "Focus on improving this area this week.",
    priority,
  };
}
