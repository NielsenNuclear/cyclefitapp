// ─── lib/intelligence/verification/recommendationVerifier.ts ──────────────────
// Phase 64 — Recommendation Verifier (main orchestrator)
// Records new recommendations and evaluates those whose window has expired.
// Does NOT modify recommendation logic.

import type {
  VerificationRecord,
  AthleteStateSnapshot,
  RecommendationClass,
  ExpectedOutcome,
} from "./verificationTypes";
import {
  upsertVerificationRecord,
  getPendingVerifications,
  loadVerificationRegistry,
  updateVerificationRecord,
} from "./verificationRegistry";
import { collectActualOutcome, deriveVerificationScore } from "./evaluateOutcome";
import {
  computeVerificationSummary,
  computeConfidenceFeedback,
  type ClassAccuracy,
  computeClassAccuracy,
} from "./calculateRecommendationAccuracy";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryScore }          from "@/lib/recovery/recoveryScore";
import type { AdherenceEntry }         from "@/lib/adherence/adherenceTracker";

const ALGORITHM_VERSION = "axis-v1.0";

// ── UID helper ────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Default expected outcome by recommendation class ─────────────────────────

function defaultExpected(cls: RecommendationClass): ExpectedOutcome {
  const defaults: Record<RecommendationClass, ExpectedOutcome> = {
    volume_increase:     { readinessDelta: 3,  recoveryDelta: -3, adherenceTarget: 0.7, rationale: "Volume increase expected to build load tolerance", horizonDays: 7 },
    volume_decrease:     { readinessDelta: 5,  recoveryDelta:  5, adherenceTarget: 0.8, rationale: "Volume decrease expected to allow recovery", horizonDays: 7 },
    volume_maintain:     { readinessDelta: 0,  recoveryDelta:  0, adherenceTarget: 0.75, rationale: "Maintain current trajectory", horizonDays: 7 },
    deload:              { readinessDelta: 8,  recoveryDelta:  8, adherenceTarget: 0.9, rationale: "Deload expected to significantly restore readiness", horizonDays: 7 },
    recovery_focus:      { readinessDelta: 6,  recoveryDelta:  7, adherenceTarget: 0.85, rationale: "Recovery focus expected to restore reserves", horizonDays: 5 },
    intensity_up:        { readinessDelta: 2,  recoveryDelta: -2, adherenceTarget: 0.7, rationale: "Intensity increase expected to build capacity", horizonDays: 7 },
    intensity_down:      { readinessDelta: 4,  recoveryDelta:  4, adherenceTarget: 0.8, rationale: "Reduced intensity expected to allow adaptation", horizonDays: 7 },
    workout_type_change: { readinessDelta: 2,  recoveryDelta:  1, adherenceTarget: 0.75, rationale: "Variety expected to maintain engagement", horizonDays: 7 },
  };
  return defaults[cls];
}

// ── Public: record a new recommendation ──────────────────────────────────────

export interface RecordRecommendationParams {
  recommendationId:       string;
  recommendationClass:    RecommendationClass;
  recommendationSummary:  string;
  supportingSignals:      string[];
  athleteState:           AthleteStateSnapshot;
  confidenceAtGeneration: number;
  today:                  string;
  expectedOutcome?:       ExpectedOutcome;
}

export function recordRecommendation(params: RecordRecommendationParams): VerificationRecord {
  const expected   = params.expectedOutcome ?? defaultExpected(params.recommendationClass);
  const dueDate    = addDays(params.today, expected.horizonDays);

  const record: VerificationRecord = {
    id:                      uid(),
    recommendationId:        params.recommendationId,
    timestamp:               params.today,
    evaluationDueDate:       dueDate,
    recommendationClass:     params.recommendationClass,
    recommendationSummary:   params.recommendationSummary,
    supportingSignals:       params.supportingSignals,
    expectedOutcome:         expected,
    athleteState:            params.athleteState,
    algorithmVersion:        ALGORITHM_VERSION,
    confidenceAtGeneration:  params.confidenceAtGeneration,
    evaluated:               false,
  };

  upsertVerificationRecord(record);
  return record;
}

// ── Public: evaluate pending records ─────────────────────────────────────────

export interface EvaluationBatch {
  evaluated:   VerificationRecord[];
  stillWaiting: number;
}

export function runPendingEvaluations(
  today:            string,
  readinessHistory: ReadinessHistoryEntry[],
  recoveryHistory:  RecoveryScore[],
  adherenceHistory: AdherenceEntry[],
): EvaluationBatch {
  const pending = getPendingVerifications(today);
  const evaluated: VerificationRecord[] = [];

  for (const record of pending) {
    const actual = collectActualOutcome(
      record, readinessHistory, recoveryHistory, adherenceHistory, today,
    );
    const { score, rationale } = deriveVerificationScore(
      record.expectedOutcome, actual, record.athleteState,
    );

    const updated: Partial<VerificationRecord> = {
      evaluated:         true,
      actualOutcome:     actual,
      verificationScore: score,
      scoreRationale:    rationale,
    };

    updateVerificationRecord(record.id, updated);
    evaluated.push({ ...record, ...updated } as VerificationRecord);
  }

  const still = loadVerificationRegistry().filter(r => !r.evaluated).length;
  return { evaluated, stillWaiting: still };
}

// ── Public: summary + calibration signal ─────────────────────────────────────

export interface VerifierOutput {
  summary:            ReturnType<typeof computeVerificationSummary>;
  classAccuracy:      ClassAccuracy[];
  confidenceFeedback: number | null;
}

export function getVerifierOutput(today: string): VerifierOutput {
  const records = loadVerificationRegistry();
  return {
    summary:            computeVerificationSummary(records, today),
    classAccuracy:      computeClassAccuracy(records),
    confidenceFeedback: computeConfidenceFeedback(records),
  };
}

// ── Internal helper ───────────────────────────────────────────────────────────

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
