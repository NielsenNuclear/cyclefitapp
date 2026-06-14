// ─── lib/recovery/healthTrendAnalysis.ts ─────────────────────────────────────
// Synthesises all four recovery signals into a unified HealthTrend with
// improving / stable / watch buckets for display and downstream planning.

import type { RecoveryTrend }         from "./recoveryTrend";
import type { RecoveryDebt }          from "./recoveryDebt";
import type { BurnoutRisk }           from "./burnoutRisk";
import type { SymptomEscalationEntry } from "./symptomEscalation";
import type { HealthTrend }           from "./recoveryTypes";

export type { HealthTrend };

// ─── Input ────────────────────────────────────────────────────────────────────

export interface HealthTrendInput {
  recoveryTrend:      RecoveryTrend | null;
  recoveryDebt:       RecoveryDebt | null;
  burnoutRisk:        BurnoutRisk | null;
  symptomEscalations: SymptomEscalationEntry[];
}

// ─── Signal classifiers ───────────────────────────────────────────────────────

type Bucket = "improving" | "stable" | "watch";
interface Signal { bucket: Bucket; label: string }

function classifyRecoveryTrend(trend: RecoveryTrend | null): Signal {
  if (!trend || trend.dataPoints < 3) {
    return { bucket: "stable", label: "Recovery scores — not enough data yet" };
  }

  const { status7d, status14d } = trend;

  if (status7d === "rapidly_declining" || status14d === "rapidly_declining") {
    return { bucket: "watch", label: "Recovery scores declining rapidly" };
  }
  if (status7d === "declining" || status14d === "declining") {
    return { bucket: "watch", label: "Recovery scores trending down" };
  }
  if (status7d === "improving" || status14d === "improving") {
    return { bucket: "improving", label: "Recovery scores improving" };
  }
  return { bucket: "stable", label: "Recovery scores stable" };
}

function classifyDebt(debt: RecoveryDebt | null): Signal {
  if (!debt) return { bucket: "stable", label: "Recovery debt within range" };

  const { category, trend, daysElevated } = debt;

  if (category === "critical") {
    return { bucket: "watch", label: `Recovery debt critical (${daysElevated} days elevated)` };
  }
  if (category === "high" && trend === "accumulating") {
    return { bucket: "watch", label: "Recovery debt high and still rising" };
  }
  if (category === "elevated" && trend === "accumulating") {
    return { bucket: "watch", label: "Recovery debt accumulating" };
  }
  if (trend === "reducing" && (category === "low" || category === "moderate")) {
    return { bucket: "improving", label: "Recovery debt clearing" };
  }
  if (trend === "reducing") {
    return { bucket: "improving", label: "Recovery debt reducing" };
  }
  return { bucket: "stable", label: "Recovery debt manageable" };
}

function classifyBurnoutRisk(risk: BurnoutRisk | null): Signal {
  if (!risk) return { bucket: "stable", label: "Recovery strain indicators normal" };

  const { level } = risk;

  if (level === "severe") {
    return { bucket: "watch", label: "Multiple elevated recovery strain indicators" };
  }
  if (level === "high") {
    return { bucket: "watch", label: "Elevated recovery strain indicators" };
  }
  if (level === "moderate") {
    return { bucket: "watch", label: "Moderate recovery strain — monitor trends" };
  }
  return { bucket: "stable", label: "Recovery strain indicators normal" };
}

function classifySymptomEscalations(escalations: SymptomEscalationEntry[]): Signal[] {
  const signals: Signal[] = [];

  for (const e of escalations) {
    if (e.status === "escalating") {
      signals.push({ bucket: "watch", label: `${e.symptomName} symptoms increasing across cycles` });
    } else if (e.status === "improving") {
      signals.push({ bucket: "improving", label: `${e.symptomName} symptoms improving across cycles` });
    }
    // stable → omitted; no value in listing every stable symptom
  }

  return signals;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Produces a three-bucket HealthTrend (improving / stable / watch) by
 * synthesising recovery score trend, debt trajectory, strain risk, and
 * per-symptom cycle escalation patterns.
 */
export function buildHealthTrend(input: HealthTrendInput): HealthTrend {
  const signals: Signal[] = [
    classifyRecoveryTrend(input.recoveryTrend),
    classifyDebt(input.recoveryDebt),
    classifyBurnoutRisk(input.burnoutRisk),
    ...classifySymptomEscalations(input.symptomEscalations),
  ];

  const trend: HealthTrend = { improving: [], stable: [], watch: [] };

  for (const s of signals) {
    trend[s.bucket].push(s.label);
  }

  return trend;
}
