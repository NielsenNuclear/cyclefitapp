// ─── lib/exercises/generateWorkout.ts ────────────────────────────────────────
// Complete workout prescription engine.
// Pure logic — no React, no side effects.

import type { Exercise, DifficultyLevel, MovementPattern, TrainingEnvironment } from "./exerciseLibrary";
import type { SplitType }                                  from "./workoutSplits";
import type { PhaseData, TrainingState }                   from "@/types/recommendation";
import { buildWorkoutDay }                                 from "./workoutSplits";
import { isCompatibleWith, findSubstitute, getExerciseSubstitutions } from "./exerciseSubstitutions";
import { isEquipmentCompatible, effectiveDifficulty, findEquipmentCompatibleSubstitute, deriveCompatibilityGroups } from "@/lib/equipment/equipmentCompatibility";
import type { GoalType }                                   from "./goalBasedSelection";
import { GOAL_PROFILES }                                   from "./goalBasedSelection";
import type { CoachingAdjustment, ComplexityModifier }     from "@/lib/progression/progressionRules";
import type { RecommendedAction }                          from "@/lib/progression/progressionProfile";
import type { ReadinessScore }                             from "@/lib/readiness/calculateReadiness";
import type { ExerciseProgressSummary }                    from "@/lib/progression/exerciseProgress";
import { assessMovementReadiness, type MovementReadiness } from "@/lib/movement/movementReadiness";
import { buildSymptomModifier }                            from "@/lib/movement/symptomMovementModifiers";
import { generateWarmup, type WarmupBlock, type MobilityItem } from "@/lib/movement/generateWarmup";
import { generateRecoveryFinisher, type RecoveryBlock }   from "@/lib/movement/recoveryFinishers";
import { getBeginnerCue, isFoundationSafe }               from "@/lib/movement/beginnerFoundations";
import type { PeriodizationStatus }                        from "@/lib/periodization/periodizationState";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { WarmupBlock, MobilityItem, RecoveryBlock, MovementReadiness };

export type { TrainingState } from "@/types/recommendation";

export interface WorkoutGenerationInput {
  splitType:          SplitType;
  dayIndex:           number;
  difficulty:         DifficultyLevel;
  energyLevel:        number;        // 0–4 from deriveEnergyLevel()
  trainingState:      TrainingState;
  phase:              PhaseData;
  sessionIndex?:      number;        // increments across sessions for variety
  environment?:       TrainingEnvironment; // if set, incompatible exercises are swapped
  goalType?:          GoalType;      // if set, exercises scored by goal alignment
  coachingAdjustment?:  CoachingAdjustment;       // optional: from progression engine
  readiness?:           ReadinessScore;            // optional: caps or confirms progression ceiling
  exerciseSummaries?:   ExerciseProgressSummary[]; // optional: drives skip-rate rotation
  // Adaptive modifier (Phase 22A) — applied as a final pass after all other scaling
  adaptiveVolumeMultiplier?:    number;   // [0.70–1.15]; defaults to 1.0
  adaptiveIntensityMultiplier?: number;   // [0.80–1.10]; defaults to 1.0
  // Phase 27F — equipment-based filtering (overrides environment filter when non-empty)
  userEquipment?: string[];
  // Phase 29 — Movement preparation inputs
  symptoms?:    Array<{ symptomId: string; severity: 0 | 1 | 2 | 3 }>;
  stressLevel?: number;        // 1–10 (from check-in)
  sleepQuality?: string;       // "excellent"|"good"|"variable"|"poor"
  // Phase 30D — Periodization modifier
  periodizationStatus?: PeriodizationStatus;
}

export interface WorkoutExercise {
  name:      string;            // exercise.name — top-level for easy access
  exercise:  Exercise;          // full object for downstream UI access
  sets:      number;
  reps:      string;            // e.g. "8–12" or "30–45s hold"
  rest:      string;            // formatted: "2 min" | "90 sec" | "30 sec"
  rpe?:      number;            // 1–10 RPE target (omitted for mobility)
  rationale: string;            // why this exercise in this context
  notes?:    string;            // training-state coaching cue
}

export interface GeneratedWorkout {
  workoutName:          string;
  generatedAt:          string;
  splitType:            SplitType;
  phase:                PhaseData;
  dayName:              string;
  focus:                string;
  goalFocus:            string;
  energyLevel:          number;
  trainingState:        TrainingState;
  exercises:            WorkoutExercise[];
  totalExercises:       number;
  estimatedDurationMin: number;
  workoutRationale:     string;
  phaseNote?:           string;
  // Exercises that required equipment the user doesn't own (for learning layer logging)
  equipmentFallbacks?:  Array<{ exerciseName: string; missingEquip: string[] }>;
  // Phase 29 — Movement preparation blocks (all optional for backward compat)
  movementReadiness?:   MovementReadiness;
  warmupBlock?:         WarmupBlock;
  activationBlock?:     MobilityItem[];
  recoveryBlock?:       RecoveryBlock;
}

// ─── Adaptation tables ────────────────────────────────────────────────────────

interface EnergyPreset {
  baseSets:    number;
  reps:        string;
  baseRpe:     number;
  restSeconds: number;
}

const ENERGY_PRESETS: Record<0 | 1 | 2 | 3 | 4, EnergyPreset> = {
  4: { baseSets: 4, reps: "6–10",  baseRpe: 8, restSeconds: 120 },
  3: { baseSets: 3, reps: "8–12",  baseRpe: 7, restSeconds: 90  },
  2: { baseSets: 3, reps: "10–15", baseRpe: 6, restSeconds: 75  },
  1: { baseSets: 2, reps: "12–15", baseRpe: 5, restSeconds: 60  },
  0: { baseSets: 2, reps: "15–20", baseRpe: 4, restSeconds: 60  },
};

const TRAINING_STATE_SET_DELTA: Record<TrainingState, number> = {
  fresh:        0,
  loaded:       0,
  fatigued:    -1,
  overreached: -2,
};

const PHASE_RPE_DELTA: Partial<Record<string, number>> = {
  "Follicular":  +1,
  "Ovulatory":   +1,
  "Luteal":      -1,
  "Late Luteal": -2,
  "Menstrual":   -1,
};

const PHASE_NOTES: Partial<Record<string, string>> = {
  "Follicular":  "Rising estrogen supports strength adaptation — prioritise progressive overload today.",
  "Ovulatory":   "Peak energy window — high-intensity efforts and performance goals are well-timed.",
  "Luteal":      "Sustain quality over volume; progesterone slightly reduces recovery efficiency.",
  "Late Luteal": "Reduce intensity and honour fatigue signals — protect the cycle ahead.",
  "Menstrual":   "Recovery-friendly selection — use felt energy as the primary guide, not the phase alone.",
};

// ─── Helper: rest formatting ──────────────────────────────────────────────────

function formatRest(seconds: number): string {
  if (seconds >= 120 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

// ─── Helper: per-exercise rationale ──────────────────────────────────────────

const MOVEMENT_PURPOSE: Partial<Record<MovementPattern, string>> = {
  "Horizontal Push": "Horizontal pressing builds pectoral and anterior deltoid strength.",
  "Vertical Push":   "Vertical pressing develops overhead strength and shoulder stability.",
  "Horizontal Pull": "Horizontal pulling addresses posterior chain balance and shoulder health.",
  "Vertical Pull":   "Vertical pulling builds lat width and scapular depression strength.",
  "Squat":           "Knee-dominant loading for quad and glute development.",
  "Hinge":           "Hip hinge for posterior chain strength and power.",
  "Explosive":       "Ballistic movement for power output and neuromuscular efficiency.",
  "Rotation":        "Rotational loading for oblique strength and transverse-plane stability.",
  "Anti-Rotation":   "Anti-rotation work builds core stiffness for force transfer.",
  "Isometric":       "Isometric hold for muscle endurance and joint stability.",
  "Mobility":        "Mobility work to maintain range of motion and joint health.",
  "Stability":       "Stability training for proprioception and injury prevention.",
  "Carry":           "Loaded carry for postural endurance and grip strength.",
};

function buildExerciseRationale(
  exercise:      Exercise,
  energyLevel:   number,
  trainingState: TrainingState,
  phaseName:     string,
): string {
  const movementPurpose =
    MOVEMENT_PURPOSE[exercise.movementPattern] ??
    "Movement selected for targeted muscle development.";

  const contextSentence: string = (() => {
    if (trainingState === "overreached") {
      return "Load minimised — session is a neural deload with emphasis on form quality.";
    }
    if (trainingState === "fatigued") {
      return "Volume reduced to manage accumulated fatigue while preserving movement stimulus.";
    }
    if (phaseName === "Follicular" && energyLevel >= 3) {
      return "Follicular phase with good energy — compound loading for maximal strength adaptation.";
    }
    if (phaseName === "Ovulatory" && energyLevel >= 3) {
      return "Ovulatory performance window — high-intensity stimulus is well-timed.";
    }
    if (phaseName === "Luteal" || phaseName === "Late Luteal") {
      return `${phaseName} phase — sustainable effort prioritised over peak output.`;
    }
    if (phaseName === "Menstrual") {
      return "Recovery-appropriate selection supporting movement quality over load.";
    }
    if (energyLevel >= 3) {
      return "Energy supports standard progressive training stimulus.";
    }
    if (energyLevel <= 1) {
      return "Low energy — exercise selected for reduced coordination demand and manageable load.";
    }
    return "Moderate energy — volume and intensity balanced for quality output.";
  })();

  return `${movementPurpose} ${contextSentence}`;
}

// ─── Helper: workout-level rationale ─────────────────────────────────────────

function buildWorkoutRationale(
  dayName:       string,
  energyLevel:   number,
  trainingState: TrainingState,
  phaseName:     string,
): string {
  const energySentence =
    energyLevel >= 4 ? "High energy today supports a full training stimulus with maximal volume." :
    energyLevel >= 3 ? "Good energy levels allow standard progressive training across all slots." :
    energyLevel >= 2 ? "Moderate energy — volume is maintained but intensity is moderated to protect quality." :
    energyLevel >= 1 ? "Low energy — exercise selection and volume are shifted toward recovery and movement quality." :
    "Very low energy — today's session is a recovery workout prioritising gentle movement.";

  const phaseSentence = PHASE_NOTES[phaseName] ?? "";

  const stateSentence =
    trainingState === "overreached"
      ? "Training load signals indicate overreaching — this session is a structured deload with significantly reduced volume."
      : trainingState === "fatigued"
      ? "Accumulated training load is present — set counts are reduced to protect adaptation quality and prevent further fatigue."
      : trainingState === "loaded"
      ? "Training load is at a sustainable level — current volume and intensity are maintained."
      : "Training state is fresh — full progressive prescription applies.";

  return `${dayName} session. ${energySentence} ${phaseSentence} ${stateSentence}`.trim();
}

// ─── Helper: workout name ─────────────────────────────────────────────────────

function buildWorkoutName(dayName: string, phaseName: string): string {
  return `${dayName} · ${phaseName}`;
}

// ─── Readiness × progression merger ──────────────────────────────────────────
// Combines CoachingAdjustment (progression engine) with ReadinessScore as a
// conservative ceiling. When readiness >= 75 the progression engine drives
// everything. Below that, readiness caps volume/intensity so the two systems
// never additively over-reduce.

function resolveEffectiveAdjustment(
  progression?: CoachingAdjustment,
  readiness?:   ReadinessScore,
): CoachingAdjustment | undefined {
  // No readiness data or readiness is good → let progression engine drive
  if (!readiness || readiness.score >= 75) return progression;

  const base: CoachingAdjustment = progression ?? {
    action:             "maintain",
    volumeModifier:     1.0,
    intensityModifier:  0,
    complexityModifier: "maintain",
    rationale:          "",
  };

  // Readiness-derived modifiers (ceiling, not additive)
  const readinessVol = readiness.score >= 60 ? 0.90 : readiness.score >= 40 ? 0.75 : 0.60;
  const readinessInt = readiness.score >= 60 ?  0   : readiness.score >= 40 ?  -1  : -2;

  const finalVol     = Math.min(base.volumeModifier,    readinessVol);
  const finalInt     = Math.min(base.intensityModifier, readinessInt);
  const finalComplex: ComplexityModifier =
    (base.complexityModifier === "decrease" || readiness.score < 60) ? "decrease" : "maintain";

  // Derive effective action for exercise notes (most conservative wins)
  const effectiveAction: RecommendedAction =
    finalVol <= 0.65 ? "deload"  :
    finalVol <= 0.85 ? "reduce"  :
    base.action;

  return {
    action:             effectiveAction,
    volumeModifier:     finalVol,
    intensityModifier:  finalInt,
    complexityModifier: finalComplex,
    rationale:          base.rationale,
  };
}

// ─── Exercise prescription ────────────────────────────────────────────────────

function prescribeExercise(
  exercise:          Exercise,
  energyLevel:       number,
  trainingState:     TrainingState,
  phaseName:         string,
  adjustment?:       CoachingAdjustment,
): WorkoutExercise {
  if (exercise.category === "Mobility") {
    return {
      name:      exercise.name,
      exercise,
      sets:      2,
      reps:      "30–45s hold",
      rest:      "30 sec",
      rationale: buildExerciseRationale(exercise, energyLevel, trainingState, phaseName),
    };
  }

  const clampedEnergy = Math.max(0, Math.min(4, Math.round(energyLevel))) as 0 | 1 | 2 | 3 | 4;
  const preset        = ENERGY_PRESETS[clampedEnergy];
  const setDelta      = TRAINING_STATE_SET_DELTA[trainingState];
  const rpeDelta      = PHASE_RPE_DELTA[phaseName] ?? 0;

  // Apply training-state delta first, then multiply by progression modifier
  const rawSets        = preset.baseSets + setDelta;
  const volumeMod      = adjustment?.volumeModifier    ?? 1.0;
  const intensityMod   = adjustment?.intensityModifier ?? 0;
  const sets           = Math.max(1, Math.round(rawSets * volumeMod));
  const rpe            = Math.max(3, Math.min(10, preset.baseRpe + rpeDelta + intensityMod));

  const progressionNote: string | undefined = (() => {
    if (!adjustment) return undefined;
    if (adjustment.action === "progress")  return "Progression: +1 set — adherence and recovery support overload.";
    if (adjustment.action === "deload")    return "Deload — volume reduced 40%. Prioritise form over load.";
    if (adjustment.action === "reduce")    return "Volume reduced — consistency takes priority over intensity.";
    return undefined;
  })();

  const stateNote: string | undefined =
    trainingState === "overreached"
      ? "Deload — prioritise form and nervous system recovery over load."
      : trainingState === "fatigued"
      ? "Volume reduced — maintain quality and technique in every set."
      : undefined;

  return {
    name:      exercise.name,
    exercise,
    sets,
    reps:      preset.reps,
    rest:      formatRest(preset.restSeconds),
    rpe,
    rationale: buildExerciseRationale(exercise, energyLevel, trainingState, phaseName),
    notes:     progressionNote ?? stateNote,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateWorkout(input: WorkoutGenerationInput): GeneratedWorkout {
  const {
    splitType,
    dayIndex,
    difficulty,
    energyLevel,
    trainingState,
    phase,
    sessionIndex = 0,
    environment,
    goalType,
    coachingAdjustment,
    readiness,
    exerciseSummaries,
    userEquipment,
    symptoms    = [],
    stressLevel = 5,
    sleepQuality = "good",
  } = input;

  // Merge progression and readiness into a single effective adjustment
  const effectiveAdjustment = resolveEffectiveAdjustment(coachingAdjustment, readiness);

  const workoutDay = buildWorkoutDay({
    splitType,
    dayIndex,
    difficulty,
    energyLevel,
    sessionIndex,
    goalType,
  });

  const equipmentFallbacks: Array<{ exerciseName: string; missingEquip: string[] }> = [];
  const resolvedExercises: Exercise[] = (userEquipment && userEquipment.length > 0)
    ? workoutDay.exercises.map(ex => {
        if (isEquipmentCompatible(ex, userEquipment)) return ex;
        // Identify which equipment groups the user is missing for this exercise
        const groups = deriveCompatibilityGroups(ex.equipment);
        const ownedSet = new Set(userEquipment);
        const missingEquip = groups
          .filter(g => g.length > 0 && !g.some(id => ownedSet.has(id)))
          .map(g => g[0]);
        equipmentFallbacks.push({ exerciseName: ex.name, missingEquip });
        // Use effective difficulty so a barbell exercise done with DBs targets the right tier
        const sub = findEquipmentCompatibleSubstitute(ex, userEquipment, effectiveDifficulty(ex, userEquipment));
        if (sub) return sub;
        return ex;
      })
    : environment
    ? workoutDay.exercises.map(ex => {
        if (isCompatibleWith(ex, environment)) return ex;
        const sub = findSubstitute(ex, environment, difficulty);
        if (sub) return sub;
        return ex;
      })
    : workoutDay.exercises;

  // Skip-rate rotation: swap out exercises the user repeatedly skips
  // rotationMap: new exercise name → original exercise name (for note injection)
  const rotationMap = new Map<string, string>();
  const rotatedExercises: Exercise[] = exerciseSummaries && exerciseSummaries.length > 0
    ? resolvedExercises.map(ex => {
        const summary = exerciseSummaries.find(s => s.exerciseName === ex.name);
        if (!summary || summary.progressionStatus !== "regressing") return ex;

        const env = environment ?? "gym";
        const candidates = getExerciseSubstitutions({ exercise: ex, environment: env, difficulty });
        const viable = candidates.filter(c => {
          const cs = exerciseSummaries.find(s => s.exerciseName === c.name);
          return !cs || cs.progressionStatus !== "regressing";
        });
        if (viable.length === 0) return ex;

        rotationMap.set(viable[0].name, ex.name);
        return viable[0];
      })
    : resolvedExercises;

  // Apply complexity modifier: reduce/deload trim the lowest-priority accessory
  const trimmedExercises: Exercise[] = (() => {
    const complexity = effectiveAdjustment?.complexityModifier;
    if (complexity === "decrease" && rotatedExercises.length > 3) {
      return rotatedExercises.slice(0, rotatedExercises.length - 1);
    }
    return rotatedExercises;
  })();

  // Beginner safety: exclude high-skill movements that require coaching prerequisites
  const safeExercises: Exercise[] = difficulty === "Beginner"
    ? trimmedExercises.filter(ex => isFoundationSafe(ex.name))
    : trimmedExercises;

  const prescribed: WorkoutExercise[] = safeExercises.map(exercise => {
    const ex = prescribeExercise(exercise, energyLevel, trainingState, phase.name, effectiveAdjustment);
    const replacedName = rotationMap.get(exercise.name);
    if (replacedName) {
      ex.notes = `Rotated in for ${replacedName} — you've been skipping that exercise recently. Same movement pattern and muscle focus.`;
    }
    return ex;
  });

  // Final pass — apply adaptive multipliers (from personal pattern history) on top of all
  // other scaling. These are small refinements (±15% vol, ±10% intensity) so the minimum
  // set count floor (1) and RPE bounds [3–10] are the only additional guards needed.
  const adaptiveVol = input.adaptiveVolumeMultiplier    ?? 1.0;
  const adaptiveInt = input.adaptiveIntensityMultiplier ?? 1.0;
  const exercises: WorkoutExercise[] = (adaptiveVol !== 1.0 || adaptiveInt !== 1.0)
    ? prescribed.map(ex => ({
        ...ex,
        sets: Math.max(1, Math.round(ex.sets * adaptiveVol)),
        rpe:  ex.rpe !== undefined
          ? Math.round(Math.min(10, Math.max(3, ex.rpe * adaptiveInt)) * 10) / 10
          : undefined,
      }))
    : prescribed;

  // ── Phase 30D: Periodization modifier ────────────────────────────────────────
  const periodizationStatus = input.periodizationStatus;
  const periodizedExercises: WorkoutExercise[] = periodizationStatus
    ? exercises.map(ex => ({
        ...ex,
        sets: Math.max(1, ex.sets + periodizationStatus.setsOffset),
        rpe:  ex.rpe !== undefined
          ? Math.round(Math.min(10, Math.max(3, ex.rpe + periodizationStatus.rpeOffset)) * 10) / 10
          : undefined,
        reps: periodizationStatus.deloadReps ?? ex.reps,
      }))
    : exercises;

  // ── Phase 29: Movement preparation ───────────────────────────────────────────
  const equipment = userEquipment ?? [];
  const movementReadiness = assessMovementReadiness({
    energyLevel,
    phaseName:     phase.name,
    symptoms,
    trainingState,
  });

  const symptomModifier = buildSymptomModifier(symptoms);

  const warmupFull = generateWarmup({
    splitType,
    dayName:          workoutDay.dayName,
    movementReadiness,
    symptomModifier,
    energyLevel,
    userEquipment:    equipment,
  });

  const warmupBlock:     WarmupBlock    = warmupFull;
  const activationBlock: MobilityItem[] = warmupFull.activation;

  const recoveryBlock = generateRecoveryFinisher({
    splitType,
    dayName:          workoutDay.dayName,
    movementReadiness,
    stressLevel,
    sleepQuality,
    userEquipment:    equipment,
  });

  // ── Beginner cue injection ─────────────────────────────────────────────────
  const exercisesWithCues: WorkoutExercise[] = difficulty === "Beginner"
    ? periodizedExercises.map(ex => {
        const cue = getBeginnerCue(ex.name);
        if (!cue) return ex;
        return { ...ex, notes: ex.notes ? `${cue} ${ex.notes}` : cue };
      })
    : periodizedExercises;

  // ── Symptom coaching notes added to rationale ─────────────────────────────
  const symptomRationale = symptomModifier.coachingNotes.length > 0
    ? ` ${symptomModifier.coachingNotes[0]}`
    : "";

  return {
    workoutName:          buildWorkoutName(workoutDay.dayName, phase.name),
    generatedAt:          new Date().toISOString(),
    splitType,
    phase,
    dayName:              workoutDay.dayName,
    focus:                workoutDay.focus,
    goalFocus:            goalType ? GOAL_PROFILES[goalType].focus : "Balanced Fitness",
    energyLevel,
    trainingState,
    exercises:            exercisesWithCues,
    totalExercises:       exercisesWithCues.length,
    estimatedDurationMin: workoutDay.estimatedDurationMin,
    workoutRationale:     buildWorkoutRationale(workoutDay.dayName, energyLevel, trainingState, phase.name) + symptomRationale,
    phaseNote:            PHASE_NOTES[phase.name],
    equipmentFallbacks:   equipmentFallbacks.length > 0 ? equipmentFallbacks : undefined,
    movementReadiness,
    warmupBlock,
    activationBlock,
    recoveryBlock,
  };
}
