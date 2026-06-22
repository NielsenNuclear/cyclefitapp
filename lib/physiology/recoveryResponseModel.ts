// ─── lib/physiology/recoveryResponseModel.ts ─────────────────────────────────
// 40D — Recovery Response Modeling
// Learn which recovery modalities actually produce next-day readiness gains
// for THIS individual (e.g. "Walking works; Meditation does nothing").

import { getRecoveryResponses, modalityLabel } from "@/lib/recovery/recoveryResponse";
import type { RecoveryModality }               from "@/lib/recovery/recoveryResponse";

const MIN_SAMPLE = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModalityResult {
  modality:   RecoveryModality;
  label:      string;
  meanLift:   number;   // readinessAfter – readinessBefore; positive = helpful
  sampleSize: number;
  effective:  boolean;  // meanLift >= 5
}

export interface RecoveryResponseProfile {
  modalities:    ModalityResult[];
  bestModality:  RecoveryModality | null;
  worstModality: RecoveryModality | null;
  dataReady:     boolean;
  insight:       string;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeRecoveryResponseProfile(): RecoveryResponseProfile {
  const EMPTY: RecoveryResponseProfile = {
    modalities: [], bestModality: null, worstModality: null,
    dataReady: false,
    insight: "Track recovery strategies to learn what works for your body.",
  };

  const log = getRecoveryResponses().filter(e => e.scored && e.readinessAfter !== undefined);
  if (log.length < MIN_SAMPLE) return EMPTY;

  const buckets = new Map<RecoveryModality, number[]>();
  for (const e of log) {
    const lift = (e.readinessAfter ?? e.readinessBefore) - e.readinessBefore;
    const arr  = buckets.get(e.modality) ?? [];
    arr.push(lift);
    buckets.set(e.modality, arr);
  }

  const modalities: ModalityResult[] = [];
  for (const [modality, lifts] of buckets.entries()) {
    if (lifts.length < MIN_SAMPLE) continue;
    const meanLift = Math.round((lifts.reduce((s, v) => s + v, 0) / lifts.length) * 10) / 10;
    modalities.push({
      modality,
      label:      modalityLabel(modality),
      meanLift,
      sampleSize: lifts.length,
      effective:  meanLift >= 5,
    });
  }

  if (modalities.length === 0) return EMPTY;
  modalities.sort((a, b) => b.meanLift - a.meanLift);

  const bestModality  = modalities[0].modality;
  const worstModality = modalities[modalities.length - 1].modality;

  const insight = modalities[0].effective
    ? `${modalityLabel(bestModality)} boosts your next-day readiness by +${modalities[0].meanLift} pts on average.`
    : "No recovery strategy has shown a strong lift yet — keep logging to learn more.";

  return { modalities, bestModality, worstModality, dataReady: true, insight };
}
