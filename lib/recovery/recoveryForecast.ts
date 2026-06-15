// ─── lib/recovery/recoveryForecast.ts ────────────────────────────────────────
// Predicts fatigue risk over the next 4 days from recovery debt, trend, and
// burnout signals. Outputs a probability and estimated days until risk onset.
// Pure function — all inputs passed in; no localStorage reads.

import type { RecoveryDebt }  from "./recoveryDebt";
import type { BurnoutRisk }   from "./burnoutRisk";
import type { RecoveryTrend } from "./recoveryTrend";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryForecast {
  fatigueProbability: number;        // 0–100
  daysUntilRisk:      number | null; // null = risk already present or not expected in 4 days
  forecastHorizon:    4;
  drivingFactors:     string[];
  recommendation:     string;
  confidence:         "low" | "moderate" | "high";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeRecoveryForecast(
  debt:    RecoveryDebt,
  burnout: BurnoutRisk,
  trend:   RecoveryTrend,
): RecoveryForecast {
  const factors: string[] = [];
  let risk = 15; // baseline — some variability always exists

  // ── Recovery debt ─────────────────────────────────────────────────────────
  if      (debt.category === "critical") { risk += 45; factors.push(`Critical recovery debt (${debt.debtScore})`); }
  else if (debt.category === "high")     { risk += 35; factors.push(`High recovery debt (${debt.debtScore})`); }
  else if (debt.category === "elevated") { risk += 20; factors.push("Elevated recovery debt"); }
  else if (debt.category === "moderate") { risk +=  8; }

  // ── Debt trajectory ──────────────────────────────────────────────────────
  if      (debt.trend === "accumulating") { risk += 18; factors.push("Debt accumulating daily"); }
  else if (debt.trend === "reducing")     { risk -=  8; }

  // ── Days elevated ────────────────────────────────────────────────────────
  if (debt.daysElevated >= 5) {
    risk += 12; factors.push(`${debt.daysElevated} days of sustained elevated debt`);
  } else if (debt.daysElevated >= 3) {
    risk += 6;
  }

  // ── Burnout risk ─────────────────────────────────────────────────────────
  if      (burnout.level === "severe")   { risk += 20; factors.push("Severe burnout indicators"); }
  else if (burnout.level === "high")     { risk += 12; factors.push("High burnout risk"); }
  else if (burnout.level === "moderate") { risk +=  5; }

  // ── 7-day readiness slope ─────────────────────────────────────────────────
  if (trend.slope7d < -3) {
    risk += 10; factors.push("Declining readiness over past 7 days");
  } else if (trend.slope7d > 2) {
    risk -= 5;
  }

  risk = Math.min(100, Math.max(0, Math.round(risk)));

  // ── Days until risk ───────────────────────────────────────────────────────
  let daysUntilRisk: number | null;
  if (debt.category === "critical" || (debt.category === "high" && burnout.level !== "low")) {
    daysUntilRisk = null; // already at risk
  } else if (risk >= 70 && debt.trend === "accumulating") {
    daysUntilRisk = 1;
  } else if (risk >= 55) {
    daysUntilRisk = 2;
  } else if (risk >= 40) {
    daysUntilRisk = 4;
  } else {
    daysUntilRisk = null; // no imminent risk in the 4-day window
  }

  // ── Recommendation ────────────────────────────────────────────────────────
  const recommendation =
    risk >= 70 ? "Prioritise recovery now — sleep, nutrition, and a significant reduction in training load." :
    risk >= 50 ? "Reduce training intensity and add an extra rest day in the next 2–3 days." :
    risk >= 35 ? "Monitor load carefully — one lighter day this week would help prevent accumulation." :
    "Recovery looks manageable at current load. Stay consistent with sleep and nutrition.";

  // ── Confidence ────────────────────────────────────────────────────────────
  const confidence: RecoveryForecast["confidence"] =
    trend.dataPoints >= 14 ? "high" :
    trend.dataPoints >= 7  ? "moderate" :
    "low";

  return {
    fatigueProbability: risk,
    daysUntilRisk,
    forecastHorizon: 4,
    drivingFactors:  factors,
    recommendation,
    confidence,
  };
}
