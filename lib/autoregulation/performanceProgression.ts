// ─── lib/autoregulation/performanceProgression.ts ────────────────────────────
// Phase 37C — Real-time performance-based load adjustment.
// Reads the last 3 sessions of 1RM trend and emits an immediate
// progression recommendation: load up / maintain / reduce.
// Complements Phase 36H (goal velocity) which operates over 4-week windows.

import { getPerformanceDatabaseForExercise } from "@/lib/performance/performanceDatabase";
import { epley1RM } from "@/lib/performance/strengthEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressionAction = "load_up" | "maintain" | "reduce" | "insufficient_data";

export interface ExerciseProgressionRecommendation {
  exerciseName:      string;
  action:            ProgressionAction;
  loadDeltaPercent:  number;     // e.g. 2.5, 0, -5
  rationale:         string;
}

export interface PerformanceProgressionReport {
  recommendations:   ExerciseProgressionRecommendation[];
  overallAction:     ProgressionAction;
  summary:           string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMPROVE_THRESH = 0.02;   // +2% trend → load up
const REGRESS_THRESH = -0.03;  // -3% trend → reduce

function last3Trend(exerciseName: string): { trend: number; sessions: number } {
  const records = getPerformanceDatabaseForExercise(exerciseName)
    .filter(r => r.weight > 0 && r.actualReps > 0)
    .slice(0, 3);

  if (records.length < 2) return { trend: 0, sessions: records.length };

  const e1RMs = records.map(r => epley1RM(r.weight, r.actualReps));
  // Compare most recent vs oldest in the window (newest-first ordering)
  const oldest = e1RMs[e1RMs.length - 1];
  const newest = e1RMs[0];

  return {
    trend:    oldest > 0 ? (newest - oldest) / oldest : 0,
    sessions: records.length,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPerformanceProgressionReport(
  exerciseNames: string[],
): PerformanceProgressionReport {
  const recommendations: ExerciseProgressionRecommendation[] = [];

  for (const name of exerciseNames) {
    const { trend, sessions } = last3Trend(name);

    if (sessions < 2) {
      recommendations.push({
        exerciseName:    name,
        action:          "insufficient_data",
        loadDeltaPercent: 0,
        rationale:       "Need at least 2 weighted sessions to assess",
      });
      continue;
    }

    let action: ProgressionAction;
    let delta: number;
    let rationale: string;

    if (trend >= IMPROVE_THRESH) {
      action   = "load_up";
      delta    = 2.5;
      rationale = `3-session 1RM up ${(trend * 100).toFixed(1)}% — ready for load increase`;
    } else if (trend <= REGRESS_THRESH) {
      action   = "reduce";
      delta    = -5;
      rationale = `3-session 1RM down ${Math.abs(trend * 100).toFixed(1)}% — reduce load to rebuild`;
    } else {
      action   = "maintain";
      delta    = 0;
      rationale = "Performance stable — maintain current load, focus on quality";
    }

    recommendations.push({ exerciseName: name, action, loadDeltaPercent: delta, rationale });
  }

  const loadUp   = recommendations.filter(r => r.action === "load_up").length;
  const reduce   = recommendations.filter(r => r.action === "reduce").length;
  const actionable = recommendations.filter(r => r.action !== "insufficient_data").length;

  const overallAction: ProgressionAction =
    actionable === 0     ? "insufficient_data"
    : loadUp > reduce   ? "load_up"
    : reduce > loadUp   ? "reduce"
    : "maintain";

  const summary =
    overallAction === "load_up"          ? `${loadUp} exercise${loadUp > 1 ? "s" : ""} ready for progression`
    : overallAction === "reduce"         ? `${reduce} exercise${reduce > 1 ? "s" : ""} showing regression — load reduced`
    : overallAction === "maintain"       ? "Performance stable across all tracked exercises"
    : "Not enough data to assess progression";

  return { recommendations, overallAction, summary };
}
