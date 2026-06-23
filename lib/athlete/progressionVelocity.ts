// ─── lib/athlete/progressionVelocity.ts ──────────────────────────────────────
// 47D — Progression Velocity
// Classifies the user as fast / average / slow responder based on how quickly
// their capacity and readiness improve relative to training volume.
// Uses Phase 44 capacity history and Phase 21 recovery data.

import { getCapacityHistory } from "@/lib/unified/capacityScore";
import type { GoalVelocity }  from "@/lib/performance/goalVelocity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResponseClass = "fast_responder" | "average_responder" | "slow_responder";

export interface ProgressionVelocity {
  responseClass:      ResponseClass;
  capacityGainPerWeek: number;       // avg weekly capacity pts gained
  adaptationPeriod:   "short" | "standard" | "extended";
  label:              string;
  implication:        string;
  dataReady:          boolean;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeProgressionVelocity(
  velocity: GoalVelocity,
): ProgressionVelocity {
  const history = getCapacityHistory(90);
  const EMPTY: ProgressionVelocity = {
    responseClass: "average_responder", capacityGainPerWeek: 0,
    adaptationPeriod: "standard", label: "Average responder",
    implication: "Standard periodisation will work well.",
    dataReady: false,
  };

  if (history.length < 14) return EMPTY;

  // Split into first half and second half to measure capacity trajectory
  const mid   = Math.floor(history.length / 2);
  const older = history.slice(mid);
  const newer = history.slice(0, mid);

  const avgOlder = older.reduce((s, e) => s + e.score, 0) / older.length;
  const avgNewer = newer.reduce((s, e) => s + e.score, 0) / newer.length;
  const deltaOverPeriod = avgNewer - avgOlder;
  const weeksSpanned    = Math.max(1, history.length / 7);
  const capacityGainPerWeek = Math.round((deltaOverPeriod / weeksSpanned) * 10) / 10;

  // Blend with goal velocity for a more complete picture
  const blendedWeekly = (capacityGainPerWeek + velocity.weeklyRatePercent) / 2;

  const responseClass: ResponseClass =
    blendedWeekly >= 1.5 ? "fast_responder"
    : blendedWeekly >= 0.3 ? "average_responder"
    : "slow_responder";

  const adaptationPeriod: "short" | "standard" | "extended" =
    responseClass === "fast_responder" ? "short"
    : responseClass === "slow_responder" ? "extended"
    : "standard";

  const LABEL: Record<ResponseClass, string> = {
    fast_responder:    "Fast responder",
    average_responder: "Average responder",
    slow_responder:    "Slow responder",
  };

  const IMPL: Record<ResponseClass, string> = {
    fast_responder:    "Your body adapts quickly — progressive overload every 1–2 weeks.",
    average_responder: "Standard 3–4 week mesocycles optimise your adaptations.",
    slow_responder:    "Your body takes longer to adapt — longer blocks and patience pay off.",
  };

  return {
    responseClass, capacityGainPerWeek, adaptationPeriod,
    label:      LABEL[responseClass],
    implication: IMPL[responseClass],
    dataReady: true,
  };
}
