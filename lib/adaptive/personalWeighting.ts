// ─── lib/adaptive/personalWeighting.ts ───────────────────────────────────────
// Learns which readiness factors (sleep, stress, symptoms) are most predictive
// for this specific user, using Pearson correlation against observed readiness
// scores. Pre-calibration returns equal flat weights.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { SymptomEntry }          from "@/lib/symptoms/symptomHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalWeights {
  sleep:        number;   // 0–1; relative predictive contribution
  stress:       number;   // 0–1
  symptoms:     number;   // 0–1
  sampleSize:   number;   // number of days used in calibration
  isCalibrated: boolean;  // true once sampleSize >= MIN_SAMPLES
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SAMPLES   = 14;                  // days needed before calibration kicks in
const FLAT_WEIGHT   = 1 / 3;             // equal weights pre-calibration

// ─── Pearson correlation ──────────────────────────────────────────────────────

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) { sumX += x[i]; sumY += y[i]; }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0, varX = 0, varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num  += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denom = Math.sqrt(varX * varY);
  return denom === 0 ? 0 : num / denom;
}

// ─── Symptom burden per date ──────────────────────────────────────────────────

function buildSymptomBurdenMap(symptomHistory: SymptomEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of symptomHistory) {
    map.set(e.date, (map.get(e.date) ?? 0) + e.severity);
  }
  return map;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Derives personal readiness-factor weights from observed history.
 *
 * Uses absolute Pearson correlation between each factor's contributor
 * score and the actual readiness outcome — a higher absolute correlation
 * means the factor is more predictive for this user.
 *
 * Returns flat equal weights until MIN_SAMPLES (14) calibrated days exist.
 */
export function buildPersonalWeights(
  readinessHistory: ReadinessHistoryEntry[],
  symptomHistory:   SymptomEntry[],
): PersonalWeights {
  // Only entries that have contributor data (stored from Phase 13C onward)
  const calibrated = readinessHistory.filter(e => e.contributors != null);

  if (calibrated.length < MIN_SAMPLES) {
    return {
      sleep:        FLAT_WEIGHT,
      stress:       FLAT_WEIGHT,
      symptoms:     FLAT_WEIGHT,
      sampleSize:   calibrated.length,
      isCalibrated: false,
    };
  }

  const symptomBurden = buildSymptomBurdenMap(symptomHistory);

  const scores:   number[] = [];
  const sleepVec: number[] = [];
  const stressVec:number[] = [];
  const sympVec:  number[] = [];

  for (const e of calibrated) {
    scores.push(e.score);
    sleepVec.push(e.contributors!.sleep);
    stressVec.push(e.contributors!.stress);
    // Higher symptom burden → lower readiness; use inverted scale (100 − burden)
    // so that all vectors point in the same direction as score for comparability,
    // but we use absolute correlation anyway so this is just for clarity.
    sympVec.push(symptomBurden.get(e.date) ?? 0);
  }

  const rSleep   = Math.abs(pearson(sleepVec,  scores));
  const rStress  = Math.abs(pearson(stressVec, scores));
  const rSymptom = Math.abs(pearson(sympVec,   scores));

  const total = rSleep + rStress + rSymptom;

  // If all correlations collapse to zero (e.g. no variance in data),
  // fall back to flat weights rather than dividing by zero.
  if (total === 0) {
    return {
      sleep:        FLAT_WEIGHT,
      stress:       FLAT_WEIGHT,
      symptoms:     FLAT_WEIGHT,
      sampleSize:   calibrated.length,
      isCalibrated: false,
    };
  }

  return {
    sleep:        Math.round((rSleep   / total) * 100) / 100,
    stress:       Math.round((rStress  / total) * 100) / 100,
    symptoms:     Math.round((rSymptom / total) * 100) / 100,
    sampleSize:   calibrated.length,
    isCalibrated: true,
  };
}
