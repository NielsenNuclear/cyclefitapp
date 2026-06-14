// ─── lib/recovery/recoveryPlanning.ts ────────────────────────────────────────
// Translates all upstream recovery signals into an actionable RecoveryPlan.
// Urgency is derived from a multi-signal point system; recommendations are
// ranked by impact and capped at 5 to avoid overwhelming the user.

import type { RecoveryScore }          from "./recoveryScore";
import type { RecoveryTrend }          from "./recoveryTrend";
import type { RecoveryDebt }           from "./recoveryDebt";
import type { BurnoutRisk }            from "./burnoutRisk";
import type { HealthTrend }            from "./healthTrendAnalysis";
import type { SymptomEscalationEntry } from "./symptomEscalation";
import type { RecoveryPlan, PlanUrgency } from "./recoveryTypes";

export type { RecoveryPlan };

// ─── Input ────────────────────────────────────────────────────────────────────

export interface RecoveryPlanInput {
  recoveryScore:      RecoveryScore | null;
  recoveryTrend:      RecoveryTrend | null;
  recoveryDebt:       RecoveryDebt | null;
  burnoutRisk:        BurnoutRisk | null;
  healthTrend:        HealthTrend | null;
  symptomEscalations: SymptomEscalationEntry[];
}

// ─── Urgency scoring ──────────────────────────────────────────────────────────

const MAX_RECS = 5;

function computeUrgencyPoints(input: RecoveryPlanInput): number {
  let pts = 0;

  // Burnout / strain level
  const bl = input.burnoutRisk?.level;
  if      (bl === "severe")   pts += 3;
  else if (bl === "high")     pts += 2;
  else if (bl === "moderate") pts += 1;

  // Recovery debt category
  const dc = input.recoveryDebt?.category;
  if      (dc === "critical") pts += 3;
  else if (dc === "high")     pts += 2;
  else if (dc === "elevated") pts += 1;

  // Recovery score
  const rs = input.recoveryScore?.score ?? 100;
  if      (rs < 35) pts += 3;  // Poor
  else if (rs < 50) pts += 2;  // Compromised
  else if (rs < 65) pts += 1;  // Moderate

  // Trend direction (7-day is most actionable)
  const t7 = input.recoveryTrend?.status7d;
  if      (t7 === "rapidly_declining") pts += 2;
  else if (t7 === "declining")         pts += 1;

  // Escalating symptoms (cap at 2 pts)
  const escalating = input.symptomEscalations.filter(e => e.status === "escalating").length;
  pts += Math.min(escalating, 2);

  return pts;
}

function toUrgency(pts: number): PlanUrgency {
  if (pts === 0) return "none";
  if (pts <= 2)  return "low";
  if (pts <= 4)  return "moderate";
  if (pts <= 6)  return "high";
  return "critical";
}

// ─── Recommendation builders ──────────────────────────────────────────────────

interface Rec { priority: number; text: string }

function collectRecs(input: RecoveryPlanInput, urgency: PlanUrgency): Rec[] {
  const recs: Rec[] = [];
  const bl = input.burnoutRisk?.level;
  const dc = input.recoveryDebt?.category;
  const dt = input.recoveryDebt?.trend;
  const rs = input.recoveryScore?.score ?? 100;
  const t7 = input.recoveryTrend?.status7d;

  // Training load / intensity
  if (urgency === "critical" || (bl === "severe" || bl === "high")) {
    recs.push({
      priority: 10,
      text: "Reduce training intensity by 30–40% and avoid adding new load for 7–10 days",
    });
  } else if (urgency === "high" || bl === "moderate") {
    recs.push({
      priority: 9,
      text: "Cut training volume by 20–25% this week and keep sessions below peak effort",
    });
  } else if (urgency === "moderate") {
    recs.push({
      priority: 8,
      text: "Keep this week's training load steady — avoid increasing volume or intensity",
    });
  }

  // Recovery debt
  if (dc === "critical" || dc === "high") {
    recs.push({
      priority: 9,
      text: "Prioritise sleep consistency and limit external stressors to clear accumulated recovery debt",
    });
  } else if (dc === "elevated" && dt === "accumulating") {
    recs.push({
      priority: 7,
      text: "Recovery debt is building — add at least one full rest day this week",
    });
  } else if (dc === "elevated") {
    recs.push({
      priority: 6,
      text: "Include active recovery sessions (light walking, stretching) to help clear recovery debt",
    });
  }

  // Score-driven rest
  if (rs < 35) {
    recs.push({
      priority: 10,
      text: "Take a full rest day today — current recovery indicators are too low for productive training",
    });
  } else if (rs < 50) {
    recs.push({
      priority: 8,
      text: "Opt for light movement over structured training until recovery scores improve",
    });
  }

  // Rapidly declining trend
  if (t7 === "rapidly_declining") {
    recs.push({
      priority: 8,
      text: "Recovery scores are dropping fast — avoid high-intensity sessions until the trend stabilises",
    });
  } else if (t7 === "declining") {
    recs.push({
      priority: 5,
      text: "Monitor recovery daily; avoid progressive overload until scores stabilise",
    });
  }

  // Sleep contributor
  const sleepContrib = input.recoveryScore?.contributors.find(
    c => c.factor.toLowerCase().includes("sleep") && c.contribution < -5,
  );
  if (sleepContrib) {
    recs.push({
      priority: 7,
      text: "Improve sleep consistency — aim for the same bed and wake time each day",
    });
  }

  // Stress contributor
  const stressContrib = input.recoveryScore?.contributors.find(
    c => c.factor.toLowerCase().includes("stress") && c.contribution < -5,
  );
  if (stressContrib) {
    recs.push({
      priority: 6,
      text: "High stress is compounding recovery difficulty — try brief daily breathwork or decompression walks",
    });
  }

  // Escalating symptoms
  for (const e of input.symptomEscalations.filter(s => s.status === "escalating")) {
    recs.push({
      priority: 5,
      text: `${e.symptomName} symptoms have been increasing — log daily and rest if they worsen`,
    });
  }

  // Low-urgency general tip
  if (urgency === "low" && recs.length === 0) {
    recs.push({
      priority: 3,
      text: "Maintain current sleep and stress habits — recovery is on track",
    });
  }

  return recs;
}

// ─── Rationale ────────────────────────────────────────────────────────────────

function buildRationale(input: RecoveryPlanInput, urgency: PlanUrgency): string {
  if (urgency === "none") return "All recovery indicators are within normal range.";

  const drivers: string[] = [];

  const bl = input.burnoutRisk?.level;
  if (bl === "severe" || bl === "high") drivers.push("elevated recovery strain indicators");
  else if (bl === "moderate")           drivers.push("moderate recovery strain");

  const dc = input.recoveryDebt?.category;
  if (dc === "critical") drivers.push("critical recovery debt");
  else if (dc === "high") drivers.push("high recovery debt");
  else if (dc === "elevated") drivers.push("elevated recovery debt");

  const rs = input.recoveryScore?.score ?? 100;
  if      (rs < 35) drivers.push("very low recovery score");
  else if (rs < 50) drivers.push("compromised recovery score");
  else if (rs < 65) drivers.push("moderate recovery score");

  const t7 = input.recoveryTrend?.status7d;
  if (t7 === "rapidly_declining") drivers.push("rapidly declining recovery trend");
  else if (t7 === "declining")    drivers.push("declining recovery trend");

  const escalating = input.symptomEscalations.filter(e => e.status === "escalating");
  if (escalating.length > 0) {
    drivers.push(`${escalating.map(e => e.symptomName.toLowerCase()).join(", ")} symptoms escalating`);
  }

  if (drivers.length === 0) return "Minor recovery signals detected.";

  const joined = drivers.length === 1
    ? drivers[0]
    : `${drivers.slice(0, -1).join(", ")} and ${drivers[drivers.length - 1]}`;

  return `Plan urgency set to ${urgency} due to ${joined}.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds an actionable recovery plan from all upstream signals.
 * Urgency is a weighted composite; recommendations are ranked by impact
 * and capped at 5 so the output stays focused.
 */
export function buildRecoveryPlan(input: RecoveryPlanInput): RecoveryPlan {
  const pts     = computeUrgencyPoints(input);
  const urgency = toUrgency(pts);
  const recs    = collectRecs(input, urgency)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_RECS)
    .map(r => r.text);

  return {
    urgency,
    recommendations: recs,
    rationale: buildRationale(input, urgency),
  };
}
