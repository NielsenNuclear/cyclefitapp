// ─── lib/performance/goalAdjustment.ts ───────────────────────────────────────
// Phase 36I — Advisory goal adjustments based on velocity, plateaus, and predictors.

import type { GoalVelocity }           from "./goalVelocity";
import type { PlateauReport }          from "./plateauDetection";
import type { PerformancePredictors }  from "./performancePredictors";
import type { TrainingQualityScore }   from "./trainingQuality";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdjustmentUrgency = "none" | "advisory" | "recommended" | "urgent";

export interface GoalAdjustmentSuggestion {
  area:        string;   // "Intensity" | "Frequency" | "Exercise Variety" | "Recovery" | "Nutrition"
  suggestion:  string;
  rationale:   string;
}

export interface GoalAdjustmentAdvice {
  urgency:     AdjustmentUrgency;
  suggestions: GoalAdjustmentSuggestion[];
  headline:    string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeGoalAdjustments(
  velocity:   GoalVelocity       | undefined,
  plateaus:   PlateauReport      | undefined,
  predictors: PerformancePredictors | undefined,
  quality:    TrainingQualityScore  | undefined,
): GoalAdjustmentAdvice {
  const suggestions: GoalAdjustmentSuggestion[] = [];

  // Velocity-based
  if (velocity && velocity.weeklyRatePercent <= 0 && velocity.currentValue > 0) {
    suggestions.push({
      area:       "Intensity",
      suggestion: "Increase load by 2.5–5% on primary compound lifts",
      rationale:  "No measurable progress over the last 4 weeks — a stimulus increase is overdue.",
    });
  } else if (velocity && !velocity.onTrack && velocity.weeklyRatePercent > 0) {
    suggestions.push({
      area:       "Intensity",
      suggestion: "Add a progressive overload attempt each session",
      rationale:  `Current rate ${velocity.weeklyRatePercent}%/wk is below target ${velocity.targetPercent / 4}%/wk.`,
    });
  }

  // Plateau-based
  if (plateaus) {
    const severe = plateaus.plateaus.filter(p => p.severity === "severe" || p.severity === "significant");
    if (severe.length > 0) {
      suggestions.push({
        area:       "Exercise Variety",
        suggestion: `Rotate ${severe[0].exerciseName} to a variation for 3–4 weeks`,
        rationale:  `${severe[0].exerciseName} has plateaued for ${severe[0].weeksDuration}+ weeks.`,
      });
    }
    if (plateaus.exercisesAtRisk.length > 0) {
      suggestions.push({
        area:       "Frequency",
        suggestion: `Reintroduce ${plateaus.exercisesAtRisk[0]} — it hasn't been trained in 3+ weeks`,
        rationale:  "Detraining risk when exercises are absent for more than 3 weeks.",
      });
    }
  }

  // Quality-based
  if (quality) {
    if (quality.breakdown.completionRate < 60) {
      suggestions.push({
        area:       "Frequency",
        suggestion: "Prioritise session completion over session quality temporarily",
        rationale:  `Only ${quality.breakdown.completionRate}% of planned sessions completed. Showing up is the first lever.`,
      });
    }
    if (quality.breakdown.rpeAccuracy < 55) {
      suggestions.push({
        area:       "Intensity",
        suggestion: "Calibrate RPE: finish your top set closer to the prescribed effort level",
        rationale:  "Large gap between prescribed and actual RPE suggests under- or over-reaching.",
      });
    }
  }

  // Predictor-based
  if (predictors?.topPositive) {
    suggestions.push({
      area:       "Planning",
      suggestion: `Schedule harder sessions when ${predictors.topPositive.label.toLowerCase()}`,
      rationale:  `Your best gains (avg ${predictors.topPositive.avgGainPercent}%/session) occur under this condition.`,
    });
  }

  const urgency: AdjustmentUrgency =
    suggestions.length === 0             ? "none"
    : plateaus?.overallStatus === "plateau" ? "urgent"
    : velocity && !velocity.onTrack       ? "recommended"
    : "advisory";

  const headline =
    urgency === "none"        ? "All systems are healthy — keep the current approach."
    : urgency === "urgent"    ? "Plateau detected — training stimulus needs to change."
    : urgency === "recommended" ? "Progress is slower than expected — consider these adjustments."
    : "Minor refinements available to optimise results.";

  return { urgency, suggestions: suggestions.slice(0, 4), headline };
}
