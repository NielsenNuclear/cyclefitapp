// ─── lib/adherence/workoutRecovery.ts ────────────────────────────────────────
// Phase 35F — Missed Workout Recovery Logic.
// When a workout is skipped, Axis decides what to do with that session.
// Decision is based on fatigue, readiness, goal, and cycle phase.

import type { RecoveryDebt } from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }  from "@/lib/recovery/burnoutRisk";
import type { DeloadRecommendation } from "@/lib/recovery/deloadDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryDecision = "move_forward" | "merge_next" | "drop" | "convert_recovery";

export interface WorkoutRecoveryPlan {
  decision:       RecoveryDecision;
  rationale:      string;
  adjustedNote:   string;     // shown in the UI after a skip is detected
}

// ─── Decision table ───────────────────────────────────────────────────────────

export function decideMissedWorkout(
  readinessScore: number,          // 0–100
  recoveryDebt:   RecoveryDebt,
  burnoutRisk:    BurnoutRisk,
  deloadRec:      DeloadRecommendation,
  cyclePhaseName: string,
): WorkoutRecoveryPlan {
  const highDebt    = recoveryDebt.debtScore > 55;
  const highBurnout = burnoutRisk.score > 60;
  const deloadNow   = deloadRec.needed;
  const highPhaseRisk = cyclePhaseName === "Late Luteal" || cyclePhaseName === "Menstrual";

  // Deload or severe burnout → convert to recovery
  if (deloadNow || (highBurnout && readinessScore < 45)) {
    return {
      decision:     "convert_recovery",
      rationale:    "Your body needs a recovery day more than a training session right now.",
      adjustedNote: "Skipped session converted to active recovery. Focus on sleep, movement, and nourishment today.",
    };
  }

  // Very low readiness + high debt → drop the session
  if (readinessScore < 40 && highDebt) {
    return {
      decision:     "drop",
      rationale:    "Low readiness combined with accumulated fatigue — adding more load would increase injury risk.",
      adjustedNote: "Session dropped. Your next scheduled workout stands — just show up rested.",
    };
  }

  // High-risk phase + moderate debt → drop
  if (highPhaseRisk && highDebt) {
    return {
      decision:     "drop",
      rationale:    `${cyclePhaseName} phase with high recovery debt — honouring this skip rather than making it up.`,
      adjustedNote: "Session dropped for this cycle phase. Your body will respond better to the next session.",
    };
  }

  // Good readiness (≥65) → move forward
  if (readinessScore >= 65 && !highDebt) {
    return {
      decision:     "move_forward",
      rationale:    "Readiness is solid — you can pick up exactly where you left off tomorrow.",
      adjustedNote: "Missed session noted. Training moves forward as scheduled — no change needed.",
    };
  }

  // Moderate readiness → merge into next session (reduce volume by a third)
  return {
    decision:     "merge_next",
    rationale:    "Moderate readiness — tomorrow's session will absorb the key work from today's missed session.",
    adjustedNote: "One important exercise from today's session will be folded into tomorrow's workout.",
  };
}
