// ─── lib/outcomes/outcomeScorecard.ts ────────────────────────────────────────
// 43E/F/G — Outcome Scorecard, Success Probability & Goal Acceleration
// Synthesises goal velocity, behavior compliance, and success patterns into
// a single outcome score with probability and acceleration recommendations.

import type { GoalVelocity }         from "@/lib/performance/goalVelocity";
import type { ConsistencyScore }     from "@/lib/adherence/consistency";
import type { GoalSuccessModel }     from "./goalSuccessModel";
import type { BehaviorImpactReport } from "./behaviorImpactRanking";
import type { LeveragePoint }        from "./leveragePointEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OutcomeTier = "excellent" | "good" | "fair" | "poor";

export interface OutcomeScorecard {
  score:              number;      // 0–100 composite outcome score
  tier:               OutcomeTier;
  successProbability: number;      // 0–100 estimated goal completion probability
  velocityScore:      number;      // velocity component (0–100)
  complianceScore:    number;      // behavior compliance component (0–100)
  momentumScore:      number;      // consistency/momentum component (0–100)
  accelerationTips:   string[];    // up to 3 actionable acceleration suggestions
  headline:           string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierFromScore(score: number): OutcomeTier {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function HEADLINE(tier: OutcomeTier, onTrack: boolean): string {
  if (tier === "excellent") return "You're excelling — keep the momentum.";
  if (tier === "good")      return onTrack ? "On track — small gains compound." : "Making progress — focus on the leverage point.";
  if (tier === "fair")      return "Solid base — one key behavior could unlock a step change.";
  return "Recovery week — consistency is the goal right now.";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeOutcomeScorecard(
  velocity:        GoalVelocity,
  consistency:     ConsistencyScore,
  successModel:    GoalSuccessModel,
  behaviorImpact:  BehaviorImpactReport,
  leveragePoint:   LeveragePoint | null,
): OutcomeScorecard {
  // Velocity score: map weeklyRatePercent (typical range -2 to +3) to 0–100
  const velocityScore = Math.min(100, Math.max(0, Math.round((velocity.weeklyRatePercent + 1) / 4 * 100)));

  // Compliance score: mean of top behavior scores (weighted)
  const complianceScore = behaviorImpact.dataReady
    ? Math.round(
        behaviorImpact.behaviors
          .slice(0, 4)
          .reduce((s, b) => s + b.currentScore, 0) / Math.min(4, behaviorImpact.behaviors.length)
      )
    : consistency.composite;

  // Momentum: training consistency + recovery
  const momentumScore = Math.round(consistency.training * 0.6 + consistency.recovery * 0.4);

  // Composite
  const score = Math.round(velocityScore * 0.35 + complianceScore * 0.35 + momentumScore * 0.30);
  const tier  = tierFromScore(score);

  // Success probability: base from score, modulated by on-track status
  let successProbability = Math.round(score * 0.80 + (velocity.onTrack ? 10 : 0));
  successProbability = Math.min(92, Math.max(8, successProbability));

  // Acceleration tips
  const tips: string[] = [];
  if (leveragePoint) {
    tips.push(`${leveragePoint.label}: ${leveragePoint.actionableAdvice}`);
  }
  if (consistency.training < 65) {
    tips.push("Protecting your next 3 sessions will have the highest impact on your velocity.");
  }
  if (velocity.etaWeeks !== null && velocity.etaWeeks > 20) {
    tips.push("Your current pace suggests a long timeline — increasing weekly frequency by 1 day could halve it.");
  }
  if (tips.length < 2) {
    tips.push("Maintain your current routine — small daily actions compound into significant gains.");
  }

  return {
    score,
    tier,
    successProbability,
    velocityScore,
    complianceScore,
    momentumScore,
    accelerationTips: tips.slice(0, 3),
    headline:         HEADLINE(tier, velocity.onTrack),
  };
}
