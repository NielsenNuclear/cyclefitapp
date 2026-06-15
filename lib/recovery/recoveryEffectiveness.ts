// ─── lib/recovery/recoveryEffectiveness.ts ───────────────────────────────────
// Aggregates per-modality recovery effectiveness from logged response data.
// Ranks recovery interventions by mean next-day readiness improvement.
// Falls back to strategy-level outcomes when granular data is insufficient.
// Pure function — reads from storage, no React.

import { getRecoveryResponses, modalityLabel, type RecoveryModality } from "./recoveryResponse";
import type { RecoveryStrategyOutcome } from "./recoveryLearning";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EffectivenessTier = "most_effective" | "moderate" | "least_effective";

export interface ModalityEffectiveness {
  modality:   RecoveryModality;
  label:      string;
  score:      number;         // mean readiness delta (positive = improved)
  confidence: "early" | "growing" | "established";
  sampleSize: number;
  tier:       EffectivenessTier;
}

export interface RecoveryEffectivenessReport {
  ranked:        ModalityEffectiveness[];      // sorted best-first
  hasGranular:   boolean;                      // ≥1 modality from recoveryResponse
  strategyHints: RecoveryStrategyOutcome[];    // fallback — broad strategy outcomes
}

const MIN_SAMPLES = 2;

// ─── Tier assignment ──────────────────────────────────────────────────────────

function assignTiers(results: Omit<ModalityEffectiveness, "tier">[]): ModalityEffectiveness[] {
  const n = results.length;
  return results.map((r, i) => ({
    ...r,
    tier: (i < Math.ceil(n / 3))               ? "most_effective"   :
          (i >= n - Math.floor(n / 3) && n > 2) ? "least_effective"  :
          "moderate",
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes per-modality effectiveness from recovery response logs.
 * Passes through strategyOutcomes as fallback context when granular data is thin.
 */
export function computeRecoveryEffectiveness(
  strategyOutcomes: RecoveryStrategyOutcome[],
): RecoveryEffectivenessReport {
  const entries = getRecoveryResponses().filter(e => e.scored && e.readinessAfter !== undefined);

  // Accumulate readiness deltas per modality
  const byModality = new Map<RecoveryModality, number[]>();
  for (const e of entries) {
    const delta = e.readinessAfter! - e.readinessBefore;
    const list  = byModality.get(e.modality) ?? [];
    list.push(delta);
    byModality.set(e.modality, list);
  }

  const results: Omit<ModalityEffectiveness, "tier">[] = [];
  for (const [modality, deltas] of byModality) {
    if (deltas.length < MIN_SAMPLES) continue;
    const score = Math.round(deltas.reduce((s, v) => s + v, 0) / deltas.length);
    results.push({
      modality,
      label:      modalityLabel(modality),
      score,
      confidence: deltas.length >= 10 ? "established" : deltas.length >= 5 ? "growing" : "early",
      sampleSize: deltas.length,
    });
  }

  // Sort best mean delta first
  results.sort((a, b) => b.score - a.score);

  return {
    ranked:        assignTiers(results),
    hasGranular:   results.length >= 1,
    strategyHints: strategyOutcomes,
  };
}
