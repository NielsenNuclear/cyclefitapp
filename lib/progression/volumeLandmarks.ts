// ─── lib/progression/volumeLandmarks.ts ──────────────────────────────────────
// Personalises MEV and MRV per muscle group via Bayesian updating of the
// evidence-based VOLUME_TARGETS priors with the user's observed training data.
// Pure logic — no React, no localStorage, no side effects.

import {
  ALL_MUSCLE_GROUPS,
  VOLUME_TARGETS,
  type MuscleGroup,
  type TrainingGoal,
  type WeeklyVolume,
  type VolumeLandmarks,
  type VolumeLandmarkReport,
} from "@/lib/exercises/volumeTracking";

export type { VolumeLandmarks, VolumeLandmarkReport };

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIOR_STRENGTH         = 4;    // equivalent weeks of prior data in the posterior
const MIN_WEEKS_TO_CALIBRATE = 2;    // minimum observed weeks before calibrating
const FULL_CONFIDENCE_WEEKS  = 8;    // confidence reaches 1.0 at this many weeks
const MRV_PRIOR_MULTIPLIER   = 1.6;  // priorMRV = priorMEV × this
const MRV_TOLERANCE_BUFFER   = 1.1;  // observed P90 × this (10% tolerance headroom)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return sorted[idx];
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes personalised MEV and MRV for each muscle group by blending the
 * evidence-based VOLUME_TARGETS priors with the user's observed weekly volumes.
 *
 * weeklyVolumes — one WeeklyVolume per training week (any order, up to ~8 weeks)
 * goal          — determines which prior target column to use as MEV anchor
 *
 * Groups with < 2 observed training weeks are returned with source: "prior"
 * and confidence: 0. Callers should use static VOLUME_TARGETS as a fallback
 * for any group that is absent from the report (empty weeklyVolumes case).
 */
export function computeVolumeLandmarks(
  weeklyVolumes: WeeklyVolume[],
  goal:          TrainingGoal,
): VolumeLandmarkReport {
  if (weeklyVolumes.length === 0) return {};

  const report: VolumeLandmarkReport = {};

  for (const group of ALL_MUSCLE_GROUPS) {
    const priorMEV = VOLUME_TARGETS[group][goal];
    const priorMRV = priorMEV * MRV_PRIOR_MULTIPLIER;

    // Collect set counts for weeks where this muscle was actually trained
    const observed = weeklyVolumes
      .map(w => w[group])
      .filter(sets => sets > 0)
      .sort((a, b) => a - b);

    if (observed.length < MIN_WEEKS_TO_CALIBRATE) {
      report[group] = {
        mev:        Math.round(priorMEV * 10) / 10,
        mrv:        Math.round(priorMRV * 10) / 10,
        confidence: 0,
        source:     "prior",
      };
      continue;
    }

    const n = observed.length;
    // α shrinks toward 0 as n grows — prior gradually yields to data
    const α = PRIOR_STRENGTH / (n + PRIOR_STRENGTH);

    // MEV: prior blended with 25th-percentile of observed (floor of consistent training)
    const observedP25 = percentile(observed, 0.25);
    const personalMEV = α * priorMEV + (1 - α) * observedP25;

    // MRV: prior blended with 90th-percentile ceiling + tolerance buffer
    const observedP90 = percentile(observed, 0.9);
    const observedMRV = Math.max(priorMRV, observedP90 * MRV_TOLERANCE_BUFFER);
    const personalMRV = α * priorMRV + (1 - α) * observedMRV;

    report[group] = {
      mev:        Math.round(personalMEV * 10) / 10,
      mrv:        Math.round(personalMRV * 10) / 10,
      confidence: Math.min(1.0, n / FULL_CONFIDENCE_WEEKS),
      source:     "calibrated",
    };
  }

  return report;
}
