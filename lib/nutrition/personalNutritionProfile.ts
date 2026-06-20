// ─── lib/nutrition/personalNutritionProfile.ts ───────────────────────────────
// Phase 32J — Synthesises all nutrition learning signals into a single,
// human-readable personalised nutrition profile.
// Derived on demand — no separate storage (computed from raw history).

import type { NutritionPattern }   from "./nutritionPatterns";
import type { NutritionOutcome }   from "./nutritionLearning";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalizedNutritionProfile {
  primaryInsight:      string;
  recommendations:     string[];   // 2–4 actionable nudges
  optimalFuelingNote:  string;
  proteinImpact:       "positive" | "neutral" | "insufficient_data";
  hydrationImpact:     "positive" | "neutral" | "insufficient_data";
  confidence:          "early" | "growing" | "established";
  sampleDays:          number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Synthesises nutrition pattern learning, compliance history, and fueling
 * level outcomes into an actionable personalised profile.
 *
 * Keeps recommendations concrete and cycle-aware — avoids generic advice
 * that doesn't account for what Axis has actually learned about this user.
 */
export function buildPersonalizedNutritionProfile(
  pattern:  NutritionPattern,
  outcomes: NutritionOutcome[],
): PersonalizedNutritionProfile {
  const recs: string[] = [];

  // Protein impact recommendation
  if (pattern.proteinVsReadiness === "positive") {
    recs.push("Prioritise hitting your protein target — it's your strongest nutrition → recovery signal.");
  } else if (pattern.proteinComplianceRate < 0.5) {
    recs.push(`You hit protein on ${Math.round(pattern.proteinComplianceRate * 100)}% of tracked days. Even a small improvement here likely drives recovery gains.`);
  }

  // Hydration impact recommendation
  if (pattern.hydrationVsReadiness === "positive") {
    recs.push("Your readiness scores are consistently higher on well-hydrated days. Treat hydration as non-negotiable.");
  } else if (pattern.hydrationComplianceRate < 0.6) {
    recs.push("Hydration compliance is below 60%. Carry a water bottle to training sessions as a default.");
  }

  // Veggie compliance
  if (pattern.veggieComplianceRate < 0.5) {
    recs.push("Less than half of tracked days include fruits or vegetables. Even one additional serving per day improves micronutrient recovery support.");
  }

  // Fueling level learning (32H)
  if (pattern.optimalFuelingLevel) {
    const label = pattern.optimalFuelingLevel.replace("_", " ");
    recs.push(`${label.charAt(0).toUpperCase() + label.slice(1)} days produce your best recovery outcomes — this is when Axis assigns those targets, lean into them.`);
  }

  // Fill minimum recommendations
  if (recs.length === 0) {
    recs.push("Keep logging daily nutrition check-ins — Axis is building your personalised picture.");
  }

  // Primary insight
  const primaryInsight = pattern.confidence === "early"
    ? "Axis is learning your nutrition patterns — complete daily check-ins to accelerate personalisation."
    : pattern.primaryInsight;

  const optimalFuelingNote = outcomes.length > 0
    ? `Best-performing fueling level: ${outcomes[0].fuelingLevel.replace("_", " ")} (avg readiness ${outcomes[0].meanNextDayScore}/100, n=${outcomes[0].sampleSize}).`
    : "Complete more scored nutrition days to identify your optimal fueling level.";

  return {
    primaryInsight,
    recommendations:    recs.slice(0, 4),
    optimalFuelingNote,
    proteinImpact:      pattern.proteinVsReadiness,
    hydrationImpact:    pattern.hydrationVsReadiness,
    confidence:         pattern.confidence,
    sampleDays:         pattern.sampleDays,
  };
}
