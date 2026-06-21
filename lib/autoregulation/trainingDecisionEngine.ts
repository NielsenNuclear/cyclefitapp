// ─── lib/autoregulation/trainingDecisionEngine.ts ────────────────────────────
// Phase 37I — Final orchestration layer: Training Decision Engine.
// Sits after all existing recommendation modifiers and before workout generation.
// Produces the authoritative training decision that governs session scaling,
// exercise swaps, and the displayed coaching rationale.
//
// NOT a second recommendation engine — it UNIFIES the existing phases.

import { computeSessionScaling, type SessionScaling }    from "./sessionScaling";
import type { FatigueScoreEntry }                        from "./fatigueModel";
import type { PerformanceTrendStatus }                   from "@/lib/analytics/performanceTrends";
import type { PerformanceTrend }                         from "@/lib/analytics/performanceTrends";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingDecisionType =
  | "proceed"     // train as planned
  | "scale_down"  // reduce volume / intensity
  | "scale_up"    // increase volume / intensity (great day)
  | "swap"        // swap exercises for lower-load alternatives
  | "recover";    // convert to active recovery

export interface TrainingDecisionInput {
  readinessScore:          number;    // 0–100
  readinessCategory:       string;    // "optimal"|"ready"|"moderate"|"cautious"|"recover"
  recoveryDebtScore:       number;    // 0–100
  burnoutRiskScore:        number;    // 0–100
  fatigueEntry:            FatigueScoreEntry;
  symptomSeverityMean:     number;    // 0–4
  symptomCount:            number;
  isDeloadRecommended:     boolean;
  performanceTrends:       PerformanceTrend[];    // from detectPerformanceTrends
  adherenceRiskLevel:      string;    // "low"|"moderate"|"high"
  existingVolumeScale:     number;    // Phase 34/35 composite scale
  isDeloadPeriod:          boolean;   // from periodizationStatus
  patternConfidenceOverall?: number;  // 0–100 from cycle intelligence
}

export interface TrainingDecision {
  type:                  TrainingDecisionType;
  finalVolumeScale:      number;          // replaces existingVolumeScale in workout pipeline
  intensityMultiplier:   number;          // compose with adaptiveModifier.intensityMultiplier
  complexityScale:       number;          // 1.0 = full; 0.7 = prefer easier variants
  shouldSwapExercises:   boolean;
  swapReasons:           string[];
  rationale:             string[];        // up to 3 coaching notes
  headline:              string;          // one-line session description
  scaling:               SessionScaling;  // full scaling breakdown for display
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dominantTrend(trends: PerformanceTrend[]): PerformanceTrendStatus {
  const sufficient = trends.filter(t => t.status !== "insufficient_data");
  if (sufficient.length === 0) return "insufficient_data";

  const counts = new Map<string, number>();
  for (const t of sufficient) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0][0] as PerformanceTrendStatus;
}

function decisionType(scaling: SessionScaling, isPossibleUpgrade: boolean): TrainingDecisionType {
  if (scaling.recommendation === "recovery") return "recover";
  if (scaling.volumeModifier >= 1.08 && isPossibleUpgrade) return "scale_up";
  if (scaling.volumeModifier < 0.85 || scaling.recommendation === "scaled") return "scale_down";
  if (scaling.complexityScale < 0.80) return "swap";
  return "proceed";
}

function headline(type: TrainingDecisionType, scaling: SessionScaling): string {
  switch (type) {
    case "proceed":    return "Train as planned — conditions are green.";
    case "scale_up":   return "Great day — volume and intensity ceiling raised.";
    case "scale_down": return `Session scaled to ${Math.round(scaling.volumeModifier * 100)}% of planned volume.`;
    case "swap":       return "Exercises adjusted for today's readiness level.";
    case "recover":    return "Today's session converted to active recovery.";
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function makeTrainingDecision(input: TrainingDecisionInput): TrainingDecision {
  const trend = dominantTrend(input.performanceTrends);

  const scaling = computeSessionScaling({
    readinessScore:         input.readinessScore,
    readinessCategory:      input.readinessCategory,
    recoveryDebtScore:      input.recoveryDebtScore,
    burnoutRiskScore:       input.burnoutRiskScore,
    fatigueScore:           input.fatigueEntry.score,
    fatigueZone:            input.fatigueEntry.zone,
    symptomSeverityMean:    input.symptomSeverityMean,
    symptomCount:           input.symptomCount,
    isDeloadRecommended:    input.isDeloadRecommended,
    performanceTrendStatus: trend,
    adherenceRiskLevel:     input.adherenceRiskLevel,
    existingVolumeScale:    input.existingVolumeScale,
    isDeloadPeriod:         input.isDeloadPeriod,
  });

  const isPossibleUpgrade =
    input.readinessCategory === "optimal" &&
    input.fatigueEntry.zone === "fresh" &&
    input.recoveryDebtScore < 30 &&
    input.burnoutRiskScore  < 40 &&
    input.symptomCount === 0;

  const type = decisionType(scaling, isPossibleUpgrade);

  // Swap exercises when complexity is meaningfully reduced
  const shouldSwapExercises = scaling.complexityScale < 0.85;
  const swapReasons: string[] = [];
  if (scaling.complexityScale < 0.85) swapReasons.push("Reduced readiness");
  if (input.symptomSeverityMean >= 2)  swapReasons.push("Active symptoms");
  if (input.fatigueEntry.zone === "fatigued" || input.fatigueEntry.zone === "overreached") {
    swapReasons.push("Elevated fatigue");
  }

  return {
    type,
    finalVolumeScale:    scaling.volumeModifier,
    intensityMultiplier: scaling.intensityMultiplier,
    complexityScale:     scaling.complexityScale,
    shouldSwapExercises,
    swapReasons,
    rationale:           scaling.rationale,
    headline:            headline(type, scaling),
    scaling,
  };
}
