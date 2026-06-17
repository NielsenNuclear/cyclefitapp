// ─── lib/recovery/fatiguePrediction.ts ────────────────────────────────────────
// 3-day and 7-day fatigue risk prediction.
// Extends recoveryForecast.ts (4-day) to a 7-day horizon and adds per-horizon
// confidence levels and named risk tiers.
// Pure function — all inputs passed in; no localStorage reads.

import type { RecoveryDebt }  from "./recoveryDebt";
import type { BurnoutRisk }   from "./burnoutRisk";
import type { RecoveryTrend } from "./recoveryTrend";
import type { FatigueEntry }  from "./fatigueHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FatigueRiskLevel = "low" | "moderate" | "high" | "critical";
export type PredictionConfidence = "insufficient_data" | "low" | "moderate" | "high";

export interface FatigueHorizon {
  days:        number;             // 3 or 7
  riskScore:   number;             // 0–100
  riskLevel:   FatigueRiskLevel;
  confidence:  PredictionConfidence;
  reasons:     string[];
  guidance:    string;
}

export interface FatiguePrediction {
  day3:             FatigueHorizon;
  day7:             FatigueHorizon;
  currentLoad:      "low" | "moderate" | "high";
  trendDirection:   "improving" | "stable" | "deteriorating";
  hasEnoughData:    boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ENTRIES_FOR_PREDICTION = 3;

// ─── Risk scoring ─────────────────────────────────────────────────────────────

function riskLevelFromScore(score: number): FatigueRiskLevel {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

function confidenceFromData(entryCount: number, horizon: number): PredictionConfidence {
  if (entryCount < MIN_ENTRIES_FOR_PREDICTION) return "insufficient_data";
  // Longer horizon = less certain; more data = more certain
  const base = entryCount >= 14 ? 2 : entryCount >= 7 ? 1 : 0;
  const horizonPenalty = horizon >= 7 ? 1 : 0;
  const tier = base - horizonPenalty;
  return (["low", "moderate", "high"] as const)[Math.max(0, tier)];
}

// ─── Core computation ─────────────────────────────────────────────────────────

function computeBaseRisk(
  debt:    RecoveryDebt,
  burnout: BurnoutRisk,
  trend:   RecoveryTrend,
): { risk: number; reasons: string[] } {
  const reasons: string[] = [];
  let risk = 10; // baseline

  if      (debt.category === "critical") { risk += 45; reasons.push(`Critical recovery debt (score ${debt.debtScore})`); }
  else if (debt.category === "high")     { risk += 30; reasons.push(`High recovery debt (score ${debt.debtScore})`); }
  else if (debt.category === "elevated") { risk += 18; reasons.push("Elevated recovery debt"); }
  else if (debt.category === "moderate") { risk +=  8; }

  if (debt.trend === "accumulating")     { risk += 15; reasons.push("Debt accumulating daily"); }
  else if (debt.trend === "reducing")    { risk -=  8; }

  if (debt.daysElevated >= 5) { risk += 12; reasons.push(`${debt.daysElevated} consecutive days elevated`); }
  else if (debt.daysElevated >= 3) { risk += 6; }

  if      (burnout.level === "severe")   { risk += 20; reasons.push("Severe burnout indicators"); }
  else if (burnout.level === "high")     { risk += 12; reasons.push("High burnout risk"); }
  else if (burnout.level === "moderate") { risk +=  5; }

  if (trend.slope7d < -3)  { risk += 10; reasons.push("Declining readiness over past 7 days"); }
  else if (trend.slope7d > 2) { risk -= 5; }

  return { risk: Math.min(100, Math.max(0, risk)), reasons };
}

function buildHorizon(
  baseRisk:   number,
  baseReasons: string[],
  days:       number,
  recentEntries: FatigueEntry[],
  entryCount: number,
): FatigueHorizon {
  let risk = baseRisk;
  const reasons = [...baseReasons];

  // 7-day horizon: sustained load compounds the risk
  if (days === 7) {
    const recentLoad = recentEntries.slice(0, 5).filter(e => e.trainingLoad > 0).length;
    if (recentLoad >= 4) {
      risk += 10;
      reasons.push(`${recentLoad} of last 5 days included training`);
    }
    // Regression to mean — extreme predictions soften over longer horizons
    risk = Math.round(risk * 0.90 + 10 * 0.10);
  }

  risk = Math.min(100, Math.max(0, Math.round(risk)));
  const riskLevel = riskLevelFromScore(risk);

  const guidance =
    riskLevel === "critical" ? "Immediate rest priority — skip or significantly reduce this week's training." :
    riskLevel === "high"     ? "Add a recovery day in the next 2–3 days and reduce session intensity." :
    riskLevel === "moderate" ? "Stay conservative with load — one lighter session would be beneficial." :
    "Current trajectory looks manageable. Maintain sleep and nutrition consistency.";

  return {
    days,
    riskScore:  risk,
    riskLevel,
    confidence: confidenceFromData(entryCount, days),
    reasons,
    guidance,
  };
}

// ─── Current load classification ──────────────────────────────────────────────

function classifyLoad(entries: FatigueEntry[]): "low" | "moderate" | "high" {
  const recent = entries.slice(0, 7);
  if (recent.length === 0) return "low";
  const avgLoad = recent.reduce((s, e) => s + e.trainingLoad, 0) / recent.length;
  if (avgLoad >= 4) return "high";
  if (avgLoad >= 2) return "moderate";
  return "low";
}

function classifyTrend(trend: RecoveryTrend): "improving" | "stable" | "deteriorating" {
  if (trend.slope7d < -1) return "deteriorating";
  if (trend.slope7d >  1) return "improving";
  return "stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function predictFatigue(
  debt:           RecoveryDebt,
  burnout:        BurnoutRisk,
  trend:          RecoveryTrend,
  recentEntries:  FatigueEntry[],   // from getFatigueHistory()
): FatiguePrediction {
  const entryCount     = recentEntries.length;
  const hasEnoughData  = entryCount >= MIN_ENTRIES_FOR_PREDICTION;
  const currentLoad    = classifyLoad(recentEntries);
  const trendDirection = classifyTrend(trend);

  if (!hasEnoughData) {
    const emptyHorizon = (days: number): FatigueHorizon => ({
      days,
      riskScore:  0,
      riskLevel:  "low",
      confidence: "insufficient_data",
      reasons:    [],
      guidance:   `Log ${MIN_ENTRIES_FOR_PREDICTION - entryCount} more check-ins to enable fatigue prediction.`,
    });
    return {
      day3: emptyHorizon(3),
      day7: emptyHorizon(7),
      currentLoad,
      trendDirection,
      hasEnoughData: false,
    };
  }

  const { risk: baseRisk, reasons: baseReasons } = computeBaseRisk(debt, burnout, trend);

  return {
    day3:          buildHorizon(baseRisk, baseReasons, 3, recentEntries, entryCount),
    day7:          buildHorizon(baseRisk, baseReasons, 7, recentEntries, entryCount),
    currentLoad,
    trendDirection,
    hasEnoughData: true,
  };
}
