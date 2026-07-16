// ─── lib/intelligence/confidence/ConfidenceExplainer.ts ──────────────────────
// Phase 67 — generates human-readable explanations for a confidence profile.

import type {
  ConfidenceProfile,
  ConfidenceExplanation,
  ConfidenceLevel,
  MaturityStage,
} from "./ConfidenceTypes";
import { MATURITY_STAGES as STAGES } from "./ConfidenceTypes";
import { workoutsToNextStage } from "./ConfidenceCalculator";

const LEVEL_SUMMARY: Record<ConfidenceLevel, string> = {
  High:         "Axis has a strong, verified understanding of your training patterns.",
  Moderate:     "Axis has a reasonable baseline for your patterns with room to grow.",
  Building:     "Axis is actively learning your patterns from your completed workouts.",
  Limited:      "Axis is working from limited data and applying conservative defaults.",
  Insufficient: "Axis needs more data before personalising your recommendations.",
};

function maturityContext(stage: MaturityStage, completedWorkouts: number): string {
  const info = STAGES.find(s => s.stage === stage)!;
  const remaining = workoutsToNextStage(completedWorkouts);
  if (!info.nextStage || remaining === null) {
    return `You've reached ${info.label} status with ${completedWorkouts} completed workouts.`;
  }
  const nextInfo = STAGES.find(s => s.stage === info.nextStage)!;
  return `You're at the ${info.label} stage. ${remaining} more workout${remaining === 1 ? "" : "s"} to reach ${nextInfo.label}.`;
}

export function explainConfidence(
  profile: ConfidenceProfile,
  completedWorkouts: number,
): ConfidenceExplanation {
  const { dimensions, level, maturityStage } = profile;
  const strengths:    string[] = [];
  const gaps:         string[] = [];
  const improvements: string[] = [];

  if (dimensions.calibration.available && dimensions.calibration.score >= 0.70) {
    strengths.push("Forecast accuracy has been verified against real outcomes.");
  } else if (!dimensions.calibration.available) {
    gaps.push("No calibration data yet — predictions use conservative defaults.");
    improvements.push("Complete daily check-ins so forecast accuracy can be measured.");
  }

  if (dimensions.verification.available && dimensions.verification.score >= 0.65) {
    strengths.push("Past recommendations have been verified as effective for you.");
  } else if (!dimensions.verification.available) {
    gaps.push("Recommendation outcomes haven't been evaluated yet.");
    improvements.push("Complete workouts within the recommendation window to build outcome history.");
  }

  if (dimensions.dataCompleteness.score >= 0.80) {
    strengths.push("Recovery, sleep, and cycle data are all contributing.");
  } else if (dimensions.dataCompleteness.score < 0.60) {
    gaps.push("Several data sources are inactive.");
    improvements.push("Log recovery check-ins and sleep data to improve completeness.");
  }

  if (dimensions.personalizationMaturity.score >= 0.80) {
    strengths.push(`${completedWorkouts} completed workouts provide strong personalisation.`);
  } else if (completedWorkouts < 10) {
    gaps.push(`Only ${completedWorkouts} workout${completedWorkouts === 1 ? "" : "s"} logged — recommendations are currently generalised.`);
    improvements.push("Complete more workouts to unlock personalised patterns.");
  }

  if (dimensions.predictionStability.available && dimensions.predictionStability.score >= 0.75) {
    strengths.push("Volume recommendations have been consistent and stable.");
  } else if (!dimensions.predictionStability.available) {
    improvements.push("Maintain a consistent training schedule to stabilise predictions.");
  }

  if (dimensions.historicalContext.score >= 0.60) {
    strengths.push("Axis has sufficient training history to detect meaningful patterns.");
  }

  return {
    summary:         LEVEL_SUMMARY[level],
    level,
    strengths,
    gaps,
    improvements,
    maturityContext: maturityContext(maturityStage, completedWorkouts),
  };
}

export function getMissingDataOpportunities(profile: ConfidenceProfile): string[] {
  const opps: string[] = [];
  const { dimensions } = profile;

  if (!dimensions.calibration.available)
    opps.push("Daily recovery check-ins (improves forecast calibration)");
  if (!dimensions.verification.available)
    opps.push("Consistent workout completion within recommended windows");
  if (dimensions.dataCompleteness.score < 0.60)
    opps.push("Sleep and recovery logging");
  if (dimensions.personalizationMaturity.score < 0.40)
    opps.push("More completed workouts (builds personalisation)");
  if (!dimensions.predictionStability.available)
    opps.push("A consistent training cadence over multiple weeks");

  return opps;
}
