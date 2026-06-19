// ─── lib/periodization/adaptiveDeload.ts ──────────────────────────────────────
// Decides whether to trigger a deload early, delay a scheduled one,
// or proceed as planned. Builds on the existing detectDeload() output
// with periodization-context awareness.

import type { ReadinessTrend }       from "@/lib/readiness/readinessHistory";
import type { RecoveryDebt }         from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }          from "@/lib/recovery/burnoutRisk";
import type { DeloadRecommendation } from "@/lib/recovery/deloadDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdaptiveDeloadDecision {
  triggerEarly:        boolean;   // deload now even if not yet scheduled
  delay:               boolean;   // postpone a scheduled deload by 1 week
  confidence:          "high" | "medium" | "low";
  reason:              string;
  signals:             string[];
  weeksSinceLastDeload: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeAdaptiveDeload(input: {
  scheduledForDeload:    boolean;           // is this mesocycle week a deload?
  deloadRecommendation?: DeloadRecommendation | null;
  readinessTrend:        ReadinessTrend | null;
  recoveryDebt:          RecoveryDebt | null;
  burnoutRisk:           BurnoutRisk | null;
  activeSymptomCount:    number;
  weeksSinceLastDeload:  number;
}): AdaptiveDeloadDecision {
  const {
    scheduledForDeload,
    deloadRecommendation,
    readinessTrend,
    recoveryDebt,
    burnoutRisk,
    activeSymptomCount,
    weeksSinceLastDeload,
  } = input;

  const signals: string[] = [];

  // ── Early-trigger signals ──────────────────────────────────────────────────
  let earlyTriggerScore = 0;

  if (burnoutRisk?.level === "severe") {
    signals.push("Severe burnout risk detected");
    earlyTriggerScore += 3;
  } else if (burnoutRisk?.level === "high") {
    signals.push("High burnout risk detected");
    earlyTriggerScore += 2;
  }

  if ((recoveryDebt?.debtScore ?? 0) >= 70) {
    signals.push("Recovery debt critically high");
    earlyTriggerScore += 2;
  } else if ((recoveryDebt?.debtScore ?? 0) >= 50) {
    signals.push("Recovery debt elevated");
    earlyTriggerScore += 1;
  }

  if (readinessTrend === "declining") {
    signals.push("Readiness trending downward");
    earlyTriggerScore += 2;
  }

  if (deloadRecommendation?.needed && (deloadRecommendation.confidence ?? 0) >= 0.75) {
    signals.push("Fatigue signals confirm deload need");
    earlyTriggerScore += 2;
  }

  if (activeSymptomCount >= 3) {
    signals.push(`High symptom burden (${activeSymptomCount} active symptoms)`);
    earlyTriggerScore += 1;
  }

  if (weeksSinceLastDeload > 8) {
    signals.push(`${weeksSinceLastDeload} weeks since last deload`);
    earlyTriggerScore += 1;
  }

  const triggerEarly = !scheduledForDeload && earlyTriggerScore >= 3;

  // ── Delay signals (only when scheduled deload exists) ─────────────────────
  const canDelay = scheduledForDeload &&
    (readinessTrend === "improving" || readinessTrend === "stable") &&
    (recoveryDebt?.debtScore ?? 0) < 25 &&
    (burnoutRisk?.level === "low" || burnoutRisk == null) &&
    weeksSinceLastDeload <= 5;

  const delay = canDelay;

  // ── Confidence ────────────────────────────────────────────────────────────
  const confidence: AdaptiveDeloadDecision["confidence"] =
    earlyTriggerScore >= 5 ? "high" :
    earlyTriggerScore >= 3 ? "medium" :
    "low";

  // ── Reason ────────────────────────────────────────────────────────────────
  let reason: string;
  if (triggerEarly) {
    reason = `Early deload triggered: ${signals.slice(0, 2).join(", ")}.`;
  } else if (delay) {
    reason = "Scheduled deload delayed — readiness is strong and recovery debt is low. One more productive week.";
  } else if (scheduledForDeload) {
    reason = "Scheduled deload week — reduce load, maintain movement quality.";
  } else {
    reason = "Training as planned — no deload intervention needed.";
  }

  return {
    triggerEarly,
    delay,
    confidence,
    reason,
    signals,
    weeksSinceLastDeload,
  };
}
