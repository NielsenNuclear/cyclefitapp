// ─── lib/intelligence/calibration/evaluatePredictions.ts ─────────────────────
// Phase 57B — Prediction Evaluation Engine
// Runs on each page mount. Finds due predictions and evaluates them against
// today's actual data. OBSERVABILITY ONLY — no model changes.

import {
  getPendingEvaluations,
  markPredictionEvaluated,
  type StoredPrediction,
} from "./predictionRegistry";
import type { AdherenceEntry } from "@/lib/adherence/adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvaluationContext {
  today:            string;
  readinessScore:   number;
  recoveryScore:    number;
  adherenceHistory: AdherenceEntry[];
  goalOnTrack:      boolean;
}

export interface EvaluationResult {
  predictionId:   string;
  domain:         string;
  predictedValue: number;
  actualValue:    number;
  errorMagnitude: number;
  accuracyScore:  number;
  timestamp:      string;
  confidence:     "low" | "medium" | "high";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function evaluatePendingPredictions(ctx: EvaluationContext): EvaluationResult[] {
  const pending = getPendingEvaluations(ctx.today);
  const results: EvaluationResult[] = [];

  for (const p of pending) {
    const result = evaluateSingle(p, ctx);
    if (result === null) continue;
    markPredictionEvaluated(p.id, result.actualValue, result.errorMagnitude, result.accuracyScore);
    results.push(result);
  }

  return results;
}

// ─── Domain evaluators ────────────────────────────────────────────────────────

function evaluateSingle(p: StoredPrediction, ctx: EvaluationContext): EvaluationResult | null {
  let actualValue: number;
  let errorMagnitude: number;
  let accuracyScore: number;

  switch (p.domain) {
    case "readiness": {
      actualValue    = ctx.readinessScore;
      errorMagnitude = Math.abs(p.predictedValue - actualValue);
      accuracyScore  = Math.max(0, 1 - errorMagnitude / 100);
      break;
    }

    case "recovery": {
      actualValue    = ctx.recoveryScore;
      errorMagnitude = Math.abs(p.predictedValue - actualValue);
      accuracyScore  = Math.max(0, 1 - errorMagnitude / 100);
      break;
    }

    case "adherence": {
      // Brier score for probabilistic binary outcome (≥50% completion rate over window)
      const windowStart = p.timestamp;
      const windowEnd   = p.evaluationDueDate;
      const inWindow    = ctx.adherenceHistory.filter(
        e => e.date >= windowStart && e.date <= windowEnd,
      );
      if (inWindow.length < 3) return null; // insufficient window data
      const completed    = inWindow.filter(
        e => e.status === "completed" || e.status === "partially_completed",
      ).length;
      const actualBinary = completed / inWindow.length >= 0.5 ? 1 : 0;
      const prob         = p.predictedValue; // 0-1 stored directly
      const brierScore   = (prob - actualBinary) ** 2;
      actualValue    = actualBinary;
      errorMagnitude = Math.round(Math.abs(prob - actualBinary) * 100);
      accuracyScore  = Math.max(0, 1 - brierScore);
      break;
    }

    case "cycle": {
      // predictedValue = days until estimated ovulation when prediction was registered
      // Evaluation: we don't yet have event-level cycle tracking so use neutral placeholder.
      // This signals "data collected, awaiting event log integration."
      actualValue    = p.predictedValue;
      errorMagnitude = 0;
      accuracyScore  = 0.70; // neutral until cycle event tracking is wired
      break;
    }

    case "outcome": {
      // predictedValue = 0-100 probability score; actual = 100 if on track, 0 if not
      const prob       = p.predictedValue / 100;
      const actual     = ctx.goalOnTrack ? 1 : 0;
      const brierScore = (prob - actual) ** 2;
      actualValue    = ctx.goalOnTrack ? 100 : 0;
      errorMagnitude = Math.round(Math.abs(prob - actual) * 100);
      accuracyScore  = Math.max(0, 1 - brierScore);
      break;
    }

    default:
      return null;
  }

  return {
    predictionId:   p.id,
    domain:         p.domain,
    predictedValue: p.predictedValue,
    actualValue,
    errorMagnitude,
    accuracyScore,
    timestamp:      p.timestamp,
    confidence:     p.confidence,
  };
}
