// ─── lib/adaptive/accuracyCalibration.ts ──────────────────────────────────────
// Converts historical prediction errors into user-specific calibration factors.
// Pure function — callers pass all data in; no localStorage reads here.
//
// Direction convention:
//   badgeError = indexOf(actualBadge) - indexOf(predictedBadge)
//   Positive = over-predicted (actual more conservative than predicted) → shift toward Recover
//   Negative = under-predicted (actual less conservative than predicted) → shift toward Push

import type { ReadinessAccuracy } from "@/lib/adaptive/readinessValidation";
import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { DailyRecommendation, ReadinessBadge, IntensityLevel } from "@/types/recommendation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalibrationFactors {
  energyBias:   number;                  // [-1, 1] in badge levels
  recoveryBias: number;                  // [-0.15, 0.15] as fraction
  symptomBias:  Record<string, number>;  // per-symptom, [-2, 2] in severity units
  sampleCount:  number;
  computedAt:   string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BADGE_ORDER: ReadinessBadge[] = ["Push", "Maintain", "Watch", "Recover"];

// Intensity order is lowest → highest (opposite of badge order direction)
const INTENSITY_ORDER: IntensityLevel[] = [
  "Low", "Light to Moderate", "Moderate", "Moderate to High", "High",
];

const MIN_SAMPLES      = 14;
const MIN_SYMPTOM_DAYS = 3;
const WINDOW_DAYS      = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function meanOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function windowCutoff(): string {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

// ─── Calibration computation ──────────────────────────────────────────────────

export function computeCalibration(
  validations:    ReadinessAccuracy[],
  symptomHistory: SymptomEntry[],
): CalibrationFactors | null {
  if (validations.length < MIN_SAMPLES) return null;

  const cutoff = windowCutoff();
  const window = validations.filter(v => v.date >= cutoff);
  if (window.length < MIN_SAMPLES) return null;

  // ai - pi: positive = actual was more conservative than predicted = over-predicted readiness
  const errors = window.map(v => {
    const pi = BADGE_ORDER.indexOf(v.predictedBadge);
    const ai = BADGE_ORDER.indexOf(v.actualBadge);
    return ai - pi;
  });

  const meanError   = meanOf(errors);
  const energyBias  = clamp(meanError, -1, 1);
  const recoveryBias = clamp(meanError * 0.15, -0.15, 0.15);

  // ── Symptom bias: group prediction errors by symptom present that day ────────
  const symptomsByDate: Record<string, string[]> = {};
  for (const entry of symptomHistory) {
    if (!symptomsByDate[entry.date]) symptomsByDate[entry.date] = [];
    symptomsByDate[entry.date].push(entry.symptomId);
  }

  const errsBySymptom: Record<string, number[]> = {};
  for (let i = 0; i < window.length; i++) {
    const syms = symptomsByDate[window[i].date] ?? [];
    for (const id of syms) {
      if (!errsBySymptom[id]) errsBySymptom[id] = [];
      errsBySymptom[id].push(errors[i]);
    }
  }

  const symptomBias: Record<string, number> = {};
  for (const [id, errs] of Object.entries(errsBySymptom)) {
    if (errs.length < MIN_SYMPTOM_DAYS) continue;
    symptomBias[id] = clamp(meanOf(errs), -2, 2);
  }

  return {
    energyBias,
    recoveryBias,
    symptomBias,
    sampleCount: window.length,
    computedAt:  new Date().toISOString(),
  };
}

// ─── Apply calibration to a recommendation ────────────────────────────────────

export function applyAccuracyCalibration(
  rec:           DailyRecommendation,
  factors:       CalibrationFactors | null,
  todaySymptoms: SymptomEntry[],
): DailyRecommendation {
  if (!factors) return rec;

  // ── Compute combined badge shift ──────────────────────────────────────────────
  // Positive shift = toward Recover (more conservative)
  // Negative shift = toward Push (more optimistic)
  let shift = 0;

  // energyBias in [-1, 1]: threshold 0.5 → ±1 badge step
  if (Math.abs(factors.energyBias) >= 0.5) {
    shift += Math.sign(factors.energyBias);
  }

  // recoveryBias in [-0.15, 0.15]: threshold 0.10 → ±1 badge step
  if (Math.abs(factors.recoveryBias) >= 0.10) {
    shift += Math.sign(factors.recoveryBias);
  }

  // symptomBias per active symptom today: threshold 1.0 → ±1 badge step
  for (const s of todaySymptoms) {
    const bias = factors.symptomBias[s.symptomId] ?? 0;
    if (Math.abs(bias) >= 1.0) {
      shift += Math.sign(bias);
    }
  }

  shift = clamp(shift, -2, 2);
  if (shift === 0) return rec;

  // ── Apply badge shift ─────────────────────────────────────────────────────────
  const currentBadgeIdx = BADGE_ORDER.indexOf(rec.training.badge);
  const newBadgeIdx     = clamp(currentBadgeIdx + shift, 0, BADGE_ORDER.length - 1);

  if (newBadgeIdx === currentBadgeIdx) return rec;  // clamped to same level

  const newBadge = BADGE_ORDER[newBadgeIdx];

  // Co-adjust intensity in the opposite direction (lower intensity = badge more conservative)
  const currentIntensityIdx = INTENSITY_ORDER.indexOf(rec.training.intensity);
  const newIntensityIdx     = clamp(currentIntensityIdx - shift, 0, INTENSITY_ORDER.length - 1);
  const newIntensity        = INTENSITY_ORDER[newIntensityIdx];

  // ── Explanation point ─────────────────────────────────────────────────────────
  const direction = shift > 0 ? "more conservative" : "more optimistic";
  const calibrationPoint = {
    signal:      "Accuracy calibration",
    observation: `Based on ${factors.sampleCount} tracked prediction${factors.sampleCount !== 1 ? "s" : ""} over the past 30 days.`,
    implication: `Adjusted ${direction} using your historical response patterns.`,
    weight:      "Secondary" as const,
  };

  return {
    ...rec,
    training: {
      ...rec.training,
      badge:     newBadge,
      intensity: newIntensity,
    },
    explanationPoints: [...rec.explanationPoints, calibrationPoint],
  };
}
