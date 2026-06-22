// ─── lib/planning/annualForecast.ts ───────────────────────────────────────────
// Phase 38I — Annual Forecast.
// Projects strength, adherence, and recovery trajectories over the next 12 months.
// Pure function — no storage, no React.

import type { GoalRoadmap } from "./goalRoadmap";
import type { GoalFeasibility } from "./goalFeasibility";
import type { TrainingMaturity } from "./trainingMaturity";
import type { GoalVelocity } from "@/lib/performance/goalVelocity";
import type { ConsistencyScore } from "@/lib/adherence/consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectionPoint {
  month:       number;   // months from now (0 = current)
  value:       number;
  label:       string;
}

export type ForecastConfidence = "low" | "medium" | "high";
export type ForecastDataMaturity = "early" | "growing" | "sufficient";

export interface AnnualForecast {
  strengthProjection:        ProjectionPoint[];
  adherenceProjection:       ProjectionPoint[];
  goalCompletionProbability: number;    // 0–100
  confidence:                ForecastConfidence;
  dataMaturity:              ForecastDataMaturity;
  headline:                  string;
  etaMonths:                 number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildAnnualForecast(
  roadmap:     GoalRoadmap,
  feasibility: GoalFeasibility,
  velocity:    GoalVelocity,
  maturity:    TrainingMaturity,
  consistency: ConsistencyScore,
): AnnualForecast {
  const dataMaturity: ForecastDataMaturity =
    !roadmap.dataReady || maturity.daysTrainingAge < 28 ? "early"
    : maturity.daysTrainingAge < 90 ? "growing"
    : "sufficient";

  if (dataMaturity === "early") {
    return {
      strengthProjection:        [],
      adherenceProjection:       [],
      goalCompletionProbability: 0,
      confidence:                "low",
      dataMaturity,
      headline:                  "Log 4+ weeks of sessions to see your annual forecast.",
      etaMonths:                 null,
    };
  }

  const weeklyRate       = Math.max(0, velocity.weeklyRatePercent ?? 0);
  const monthlyRateDecimal = (weeklyRate / 100) * 4.3;   // weeks per month ≈ 4.3

  // ── Strength projection ───────────────────────────────────────────────────
  const strengthProjection: ProjectionPoint[] = [];
  const baseStrength = roadmap.currentValue;
  for (let m = 0; m <= 12; m++) {
    const value = Math.round(baseStrength * Math.pow(1 + monthlyRateDecimal, m) * 10) / 10;
    strengthProjection.push({
      month: m,
      value,
      label: m === 0 ? "Now" : `Month ${m}`,
    });
  }

  // ── Adherence projection ─────────────────────────────────────────────────
  const adherenceProjection: ProjectionPoint[] = [];
  const baseAdherence     = clamp(consistency?.composite ?? 50, 0, 100);
  const maturityBonus     = maturity.level === "advanced" ? 0.3
    : maturity.level === "intermediate" ? 0.5
    : 0.8;
  const monthlyAdherenceGain = Math.min(2, maturityBonus);   // max 2% per month growth

  for (let m = 0; m <= 12; m++) {
    const value = Math.min(95, Math.round(baseAdherence + monthlyAdherenceGain * m));
    adherenceProjection.push({
      month: m,
      value,
      label: m === 0 ? "Now" : `Month ${m}`,
    });
  }

  // ── Goal completion probability ───────────────────────────────────────────
  const feasibilityBase = feasibility.feasible ? feasibility.confidence : 20;
  const consistencyMod  = clamp((consistency?.composite ?? 50) / 100, 0.5, 1.0);
  const maturityMod     =
    maturity.level === "beginner"     ? 1.1   // beginners progress fastest
    : maturity.level === "developing" ? 1.0
    : maturity.level === "intermediate" ? 0.95
    : 0.90;

  const rawProb = feasibilityBase * consistencyMod * maturityMod;
  const goalCompletionProbability = clamp(Math.round(rawProb), 5, 95);

  // ── Confidence level ─────────────────────────────────────────────────────
  const confidence: ForecastConfidence =
    dataMaturity === "sufficient" && consistency?.composite >= 60 ? "high"
    : dataMaturity === "growing"                                   ? "medium"
    : "low";

  // ── ETA in months ─────────────────────────────────────────────────────────
  const etaWeeks  = velocity.etaWeeks;
  const etaMonths = etaWeeks !== null ? Math.round(etaWeeks / 4.3) : null;

  // ── Headline ─────────────────────────────────────────────────────────────
  const headline =
    goalCompletionProbability >= 75
      ? `${goalCompletionProbability}% chance of hitting your goal — you're on a strong trajectory.`
      : goalCompletionProbability >= 50
        ? `${goalCompletionProbability}% chance of hitting your goal. Consistent weeks will increase this.`
        : `${goalCompletionProbability}% chance — focus on the limiting factors in your feasibility report.`;

  return {
    strengthProjection,
    adherenceProjection,
    goalCompletionProbability,
    confidence,
    dataMaturity,
    headline,
    etaMonths,
  };
}
