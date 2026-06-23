// ─── lib/adherence/adherenceRiskForecast.ts ──────────────────────────────────
// 46C — Adherence Risk Forecast
// Predicts likelihood of MISSING THE NEXT workout based on current conditions
// vs the user's personal miss profile. Different from Phase 35's riskDetection.ts
// (which looks at multi-week disengagement). This is next-session prediction.

import type { MissedWorkoutAnalysis } from "./missedWorkoutAnalysis";
import type { AdherencePatternReport } from "./patternEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NextWorkoutRisk = "low" | "moderate" | "high";

export interface AdherenceRiskForecast {
  risk:               NextWorkoutRisk;
  riskScore:          number;         // 0–100
  reasons:            string[];
  protectiveFactors:  string[];
  recommendedAction:  "proceed" | "simplify" | "rescue";
  dataReady:          boolean;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function forecastAdherenceRisk(
  currentReadiness:    number,           // 0–100
  currentEnergyLevel:  number,           // 0–4
  currentWeekday:      number,           // 0–6
  currentCyclePhase:   string,
  recentMisses:        number,           // consecutive recent misses (last 7 days)
  missAnalysis:        MissedWorkoutAnalysis,
  patterns:            AdherencePatternReport,
): AdherenceRiskForecast {
  if (!missAnalysis.dataReady && !patterns.dataReady) {
    return {
      risk: "low", riskScore: 25, reasons: [],
      protectiveFactors: ["Insufficient history — defaulting to low risk."],
      recommendedAction: "proceed", dataReady: false,
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const protective: string[] = [];

  // ── Readiness signal ──────────────────────────────────────────────────────
  const missAvgReadiness = missAnalysis.missConditions?.avgReadiness ?? 55;
  const hitAvgReadiness  = missAnalysis.hitConditions?.avgReadiness ?? 70;

  if (currentReadiness < missAvgReadiness) {
    score += 30;
    reasons.push(`Readiness (${currentReadiness}) is below your typical miss-day average (${missAvgReadiness})`);
  } else if (currentReadiness >= hitAvgReadiness) {
    score -= 15;
    protective.push(`Readiness (${currentReadiness}) matches your typical completion-day average`);
  } else if (currentReadiness < 50) {
    score += 15;
    reasons.push(`Low readiness (${currentReadiness})`);
  }

  // ── Energy signal ─────────────────────────────────────────────────────────
  const missAvgEnergy = missAnalysis.missConditions?.avgEnergyLevel ?? 1.5;
  if (currentEnergyLevel <= missAvgEnergy) {
    score += 20;
    reasons.push(`Energy level (${currentEnergyLevel}/4) is at or below miss-day average`);
  } else if (currentEnergyLevel >= 3) {
    score -= 10;
    protective.push("High energy today");
  }

  // ── Weekday risk ──────────────────────────────────────────────────────────
  const worstWeekdayPattern = patterns.weekdayPatterns.find(
    p => p.completionRate === Math.min(...patterns.weekdayPatterns.map(x => x.completionRate)),
  );
  if (worstWeekdayPattern && worstWeekdayPattern.weekday === currentWeekday) {
    score += 15;
    reasons.push(`${worstWeekdayPattern.label}s are your lowest-completion day (${Math.round(worstWeekdayPattern.completionRate * 100)}%)`);
  }
  const bestWeekdayPattern = patterns.weekdayPatterns.find(
    p => p.completionRate === Math.max(...patterns.weekdayPatterns.map(x => x.completionRate)),
  );
  if (bestWeekdayPattern && bestWeekdayPattern.weekday === currentWeekday) {
    score -= 10;
    protective.push(`${bestWeekdayPattern.label}s are your highest-completion day`);
  }

  // ── Phase risk ────────────────────────────────────────────────────────────
  const missPhase = missAnalysis.missConditions?.mostCommonCyclePhase;
  if (missPhase && currentCyclePhase === missPhase) {
    score += 15;
    reasons.push(`${currentCyclePhase} is your most common miss phase`);
  }

  // ── Recent skip streak ────────────────────────────────────────────────────
  if (recentMisses >= 2) {
    score += recentMisses * 8;
    reasons.push(`${recentMisses} consecutive skips recently`);
  }

  score = Math.max(0, Math.min(100, score));

  const risk: NextWorkoutRisk =
    score >= 60 ? "high"
    : score >= 35 ? "moderate"
    : "low";

  const recommendedAction =
    risk === "high" ? "rescue"
    : risk === "moderate" ? "simplify"
    : "proceed";

  return {
    risk, riskScore: score,
    reasons, protectiveFactors: protective,
    recommendedAction, dataReady: true,
  };
}
