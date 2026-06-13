// ─── lib/recovery/deloadDetection.ts ─────────────────────────────────────────
// Detects when cumulative fatigue signals suggest a deload is needed.
// Pure function — callers pass all data in; no localStorage reads here.

import type { LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import type { WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryCapacity } from "@/lib/adaptive/recoveryCapacity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeloadRecommendation {
  needed:     boolean;
  confidence: number;   // 0–1
  rationale:  string;
}

export interface DeloadInput {
  recentLog:         LoggedWorkout[];          // last 14 days
  recentFeedback:    WorkoutFeedback[];        // last 14 days
  recentSymptoms:    SymptomEntry[];           // last 7 days
  exerciseSummaries: ExerciseProgressSummary[];
  readinessHistory:  ReadinessHistoryEntry[];  // last 14 days, newest first
  recoveryCapacity?: RecoveryCapacity;
}

// ─── Confidence from trigger count ───────────────────────────────────────────

const CONFIDENCE_BY_TRIGGERS: Record<number, number> = {
  0: 0,
  1: 0.55,
  2: 0.75,
  3: 0.90,
};

function confidenceFromCount(n: number): number {
  return CONFIDENCE_BY_TRIGGERS[Math.min(n, 3)] ?? 0.90;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectDeload(input: DeloadInput): DeloadRecommendation {
  const { recentLog, recentFeedback, recentSymptoms, exerciseSummaries, readinessHistory } = input;

  // Not enough data to make any call
  if (recentLog.length === 0 && recentFeedback.length === 0 && readinessHistory.length === 0) {
    return { needed: false, confidence: 0, rationale: "" };
  }

  const firedTriggers: string[] = [];

  // ── Trigger 1: High-fatigue session count ────────────────────────────────────
  // A session counts as high-fatigue when RPE ≥ 8 OR recovery is significant_fatigue.
  const highFatigueSessions = recentFeedback.filter(
    f => f.sessionRPE >= 8 || f.recoveryRating === "significant_fatigue"
  ).length;
  if (highFatigueSessions >= 4) {
    firedTriggers.push(`${highFatigueSessions} high-fatigue sessions in the last 2 weeks`);
  }

  // ── Trigger 2: Symptom spike ─────────────────────────────────────────────────
  // Sum of all symptom severities over last 7 days ≥ 12
  // e.g. 4 moderate (2×4=8) + 1 severe (3×1=3) = 11 → misses; 4 severe = 12 → fires
  const symptomBurden = recentSymptoms.reduce((s, e) => s + e.severity, 0);
  if (symptomBurden >= 12) {
    firedTriggers.push("elevated symptom burden this week");
  }

  // ── Trigger 3: Declining performance ─────────────────────────────────────────
  const decliningCount = exerciseSummaries.filter(s => s.trend === "declining").length;
  if (decliningCount >= 2) {
    firedTriggers.push(`${decliningCount} exercises showing declining performance`);
  }

  // ── Trigger 4: Sustained low readiness ───────────────────────────────────────
  // 5+ of last 7 readiness entries in the cautious/recover category
  const recentRdx = readinessHistory.slice(0, 7);
  const lowReadinessCount = recentRdx.filter(
    e => e.category === "cautious" || e.category === "recover"
  ).length;
  if (recentRdx.length >= 5 && lowReadinessCount >= 4) {
    firedTriggers.push("sustained low readiness over the past week");
  }

  const triggerCount      = firedTriggers.length;
  const capacityLevel     = input.recoveryCapacity?.level ?? "moderate";
  const capacityConfident = input.recoveryCapacity?.confidence !== "early";

  const triggerThreshold = (capacityLevel === "high" && capacityConfident) ? 2 : 1;
  const needed           = triggerCount >= triggerThreshold;

  const confidenceBoost = (capacityLevel === "low" && capacityConfident) ? 0.10 : 0;
  const confidence      = Math.min(1.0, confidenceFromCount(triggerCount) + confidenceBoost);

  if (!needed) {
    return { needed: false, confidence: 0, rationale: "" };
  }

  const rationale = firedTriggers.length === 1
    ? `Deload indicated: ${firedTriggers[0]}.`
    : `Deload indicated across ${firedTriggers.length} signals: ${firedTriggers.join("; ")}.`;

  return { needed, confidence, rationale };
}
