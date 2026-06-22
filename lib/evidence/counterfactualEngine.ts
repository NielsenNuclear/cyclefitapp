// ─── lib/evidence/counterfactualEngine.ts ────────────────────────────────────
// 42B — Counterfactual Engine
// Shows users what would need to change to flip today's recommendation.
// "If sleep improves tonight, tomorrow likely becomes Push."

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlipCondition {
  factor:  string;
  change:  string;
  impact:  string;
}

export interface Counterfactual {
  currentRecommendation: string;
  flipConditions:        FlipCondition[];
  primaryMessage:        string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildCounterfactual(
  recommendation: string,
  readinessScore: number,
  recoveryScore:  number,
  stressLevel:    number,
): Counterfactual {
  const rec        = recommendation.toLowerCase();
  const conditions: FlipCondition[] = [];

  if (rec === "recover" || rec === "rest") {
    if (readinessScore < 50) {
      conditions.push({
        factor: "Readiness",
        change: "Reach 60+",
        impact: "Would unlock a maintenance workout.",
      });
    }
    if (recoveryScore < 50) {
      conditions.push({
        factor: "Recovery",
        change: "Improve to 60+",
        impact: "Would shift toward a lighter session.",
      });
    }
    if (stressLevel >= 4) {
      conditions.push({
        factor: "Stress",
        change: "Reduce to moderate",
        impact: "Would allow a minimum-effective dose session.",
      });
    }
  } else if (rec === "maintain") {
    if (readinessScore < 75 || recoveryScore < 70) {
      conditions.push({
        factor: "Readiness",
        change: "3 consecutive days above 80",
        impact: "Would trigger a Push session.",
      });
    }
    conditions.push({
      factor: "Stress",
      change: "Keep stress low for 2+ days",
      impact: "Increases likelihood of a Push recommendation.",
    });
  } else if (rec === "push" || rec === "build") {
    conditions.push({
      factor: "Readiness",
      change: "Drop below 60",
      impact: "Would shift to Maintain.",
    });
    conditions.push({
      factor: "Recovery",
      change: "Drop below 50",
      impact: "Would trigger a recovery or rest day.",
    });
  }

  const primaryMessage = conditions.length > 0
    ? `To move from ${recommendation}: ${conditions[0].factor} — ${conditions[0].change}.`
    : "Current recommendation is strongly supported by your data.";

  return {
    currentRecommendation: recommendation,
    flipConditions:        conditions,
    primaryMessage,
  };
}
