/**
 * exerciseIntelligence.ts
 *
 * Pure computation layer for Phase 60 — Exercise Intelligence Explorer.
 * No React, no localStorage, no side effects.
 *
 * Receives data from existing systems and produces structured output for
 * the ExerciseIntelligencePanel UI.
 *
 * Future phases add to ExerciseFutureExtensions without touching this API.
 */

import type { MuscleRecord }         from "./BodyStateEngine";
import type { MuscleGroupDef }       from "./muscleGroups";
import type { Exercise, MovementPattern } from "@/lib/exercises/exerciseLibrary";
import type { StoredExercise }        from "@/lib/history/workoutHistory";
import { allExercises }               from "@/lib/exercises/exerciseLibrary";
import {
  isEquipmentCompatible,
  findEquipmentCompatibleSubstitute,
} from "@/lib/equipment/equipmentCompatibility";

// ─── Core types ───────────────────────────────────────────────────────────────

export type ExerciseRole     = "primary" | "secondary";
export type ExerciseSubGroup = "compound" | "isolation" | "mobility";

export interface TodayScheduledExercise {
  name:       string;
  sets:       number;
  reps:       string;
  rpe?:       number;
  orderIndex: number;
}

export interface EnrichedExercise {
  exercise:         Exercise;
  role:             ExerciseRole;
  subGroup:         ExerciseSubGroup;
  isAvailable:      boolean;
  substitute:       Exercise | null;
  isScheduledToday: boolean;
  todayEntry:       TodayScheduledExercise | null;
}

export interface ExerciseIntelligenceGroup {
  id:        string;
  label:     string;
  exercises: EnrichedExercise[];
}

export type InsightType = "info" | "positive" | "warning" | "alert";

export interface MuscleInsight {
  id:    string;
  type:  InsightType;
  title: string;
  body:  string;
}

// ─── Future extension interfaces (Phase 61+) ──────────────────────────────────
// These are the only things that need to change when new capabilities arrive.
// The rest of the exercise intelligence system remains stable.

export interface ExerciseVideoExtension {
  videoUrl:     string;
  thumbnailUrl: string;
  durationSec:  number;
  coachName:    string;
}

export interface ExerciseTechniqueExtension {
  instructions:    string[];
  coachingCues:    string[];
  commonMistakes:  string[];
  difficultyNotes?: string;
}

export interface ExerciseFormExtension {
  formScore:     number;       // 0–100
  lastAssessed:  string;       // ISO date
  flaggedPoints: string[];
}

export interface ExerciseBiomechanicsExtension {
  muscleActivationPct: Record<string, number>;  // muscle → 0–100
  jointAngles:         Record<string, number>;  // joint → degrees
}

/** Attach additional capabilities to EnrichedExercise in later phases */
export interface ExerciseFutureExtensions {
  video?:         ExerciseVideoExtension;         // Phase 61
  technique?:     ExerciseTechniqueExtension;     // Phase 62
  form?:          ExerciseFormExtension;          // Phase 63
  biomechanics?:  ExerciseBiomechanicsExtension;  // Phase 64
  romLimitations?: string[];                      // Phase 65
  painFlags?:      string[];                      // Phase 66
  aiCoachingNote?: string;                        // Phase 67
}

// ─── Compound pattern classification ─────────────────────────────────────────

const COMPOUND_PATTERNS = new Set<MovementPattern>([
  "Horizontal Push", "Vertical Push",
  "Horizontal Pull", "Vertical Pull",
  "Squat", "Hinge", "Explosive", "Carry",
]);

function subGroupOf(ex: Exercise): ExerciseSubGroup {
  if (ex.category === "Mobility")              return "mobility";
  if (COMPOUND_PATTERNS.has(ex.movementPattern)) return "compound";
  return "isolation";
}

// ─── Exercise grouping ────────────────────────────────────────────────────────

export function groupExercisesForMuscle(
  muscleDef:       MuscleGroupDef,
  userEquipment:   string[],
  scheduledNames:  Set<string>,
  todayEntries:    TodayScheduledExercise[],
): ExerciseIntelligenceGroup[] {
  const nameSet  = new Set(muscleDef.libraryNames.map(n => n.toLowerCase()));
  const todayMap = new Map(todayEntries.map(e => [e.name.toLowerCase(), e]));

  const primaryCompound:  EnrichedExercise[] = [];
  const primaryIsolation: EnrichedExercise[] = [];
  const primaryMobility:  EnrichedExercise[] = [];
  const secondary:        EnrichedExercise[] = [];

  for (const ex of allExercises) {
    const isPrimary   = ex.primaryMuscles.some(m  => nameSet.has(m.toLowerCase()));
    const isSecondary = !isPrimary && ex.secondaryMuscles.some(m => nameSet.has(m.toLowerCase()));
    if (!isPrimary && !isSecondary) continue;

    const sub        = subGroupOf(ex);
    const available  = isEquipmentCompatible(ex, userEquipment);
    const substitute = available ? null : findEquipmentCompatibleSubstitute(ex, userEquipment);
    const scheduled  = scheduledNames.has(ex.name.toLowerCase());
    const todayEntry = todayMap.get(ex.name.toLowerCase()) ?? null;

    const enriched: EnrichedExercise = {
      exercise: ex, role: isPrimary ? "primary" : "secondary",
      subGroup: sub, isAvailable: available, substitute,
      isScheduledToday: scheduled, todayEntry,
    };

    if (isPrimary) {
      if (sub === "compound") primaryCompound.push(enriched);
      else if (sub === "mobility") primaryMobility.push(enriched);
      else primaryIsolation.push(enriched);
    } else {
      secondary.push(enriched);
    }
  }

  // Scheduled first, then available, then not-available
  const rank = (e: EnrichedExercise) =>
    e.isScheduledToday ? 0 : e.isAvailable ? 1 : 2;
  const sortFn = (a: EnrichedExercise, b: EnrichedExercise) => rank(a) - rank(b);

  return [
    { id: "compound",   label: "Primary — Compound",  exercises: primaryCompound.sort(sortFn).slice(0, 10) },
    { id: "isolation",  label: "Primary — Isolation",  exercises: primaryIsolation.sort(sortFn).slice(0, 8) },
    { id: "secondary",  label: "Secondary",            exercises: secondary.sort(sortFn).slice(0, 8) },
    { id: "mobility",   label: "Mobility & Recovery",  exercises: primaryMobility.sort(sortFn).slice(0, 6) },
  ].filter(g => g.exercises.length > 0);
}

// ─── Today's workout relevance ────────────────────────────────────────────────

export function getTodayExercisesForMuscle(
  muscleDef:  MuscleGroupDef | undefined,
  exercises:  StoredExercise[],
): TodayScheduledExercise[] {
  if (!muscleDef || exercises.length === 0) return [];
  const nameSet = new Set(muscleDef.libraryNames.map(n => n.toLowerCase()));

  return exercises
    .filter(ex => {
      const muscles = [...(ex.primaryMuscles ?? []), ...(ex.secondaryMuscles ?? [])];
      return muscles.some(m => nameSet.has(m.toLowerCase()));
    })
    .map((ex, i) => ({
      name:       ex.name,
      sets:       ex.sets,
      reps:       ex.reps,
      rpe:        ex.rpe,
      orderIndex: i + 1,
    }));
}

// ─── Smart insights ───────────────────────────────────────────────────────────

export function generateMuscleInsights(muscle: MuscleRecord): MuscleInsight[] {
  const ins: MuscleInsight[] = [];
  const n = muscle.displayName;

  if (muscle.status === "training") {
    ins.push({
      id: "today_focus", type: "positive",
      title: "Today's Focus",
      body:  `${n} is a primary training target today. Recovery and readiness support working hard.`,
    });
  }
  if (muscle.status === "secondary") {
    ins.push({
      id: "secondary_today", type: "info",
      title: "Secondary Target",
      body:  `${n} will be recruited secondarily in today's session.`,
    });
  }
  if (muscle.status === "injured") {
    ins.push({
      id: "injured", type: "alert",
      title: "Injury Flag Active",
      body:  `Exercises for ${n} have been automatically substituted in your workouts.`,
    });
  }
  if (muscle.status === "fatigued") {
    ins.push({
      id: "fatigued", type: "warning",
      title: "Elevated Fatigue",
      body:  `Accumulated load in ${n} is high. Consider lighter loads or an extra rest day.`,
    });
  }
  if (muscle.status === "recovering" && muscle.recoveryPct >= 70) {
    ins.push({
      id: "almost_ready", type: "info",
      title: `${muscle.recoveryPct}% Recovered`,
      body:  `${n} is approaching full readiness. One more rest day may optimise the next session.`,
    });
  }
  if ((muscle.daysSinceTrained ?? 0) >= 6 && muscle.status !== "injured" && muscle.status !== "protected") {
    ins.push({
      id: "detraining", type: "warning",
      title: `${muscle.daysSinceTrained}d Without Training`,
      body:  `${n} hasn't been targeted in ${muscle.daysSinceTrained} days — it's fully recovered and approaching detraining territory.`,
    });
  }
  if (muscle.weeklyVolume >= 14 && muscle.volumePct >= 75) {
    ins.push({
      id: "high_volume", type: "warning",
      title: "Above-Average Volume",
      body:  `${n} has received ${muscle.weeklyVolume} sets this week (${muscle.volumePct}% of maximum recoverable volume).`,
    });
  }
  if (muscle.cycleModifier > 0.1) {
    ins.push({
      id: "cycle_positive", type: "positive",
      title: "Cycle Advantage",
      body:  `Your hormonal phase is favourable for high-intensity ${n} work this week.`,
    });
  }
  if (muscle.cycleModifier < -0.1) {
    ins.push({
      id: "cycle_reduce", type: "info",
      title: "Reduce Volume",
      body:  `Your cycle phase suggests reducing ${n} intensity this week.`,
    });
  }
  if (muscle.mobilityFlag) {
    ins.push({
      id: "mobility", type: "warning",
      title: "Mobility Restriction",
      body:  `A restriction has been flagged for ${n}. Prioritise mobility work before loading.`,
    });
  }

  return ins;
}
