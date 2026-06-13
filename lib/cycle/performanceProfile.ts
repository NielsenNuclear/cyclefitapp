// ─── lib/cycle/performanceProfile.ts ─────────────────────────────────────────
// Synthesises all cycle intelligence signals into a single profile object.
// Downstream consumers (18I card, coach view) import from here only.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { PeriodEntry } from "./cycleAccuracy";
import type { TrainingWindow } from "./trainingWindows";
import type { RecoveryWindow } from "./recoveryWindows";
import type { OvulationEstimate } from "./ovulationEstimator";
import type { SymptomCluster } from "./symptomClusters";
import { toCycleDay, getPeriodStartForDate, toCyclePhaseName } from "./cycleUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalPerformanceProfile {
  primeWindow:       TrainingWindow | null;
  recoveryWindow:    RecoveryWindow | null;
  ovulationEstimate: OvulationEstimate | null;
  bestPhase:         string | null;   // named cycle phase with highest mean readiness
  worstPhase:        string | null;   // named cycle phase with lowest mean readiness
  dominantCluster:   SymptomCluster | null;  // strongest symptom cluster by frequency
  dataMaturity:      "early" | "developing" | "established";
}

export interface PerformanceProfileInput {
  readinessHistory:  ReadinessHistoryEntry[];
  periodHistory:     PeriodEntry[];
  cycleLength:       number;
  primeWindow:       TrainingWindow | null;
  recoveryWindow:    RecoveryWindow | null;
  ovulationEstimate: OvulationEstimate | null;
  symptomClusters:   SymptomCluster[];
}

// ─── Internal: best/worst phase ───────────────────────────────────────────────

const MIN_PHASE_OBSERVATIONS = 3;

function deriveBestWorstPhase(
  readinessHistory: ReadinessHistoryEntry[],
  periodHistory:    PeriodEntry[],
  cycleLength:      number,
): { bestPhase: string | null; worstPhase: string | null } {
  if (periodHistory.length < 2 || readinessHistory.length < MIN_PHASE_OBSERVATIONS) {
    return { bestPhase: null, worstPhase: null };
  }

  const sortedPeriods = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const phaseBuckets  = new Map<string, number[]>();

  for (const entry of readinessHistory) {
    const cd          = toCycleDay(entry.date, sortedPeriods, cycleLength);
    const periodStart = getPeriodStartForDate(entry.date, sortedPeriods);
    if (cd === null || periodStart === null) continue;

    const phase  = toCyclePhaseName(cd, cycleLength);
    const bucket = phaseBuckets.get(phase) ?? [];
    bucket.push(entry.score);
    phaseBuckets.set(phase, bucket);
  }

  // Only phases with enough observations qualify
  const qualified = [...phaseBuckets.entries()]
    .filter(([, scores]) => scores.length >= MIN_PHASE_OBSERVATIONS)
    .map(([phase, scores]) => ({
      phase,
      mean: scores.reduce((s, v) => s + v, 0) / scores.length,
    }));

  if (qualified.length < 2) return { bestPhase: null, worstPhase: null };

  qualified.sort((a, b) => b.mean - a.mean);

  return {
    bestPhase:  qualified[0].phase,
    worstPhase: qualified[qualified.length - 1].phase,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPerformanceProfile(
  input: PerformanceProfileInput,
): PersonalPerformanceProfile {
  const {
    readinessHistory,
    periodHistory,
    cycleLength,
    primeWindow,
    recoveryWindow,
    ovulationEstimate,
    symptomClusters,
  } = input;

  const { bestPhase, worstPhase } = deriveBestWorstPhase(
    readinessHistory, periodHistory, cycleLength,
  );

  const dominantCluster = symptomClusters.length > 0
    ? symptomClusters.reduce((best, c) => c.strength > best.strength ? c : best)
    : null;

  const cycleCount = Math.max(0, periodHistory.length - 1);
  const dataMaturity: PersonalPerformanceProfile["dataMaturity"] =
    cycleCount >= 5 ? "established" :
    cycleCount >= 2 ? "developing"  :
    "early";

  return {
    primeWindow,
    recoveryWindow,
    ovulationEstimate,
    bestPhase,
    worstPhase,
    dominantCluster,
    dataMaturity,
  };
}
