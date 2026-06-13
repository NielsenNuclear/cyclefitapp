// ─── lib/cycle/cycleHealth.ts ─────────────────────────────────────────────────
// Surfaces cycle irregularity patterns as plain-language observations.
// NOT diagnostic. NOT medical advice. Informational only.

import type { CycleAccuracyReport } from "./cycleAccuracy";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleHealthObservation {
  id:          string;
  observation: string;
}

export interface CycleHealthReport {
  observations:    CycleHealthObservation[];
  hasObservations: boolean;
  disclaimer:      string;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const VARIABILITY_THRESHOLD      = 7;   // std dev in days
const SHORT_CYCLE_THRESHOLD      = 21;  // days
const LONG_CYCLE_THRESHOLD       = 35;  // days
const ACCURACY_THRESHOLD         = 0.6; // below this = notable divergence
const MIN_CYCLES_FOR_ACCURACY    = 3;   // don't flag accuracy until enough data

// ─── Main export ──────────────────────────────────────────────────────────────

const DISCLAIMER =
  "These are informational observations only — not a medical assessment. " +
  "If you have concerns about your cycle, speak with a healthcare provider.";

/**
 * Generates plain-language observations about cycle patterns.
 * Returns an empty observations array when nothing notable is detected.
 * The disclaimer is always included.
 */
export function buildCycleHealthReport(
  accuracy: CycleAccuracyReport,
): CycleHealthReport {
  const observations: CycleHealthObservation[] = [];

  if (accuracy.variability > VARIABILITY_THRESHOLD) {
    observations.push({
      id:          "high-variability",
      observation: `Your cycle length has varied by more than ${VARIABILITY_THRESHOLD} days — ` +
                   `shortest ${accuracy.shortestLength} days, longest ${accuracy.longestLength} days.`,
    });
  }

  if (accuracy.shortestLength < SHORT_CYCLE_THRESHOLD) {
    observations.push({
      id:          "short-cycle",
      observation: `One or more cycles were shorter than ${SHORT_CYCLE_THRESHOLD} days ` +
                   `(shortest recorded: ${accuracy.shortestLength} days).`,
    });
  }

  if (accuracy.longestLength > LONG_CYCLE_THRESHOLD) {
    observations.push({
      id:          "long-cycle",
      observation: `One or more cycles were longer than ${LONG_CYCLE_THRESHOLD} days ` +
                   `(longest recorded: ${accuracy.longestLength} days).`,
    });
  }

  if (
    accuracy.cycleCount >= MIN_CYCLES_FOR_ACCURACY &&
    accuracy.predictionAccuracy < ACCURACY_THRESHOLD
  ) {
    observations.push({
      id:          "low-accuracy",
      observation: `Your logged cycle length (${accuracy.reportedLength} days) differs ` +
                   `notably from your observed average (${accuracy.averageLength} days). ` +
                   `Updating your cycle length in settings may improve recommendations.`,
    });
  }

  return {
    observations,
    hasObservations: observations.length > 0,
    disclaimer:      DISCLAIMER,
  };
}
