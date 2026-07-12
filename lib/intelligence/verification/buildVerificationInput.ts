// ─── lib/intelligence/verification/buildVerificationInput.ts ──────────────────
// Phase C — Adapter: maps live dashboard pipeline state to
// RecordRecommendationParams without importing React or dashboard internals.
// Pure function — no side effects, no storage calls.

import type { RecommendationClass, AthleteStateSnapshot } from "./verificationTypes";
import type { RecordRecommendationParams }                 from "./recommendationVerifier";
import type { TrainingDecisionType }                       from "@/lib/autoregulation/trainingDecisionEngine";

export interface BuildVerificationInputArgs {
  // Decision
  decisionType:          TrainingDecisionType;
  finalVolumeScale:      number;
  headline:              string;
  rationale:             string[];
  isDeload:              boolean;
  workoutMode:           string;

  // Athlete state
  readinessScore:        number;
  recoveryScore:         number;
  fatigueEstimate:       number;
  cyclePhase:            string;
  cycleDay:              number | null;
  weeklyVolumeSets:      number;
  streakDays:            number;
  adherenceRate:         number;   // 0–1, trailing 14 days

  // Meta
  confidenceScore:       number;   // 0–1
  today:                 string;   // YYYY-MM-DD
}

// ── Derive RecommendationClass from pipeline data ─────────────────────────────

export function decisionToRecommendationClass(
  decisionType:     TrainingDecisionType,
  finalVolumeScale: number,
  isDeload:         boolean,
  workoutMode:      string,
): RecommendationClass {
  if (isDeload)                           return "deload";
  if (decisionType === "recover")         return "recovery_focus";
  if (workoutMode === "recovery")         return "recovery_focus";
  if (decisionType === "swap")            return "workout_type_change";
  if (decisionType === "scale_up")        return "volume_increase";
  if (decisionType === "scale_down")      return "volume_decrease";
  if (finalVolumeScale >= 1.05)          return "volume_increase";
  if (finalVolumeScale <= 0.90)          return "volume_decrease";
  return "volume_maintain";
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildVerificationInput(
  args: BuildVerificationInputArgs,
): RecordRecommendationParams {
  const recClass = decisionToRecommendationClass(
    args.decisionType,
    args.finalVolumeScale,
    args.isDeload,
    args.workoutMode,
  );

  const athleteState: AthleteStateSnapshot = {
    readinessScore:   args.readinessScore,
    recoveryScore:    args.recoveryScore,
    fatigueEstimate:  args.fatigueEstimate,
    cyclePhase:       args.cyclePhase,
    cycleDay:         args.cycleDay,
    adherenceRate:    args.adherenceRate,
    weeklyVolumeSets: args.weeklyVolumeSets,
    streakDays:       args.streakDays,
    timestamp:        args.today,
  };

  return {
    recommendationId:       `rec-${args.today}`,
    recommendationClass:    recClass,
    recommendationSummary:  args.headline,
    supportingSignals:      args.rationale,
    athleteState,
    confidenceAtGeneration: args.confidenceScore,
    today:                  args.today,
  };
}
