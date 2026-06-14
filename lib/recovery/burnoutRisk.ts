// ─── lib/recovery/burnoutRisk.ts ─────────────────────────────────────────────
// Detects signs of accumulated recovery strain before they become a problem.
// Five independent factors each score 0–20; total 0–100 maps to a risk level.
//
// Language rule: never use "burnout" or "burned out" in user-facing output.
// Use "elevated recovery strain", "recovery indicators", etc.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";
import type { SymptomEntry }          from "@/lib/symptoms/symptomHistory";
import type { TrainingLoadReport }    from "@/lib/analytics/trainingLoad";
import type { RecoveryDebt }          from "./recoveryDebt";
import type { BurnoutRisk, BurnoutFactor, BurnoutLevel } from "./recoveryTypes";

export type { BurnoutRisk };

// ─── Input ────────────────────────────────────────────────────────────────────

export interface BurnoutRiskInput {
  readinessHistory: ReadinessHistoryEntry[];   // 14+ days, newest first
  workoutHistory:   WorkoutHistoryEntry[];     // last 28 days
  symptomHistory:   SymptomEntry[];            // last 28 days
  recoveryDebt:     RecoveryDebt | null;
  loadReport:       TrainingLoadReport;
}

// ─── Level mapping ────────────────────────────────────────────────────────────

function toLevel(score: number): BurnoutLevel {
  if (score >= 71) return "severe";
  if (score >= 46) return "high";
  if (score >= 21) return "moderate";
  return "low";
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Factor 1 — Readiness decline over 14 days ───────────────────────────────

function scoreReadinessDecline(history: ReadinessHistoryEntry[]): BurnoutFactor {
  const recent = history.slice(0, 7).map(e => e.score);
  const prior  = history.slice(7, 14).map(e => e.score);

  if (recent.length < 3 || prior.length < 3) {
    return { name: "Readiness trend", score: 0, detail: "Insufficient data" };
  }

  const delta = mean(recent) - mean(prior);
  let score = 0;
  let detail: string;

  if (delta <= -10) {
    score  = 20;
    detail = `Readiness dropped ~${Math.abs(Math.round(delta))} pts over 14 days`;
  } else if (delta <= -5) {
    score  = 12;
    detail = `Readiness declined ~${Math.abs(Math.round(delta))} pts over 14 days`;
  } else if (delta <= -2) {
    score  = 6;
    detail = `Readiness slightly lower over 14 days`;
  } else {
    detail = "Readiness stable or improving";
  }

  return { name: "Readiness trend", score, detail };
}

// ─── Factor 2 — Adherence decline ────────────────────────────────────────────

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function skipRate(entries: WorkoutHistoryEntry[]): number {
  const nonPending = entries.filter(e => e.status !== "pending");
  if (nonPending.length === 0) return 0;
  return nonPending.filter(e => e.status === "skipped").length / nonPending.length;
}

function scoreAdherenceDecline(history: WorkoutHistoryEntry[]): BurnoutFactor {
  const cutoff14 = dateNDaysAgo(14);
  const cutoff28 = dateNDaysAgo(28);

  const recent = history.filter(e => e.id >= cutoff14);
  const prior  = history.filter(e => e.id >= cutoff28 && e.id < cutoff14);

  if (recent.length < 2 || prior.length < 2) {
    return { name: "Training adherence", score: 0, detail: "Insufficient data" };
  }

  const recentSkip = skipRate(recent);
  const priorSkip  = skipRate(prior);
  const increase   = recentSkip - priorSkip;

  let score = 0;
  let detail: string;

  if (increase >= 0.15) {
    score  = 20;
    detail = `Skip rate increased by ${Math.round(increase * 100)}% vs prior 14 days`;
  } else if (increase >= 0.08) {
    score  = 12;
    detail = `Skip rate moderately elevated vs prior 14 days`;
  } else if (increase > 0) {
    score  = 5;
    detail = `Slight increase in missed sessions`;
  } else {
    detail = "Adherence consistent";
  }

  return { name: "Training adherence", score, detail };
}

// ─── Factor 3 — Fatigue symptom escalation ───────────────────────────────────

function scoreFatigueEscalation(symptomHistory: SymptomEntry[]): BurnoutFactor {
  const cutoff14 = dateNDaysAgo(14);
  const cutoff28 = dateNDaysAgo(28);

  const FATIGUE_IDS = ["fatigue", "energy", "motivation"];

  const recent = symptomHistory.filter(
    s => s.date >= cutoff14 && FATIGUE_IDS.includes(s.symptomId),
  );
  const prior = symptomHistory.filter(
    s => s.date >= cutoff28 && s.date < cutoff14 && FATIGUE_IDS.includes(s.symptomId),
  );

  if (recent.length < 2 || prior.length < 2) {
    return { name: "Fatigue indicators", score: 0, detail: "Insufficient data" };
  }

  const recentMean = mean(recent.map(s => s.severity));
  const priorMean  = mean(prior.map(s => s.severity));
  const increase   = recentMean - priorMean;

  let score = 0;
  let detail: string;

  if (increase >= 1.0) {
    score  = 20;
    detail = "Fatigue, energy, or motivation indicators significantly elevated";
  } else if (increase >= 0.5) {
    score  = 12;
    detail = "Fatigue or low-energy symptoms increasing";
  } else if (increase >= 0.2) {
    score  = 6;
    detail = "Mild upward trend in fatigue indicators";
  } else {
    detail = "Fatigue indicators stable";
  }

  return { name: "Fatigue indicators", score, detail };
}

// ─── Factor 4 — Sustained recovery debt ──────────────────────────────────────

function scoreSustainedDebt(debt: RecoveryDebt | null): BurnoutFactor {
  if (!debt) return { name: "Recovery debt", score: 0, detail: "No data" };

  const days = debt.daysElevated;
  let score = 0;
  let detail: string;

  if (days >= 21) {
    score  = 20;
    detail = `Recovery debt elevated for ${days} consecutive days`;
  } else if (days >= 14) {
    score  = 15;
    detail = `Recovery debt elevated for ${days} days`;
  } else if (days >= 7) {
    score  = 8;
    detail = `Recovery debt elevated for ${days} days`;
  } else {
    detail = days > 0
      ? `Recovery debt elevated for ${days} day(s)`
      : "Recovery debt within normal range";
  }

  return { name: "Recovery debt", score, detail };
}

// ─── Factor 5 — Acute/chronic load mismatch ──────────────────────────────────

function scoreLoadMismatch(loadReport: TrainingLoadReport): BurnoutFactor {
  const prev = loadReport.previousWeekVolume;
  if (prev === 0) {
    return { name: "Training load", score: 0, detail: "No prior week data" };
  }

  const ratio = loadReport.weeklyVolume / prev;
  let score = 0;
  let detail: string;

  if (ratio > 1.5) {
    score  = 20;
    detail = `Training volume spiked ${Math.round((ratio - 1) * 100)}% above prior week`;
  } else if (ratio > 1.3) {
    score  = 12;
    detail = `Training volume notably higher than prior week`;
  } else if (ratio > 1.15) {
    score  = 6;
    detail = `Moderate week-on-week volume increase`;
  } else {
    detail = "Training load well-managed";
  }

  return { name: "Training load", score, detail };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Evaluates five independent recovery-strain signals and returns a composite
 * risk score and level. Never uses "burnout" or "burned out" in output —
 * all factor details use neutral, observational language.
 */
export function computeBurnoutRisk(input: BurnoutRiskInput): BurnoutRisk {
  const factors: BurnoutFactor[] = [
    scoreReadinessDecline(input.readinessHistory),
    scoreAdherenceDecline(input.workoutHistory),
    scoreFatigueEscalation(input.symptomHistory),
    scoreSustainedDebt(input.recoveryDebt),
    scoreLoadMismatch(input.loadReport),
  ];

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));

  return {
    score,
    level:   toLevel(score),
    factors: factors.filter(f => f.score > 0 || f.detail !== "Insufficient data"),
  };
}
