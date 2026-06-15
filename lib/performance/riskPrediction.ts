// ─── lib/performance/riskPrediction.ts ───────────────────────────────────────
// Consolidates four training risks into a unified output: overreaching,
// recovery, symptom flare, and training disruption.
// Pure function — all inputs passed in.

import type { RecoveryDebt }             from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }              from "@/lib/recovery/burnoutRisk";
import type { RecoveryTrend }            from "@/lib/recovery/recoveryTrend";
import type { SymptomEscalationEntry }   from "@/lib/recovery/symptomEscalation";
import type { ForecastEvent }            from "@/lib/forecasting/forecastSymptoms";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high";

export interface RiskSignal {
  level:  RiskLevel;
  reason: string;
}

export interface TrainingRisk {
  overreachingRisk: RiskSignal;
  recoveryRisk:     RiskSignal;
  symptomFlareRisk: RiskSignal;
  disruptionRisk:   RiskSignal;
  topRisk:          { name: string } & RiskSignal | null;  // highest severity risk
}

// ─── Signal functions ─────────────────────────────────────────────────────────

function overreachingRisk(
  debt:    RecoveryDebt,
  burnout: BurnoutRisk,
  trend:   RecoveryTrend,
): RiskSignal {
  if (burnout.level === "severe" || (burnout.level === "high" && debt.category !== "low")) {
    return { level: "high",     reason: "High burnout + elevated debt indicate overreaching risk." };
  }
  if (debt.trend === "accumulating" && debt.daysElevated >= 3) {
    return { level: "moderate", reason: "Debt accumulating for 3+ days — reduce load soon." };
  }
  if (trend.slope7d < -3 && debt.category !== "low") {
    return { level: "moderate", reason: "Declining readiness trend with elevated debt." };
  }
  return { level: "low", reason: "Current load appears sustainable." };
}

function recoveryRisk(
  debt:    RecoveryDebt,
  burnout: BurnoutRisk,
): RiskSignal {
  if (debt.category === "critical" || (debt.category === "high" && burnout.level !== "low")) {
    return { level: "high",     reason: `${debt.daysElevated} days of elevated debt — recovery is compromised.` };
  }
  if (debt.category === "elevated" || debt.trend === "accumulating") {
    return { level: "moderate", reason: "Recovery deficit building — monitor closely." };
  }
  return { level: "low", reason: "Recovery demand appears manageable." };
}

function symptomFlareRisk(
  escalations: SymptomEscalationEntry[],
  events:      ForecastEvent[],
  phaseName:   string,
): RiskSignal {
  const escalating   = escalations.filter(e => e.status === "escalating");
  const imminentHigh = events.filter(e => e.daysUntilStart <= 2 && e.expectedSeverity >= 2);

  if (escalating.length >= 2 || imminentHigh.length >= 2) {
    return {
      level:  "high",
      reason: escalating.length >= 2
        ? `${escalating.length} symptoms trending worse cycle-over-cycle.`
        : `${imminentHigh.length} high-severity symptoms expected within 2 days.`,
    };
  }
  if (escalating.length === 1 || imminentHigh.length === 1 ||
      (phaseName === "Late Luteal" && events.length >= 1)) {
    return { level: "moderate", reason: "Some symptoms may increase — stay attentive." };
  }
  return { level: "low", reason: "No significant symptom flares expected." };
}

function disruptionRisk(
  phaseName:   string,
  debt:        RecoveryDebt,
  escalations: SymptomEscalationEntry[],
): RiskSignal {
  const hasLateLuteal   = phaseName === "Late Luteal" || phaseName === "Menstrual";
  const highDebt        = debt.category === "high" || debt.category === "critical";
  const escalatingCount = escalations.filter(e => e.status === "escalating").length;

  if (hasLateLuteal && highDebt && escalatingCount >= 1) {
    return { level: "high",     reason: "Phase + debt + symptoms create high disruption risk." };
  }
  if ((hasLateLuteal && highDebt) || (hasLateLuteal && escalatingCount >= 2)) {
    return { level: "moderate", reason: "Cycle phase and current load may disrupt training quality." };
  }
  if (highDebt || (hasLateLuteal && escalatingCount >= 1)) {
    return { level: "moderate", reason: "Minor disruption risk — maintain current plan but stay flexible." };
  }
  return { level: "low", reason: "Training plan looks stable." };
}

const RISK_ORDER: RiskLevel[] = ["high", "moderate", "low"];
const RISK_NAMES = {
  overreachingRisk: "Overreaching risk",
  recoveryRisk:     "Recovery risk",
  symptomFlareRisk: "Symptom flare risk",
  disruptionRisk:   "Training disruption risk",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeRiskPrediction(
  debt:        RecoveryDebt,
  burnout:     BurnoutRisk,
  trend:       RecoveryTrend,
  escalations: SymptomEscalationEntry[],
  phaseName:   string,
  events:      ForecastEvent[],
): TrainingRisk {
  const risks = {
    overreachingRisk: overreachingRisk(debt, burnout, trend),
    recoveryRisk:     recoveryRisk(debt, burnout),
    symptomFlareRisk: symptomFlareRisk(escalations, events, phaseName),
    disruptionRisk:   disruptionRisk(phaseName, debt, escalations),
  };

  // Find the highest severity risk
  let topRisk: TrainingRisk["topRisk"] = null;
  for (const level of RISK_ORDER) {
    const entry = (Object.entries(risks) as [keyof typeof RISK_NAMES, RiskSignal][])
      .find(([, v]) => v.level === level);
    if (entry) {
      topRisk = { name: RISK_NAMES[entry[0]], ...entry[1] };
      break;
    }
  }

  return { ...risks, topRisk };
}
