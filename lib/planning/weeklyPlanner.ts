// ─── lib/planning/weeklyPlanner.ts ────────────────────────────────────────────
// Derives a weekly training plan from current readiness, compliance, and phase.
// Pure function — callers pass data in; no localStorage reads here.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { PhaseData } from "@/types/recommendation";
import type { RecoveryCapacity } from "@/lib/adaptive/recoveryCapacity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyPlanInput {
  sessionsPerWeek:  number;
  readinessHistory: ReadinessHistoryEntry[];  // last 7 days
  recentFeedback:   WorkoutFeedback[];        // last 14 days
  recentHistory:    WorkoutHistoryEntry[];    // last 14 days
  recentSymptoms:   SymptomEntry[];           // last 7 days
  currentPhase:     PhaseData;
  recoveryCapacity?: RecoveryCapacity;
}

export interface WeeklyPlan {
  weekStart:        string;                           // ISO date — Monday of current week
  targetSessions:   number;
  targetVolume:     number;                           // total working sets planned
  recoveryDays:     number;                           // 7 - targetSessions
  plannedIntensity: "low" | "moderate" | "high";
  rationale:        string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function meanOf(values: number[]): number {
  if (values.length === 0) return -1;  // sentinel: insufficient data
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function currentMondayISO(): string {
  const now  = new Date();
  const day  = now.getDay();                  // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;     // steps back to most recent Monday
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

const SETS_PER_SESSION: Record<WeeklyPlan["plannedIntensity"], number> = {
  high:     18,
  moderate: 14,
  low:      10,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeWeeklyPlan(input: WeeklyPlanInput): WeeklyPlan {
  const {
    sessionsPerWeek,
    readinessHistory,
    recentFeedback,
    recentHistory,
    recentSymptoms,
    currentPhase,
    recoveryCapacity,
  } = input;

  const baseline = Math.max(1, sessionsPerWeek);

  // ── Signal: mean readiness ───────────────────────────────────────────────────
  const meanReadiness = meanOf(readinessHistory.map(e => e.score));

  // ── Signal: compliance ───────────────────────────────────────────────────────
  const nonPending = recentHistory.filter(e => e.status !== "pending");
  const completed  = nonPending.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  ).length;
  const completionRate = nonPending.length >= 2
    ? completed / nonPending.length
    : 1;  // not enough history → assume on track

  // ── Signal: session RPE ──────────────────────────────────────────────────────
  const meanRPE = meanOf(recentFeedback.map(f => f.sessionRPE));

  // ── Signal: symptom burden ───────────────────────────────────────────────────
  const symptomBurden = recentSymptoms.reduce((s, e) => s + e.severity, 0);

  // ── Session modifier ─────────────────────────────────────────────────────────
  let modifier = 0;
  const rationaleSignals: string[] = [];

  if (meanReadiness !== -1 && meanReadiness < 40) {
    modifier -= 1;
    rationaleSignals.push("low readiness this week");
  }
  if (completionRate < 0.5) {
    modifier -= 1;
    rationaleSignals.push("completion below 50%");
  }
  if (meanRPE !== -1 && meanRPE >= 8.5) {
    modifier -= 1;
    rationaleSignals.push("sessions feeling very hard");
  }
  if (symptomBurden >= 10) {
    modifier -= 1;
    rationaleSignals.push("elevated symptom load");
  }

  // Late Luteal: protect even without other fatigue signals
  if (currentPhase.name === "Late Luteal" && modifier === 0) {
    modifier -= 1;
    rationaleSignals.push("pre-menstrual phase");
  }

  const capacityLevel     = recoveryCapacity?.level;
  const capacityConfident = recoveryCapacity?.confidence !== "early";

  // Low recovery capacity: additional downward pressure if not at floor
  if (capacityLevel === "low" && capacityConfident && modifier > -2) {
    modifier -= 1;
    rationaleSignals.push("low recovery capacity");
  }

  // Never reduce by more than 2 from baseline
  modifier = Math.max(-2, modifier);

  // Upward bump only when clearly thriving across all signals
  const thriving =
    meanReadiness >= 80 &&
    completionRate >= 1.0 &&
    (meanRPE === -1 || meanRPE < 7.0) &&
    symptomBurden < 5 &&
    currentPhase.name !== "Late Luteal";

  if (thriving) {
    modifier += 1;
    rationaleSignals.push("strong readiness and full compliance");
  }

  // High recovery capacity: allow +1 if no other signal has already bumped up
  if (capacityLevel === "high" && capacityConfident && modifier === 0 && !thriving) {
    modifier += 1;
    rationaleSignals.push("high recovery capacity");
  }

  const targetSessions = Math.max(1, Math.min(baseline + 1, baseline + modifier));

  // ── Planned intensity ────────────────────────────────────────────────────────
  let plannedIntensity: WeeklyPlan["plannedIntensity"];

  if (
    (meanReadiness !== -1 && meanReadiness < 40) ||
    (meanRPE !== -1 && meanRPE >= 8.5) ||
    symptomBurden >= 10 ||
    currentPhase.name === "Late Luteal"
  ) {
    plannedIntensity = "low";
  } else if (
    meanReadiness >= 75 &&
    (meanRPE === -1 || meanRPE < 7.0) &&
    symptomBurden < 5
  ) {
    plannedIntensity = "high";
  } else {
    plannedIntensity = "moderate";
  }

  // ── Volume ───────────────────────────────────────────────────────────────────
  const volumeScale  = (capacityLevel === "low"  && capacityConfident) ? 0.85
                     : (capacityLevel === "high" && capacityConfident) ? 1.10
                     : 1.0;
  const targetVolume = Math.round(targetSessions * SETS_PER_SESSION[plannedIntensity] * volumeScale);

  // ── Rationale text ───────────────────────────────────────────────────────────
  let rationale: string;
  if (rationaleSignals.length === 0) {
    rationale = `Holding at your ${baseline}-session baseline. All signals look good this week.`;
  } else if (modifier > 0) {
    rationale = `Bumped to ${targetSessions} session${targetSessions !== 1 ? "s" : ""} — ${rationaleSignals.join(" and ")}.`;
  } else {
    const reasons = rationaleSignals.join(", ");
    rationale = `Adjusted to ${targetSessions} session${targetSessions !== 1 ? "s" : ""} this week due to ${reasons}.`;
  }

  return {
    weekStart:       currentMondayISO(),
    targetSessions,
    targetVolume,
    recoveryDays:    7 - targetSessions,
    plannedIntensity,
    rationale,
  };
}
