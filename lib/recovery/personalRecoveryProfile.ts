// ─── lib/recovery/personalRecoveryProfile.ts ─────────────────────────────────
// Phase 33J — Synthesises all recovery learning signals into a single
// human-readable personal recovery profile.
// Derived on demand from correlation reports, strategy outcomes, validation,
// and capacity estimates. No separate storage needed.

import type { CorrelationReport }          from "./recoveryCorrelation";
import type { RecoveryStrategyOutcome }    from "./recoveryTypes";
import type { RecoveryValidationAccuracy } from "./recoveryValidation";
import type { RecoveryCapacity }           from "@/lib/adaptive/recoveryCapacity";
import type { RecoveryBank }               from "./recoveryBank";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalRecoveryProfile {
  optimalConditions:   string[];    // top 2-3 conditions that support recovery
  recoveryBottleneck:  string;      // the single biggest drag on recovery
  topStrategies:       string[];    // most effective recovery modalities
  capacityInsight:     string;      // what the capacity model has learned
  bankInsight:         string;      // current resilience reserve narrative
  forecastAccuracy:    string;      // how well Axis predicts recovery
  summary:             string;      // 1–2 sentence synthesis
  confidence:          "early" | "growing" | "established";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds a PersonalRecoveryProfile by synthesising all available recovery
 * learning signals into actionable, personalised insights.
 */
export function buildPersonalRecoveryProfile(
  correlations:  CorrelationReport,
  strategies:    RecoveryStrategyOutcome[],
  validation:    RecoveryValidationAccuracy,
  capacity:      RecoveryCapacity,
  bank:          RecoveryBank,
): PersonalRecoveryProfile {
  // ── Confidence tier ─────────────────────────────────────────────────────────
  const dataPoints = correlations.totalDays;
  const confidence: PersonalRecoveryProfile["confidence"] =
    dataPoints >= 30 ? "established" :
    dataPoints >= 14 ? "growing"     : "early";

  // ── Optimal conditions (positive correlations) ────────────────────────────
  const optimalConditions: string[] = [];
  for (const c of correlations.correlations) {
    if (c.direction === "positive" && c.strength !== "none") {
      // Positive correlations for sleep/energy = good signal
      if (c.signal === "sleep" || c.signal === "energy") {
        optimalConditions.push(`High ${c.label.toLowerCase()} strongly supports your recovery`);
      }
    }
    // Negative correlations for stress/load = low stress/load helps
    if (c.direction === "negative" && c.strength !== "none") {
      if (c.signal === "stress") {
        optimalConditions.push("Keeping stress low is your strongest recovery lever");
      }
      if (c.signal === "training_load") {
        optimalConditions.push("Moderate training load preserves better day-to-day recovery");
      }
    }
    if (optimalConditions.length >= 3) break;
  }

  if (optimalConditions.length === 0) {
    optimalConditions.push("Consistent sleep, low stress, and manageable training load");
  }

  // ── Recovery bottleneck ───────────────────────────────────────────────────
  const bottleneck = correlations.topPredictor
    ? `${correlations.topPredictor.label} (${correlations.topPredictor.strength} signal, explains ~${Math.round(correlations.topPredictor.rSquared * 100)}% of variance)`
    : bank.balance < 40
    ? "Depleted resilience reserves from sustained sub-optimal sleep and/or high stress"
    : "Insufficient data to identify — keep logging check-ins";

  // ── Top strategies ────────────────────────────────────────────────────────
  const effective = strategies
    .filter(s => s.verdict === "effective")
    .map(s => capitalise(s.strategy.replace(/_/g, " ")));
  const topStrategies = effective.length > 0
    ? effective.slice(0, 3)
    : ["Keep logging recovery strategies to discover what works for you"];

  // ── Capacity insight ──────────────────────────────────────────────────────
  const capacityInsight =
    capacity.confidence === "early"
      ? "Capacity model is still learning — complete more training cycles for a reliable estimate."
      : `${capitalise(capacity.level)} recovery capacity (${capacity.score}/100). ${capacity.rationale}`;

  // ── Bank insight ──────────────────────────────────────────────────────────
  const bankInsight = bank.note;

  // ── Forecast accuracy insight ─────────────────────────────────────────────
  const forecastAccuracy = validation.sampleSize < 3
    ? "Forecast accuracy will improve as more days are validated."
    : validation.insight;

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary =
    confidence === "early"
      ? "Axis is learning your recovery patterns. Log daily check-ins to accelerate personalisation."
      : capacity.level === "high"
      ? `You have ${capacity.level} recovery capacity. ${optimalConditions[0] ?? "Consistent habits are protecting your resilience."}${topStrategies[0] ? ` ${topStrategies[0]} is your most effective strategy.` : ""}`
      : `Recovery capacity is ${capacity.level}. Your biggest lever is: ${optimalConditions[0]?.toLowerCase() ?? "sleep and stress management"}. ${topStrategies[0] ? `${topStrategies[0]} is showing the best effectiveness.` : ""}`;

  return {
    optimalConditions,
    recoveryBottleneck: bottleneck,
    topStrategies,
    capacityInsight,
    bankInsight,
    forecastAccuracy,
    summary,
    confidence,
  };
}
