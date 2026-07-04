// ─── lib/athlete/trainingFingerprint.ts ──────────────────────────────────────
// Phase 62D — Training Fingerprint
// Classifies the athlete's training style from their actual workout history:
// how much strength vs hypertrophy vs conditioning work they do, how varied
// their exercise selection is, and how consistent their schedule is.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingBias =
  | "strength-focused"
  | "hypertrophy-focused"
  | "conditioning-focused"
  | "balanced"
  | "recovery-focused";

export interface TrainingFingerprint {
  primaryBias:          TrainingBias;
  strengthBias:         number;     // 0–100 relative share
  hypertrophyBias:      number;
  conditioningBias:     number;
  varietyIndex:         number;     // 0–100: 100 = never repeats, 0 = always the same
  consistencyIndex:     number;     // 0–100: session-to-session volume consistency
  avgSetsPerSession:    number;
  avgExercisesPerSession: number;
  preferredSplitTypes:  string[];
  mostTrainedMuscles:   string[];
  sessionLengthBias:    "short" | "medium" | "long";  // <35 / 35-65 / >65 min
  dataReady:            boolean;
  sampleCount:          number;
}

// ─── Bias detection ───────────────────────────────────────────────────────────

// Split type heuristics
const STRENGTH_SPLITS    = new Set(["push_pull_legs", "upper_lower", "full_body"]);
const HYPERTROPHY_SPLITS = new Set(["push_pull_legs", "body_part_split"]);
const CONDITIONING_SPLITS = new Set(["full_body"]);

// RPE heuristics — high RPE (≥8) → strength, low RPE (<6) → conditioning
function biasFromRpe(rpe: number | undefined): "strength" | "hypertrophy" | "conditioning" | null {
  if (rpe === undefined) return null;
  if (rpe >= 8) return "strength";
  if (rpe <= 5) return "conditioning";
  return "hypertrophy";
}

function varietyIndex(history: WorkoutHistoryEntry[]): number {
  if (history.length < 3) return 50;
  // Compare exercise name sets between consecutive sessions
  let overlapSum = 0;
  let pairs = 0;
  for (let i = 1; i < Math.min(history.length, 20); i++) {
    const prev = new Set(history[i - 1].exercises.map(e => e.name));
    const curr = new Set(history[i].exercises.map(e => e.name));
    if (prev.size === 0 || curr.size === 0) continue;
    const intersection = [...curr].filter(n => prev.has(n)).length;
    overlapSum += intersection / Math.max(prev.size, curr.size);
    pairs++;
  }
  if (pairs === 0) return 50;
  const avgOverlap = overlapSum / pairs;
  return Math.round((1 - avgOverlap) * 100);
}

function consistencyIndex(history: WorkoutHistoryEntry[]): number {
  const completed = history.filter(e => e.status === "completed" || e.status === "partially_completed");
  if (completed.length < 4) return 50;
  const volumes = completed.map(e => e.exercises.reduce((s, ex) => s + ex.sets, 0));
  const mean = volumes.reduce((s, v) => s + v, 0) / volumes.length;
  if (mean === 0) return 50;
  const cv = Math.sqrt(volumes.reduce((s, v) => s + (v - mean) ** 2, 0) / volumes.length) / mean;
  return Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeTrainingFingerprint(history: WorkoutHistoryEntry[]): TrainingFingerprint {
  const EMPTY: TrainingFingerprint = {
    primaryBias: "balanced",
    strengthBias: 33, hypertrophyBias: 33, conditioningBias: 34,
    varietyIndex: 50, consistencyIndex: 50,
    avgSetsPerSession: 0, avgExercisesPerSession: 0,
    preferredSplitTypes: [], mostTrainedMuscles: [],
    sessionLengthBias: "medium",
    dataReady: false, sampleCount: 0,
  };

  const completed = history.filter(e =>
    e.status === "completed" || e.status === "partially_completed"
  );
  if (completed.length < 5) return EMPTY;

  // Split type frequency
  const splitFreq: Record<string, number> = {};
  completed.forEach(e => {
    splitFreq[e.splitType] = (splitFreq[e.splitType] ?? 0) + 1;
  });
  const topSplits = Object.entries(splitFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  // Muscle group frequency
  const muscleFreq: Record<string, number> = {};
  completed.forEach(e =>
    e.exercises.forEach(ex =>
      (ex.primaryMuscles ?? []).forEach(m => {
        muscleFreq[m] = (muscleFreq[m] ?? 0) + 1;
      })
    )
  );
  const topMuscles = Object.entries(muscleFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([m]) => m);

  // Bias from splits + RPE
  let strengthCount = 0, hypertrophyCount = 0, conditioningCount = 0;
  completed.forEach(e => {
    if (STRENGTH_SPLITS.has(e.splitType))     strengthCount++;
    if (HYPERTROPHY_SPLITS.has(e.splitType))  hypertrophyCount++;
    if (CONDITIONING_SPLITS.has(e.splitType)) conditioningCount++;
    // RPE signals
    e.exercises.forEach(ex => {
      const bias = biasFromRpe(ex.rpe);
      if (bias === "strength")     strengthCount += 0.5;
      if (bias === "hypertrophy")  hypertrophyCount += 0.5;
      if (bias === "conditioning") conditioningCount += 0.5;
    });
  });
  const total = strengthCount + hypertrophyCount + conditioningCount;
  const sB = total > 0 ? Math.round((strengthCount / total) * 100)    : 33;
  const hB = total > 0 ? Math.round((hypertrophyCount / total) * 100) : 33;
  const cB = 100 - sB - hB;

  // Primary bias
  let primaryBias: TrainingBias = "balanced";
  if (sB >= 45) primaryBias = "strength-focused";
  else if (hB >= 45) primaryBias = "hypertrophy-focused";
  else if (cB >= 45) primaryBias = "conditioning-focused";
  else if (Math.max(sB, hB, cB) < 40) {
    // Check if mostly rest/recovery splits
    const recoveryRate = history.filter(e => e.status === "skipped").length / history.length;
    if (recoveryRate > 0.4) primaryBias = "recovery-focused";
  }

  // Average sets and exercises
  const avgSets = completed.reduce((s, e) =>
    s + e.exercises.reduce((es, ex) => es + ex.sets, 0), 0) / completed.length;
  const avgExercises = completed.reduce((s, e) => s + e.exercises.length, 0) / completed.length;

  // Session length bias
  const avgDuration = completed.reduce((s, e) => s + e.estimatedDurationMin, 0) / completed.length;
  const lengthBias: TrainingFingerprint["sessionLengthBias"] =
    avgDuration < 35 ? "short" : avgDuration > 65 ? "long" : "medium";

  return {
    primaryBias,
    strengthBias:           sB,
    hypertrophyBias:        hB,
    conditioningBias:       cB,
    varietyIndex:           varietyIndex(completed),
    consistencyIndex:       consistencyIndex(completed),
    avgSetsPerSession:      Math.round(avgSets * 10) / 10,
    avgExercisesPerSession: Math.round(avgExercises * 10) / 10,
    preferredSplitTypes:    topSplits,
    mostTrainedMuscles:     topMuscles,
    sessionLengthBias:      lengthBias,
    dataReady:              true,
    sampleCount:            completed.length,
  };
}
