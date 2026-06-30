// ─── lib/bodyIntelligence/muscleStateEngine.ts ───────────────────────────────
// Derives per-muscle-group state from existing Axis intelligence.
// Pure function — no side effects.

import { MUSCLE_GROUPS, muscleGroupIdsForLibraryName } from "./muscleGroups";
import type {
  MuscleGroupState,
  MuscleState,
  FatigueLevel,
  ConfidenceLevel,
  SymptomRecord,
  VisualizationMode,
  BodyIntelligenceSnapshot,
} from "./bodyIntelligenceTypes";
import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { RecoveryScore }     from "@/lib/recovery/recoveryTypes";
import type { FatigueScoreEntry, FatigueZone } from "@/lib/autoregulation/fatigueModel";
import type { SymptomEntry }      from "@/lib/symptoms/symptomHistory";
import { getWorkoutHistory }      from "@/lib/history/workoutHistory";
import type { StoredExercise }    from "@/lib/history/workoutHistory";

// ─── Internal accumulators ─────────────────────────────────────────────────────

interface MuscleAccumulator {
  trainedDates:      string[];
  totalSets:         number;
  isScheduledPrimary: boolean;
  isScheduledSecondary: boolean;
}

function emptyAccumulator(): MuscleAccumulator {
  return { trainedDates: [], totalSets: 0, isScheduledPrimary: false, isScheduledSecondary: false };
}

// ─── Exercise → muscle group mapping ─────────────────────────────────────────

function collectMuscleIdsFromExercise(
  primaryMuscles:   string[],
  secondaryMuscles: string[],
): { primary: Set<string>; secondary: Set<string> } {
  const primary   = new Set<string>();
  const secondary = new Set<string>();

  for (const m of primaryMuscles) {
    for (const id of muscleGroupIdsForLibraryName(m)) primary.add(id);
  }
  for (const m of secondaryMuscles) {
    for (const id of muscleGroupIdsForLibraryName(m)) {
      if (!primary.has(id)) secondary.add(id);
    }
  }
  return { primary, secondary };
}

// ─── Recovery estimation per muscle group ────────────────────────────────────

const BASE_RECOVERY_HOURS: Record<string, number> = {
  // Large compound muscle groups recover more slowly
  quads:        72,
  hamstrings:   72,
  glute_max:    72,
  lat:          60,
  pec_major:    60,
  erector_spinae: 72,
  // Medium groups
  posterior_delt: 48,
  anterior_delt:  48,
  lateral_delt:   48,
  bicep:          48,
  tricep:         48,
  calves:         48,
  adductors:      60,
  abductors:      48,
  hip_flexors:    48,
  // Small / stabiliser groups
  upper_trap:     36,
  middle_trap:    36,
  lower_trap:     36,
  rhomboids:      36,
  rotator_cuff:   36,
  serratus:       36,
  rectus_abdominis: 48,
  obliques:       36,
  transverse_abdominis: 36,
  quadratus_lumborum:   48,
  glute_med:      48,
  hip_external_rotators: 36,
  forearm:        36,
  neck:           24,
  tibialis_anterior: 36,
  peroneals:      36,
};

function recoveryPercent(
  muscleId:         string,
  daysSinceTraining: number | null,
  recoveryScore?:   RecoveryScore,
): number {
  if (daysSinceTraining === null) return 100;

  const baseHours  = BASE_RECOVERY_HOURS[muscleId] ?? 48;
  const baseRate   = 1 / baseHours;
  // Global recovery modifier from recovery score
  const globalMod  = recoveryScore ? (recoveryScore.score / 100) * 0.4 + 0.6 : 1;
  const hoursRecovered = daysSinceTraining * 24 * globalMod;
  const pct        = Math.min(100, Math.round((hoursRecovered / baseHours) * 100));
  return Math.max(0, pct);
}

// ─── State derivation ─────────────────────────────────────────────────────────

function deriveState(
  acc:           MuscleAccumulator,
  muscleId:      string,
  daysSince:     number | null,
  recovPct:      number,
  fatigueZone:   FatigueZone | undefined,
  injuredIds:    Set<string>,
): MuscleState {
  if (injuredIds.has(muscleId)) return "injured";
  if (acc.isScheduledPrimary)   return "scheduled";
  if (acc.isScheduledSecondary) return "secondary";
  if (daysSince === null)        return "recovered";

  if (fatigueZone === "overreached") {
    if (recovPct < 40) return "overloaded";
    if (recovPct < 60) return "fatigued";
  }

  if (recovPct < 30)  return "recovering";
  if (recovPct < 50)  return "recovering";
  if (recovPct < 70) {
    if (daysSince <= 1) return "recently_trained";
    return "recovering";
  }
  if (daysSince <= 1)  return "recently_trained";
  return "recovered";
}

function fatigueLevel(recovPct: number): FatigueLevel {
  if (recovPct < 40) return "high";
  if (recovPct < 65) return "moderate";
  return "low";
}

function confidence(
  acc:  MuscleAccumulator,
  totalHistory: number,
): ConfidenceLevel {
  if (totalHistory < 3)           return "low";
  if (acc.trainedDates.length < 2) return "moderate";
  return "high";
}

// ─── Main engine ─────────────────────────────────────────────────────────────

export interface MuscleStateEngineInput {
  todayWorkout?:    GeneratedWorkout;
  recoveryScore?:   RecoveryScore | null;
  fatigueEntry?:    FatigueScoreEntry | null;
  todaySymptoms?:   SymptomEntry[];
  cyclePhase?:      string;
}

export function computeBodyIntelligenceSnapshot(
  input:  MuscleStateEngineInput,
  mode:   VisualizationMode = "today",
  timeline: BodyIntelligenceSnapshot["timeline"] = "today",
): BodyIntelligenceSnapshot {
  const {
    todayWorkout,
    recoveryScore,
    fatigueEntry,
    todaySymptoms  = [],
    cyclePhase,
  } = input;

  const todayStr = new Date().toISOString().slice(0, 10);
  const history  = getWorkoutHistory();

  // ── Build accumulators for each muscle group ──────────────────────────────
  const accMap = new Map<string, MuscleAccumulator>();
  for (const g of MUSCLE_GROUPS) {
    accMap.set(g.id, emptyAccumulator());
  }

  // Past 28 days of history
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // WorkoutHistoryEntry.exercises is StoredExercise[] — muscles at top level
  for (const entry of history) {
    if (entry.id < cutoffStr) continue;
    for (const ex of (entry.exercises ?? [])) {
      const { primary, secondary } = collectMuscleIdsFromExercise(
        ex.primaryMuscles   ?? [],
        ex.secondaryMuscles ?? [],
      );
      for (const id of primary) {
        const acc = accMap.get(id);
        if (!acc) continue;
        if (!acc.trainedDates.includes(entry.id)) acc.trainedDates.push(entry.id);
        acc.totalSets += ex.sets ?? 1;
      }
      for (const id of secondary) {
        const acc = accMap.get(id);
        if (!acc) continue;
        if (!acc.trainedDates.includes(entry.id)) acc.trainedDates.push(entry.id);
      }
    }
  }

  // Mark today's scheduled muscles — GeneratedWorkout.exercises is WorkoutExercise[]
  // muscles live at ex.exercise.primaryMuscles / ex.exercise.secondaryMuscles
  if (todayWorkout?.exercises) {
    for (const ex of todayWorkout.exercises as WorkoutExercise[]) {
      const { primary, secondary } = collectMuscleIdsFromExercise(
        ex.exercise?.primaryMuscles   ?? [],
        ex.exercise?.secondaryMuscles ?? [],
      );
      for (const id of primary) {
        const acc = accMap.get(id);
        if (acc) acc.isScheduledPrimary = true;
      }
      for (const id of secondary) {
        const acc = accMap.get(id);
        if (acc) acc.isScheduledSecondary = true;
      }
    }
  }

  // ── Symptom mapping ───────────────────────────────────────────────────────
  const symptomsByMuscle = new Map<string, SymptomRecord[]>();
  const injuredIds       = new Set<string>();

  for (const s of todaySymptoms) {
    const label    = s.symptomId ?? "";
    const severity = (s.severity ?? 0) as 0 | 1 | 2 | 3;
    // Simple keyword → muscle mapping
    const keywords: Array<[string, string[]]> = [
      ["knee",        ["quads", "hamstrings"]],
      ["quad",        ["quads"]],
      ["hamstring",   ["hamstrings"]],
      ["glute",       ["glute_max", "glute_med"]],
      ["hip",         ["hip_flexors", "glute_med"]],
      ["shoulder",    ["anterior_delt", "lateral_delt", "posterior_delt", "rotator_cuff"]],
      ["chest",       ["pec_major"]],
      ["back",        ["erector_spinae", "lat"]],
      ["lower back",  ["erector_spinae", "quadratus_lumborum"]],
      ["neck",        ["neck", "upper_trap"]],
      ["calf",        ["calves"]],
      ["ankle",       ["calves", "peroneals", "tibialis_anterior"]],
      ["elbow",       ["bicep", "tricep", "forearm"]],
      ["wrist",       ["forearm"]],
      ["abs",         ["rectus_abdominis", "obliques"]],
    ];

    const lc = label.toLowerCase();
    for (const [kw, ids] of keywords) {
      if (lc.includes(kw)) {
        for (const id of ids) {
          const existing = symptomsByMuscle.get(id) ?? [];
          existing.push({ symptomId: s.symptomId, label, severity, date: todayStr });
          symptomsByMuscle.set(id, existing);
          if (severity >= 2) injuredIds.add(id);
        }
      }
    }
  }

  // ── Cycle modifier ─────────────────────────────────────────────────────────
  function cycleModifier(muscleId: string): number {
    if (!cyclePhase) return 0;
    const phase = cyclePhase.toLowerCase();
    // Follicular / Ovulatory: slight positive for strength muscles
    if (phase.includes("follicular") || phase.includes("ovulatory")) {
      if (["quads", "glute_max", "pec_major", "lat"].includes(muscleId)) return 0.2;
    }
    // Menstrual: reduce lower body emphasis
    if (phase.includes("menstrual")) {
      if (["quads", "hamstrings", "glute_max", "hip_flexors"].includes(muscleId)) return -0.2;
    }
    // Late luteal: slight reduction everywhere
    if (phase.includes("late luteal")) return -0.1;
    return 0;
  }

  // ── 7-day volume summary ───────────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);

  // ── Build output ───────────────────────────────────────────────────────────
  const muscles: MuscleGroupState[] = [];

  for (const g of MUSCLE_GROUPS) {
    const acc = accMap.get(g.id)!;

    const recentDates = acc.trainedDates.filter(d => d >= sevenDaysStr).sort().reverse();
    const allDates    = acc.trainedDates.sort().reverse();
    const lastDate    = allDates[0] ?? null;
    const daysSince   = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
      : null;

    const recovPct  = recoveryPercent(g.id, daysSince, recoveryScore ?? undefined);
    const zone      = fatigueEntry?.zone;
    const state     = deriveState(acc, g.id, daysSince, recovPct, zone, injuredIds);
    const fatigue   = fatigueLevel(recovPct);
    const conf      = confidence(acc, history.length);
    const symptoms  = symptomsByMuscle.get(g.id) ?? [];
    const mod       = cycleModifier(g.id);

    const weekSets   = history
      .filter(e => e.id >= sevenDaysStr)
      .flatMap(e => e.exercises ?? [])
      .filter((ex: StoredExercise) => {
        const { primary } = collectMuscleIdsFromExercise(
          ex.primaryMuscles ?? [], ex.secondaryMuscles ?? [],
        );
        return primary.has(g.id);
      })
      .reduce((sum: number, ex: StoredExercise) => sum + (ex.sets ?? 1), 0);

    // Volume score relative to rough MRV (max recoverable volume)
    const MRV_APPROX: Record<string, number> = {
      quads: 20, hamstrings: 16, glute_max: 20, lat: 20, pec_major: 16,
      erector_spinae: 12, anterior_delt: 12, lateral_delt: 16, posterior_delt: 16,
      bicep: 20, tricep: 20, calves: 16, rectus_abdominis: 20, obliques: 16,
    };
    const mrv        = MRV_APPROX[g.id] ?? 12;
    const volScore   = Math.min(100, Math.round((weekSets / mrv) * 100));

    // Build one entry per side (or single for bilateral = false)
    const sides: Array<"left" | "right" | "bilateral"> = g.bilateral
      ? ["left", "right"]
      : ["bilateral"];

    for (const side of sides) {
      muscles.push({
        id:              g.bilateral ? `${g.id}_${side}` : g.id,
        displayName:     g.displayName + (g.bilateral ? ` (${side})` : ""),
        side,
        state,
        recoveryPercent: recovPct,
        fatigueLevel:    fatigue,
        lastTrainedDate: lastDate,
        daysSinceTraining: daysSince,
        nextScheduledDate: acc.isScheduledPrimary || acc.isScheduledSecondary ? todayStr : null,
        weeklyFrequency:   recentDates.length,
        weeklyVolume:      weekSets,
        symptoms,
        confidence:        conf,
        cycleModifier:     mod,
        volumeScore:       volScore,
        mobilityFlag:      symptoms.some(s => s.severity >= 1),
      });
    }
  }

  return {
    date:      todayStr,
    muscles,
    mode,
    timeline,
    dataReady: history.length > 0 || !!todayWorkout,
  };
}

// ─── Lookup by GLTF node name ─────────────────────────────────────────────────

export function findMuscleByGltfNode(
  snapshot:  BodyIntelligenceSnapshot,
  nodeName:  string,
): MuscleGroupState | undefined {
  // nodeName format: "muscle_quads_left" → id "quads_left"
  const id = nodeName.replace(/^muscle_/, "");
  return snapshot.muscles.find(m => m.id === id);
}
