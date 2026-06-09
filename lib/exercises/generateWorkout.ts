// ─── lib/exercises/generateWorkout.ts ────────────────────────────────────────
// Complete workout prescription engine.
// Pure logic — no React, no side effects.

import type { Exercise, DifficultyLevel, MovementPattern, TrainingEnvironment } from "./exerciseLibrary";
import type { SplitType }                                  from "./workoutSplits";
import type { PhaseData }                                  from "@/types/recommendation";
import { buildWorkoutDay }                                 from "./workoutSplits";
import { isCompatibleWith, findSubstitute }                from "./exerciseSubstitutions";
import type { GoalType }                                   from "./goalBasedSelection";
import { GOAL_PROFILES }                                   from "./goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingState = "fresh" | "loaded" | "fatigued" | "overreached";

export interface WorkoutGenerationInput {
  splitType:     SplitType;
  dayIndex:      number;
  difficulty:    DifficultyLevel;
  energyLevel:   number;        // 0–4 from deriveEnergyLevel()
  trainingState: TrainingState;
  phase:         PhaseData;
  sessionIndex?: number;        // increments across sessions for variety
  environment?:  TrainingEnvironment; // if set, incompatible exercises are swapped
  goalType?:     GoalType;      // if set, exercises scored by goal alignment
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

// ─── Exercise prescription ────────────────────────────────────────────────────

function prescribeExercise(
  exercise:      Exercise,
  energyLevel:   number,
  trainingState: TrainingState,
  phaseName:     string,
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
  const preset   = ENERGY_PRESETS[clampedEnergy];
  const setDelta = TRAINING_STATE_SET_DELTA[trainingState];
  const rpeDelta = PHASE_RPE_DELTA[phaseName] ?? 0;

  const sets = Math.max(1, preset.baseSets + setDelta);
  const rpe  = Math.max(3, Math.min(10, preset.baseRpe + rpeDelta));

  const notes: string | undefined =
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
    notes,
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
  } = input;

  const workoutDay = buildWorkoutDay({
    splitType,
    dayIndex,
    difficulty,
    energyLevel,
    sessionIndex,
    goalType,
  });

  const resolvedExercises: Exercise[] = environment
    ? workoutDay.exercises.map(ex => {
        if (isCompatibleWith(ex, environment)) return ex;
        const sub = findSubstitute(ex, environment, difficulty);
        if (sub) return sub;
        console.warn(`[generateWorkout] No substitute for "${ex.name}" in "${environment}" — keeping original`);
        return ex;
      })
    : workoutDay.exercises;

  const exercises: WorkoutExercise[] = resolvedExercises.map(exercise =>
    prescribeExercise(exercise, energyLevel, trainingState, phase.name)
  );

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
    exercises,
    totalExercises:       exercises.length,
    estimatedDurationMin: workoutDay.estimatedDurationMin,
    workoutRationale:     buildWorkoutRationale(workoutDay.dayName, energyLevel, trainingState, phase.name),
    phaseNote:            PHASE_NOTES[phase.name],
  };
}
