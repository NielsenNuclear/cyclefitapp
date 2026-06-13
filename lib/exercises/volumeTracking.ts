// ─── lib/exercises/volumeTracking.ts ─────────────────────────────────────────
// Weekly muscle-volume estimation layer.
// Pure logic — no React, no side effects.
// Unit of volume: weighted sets (primary × 1.0, secondary × 0.5).

import type { GeneratedWorkout } from "./generateWorkout";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | "chest"
  | "upperBack"
  | "lats"
  | "rearDelts"
  | "frontDelts"
  | "sideDelts"
  | "biceps"
  | "triceps"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "obliques"
  | "lowerBack";

export type WeeklyVolume = Record<MuscleGroup, number>;

export interface VolumeTarget {
  maintenance: number;
  hypertrophy: number;
  strength:    number;
}

export type VolumeStatus = "under" | "on_target" | "over";

export type TrainingGoal = "maintenance" | "hypertrophy" | "strength";

export interface VolumeLandmarks {
  mev:        number;   // minimum effective sets per week (personalised)
  mrv:        number;   // maximum recoverable sets per week (personalised)
  confidence: number;   // 0–1; full confidence after ~8 calibrated weeks
  source:     "prior" | "calibrated";
}

export type VolumeLandmarkReport = Partial<Record<MuscleGroup, VolumeLandmarks>>;

export interface MuscleVolumeEntry {
  sets:   number;        // accumulated weighted sets
  target: VolumeTarget;  // static weekly targets (kept for reference)
  status: VolumeStatus;  // evaluated against effective target (personalised when available)
  mrv?:   number;        // personalised MRV (present when landmarks confidence ≥ 0.3)
}

export type VolumeReport = Record<MuscleGroup, MuscleVolumeEntry>;

// ─── All groups (for iteration) ───────────────────────────────────────────────

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  "chest", "upperBack", "lats", "rearDelts", "frontDelts", "sideDelts",
  "biceps", "triceps", "quadriceps", "hamstrings", "glutes", "calves",
  "abs", "obliques", "lowerBack",
];

// ─── Weekly volume targets (sets) ─────────────────────────────────────────────
// Approximate evidence-informed ranges. Maintenance = minimum to preserve mass;
// hypertrophy = optimal for muscle growth; strength = sufficient for adaptation
// at lower rep ranges. Not intended as exact clinical prescriptions.

export const VOLUME_TARGETS: Record<MuscleGroup, VolumeTarget> = {
  chest:      { maintenance:  8, hypertrophy: 14, strength: 10 },
  upperBack:  { maintenance: 10, hypertrophy: 16, strength: 12 },
  lats:       { maintenance:  8, hypertrophy: 14, strength: 10 },
  rearDelts:  { maintenance:  6, hypertrophy: 12, strength:  8 },
  frontDelts: { maintenance:  4, hypertrophy:  8, strength:  6 },
  sideDelts:  { maintenance:  6, hypertrophy: 14, strength:  8 },
  biceps:     { maintenance:  6, hypertrophy: 12, strength:  8 },
  triceps:    { maintenance:  6, hypertrophy: 12, strength:  8 },
  quadriceps: { maintenance:  8, hypertrophy: 14, strength: 10 },
  hamstrings: { maintenance:  6, hypertrophy: 12, strength:  8 },
  glutes:     { maintenance:  6, hypertrophy: 12, strength:  8 },
  calves:     { maintenance:  6, hypertrophy: 12, strength:  8 },
  abs:        { maintenance:  6, hypertrophy: 10, strength:  8 },
  obliques:   { maintenance:  4, hypertrophy:  8, strength:  6 },
  lowerBack:  { maintenance:  4, hypertrophy:  6, strength:  6 },
};

// ─── Muscle name → MuscleGroup resolution ────────────────────────────────────
// Ordered list of [substring, group] pairs. Each primaryMuscles / secondaryMuscles
// string from the exercise library is matched against this list (case-insensitive,
// first match wins). Specificity matters: longer / more specific patterns first.

const MUSCLE_KEYWORD_MAP: Array<[string, MuscleGroup]> = [
  // ── Chest ───────────────────────────────────────────────────────────────────
  ["pectoralis",          "chest"],

  // ── Deltoids (specific → generic order) ─────────────────────────────────────
  ["anterior deltoid",    "frontDelts"],
  ["medial deltoid",      "sideDelts"],
  ["posterior deltoid",   "rearDelts"],
  ["rear deltoid",        "rearDelts"],

  // ── Rotator cuff / posterior shoulder ────────────────────────────────────────
  ["infraspinatus",       "rearDelts"],
  ["teres minor",         "rearDelts"],
  ["rotator cuff",        "rearDelts"],

  // ── Lats / teres major ───────────────────────────────────────────────────────
  ["latissimus",          "lats"],
  ["teres major",         "lats"],     // must come after "teres minor"

  // ── Upper back ────────────────────────────────────────────────────────────────
  ["rhomboid",            "upperBack"],
  ["trapezius",           "upperBack"],
  ["serratus anterior",   "upperBack"],

  // ── Biceps / elbow flexors ───────────────────────────────────────────────────
  ["biceps",              "biceps"],
  ["brachialis",          "biceps"],
  ["brachioradialis",     "biceps"],

  // ── Triceps ───────────────────────────────────────────────────────────────────
  ["triceps",             "triceps"],
  ["anconeus",            "triceps"],

  // ── Quadriceps ────────────────────────────────────────────────────────────────
  ["quadricep",           "quadriceps"],
  ["vastus",              "quadriceps"],

  // ── Hamstrings ───────────────────────────────────────────────────────────────
  ["hamstring",           "hamstrings"],

  // ── Glutes / hip abductors ───────────────────────────────────────────────────
  ["glute",               "glutes"],
  ["hip abductor",        "glutes"],
  ["hip external rotator","glutes"],
  ["hip internal rotator","glutes"],

  // ── Calves ────────────────────────────────────────────────────────────────────
  ["gastrocnemius",       "calves"],
  ["soleus",              "calves"],
  ["calves",              "calves"],

  // ── Quadriceps (additional names) ────────────────────────────────────────────
  ["rectus femoris",      "quadriceps"],  // one of the four quad muscles

  // ── Shoulder girdle (vague term in ballistic/full-body exercises) ────────────
  ["shoulder girdle",     "frontDelts"],  // approximate: deltoid-dominant in context

  // ── Abs / core ───────────────────────────────────────────────────────────────
  ["rectus abdominis",    "abs"],
  ["transverse abdominis","abs"],
  ["abdominal",           "abs"],
  ["hip flexor",          "abs"],    // hip flexors are often trained alongside abs
  ["core",                "abs"],

  // ── Obliques / QL ────────────────────────────────────────────────────────────
  ["oblique",             "obliques"],
  ["quadratus lumborum",  "lowerBack"],

  // ── Lower back ────────────────────────────────────────────────────────────────
  ["spinal erector",      "lowerBack"],
  ["erector spinae",      "lowerBack"],
  ["spinal extensor",     "lowerBack"],  // "Spinal Extensors" in Cat-Cow etc.
  ["lumbar",              "lowerBack"],
];

export function resolveMuscleGroup(muscleName: string): MuscleGroup | null {
  const lower = muscleName.toLowerCase();
  for (const [keyword, group] of MUSCLE_KEYWORD_MAP) {
    if (lower.includes(keyword)) return group;
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyVolume(): WeeklyVolume {
  return Object.fromEntries(ALL_MUSCLE_GROUPS.map(g => [g, 0])) as WeeklyVolume;
}

function accumulateVolume(
  volume:    WeeklyVolume,
  muscles:   string[],
  sets:      number,
  multiplier: number,
): void {
  for (const muscle of muscles) {
    const group = resolveMuscleGroup(muscle);
    if (group) volume[group] += sets * multiplier;
  }
}

// ─── Core calculations ────────────────────────────────────────────────────────

export function calculateWorkoutVolume(workout: GeneratedWorkout): WeeklyVolume {
  const volume = emptyVolume();

  for (const ex of workout.exercises) {
    accumulateVolume(volume, ex.exercise.primaryMuscles,   ex.sets, 1.0);
    accumulateVolume(volume, ex.exercise.secondaryMuscles, ex.sets, 0.5);
  }

  return volume;
}

export function calculateWeeklyVolume(workouts: GeneratedWorkout[]): WeeklyVolume {
  const total = emptyVolume();

  for (const workout of workouts) {
    const wv = calculateWorkoutVolume(workout);
    for (const group of ALL_MUSCLE_GROUPS) {
      total[group] += wv[group];
    }
  }

  // Round to one decimal place to keep report values readable
  for (const group of ALL_MUSCLE_GROUPS) {
    total[group] = Math.round(total[group] * 10) / 10;
  }

  return total;
}

// ─── Volume status thresholds ─────────────────────────────────────────────────
// under    < 80 % of target
// on_target 80 %–130 % of target
// over     > 130 % of target

const UNDER_THRESHOLD = 0.8;
const OVER_THRESHOLD  = 1.3;

function resolveStatus(sets: number, target: number): VolumeStatus {
  if (sets > target * OVER_THRESHOLD)  return "over";
  if (sets >= target * UNDER_THRESHOLD) return "on_target";
  return "under";
}

// ─── Report generation ────────────────────────────────────────────────────────

export function generateVolumeReport(
  volume:     WeeklyVolume,
  goal:       TrainingGoal,
  landmarks?: VolumeLandmarkReport,
): VolumeReport {
  return Object.fromEntries(
    ALL_MUSCLE_GROUPS.map(group => {
      const sets     = volume[group];
      const target   = VOLUME_TARGETS[group];
      const landmark = landmarks?.[group];
      const usePersonalised = landmark && landmark.confidence >= 0.3;

      return [group, {
        sets,
        target,
        status: resolveStatus(sets, usePersonalised ? landmark.mev : target[goal]),
        mrv:    usePersonalised ? landmark.mrv : undefined,
      }];
    })
  ) as VolumeReport;
}

// ─── Convenience: single-call report from workouts ───────────────────────────

export function weeklyVolumeReport(
  workouts: GeneratedWorkout[],
  goal:     TrainingGoal,
): VolumeReport {
  return generateVolumeReport(calculateWeeklyVolume(workouts), goal);
}

// ─── Weekly volume from history entries (duck-typed) ─────────────────────────
// Works with WorkoutHistoryEntry[] without importing from workoutHistory to
// avoid a cross-module dependency. Entries only contribute if they have
// primaryMuscles / secondaryMuscles populated (stored from Phase 8 onwards).

interface HistoryLike {
  exercises: Array<{
    sets:              number;
    primaryMuscles?:   string[];
    secondaryMuscles?: string[];
  }>;
}

export function calculateWeeklyVolumeFromHistory(entries: HistoryLike[]): WeeklyVolume {
  const total = emptyVolume();
  for (const entry of entries) {
    for (const ex of entry.exercises) {
      if (ex.primaryMuscles)   accumulateVolume(total, ex.primaryMuscles,   ex.sets, 1.0);
      if (ex.secondaryMuscles) accumulateVolume(total, ex.secondaryMuscles, ex.sets, 0.5);
    }
  }
  for (const group of ALL_MUSCLE_GROUPS) {
    total[group] = Math.round(total[group] * 10) / 10;
  }
  return total;
}
