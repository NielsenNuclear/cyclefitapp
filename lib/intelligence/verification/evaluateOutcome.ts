// ─── lib/intelligence/verification/evaluateOutcome.ts ─────────────────────────
// Phase 64 — Outcome Evaluator
// Compares the expected outcome of a recommendation against what actually
// happened (readiness, recovery, adherence) and derives a VerificationScore.

import type {
  VerificationRecord,
  ActualOutcome,
  ExpectedOutcome,
  VerificationScore,
} from "./verificationTypes";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryScore }          from "@/lib/recovery/recoveryScore";
import type { AdherenceEntry }         from "@/lib/adherence/adherenceTracker";

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
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
  const done = entries.filter(
    e => e.status === "completed" || e.status === "partially_completed",
  ).length;
  return done / entries.length;
}

// ── Collect actual metrics from trailing history ───────────────────────────────

export function collectActualOutcome(
  record:           VerificationRecord,
  readinessHistory: ReadinessHistoryEntry[],
  recoveryHistory:  RecoveryScore[],
  adherenceHistory: AdherenceEntry[],
  today:            string,
): ActualOutcome {
  const from    = addDays(record.timestamp, 1);
  const to      = addDays(record.timestamp, record.expectedOutcome.horizonDays);
  const prior   = addDays(record.timestamp, -record.expectedOutcome.horizonDays);

  const rdxMean     = windowMean(readinessHistory, from, to);
  const recMean     = windowMean(
    recoveryHistory.map(r => ({ date: r.date, score: r.score })),
    from, to,
  );
  const compRate    = adherenceRate(adherenceHistory, from, to);
  const priorAdh    = adherenceRate(adherenceHistory, prior, record.timestamp);
  const adhDelta    = compRate !== null && priorAdh !== null
    ? compRate - priorAdh
    : null;

  const workoutsCompleted = adherenceHistory
    .filter(e => e.date >= from && e.date <= to && e.status === "completed")
    .length;

  const samples = readinessHistory.filter(e => e.date >= from && e.date <= to).length;

  return {
    readinessMean:     rdxMean,
    recoveryMean:      recMean,
    completionRate:    compRate,
    adherenceDelta:    adhDelta,
    workoutsCompleted,
    samplesCollected:  samples,
    evaluationDate:    today,
  };
}

// ── Score derivation ──────────────────────────────────────────────────────────

const MIN_SAMPLES = 3;
const PARTIAL_THRESHOLD = 0.5; // half of expected delta counts as partial success

export function deriveVerificationScore(
  expected: ExpectedOutcome,
  actual:   ActualOutcome,
  baseline: AthleteStateSnapshot,
): { score: VerificationScore; rationale: string } {
  if (actual.samplesCollected < MIN_SAMPLES) {
    return {
      score: "insufficient_data",
      rationale: `Only ${actual.samplesCollected} data point(s) collected in the evaluation window (minimum ${MIN_SAMPLES}).`,
    };
  }

  const rdxBaseline = baseline.readinessScore;
  const recBaseline = baseline.recoveryScore;

  const rdxActualDelta  = actual.readinessMean  !== null ? actual.readinessMean  - rdxBaseline : 0;
  const recActualDelta  = actual.recoveryMean   !== null ? actual.recoveryMean   - recBaseline : 0;
  const adhMet          = actual.completionRate !== null
    ? actual.completionRate >= expected.adherenceTarget * PARTIAL_THRESHOLD
    : false;

  const rdxExpected = expected.readinessDelta;
  const recExpected = expected.recoveryDelta;

  // Signed direction checks
  const rdxOk = rdxExpected === 0
    ? Math.abs(rdxActualDelta) < 5
    : Math.sign(rdxActualDelta) === Math.sign(rdxExpected) && Math.abs(rdxActualDelta) >= Math.abs(rdxExpected) * PARTIAL_THRESHOLD;

  const recOk = recExpected === 0
    ? Math.abs(recActualDelta) < 5
    : Math.sign(recActualDelta) === Math.sign(recExpected) && Math.abs(recActualDelta) >= Math.abs(recExpected) * PARTIAL_THRESHOLD;

  const allOk  = rdxOk && recOk && adhMet;
  const someOk = rdxOk || recOk || adhMet;

  const rdxFullOk = rdxExpected === 0
    ? true
    : Math.sign(rdxActualDelta) === Math.sign(rdxExpected) && Math.abs(rdxActualDelta) >= Math.abs(rdxExpected);
  const recFullOk = recExpected === 0
    ? true
    : Math.sign(recActualDelta) === Math.sign(recExpected) && Math.abs(recActualDelta) >= Math.abs(recExpected);
  const adhFullOk = actual.completionRate !== null && actual.completionRate >= expected.adherenceTarget;

  const score: VerificationScore =
    rdxFullOk && recFullOk && adhFullOk ? "successful" :
    allOk                               ? "partially_successful" :
    someOk                              ? "partially_successful" :
    actual.samplesCollected >= MIN_SAMPLES && !someOk &&
      (rdxActualDelta < -5 || recActualDelta < -5)
                                        ? "unsuccessful" :
                                          "neutral";

  const rationale = [
    actual.readinessMean !== null
      ? `Readiness: ${rdxActualDelta > 0 ? "+" : ""}${rdxActualDelta.toFixed(1)} pts vs expected ${rdxExpected > 0 ? "+" : ""}${rdxExpected}.`
      : "Readiness: no data.",
    actual.recoveryMean !== null
      ? `Recovery: ${recActualDelta > 0 ? "+" : ""}${recActualDelta.toFixed(1)} pts vs expected ${recExpected > 0 ? "+" : ""}${recExpected}.`
      : "Recovery: no data.",
    actual.completionRate !== null
      ? `Completion: ${(actual.completionRate * 100).toFixed(0)}% (target ${(expected.adherenceTarget * 100).toFixed(0)}%).`
      : "Adherence: no data.",
  ].join(" ");

  return { score, rationale };
}

// AthleteStateSnapshot imported inline to avoid circular deps
import type { AthleteStateSnapshot } from "./verificationTypes";
