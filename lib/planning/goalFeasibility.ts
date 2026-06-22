// ─── lib/planning/goalFeasibility.ts ──────────────────────────────────────────
// Phase 38C — Goal Feasibility Analysis.
// Evaluates whether the current goal is realistic given velocity, consistency,
// and training maturity, and estimates a realistic adjusted timeline.
// Pure function — no storage, no React.

import type { GoalRoadmap } from "./goalRoadmap";
import type { TrainingMaturity } from "./trainingMaturity";
import type { GoalVelocity } from "@/lib/performance/goalVelocity";
import type { ConsistencyScore } from "@/lib/adherence/consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeasibilityDataMaturity = "early" | "growing" | "sufficient";

export interface LimitingFactor {
  factor:     string;
  severity:   "minor" | "moderate" | "significant";
  suggestion: string;
}

export interface GoalFeasibility {
  feasible:          boolean;
  confidence:        number;             // 0–100
  projectedTimeline: number;             // weeks (at current rate)
  limitingFactors:   LimitingFactor[];
  dataMaturity:      FeasibilityDataMaturity;
  message:           string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function dataMaturity(roadmap: GoalRoadmap, maturity: TrainingMaturity): FeasibilityDataMaturity {
  if (!roadmap.dataReady || maturity.daysTrainingAge < 28)   return "early";
  if (maturity.daysTrainingAge < 90 || maturity.score < 30)  return "growing";
  return "sufficient";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeGoalFeasibility(
  roadmap:     GoalRoadmap,
  consistency: ConsistencyScore,
  maturity:    TrainingMaturity,
  velocity:    GoalVelocity,
): GoalFeasibility {
  const dm = dataMaturity(roadmap, maturity);

  if (!roadmap.dataReady) {
    return {
      feasible:          true,
      confidence:        30,
      projectedTimeline: 52,
      limitingFactors:   [],
      dataMaturity:      "early",
      message:           "Track 4+ weeks of sessions to generate a feasibility analysis.",
    };
  }

  const limitingFactors: LimitingFactor[] = [];

  // ── Consistency check ─────────────────────────────────────────────────────
  const comp = consistency?.composite ?? 0;
  if (comp < 40) {
    limitingFactors.push({
      factor:     "Low consistency",
      severity:   "significant",
      suggestion: "Hit your target sessions per week consistently for 4 weeks before pushing intensity.",
    });
  } else if (comp < 60) {
    limitingFactors.push({
      factor:     "Inconsistent training schedule",
      severity:   "moderate",
      suggestion: "Aim for at least 3 consistent sessions per week to build sustainable momentum.",
    });
  }

  // ── Velocity check ────────────────────────────────────────────────────────
  const weeklyRate = velocity?.weeklyRatePercent ?? 0;
  if (weeklyRate < 0) {
    limitingFactors.push({
      factor:     "Declining performance trend",
      severity:   "significant",
      suggestion: "A planned deload week followed by a structured ramp-up can reverse a declining trend.",
    });
  } else if (weeklyRate === 0 && roadmap.completionPercent < 20) {
    limitingFactors.push({
      factor:     "No measurable progress yet",
      severity:   "moderate",
      suggestion: "Log performance data (weight × reps) in each session to enable velocity tracking.",
    });
  }

  // ── Maturity vs goal ambition ─────────────────────────────────────────────
  if (maturity.level === "beginner" && roadmap.estimatedWeeks <= 8) {
    limitingFactors.push({
      factor:     "Goal timeline very aggressive for current training age",
      severity:   "minor",
      suggestion: "Beginners progress quickly — but set expectations for 12–16 weeks, not 4–8.",
    });
  }

  // ── Confidence score ─────────────────────────────────────────────────────
  let confidence = 60;
  confidence += clamp((comp - 50) * 0.8, -20, 20);     // consistency ±20
  confidence += clamp(weeklyRate * 5, -15, 15);          // velocity ±15
  confidence += maturity.level === "intermediate" ? 5
    : maturity.level === "advanced" ? 10
    : maturity.level === "beginner" ? -10
    : 0;
  confidence -= limitingFactors.filter(f => f.severity === "significant").length * 15;
  confidence -= limitingFactors.filter(f => f.severity === "moderate").length * 8;
  confidence  = clamp(Math.round(confidence), 5, 95);

  const projectedTimeline = velocity?.etaWeeks ?? roadmap.estimatedWeeks;
  const feasible = weeklyRate >= 0 && comp >= 30;

  const message =
    !feasible
      ? "At the current rate, the goal is not on track. Address the limiting factors below."
      : confidence >= 70
        ? "Your goal is well within reach at the current rate."
        : confidence >= 50
          ? "Goal is achievable but will require consistent effort — watch the limiting factors."
          : "Goal is possible but challenging. Improving consistency and tracking will help.";

  return { feasible, confidence, projectedTimeline, limitingFactors, dataMaturity: dm, message };
}
