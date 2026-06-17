// ─── lib/progression/plateauDetection.ts ─────────────────────────────────────
// Per-exercise plateau detection with confidence scoring.
// Reads from axis_exercise_history (29B).
// Distinct from analytics/performanceTrends.ts which reads from axis_workout_log.

import {
  getExercisePerformanceHistory,
  getAllExerciseHistory,
  type ExercisePerformance,
} from "./exerciseHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlateauReason =
  | "volume_flat"         // no volume growth across recent sessions
  | "weight_stuck"        // weight hasn't moved in multiple sessions
  | "rpe_rising"          // same load getting harder (RPE creeping up)
  | "incomplete_sets"     // consistently not finishing prescribed sets
  | "insufficient_data";  // fewer than MIN_SESSIONS completed

export interface PlateauResult {
  exerciseName:    string;
  plateauDetected: boolean;
  confidence:      number;        // 0–1; 0 = no data, 1 = very confident
  reason:          PlateauReason;
  sessionCount:    number;
  lastWeight:      number;
  lastReps:        number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SESSIONS    = 3;
const PLATEAU_WINDOW  = 4;   // sessions to look back
const FLAT_THRESHOLD  = 0.03; // <3% volume change = flat
const RPE_RISE_DELTA  = 0.8;  // RPE risen this much on average = rising effort

// ─── Volume proxy ─────────────────────────────────────────────────────────────

function volumeProxy(p: ExercisePerformance): number {
  return (p.weight + 1) * p.reps * p.sets;
}

// ─── Confidence (0–1) ─────────────────────────────────────────────────────────

function calcConfidence(sessionCount: number): number {
  if (sessionCount < MIN_SESSIONS) return 0;
  if (sessionCount === MIN_SESSIONS) return 0.45;
  if (sessionCount <= 5)  return 0.60;
  if (sessionCount <= 8)  return 0.75;
  if (sessionCount <= 12) return 0.85;
  return 0.92;
}

// ─── Core detection ───────────────────────────────────────────────────────────

export function detectPlateau(exerciseName: string): PlateauResult {
  const history  = getExercisePerformanceHistory(exerciseName);
  const completed = history.filter(p => p.completed);

  const base: PlateauResult = {
    exerciseName,
    plateauDetected: false,
    confidence:      0,
    reason:          "insufficient_data",
    sessionCount:    completed.length,
    lastWeight:      completed[0]?.weight ?? 0,
    lastReps:        completed[0]?.reps   ?? 0,
  };

  if (completed.length < MIN_SESSIONS) return base;

  const window = completed.slice(0, PLATEAU_WINDOW);
  const confidence = calcConfidence(completed.length);

  // ─ Incomplete sets: avg completed sets < prescribed for 3+ sessions ──────────
  const recentIncomplete = window
    .filter(p => p.sets < (completed[0]?.sets ?? p.sets))
    .length;
  if (recentIncomplete >= 2) {
    return {
      ...base,
      plateauDetected: true,
      confidence,
      reason: "incomplete_sets",
    };
  }

  // ─ Weight stuck: same weight across PLATEAU_WINDOW sessions ─────────────────
  const weights   = window.map(p => p.weight);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const weightRange = maxWeight > 0 ? (maxWeight - minWeight) / maxWeight : 0;
  const weightStuck = maxWeight > 0 && weightRange < 0.02 && window.length >= 3;

  // ─ Volume flat: recent 2 vs prior 2, <FLAT_THRESHOLD growth ─────────────────
  const recentVols = window.slice(0, 2).map(volumeProxy);
  const priorVols  = window.slice(2, 4).map(volumeProxy);

  let volumeFlat = false;
  if (priorVols.length > 0) {
    const recentMean = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
    const priorMean  = priorVols.reduce((s, v)  => s + v, 0) / priorVols.length;
    volumeFlat = priorMean > 0 &&
      Math.abs(recentMean - priorMean) / priorMean < FLAT_THRESHOLD;
  }

  // ─ RPE rising: effort increasing without load increase ───────────────────────
  const withRpe = window.filter(p => p.rpe && p.rpe > 0);
  let rpeRising = false;
  if (withRpe.length >= 3) {
    const mid     = Math.floor(withRpe.length / 2);
    const earlyRpe = withRpe.slice(mid).map(p => p.rpe ?? 0);
    const lateRpe  = withRpe.slice(0, mid).map(p => p.rpe ?? 0);
    const earlyMean = earlyRpe.reduce((s, v) => s + v, 0) / earlyRpe.length;
    const lateMean  = lateRpe.reduce((s, v)  => s + v, 0) / lateRpe.length;
    rpeRising = lateMean - earlyMean >= RPE_RISE_DELTA;
  }

  if (rpeRising) {
    return { ...base, plateauDetected: true, confidence, reason: "rpe_rising" };
  }

  if (weightStuck && volumeFlat) {
    return { ...base, plateauDetected: true, confidence, reason: "weight_stuck" };
  }

  if (volumeFlat) {
    return { ...base, plateauDetected: true, confidence, reason: "volume_flat" };
  }

  return { ...base, confidence };
}

// ─── Batch detection ──────────────────────────────────────────────────────────

/**
 * Returns plateau results for every exercise that has at least MIN_SESSIONS
 * completed entries in axis_exercise_history, sorted by confidence desc.
 */
export function detectAllPlateaus(): PlateauResult[] {
  const allHistory = getAllExerciseHistory();
  const names = [...new Set(allHistory.filter(p => p.completed).map(p => p.exerciseName))];

  return names
    .map(detectPlateau)
    .filter(r => r.sessionCount >= MIN_SESSIONS)
    .sort((a, b) => {
      // Detected plateaus first, then by confidence
      if (a.plateauDetected !== b.plateauDetected) return a.plateauDetected ? -1 : 1;
      return b.confidence - a.confidence;
    });
}
