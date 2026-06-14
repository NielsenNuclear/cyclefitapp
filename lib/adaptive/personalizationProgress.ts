// ─── lib/adaptive/personalizationProgress.ts ─────────────────────────────────
// Measures how much the adaptive engine has learned about this specific user.
// Pure function — all inputs passed in; no localStorage reads here.

import type { PeriodEntry }           from "@/lib/cycle/cycleAccuracy";
import type { PatternConfidence }      from "@/lib/adaptive/patternConfidence";
import type { ReadinessHistoryEntry }  from "@/lib/readiness/readinessHistory";
import type { PhysiologyEntry }        from "@/lib/adaptive/physiologyMemory";
import type { RecoveryStrategyOutcome } from "@/lib/recovery/recoveryLearning";
import type { CalibrationFactors }     from "@/lib/adaptive/accuracyCalibration";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonalizationTier =
  | "Starting"
  | "Learning"
  | "Personalized"
  | "Highly Personalized";

export interface PersonalizationProgress {
  cycleLearning:     number;   // 0–100
  symptomLearning:   number;   // 0–100
  strategyLearning:  number;   // 0–100
  readinessLearning: number;   // 0–100
  recoveryLearning:  number;   // 0–100
  overallProgress:   number;   // 0–100 weighted average
  tier:              PersonalizationTier;
  strongSignals:     string[];  // dimensions ≥ 70
  learningSignals:   string[];  // dimensions 30–69
  needsDataSignals:  string[];  // dimensions < 30
}

export interface PersonalizationProgressInput {
  periodHistory:      PeriodEntry[];
  patternConfidences: PatternConfidence[];
  readinessHistory:   ReadinessHistoryEntry[];
  physiologyHistory:  PhysiologyEntry[];
  strategyOutcomes:   RecoveryStrategyOutcome[];
  calibrationFactors: CalibrationFactors | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp100(v: number): number {
  return Math.round(Math.min(100, Math.max(0, v)));
}

// ─── Sub-dimension scorers ────────────────────────────────────────────────────

// Cycle learning: how well have observed cycles been tracked and patterned?
// 100% = 6 cycles logged + ≥2 reliable symptom patterns across those cycles.
function scoreCycleLearning(
  periodHistory:      PeriodEntry[],
  patternConfidences: PatternConfidence[],
): number {
  const cycles      = Math.max(0, periodHistory.length - 1);
  const reliable    = patternConfidences.filter(p => p.isReliable).length;

  // Base: cycles → up to 75 pts (6 cycles = 75 pts)
  const baseScore   = Math.min(75, (cycles / 6) * 75);
  // Bonus: reliable patterns → up to 25 pts (2 = 25 pts)
  const reliableBonus = Math.min(25, (reliable / 2) * 25);

  return clamp100(baseScore + reliableBonus);
}

// Symptom learning: how well are symptom patterns known?
// 100% = 5 tracked patterns with ≥2 reliable.
function scoreSymptomLearning(patternConfidences: PatternConfidence[]): number {
  const total    = patternConfidences.length;
  const reliable = patternConfidences.filter(p => p.isReliable).length;

  // Base: pattern count → up to 60 pts (5 patterns = 60 pts)
  const baseScore     = Math.min(60, (total / 5) * 60);
  // Bonus: reliable patterns → up to 40 pts (2 reliable = 40 pts)
  const reliableBonus = Math.min(40, (reliable / 2) * 40);

  return clamp100(baseScore + reliableBonus);
}

// Strategy learning: how much has the system learned about recovery strategies?
// 100% = 10 scored entries + ≥4 strategies with definitive verdicts.
function scoreStrategyLearning(strategyOutcomes: RecoveryStrategyOutcome[]): number {
  const totalScored = strategyOutcomes.reduce((s, o) => s + o.sampleSize, 0);
  const decided     = strategyOutcomes.filter(o => o.verdict !== "uncertain").length;

  // Base: scored entries → up to 60 pts (10 = 60 pts)
  const baseScore    = Math.min(60, (totalScored / 10) * 60);
  // Bonus: strategies with verdict → up to 40 pts (4 = 40 pts)
  const decidedBonus = Math.min(40, (decided / 4) * 40);

  return clamp100(baseScore + decidedBonus);
}

// Readiness learning: how well calibrated are the readiness predictions?
// 100% = 30 contributor-tracked entries + active calibration factors.
function scoreReadinessLearning(
  readinessHistory:   ReadinessHistoryEntry[],
  calibrationFactors: CalibrationFactors | null,
): number {
  const calibrated = readinessHistory.filter(e => e.contributors != null).length;

  // Base: calibrated entries → up to 70 pts (30 = 70 pts)
  const baseScore       = Math.min(70, (calibrated / 30) * 70);
  // Bonus: active calibration factors present → 30 pts
  const calibrationBonus = calibrationFactors ? 30 : 0;

  return clamp100(baseScore + calibrationBonus);
}

// Recovery learning: how well are per-phase recovery patterns known?
// 100% = 30 physiology entries spanning 4+ distinct phases.
function scoreRecoveryLearning(physiologyHistory: PhysiologyEntry[]): number {
  const count  = physiologyHistory.length;
  const phases = new Set(
    physiologyHistory.map(e => e.phase).filter((p): p is string => p !== null),
  ).size;

  // Base: entry count → up to 60 pts (30 = 60 pts)
  const baseScore   = Math.min(60, (count / 30) * 60);
  // Bonus: phase coverage → up to 40 pts (4 phases = 40 pts)
  const phaseBonus  = Math.min(40, (phases / 4) * 40);

  return clamp100(baseScore + phaseBonus);
}

// ─── Tier ────────────────────────────────────────────────────────────────────

function toTier(overall: number): PersonalizationTier {
  if (overall >= 76) return "Highly Personalized";
  if (overall >= 51) return "Personalized";
  if (overall >= 26) return "Learning";
  return "Starting";
}

// ─── Signal classification ────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  cycleLearning:     "Cycle timing",
  symptomLearning:   "Symptom patterns",
  strategyLearning:  "Recovery strategies",
  readinessLearning: "Readiness calibration",
  recoveryLearning:  "Recovery response",
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes how much the adaptive engine has learned about this user.
 * Returns sub-dimension scores, overall progress, tier, and signal classification.
 */
export function computePersonalizationProgress(
  input: PersonalizationProgressInput,
): PersonalizationProgress {
  const {
    periodHistory, patternConfidences, readinessHistory,
    physiologyHistory, strategyOutcomes, calibrationFactors,
  } = input;

  const cycleLearning     = scoreCycleLearning(periodHistory, patternConfidences);
  const symptomLearning   = scoreSymptomLearning(patternConfidences);
  const strategyLearning  = scoreStrategyLearning(strategyOutcomes);
  const readinessLearning = scoreReadinessLearning(readinessHistory, calibrationFactors);
  const recoveryLearning  = scoreRecoveryLearning(physiologyHistory);

  // Weighted average: cycle 25%, symptom 20%, readiness 20%, recovery 20%, strategy 15%
  const overallProgress = clamp100(
    cycleLearning     * 0.25 +
    symptomLearning   * 0.20 +
    readinessLearning * 0.20 +
    recoveryLearning  * 0.20 +
    strategyLearning  * 0.15,
  );

  const tier = toTier(overallProgress);

  const scores: Record<string, number> = {
    cycleLearning,
    symptomLearning,
    strategyLearning,
    readinessLearning,
    recoveryLearning,
  };

  const strongSignals:  string[] = [];
  const learningSignals: string[] = [];
  const needsDataSignals: string[] = [];

  for (const [key, score] of Object.entries(scores)) {
    const label = DIMENSION_LABELS[key] ?? key;
    if (score >= 70)      strongSignals.push(label);
    else if (score >= 30) learningSignals.push(label);
    else                  needsDataSignals.push(label);
  }

  return {
    cycleLearning,
    symptomLearning,
    strategyLearning,
    readinessLearning,
    recoveryLearning,
    overallProgress,
    tier,
    strongSignals,
    learningSignals,
    needsDataSignals,
  };
}
