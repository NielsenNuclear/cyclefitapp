// ─── lib/athlete/trainingAge.ts ───────────────────────────────────────────────
// 47A — Training Age Model
// Infers demonstrated training maturity from logged behavior — not from how long
// the user has had the app. A user who trains consistently for 6 months develops
// faster than one with 2 years of sporadic attendance.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { ConsistencyScore }    from "@/lib/adherence/consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingMaturity = "beginner" | "developing" | "intermediate" | "advanced" | "veteran";

export interface TrainingAge {
  maturity:              TrainingMaturity;
  totalSessionsLogged:   number;
  weeksActive:           number;
  estimatedAge:          string;        // e.g. "~6 months"
  volumeTolerance:       "low" | "moderate" | "high";
  recoveryCapacity:      "limited" | "moderate" | "robust";
  adaptationRate:        "slow" | "standard" | "fast";
  dataReady:             boolean;
  headline:              string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weeksActiveFromHistory(history: WorkoutHistoryEntry[]): number {
  if (history.length === 0) return 0;
  const dates  = history.map(e => e.id).sort();
  const oldest = new Date(dates[0] + "T12:00:00");
  const newest = new Date(dates[dates.length - 1] + "T12:00:00");
  return Math.max(1, Math.round((newest.getTime() - oldest.getTime()) / (7 * 24 * 3600 * 1000)));
}

function ageLabel(weeks: number): string {
  if (weeks < 4)   return "< 1 month";
  if (weeks < 13)  return `~${Math.round(weeks / 4)} months`;
  if (weeks < 52)  return `~${Math.round(weeks / 4.3)} months`;
  return `~${Math.round(weeks / 52)} year${weeks >= 104 ? "s" : ""}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeTrainingAge(
  history:          WorkoutHistoryEntry[],
  consistency:      ConsistencyScore | undefined,
): TrainingAge {
  const EMPTY: TrainingAge = {
    maturity: "beginner", totalSessionsLogged: 0, weeksActive: 0,
    estimatedAge: "< 1 month", volumeTolerance: "low", recoveryCapacity: "limited",
    adaptationRate: "standard", dataReady: false,
    headline: "Early stage — every session builds your foundation.",
  };

  const completed = history.filter(e => e.status === "completed" || e.status === "partially_completed");
  if (completed.length < 5) return EMPTY;

  const total       = completed.length;
  const weeksActive = weeksActiveFromHistory(history);
  const sessionsPerWeek = weeksActive > 0 ? total / weeksActive : 0;
  const consistencyPct  = consistency?.composite ?? 0;

  // Training age score: weighted composite of volume × consistency × time
  const ageScore =
    Math.min(total / 200, 1) * 40 +
    Math.min(weeksActive / 104, 1) * 30 +
    (consistencyPct / 100) * 30;

  const maturity: TrainingMaturity =
    ageScore >= 85 ? "veteran"
    : ageScore >= 65 ? "advanced"
    : ageScore >= 45 ? "intermediate"
    : ageScore >= 25 ? "developing"
    : "beginner";

  const volumeTolerance: "low" | "moderate" | "high" =
    maturity === "veteran" || maturity === "advanced" ? "high"
    : maturity === "intermediate" ? "moderate"
    : "low";

  const recoveryCapacity: "limited" | "moderate" | "robust" =
    maturity === "veteran" || maturity === "advanced" ? "robust"
    : maturity === "intermediate" ? "moderate"
    : "limited";

  const adaptationRate: "slow" | "standard" | "fast" =
    sessionsPerWeek >= 4 && consistencyPct >= 70 ? "fast"
    : sessionsPerWeek >= 2 ? "standard"
    : "slow";

  const HEADLINE: Record<TrainingMaturity, string> = {
    beginner:     "Building your foundation — keep sessions consistent.",
    developing:   "Training patterns are taking hold. Protect your routine.",
    intermediate: "Intermediate training age — ready for structured programming.",
    advanced:     "Advanced — your body handles high volumes with robust recovery.",
    veteran:      "Veteran athlete — sophisticated periodisation will yield the best results.",
  };

  return {
    maturity,
    totalSessionsLogged: total,
    weeksActive,
    estimatedAge:        ageLabel(weeksActive),
    volumeTolerance,
    recoveryCapacity,
    adaptationRate,
    dataReady:           true,
    headline:            HEADLINE[maturity],
  };
}
