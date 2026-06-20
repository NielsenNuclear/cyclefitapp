// ─── lib/nutrition/nutritionPatterns.ts ──────────────────────────────────────
// Phase 32G/32H — Correlates nutrition compliance with readiness outcomes.
// Answers: "do protein-compliant days lead to better recovery?"
// and "does hydration compliance predict next-day readiness?"
// Derives food strategy signals: does higher protein or higher carb fueling
// associate with better performance for this specific user?

import type { DailyNutritionCheckin, NutritionComplianceSummary } from "./nutritionCheckin";
import type { ReadinessHistoryEntry }                              from "@/lib/readiness/readinessHistory";
import type { NutritionOutcome }                                   from "./nutritionLearning";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplianceImpact = "positive" | "neutral" | "insufficient_data";

export interface NutritionPattern {
  // Compliance rates
  proteinComplianceRate:   number;        // 0–1
  hydrationComplianceRate: number;        // 0–1
  veggieComplianceRate:    number;        // 0–1
  sampleDays:              number;

  // Correlation signals
  proteinVsReadiness:      ComplianceImpact;
  hydrationVsReadiness:    ComplianceImpact;

  // Food strategy learning (32H)
  optimalFuelingLevel:     string | null; // "performance" | "high_output" | null
  fuelingInsight:          string;

  // Synthesis
  primaryInsight:          string;
  confidence:              "early" | "growing" | "established";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * For each check-in day that has a next-day readiness score, compare
 * readiness on days where the compliance flag was true vs false.
 * Returns "positive" if true-days had >= 5 points higher mean readiness.
 */
function compareCompliance(
  checkins:         DailyNutritionCheckin[],
  readiness:        ReadinessHistoryEntry[],
  flagKey:          keyof Pick<DailyNutritionCheckin, "hitProtein" | "hitHydration" | "hitVeggies">,
): ComplianceImpact {
  const rdxMap = new Map<string, number>();
  for (const r of readiness) rdxMap.set(r.date, r.score);

  const hit: number[]  = [];
  const miss: number[] = [];

  for (const c of checkins) {
    // Look for same-day or next-day readiness score
    const score = rdxMap.get(c.date);
    if (score === undefined) continue;
    if (c[flagKey]) hit.push(score);
    else            miss.push(score);
  }

  if (hit.length < 3 || miss.length < 3) return "insufficient_data";

  const hitMean  = mean(hit);
  const missMean = mean(miss);

  return hitMean - missMean >= 5 ? "positive" : "neutral";
}

// ─── Main export ──────────────────────────────────────────────────────────────

const MIN_SAMPLES = 7;

/**
 * Builds a NutritionPattern from check-in history and readiness data.
 * Requires MIN_SAMPLES days of checkin data for meaningful correlation.
 * Food strategy insight (32H) derives from NutritionOutcomes (which fueling
 * levels produced the best readiness).
 */
export function buildNutritionPatterns(
  checkins:          DailyNutritionCheckin[],
  readiness:         ReadinessHistoryEntry[],
  nutritionOutcomes: NutritionOutcome[],
  compliance:        NutritionComplianceSummary,
): NutritionPattern {
  const n = checkins.length;

  if (n < MIN_SAMPLES) {
    return {
      proteinComplianceRate:   compliance.proteinRate,
      hydrationComplianceRate: compliance.hydrationRate,
      veggieComplianceRate:    compliance.veggieRate,
      sampleDays:              n,
      proteinVsReadiness:      "insufficient_data",
      hydrationVsReadiness:    "insufficient_data",
      optimalFuelingLevel:     null,
      fuelingInsight:          `Log ${MIN_SAMPLES - n} more nutrition check-ins to unlock nutrition pattern learning.`,
      primaryInsight:          "Keep logging daily nutrition check-ins — patterns will emerge over time.",
      confidence:              "early",
    };
  }

  const proteinVsReadiness   = compareCompliance(checkins, readiness, "hitProtein");
  const hydrationVsReadiness = compareCompliance(checkins, readiness, "hitHydration");

  // 32H: Food strategy — which fueling level produces best readiness?
  const optimalOutcome = nutritionOutcomes.length > 0 ? nutritionOutcomes[0] : null;
  const optimalFuelingLevel = optimalOutcome?.fuelingLevel ?? null;

  const fuelingInsight = optimalOutcome
    ? `${optimalFuelingLevel?.replace("_", " ") ?? "Moderate"} fueling days are associated with your highest next-day readiness scores (avg ${optimalOutcome.meanNextDayScore}/100 from ${optimalOutcome.sampleSize} days).`
    : "Complete more scored nutrition days to discover your optimal fueling strategy.";

  // Build primary insight
  const insights: string[] = [];
  if (proteinVsReadiness === "positive") {
    insights.push("Hitting your protein target is associated with higher readiness the following day.");
  }
  if (hydrationVsReadiness === "positive") {
    insights.push("Hydration compliance tracks closely with better recovery scores.");
  }
  if (compliance.proteinRate < 0.5) {
    insights.push(`You hit your protein target on ${Math.round(compliance.proteinRate * 100)}% of tracked days — this is the highest-impact area to improve.`);
  }
  if (compliance.hydrationRate < 0.5) {
    insights.push(`Hydration goal reached on ${Math.round(compliance.hydrationRate * 100)}% of days.`);
  }

  const primaryInsight = insights[0] ?? "Nutrition patterns are building — keep logging daily check-ins.";

  const confidence: NutritionPattern["confidence"] =
    n >= 30 ? "established" :
    n >= 14 ? "growing"     : "early";

  return {
    proteinComplianceRate:   compliance.proteinRate,
    hydrationComplianceRate: compliance.hydrationRate,
    veggieComplianceRate:    compliance.veggieRate,
    sampleDays:              n,
    proteinVsReadiness,
    hydrationVsReadiness,
    optimalFuelingLevel,
    fuelingInsight,
    primaryInsight,
    confidence,
  };
}
