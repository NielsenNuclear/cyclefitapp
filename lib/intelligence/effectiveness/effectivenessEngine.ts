// ─── lib/intelligence/effectiveness/effectivenessEngine.ts ───────────────────
// Phase 58B/C — Outcome Collection + Effectiveness Evaluation
// Evaluates past recommendations against actual outcomes.
// Also provides safety guardrails for volume bounds.

import {
  getPendingEvaluations,
  markEventEvaluated,
  type RecommendationType,
  type OutcomeMetrics,
} from "./recommendationRegistry";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryScore }         from "@/lib/recovery/recoveryScore";
import type { AdherenceEntry }        from "@/lib/adherence/adherenceTracker";

// ─── Safety Guardrails ────────────────────────────────────────────────────────

const VOLUME_MAX = 1.30;
const VOLUME_MIN = 0.60;

export interface GuardrailResult {
  withinBounds: boolean;
  violations:   string[];
}

export function checkSafetyBounds(volumeScale: number): GuardrailResult {
  const violations: string[] = [];
  if (volumeScale > VOLUME_MAX) {
    violations.push(`Volume scale ${volumeScale.toFixed(2)} exceeds +30% ceiling`);
  }
  if (volumeScale < VOLUME_MIN) {
    violations.push(`Volume scale ${volumeScale.toFixed(2)} below -40% floor`);
  }
  return { withinBounds: violations.length === 0, violations };
}

// ─── Outcome collection ───────────────────────────────────────────────────────

export interface EvaluationData {
  today:            string;
  readinessHistory: ReadinessHistoryEntry[];
  recoveryHistory:  RecoveryScore[];
  adherenceHistory: AdherenceEntry[];
}

function windowMean(
  history: Array<{ date: string; score: number }>,
  from:    string,
  to:      string,
): number | null {
  const entries = history.filter(e => e.date >= from && e.date <= to);
  if (entries.length === 0) return null;
  return entries.reduce((s, e) => s + e.score, 0) / entries.length;
}

function adherenceRate(history: AdherenceEntry[], from: string, to: string): number | null {
  const entries = history.filter(e => e.date >= from && e.date <= to);
  if (entries.length < 2) return null;
  const completed = entries.filter(
    e => e.status === "completed" || e.status === "partially_completed",
  ).length;
  return completed / entries.length;
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function collectOutcomeMetrics(
  eventDate:        string,
  readinessHistory: ReadinessHistoryEntry[],
  recoveryHistory:  RecoveryScore[],
  adherenceHistory: AdherenceEntry[],
): OutcomeMetrics | null {
  const windowStart = addDays(eventDate, 1);
  const windowEnd   = addDays(eventDate, 7);
  const priorStart  = addDays(eventDate, -6);

  const rdxAtDecision = readinessHistory.find(e => e.date === eventDate)?.score;
  const rcvAtDecision = recoveryHistory.find(e => e.date === eventDate)?.score;

  const rdxAfter = windowMean(
    readinessHistory.map(e => ({ date: e.date, score: e.score })), windowStart, windowEnd,
  );
  const rcvAfter = windowMean(
    recoveryHistory.map(e => ({ date: e.date, score: e.score })), windowStart, windowEnd,
  );

  const adherenceAfter  = adherenceRate(adherenceHistory, windowStart, windowEnd);
  const adherenceBefore = adherenceRate(adherenceHistory, priorStart, eventDate);

  const completedInWindow = adherenceHistory.filter(
    e => e.date >= windowStart && e.date <= windowEnd &&
         (e.status === "completed" || e.status === "partially_completed"),
  ).length;
  const totalInWindow = adherenceHistory.filter(
    e => e.date >= windowStart && e.date <= windowEnd,
  ).length;

  if (rdxAfter === null && rcvAfter === null) return null; // no data in window yet

  const sampleSize = Math.max(
    readinessHistory.filter(e => e.date >= windowStart && e.date <= windowEnd).length,
    recoveryHistory.filter(e => e.date >= windowStart && e.date <= windowEnd).length,
  );

  return {
    readinessDelta:  rdxAfter !== null && rdxAtDecision !== undefined
                       ? rdxAfter - rdxAtDecision : 0,
    recoveryDelta:   rcvAfter !== null && rcvAtDecision !== undefined
                       ? rcvAfter - rcvAtDecision : 0,
    completionRate:  totalInWindow > 0 ? completedInWindow / totalInWindow : 0.5,
    adherenceDelta:  adherenceAfter !== null && adherenceBefore !== null
                       ? adherenceAfter - adherenceBefore : 0,
    sampleSize,
  };
}

// ─── Effectiveness scoring ────────────────────────────────────────────────────

const TYPE_WEIGHTS: Record<RecommendationType, {
  recovery:   number;
  readiness:  number;
  completion: number;
  adherence:  number;
}> = {
  volume_increase:     { recovery: 0.20, readiness: 0.35, completion: 0.30, adherence: 0.15 },
  volume_decrease:     { recovery: 0.35, readiness: 0.25, completion: 0.25, adherence: 0.15 },
  volume_maintain:     { recovery: 0.25, readiness: 0.25, completion: 0.25, adherence: 0.25 },
  deload:              { recovery: 0.40, readiness: 0.30, completion: 0.15, adherence: 0.15 },
  recovery_focus:      { recovery: 0.40, readiness: 0.30, completion: 0.15, adherence: 0.15 },
  workout_mode_change: { recovery: 0.20, readiness: 0.25, completion: 0.35, adherence: 0.20 },
};

function computeScore(
  type:    RecommendationType,
  metrics: OutcomeMetrics,
): { score: number; outcome: "helpful" | "neutral" | "harmful" } {
  const w = TYPE_WEIGHTS[type];

  // Map deltas to 0-1 components (0.5 = no change baseline)
  const recoveryC  = Math.min(1, Math.max(0, 0.5 + metrics.recoveryDelta  / 20));
  const readinessC = Math.min(1, Math.max(0, 0.5 + metrics.readinessDelta / 20));
  const adherenceC = Math.min(1, Math.max(0, 0.5 + metrics.adherenceDelta / 0.4));
  const completionC = metrics.completionRate; // already 0-1

  const score = w.recovery  * recoveryC
    +           w.readiness * readinessC
    +           w.completion * completionC
    +           w.adherence * adherenceC;

  const outcome: "helpful" | "neutral" | "harmful" =
    score >= 0.65 ? "helpful" : score >= 0.40 ? "neutral" : "harmful";

  return { score: Math.round(score * 1000) / 1000, outcome };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function evaluateRecommendationEffectiveness(data: EvaluationData): void {
  const pending = getPendingEvaluations(data.today);

  for (const event of pending) {
    const metrics = collectOutcomeMetrics(
      event.timestamp,
      data.readinessHistory,
      data.recoveryHistory,
      data.adherenceHistory,
    );
    if (metrics === null) continue;

    const { score, outcome } = computeScore(event.recommendationType, metrics);
    markEventEvaluated(event.id, score, outcome, metrics);
  }
}
