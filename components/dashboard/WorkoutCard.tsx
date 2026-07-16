"use client";

// ─── components/dashboard/WorkoutCard.tsx ────────────────────────────────────
// Phase UX-1 — Workout Experience Redesign.
// This component manages ALL workout state and data writes.
// Rendering is delegated to focused sub-components:
//   idle  → WorkoutHeroView
//   active → GuidedExerciseFlow + RestScreen
//   done  → WorkoutCompletionView

import { useState, useEffect, useRef } from "react";
import type { GeneratedWorkout, WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { Exercise }           from "@/lib/exercises/exerciseLibrary";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";
import type { LoggedExercise, LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import {
  saveLoggedWorkout,
  setActiveWorkout,
  getActiveWorkout,
  clearActiveWorkout,
} from "@/lib/workoutExecution/workoutLogging";
import {
  saveExercisePerformances,
  type ExercisePerformance,
} from "@/lib/progression/exerciseHistory";
import { getExerciseHistory } from "@/lib/history/exerciseHistory";
import { generateWarmupSets } from "@/lib/exercises/warmupSets";
import type { SetRecord }         from "@/components/workout/types";
import { WorkoutHeroView }        from "@/components/workout/WorkoutHeroView";
import { GuidedExerciseFlow }     from "@/components/workout/GuidedExerciseFlow";
import { RestScreen }             from "@/components/workout/RestScreen";
import { WorkoutCompletionView }  from "@/components/workout/WorkoutCompletionView";
import { ErrorBoundary }          from "@/components/resilience/ErrorBoundary";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutMode = "idle" | "active" | "done";

const REST_TIMER_STORAGE_KEY = "axis_rest_timer_enabled";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultSets(ex: WorkoutExercise, lastWeight?: number): SetRecord[] {
  return Array.from({ length: ex.sets }, () => ({
    targetReps: ex.reps,
    completed:  false,
    actualReps: ex.reps,
    weight:     lastWeight,
    rpe:        ex.rpe ?? undefined,
  }));
}

// Workout Engine Sprint — Phase A.1. Warm-up sets ramp toward the same
// lastWeight reference defaultSets() already uses, so both are computed from
// one history lookup per exercise (see the actuals/warmupActuals
// initializers below) rather than duplicating it. Logged as ordinary
// SetRecord[] — reusing ExerciseFocusCard's existing completion-tracking
// pattern — but kept in a separate warmupActuals map so warm-up completions
// never reach buildExercisePerformances()/buildLog(), i.e. never count as
// working volume.
function defaultWarmupSets(ex: WorkoutExercise, lastWeight?: number): SetRecord[] {
  return generateWarmupSets(ex.exercise, lastWeight).map(w => ({
    targetReps: w.reps,
    completed:  false,
    actualReps: w.reps,
    weight:     w.weight,
  }));
}

function parseReps(repsStr: string): number {
  const n = parseInt(repsStr, 10);
  return isNaN(n) ? 0 : n;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout:              GeneratedWorkout;
  environment:          TrainingEnvironment;
  onEnvironmentChange:  (env: TrainingEnvironment) => void;
  completionStatus?:    WorkoutCompletionStatus;
  onMarkComplete:       () => void;
  onMarkPartial:        () => void;
  onMarkSkip:           () => void;
  onWorkoutLogged?:     (log: LoggedWorkout) => void;
  confidenceLevel?:     string; // Phase D — optional, display only
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

export function WorkoutCard({
  workout,
  environment,
  onEnvironmentChange,
  completionStatus = "pending",
  onMarkComplete,
  onMarkPartial,
  onMarkSkip,
  onWorkoutLogged,
  confidenceLevel,
}: WorkoutCardProps) {
  const today = new Date().toISOString().slice(0, 10);

  // Mutable exercise list — supports in-session swaps
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);

  function handleSwap(idx: number, newExercise: Exercise) {
    setExercises(prev => prev.map((ex, i) =>
      i === idx ? { ...ex, name: newExercise.name, exercise: newExercise } : ex
    ));
  }

  // Add an exercise mid-session (UX Stabilization #9). Uses sensible defaults —
  // it logs identically to a generated exercise, no special-casing downstream.
  function handleAddExercise(newExercise: Exercise) {
    const added: WorkoutExercise = {
      name:      newExercise.name,
      exercise:  newExercise,
      sets:      3,
      reps:      "8-12",
      rest:      "90 sec",
      rationale: "Added mid-session.",
    };
    const newIdx = exercises.length;
    setExercises(prev => [...prev, added]);
    const history    = getExerciseHistory(added.name);
    const lastWeight = (history.bestSet && history.bestSet.weight > 0)
      ? history.bestSet.weight
      : undefined;
    setActuals(prev => ({ ...prev, [newIdx]: defaultSets(added, lastWeight) }));
    setWarmupActuals(prev => ({ ...prev, [newIdx]: defaultWarmupSets(added, lastWeight) }));
  }

  // Restore in-progress state from localStorage on mount
  const [mode, setMode] = useState<WorkoutMode>(() => {
    if (typeof window === "undefined" || completionStatus !== "pending") return "idle";
    const active = getActiveWorkout();
    return active?.date === today ? "active" : "idle";
  });

  const startedAtRef = useRef<number>(
    typeof window !== "undefined"
      ? (() => {
          const active = getActiveWorkout();
          if (active?.date === today) return new Date(active.startedAt).getTime();
          return Date.now();
        })()
      : Date.now()
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [actuals, setActuals] = useState<Record<number, SetRecord[]>>(() =>
    Object.fromEntries(
      workout.exercises.map((ex, i) => {
        const history    = getExerciseHistory(ex.name);
        const lastWeight = (history.bestSet && history.bestSet.weight > 0)
          ? history.bestSet.weight
          : undefined;
        return [i, defaultSets(ex, lastWeight)];
      })
    )
  );

  // Workout Engine Sprint — Phase A.1. Kept separate from `actuals` so
  // warm-up completions never reach buildExercisePerformances()/buildLog()
  // (never count as working volume).
  const [warmupActuals, setWarmupActuals] = useState<Record<number, SetRecord[]>>(() =>
    Object.fromEntries(
      workout.exercises.map((ex, i) => {
        const history    = getExerciseHistory(ex.name);
        const lastWeight = (history.bestSet && history.bestSet.weight > 0)
          ? history.bestSet.weight
          : undefined;
        return [i, defaultWarmupSets(ex, lastWeight)];
      })
    )
  );

  const [overallDifficulty, setOverallDifficulty] = useState(5);
  const [finishedDuration,  setFinishedDuration]  = useState(0);
  const [restTimer, setRestTimer] = useState<{
    totalSeconds:  number;
    exerciseName:  string;
    nextExercise:  string | null;
  } | null>(null);

  // Rest-timer preference (Settings → Workout preferences) — defaults to on.
  // onRestStart still fires either way; when off, we simply don't surface the
  // forced rest screen, so exercises continue without interruption.
  const [restTimerEnabled] = useState(() =>
    typeof window === "undefined"
      ? true
      : (localStorage.getItem(REST_TIMER_STORAGE_KEY) ?? "true") === "true"
  );

  // ── Timer ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== "active") return;
    setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Clean up active flag if status resolved outside this component
  useEffect(() => {
    if (completionStatus !== "pending") clearActiveWorkout();
  }, [completionStatus]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const stateWarning =
    workout.trainingState === "overreached"
      ? "Today's session has been significantly reduced to support nervous system recovery."
      : workout.trainingState === "fatigued"
      ? "Volume has been reduced — focus on movement quality over load."
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleStart() {
    setActiveWorkout(today);
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setMode("active");
  }

  function buildExercisePerformances(
    exerciseList: WorkoutExercise[],
    actualsMap:   Record<number, SetRecord[]>,
    date:         string,
    completed:    boolean,
  ): ExercisePerformance[] {
    return exerciseList.map((ex, i) => {
      const sets = actualsMap[i] ?? defaultSets(ex);
      const done = sets.filter(s => s.completed);

      if (done.length === 0) {
        return {
          exerciseId:   ex.name,
          exerciseName: ex.name,
          date,
          weight:       0,
          reps:         parseReps(ex.reps),
          sets:         ex.sets,
          completed:    false,
        } satisfies ExercisePerformance;
      }

      const avgWeight = done.reduce((s, d) => s + (d.weight ?? 0), 0) / done.length;
      const avgReps   = done.reduce((s, d) => s + parseReps(d.actualReps || d.targetReps), 0) / done.length;
      const lastRpe   = [...done].reverse().find(d => d.rpe !== undefined)?.rpe;

      return {
        exerciseId:   ex.name,
        exerciseName: ex.name,
        date,
        weight:       Math.round(avgWeight * 10) / 10,
        reps:         Math.round(avgReps),
        sets:         done.length,
        rpe:          lastRpe,
        completed,
      } satisfies ExercisePerformance;
    });
  }

  function buildPlannedPerformances(
    exerciseList: WorkoutExercise[],
    date:         string,
  ): ExercisePerformance[] {
    return exerciseList.map(ex => ({
      exerciseId:   ex.name,
      exerciseName: ex.name,
      date,
      weight:       0,
      reps:         parseReps(ex.reps),
      sets:         ex.sets,
      completed:    true,
    } satisfies ExercisePerformance));
  }

  function buildLog(status: "completed" | "partial"): LoggedWorkout {
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const loggedExercises: LoggedExercise[] = exercises.map((ex, i) => {
      const sets    = actuals[i] ?? defaultSets(ex);
      const done    = sets.filter(s => s.completed);
      const repsArr = done.map(s => s.actualReps || s.targetReps);
      const repsStr = repsArr[0] ?? ex.reps;
      const avgWt   = done.length > 0
        ? done.reduce((sum, s) => sum + (s.weight ?? 0), 0) / done.length
        : undefined;
      const lastRpe = [...done].reverse().find(s => s.rpe !== undefined)?.rpe ?? (ex.rpe ?? 0);
      return {
        exerciseName:   ex.name,
        prescribedSets: ex.sets,
        completedSets:  done.length,
        prescribedReps: ex.reps,
        completedReps:  repsArr.join(", ") || ex.reps,
        prescribedRPE:  ex.rpe ?? 0,
        actualRPE:      lastRpe,
        weight:         avgWt && avgWt > 0 ? avgWt : undefined,
        actualReps:     parseReps(repsStr) || undefined,
      };
    });
    return {
      id:               today,
      date:             today,
      workoutName:      workout.workoutName,
      completionStatus: status,
      exercises:        loggedExercises,
      durationMinutes:  Math.max(1, Math.round(elapsedSeconds / 60)),
      overallDifficulty,
    };
  }

  function handleFinish(status: "completed" | "partial") {
    const dur = Math.max(1, Math.round(elapsedSeconds / 60));
    setFinishedDuration(dur);
    const log  = buildLog(status);
    const perfs = buildExercisePerformances(exercises, actuals, today, status === "completed");
    saveLoggedWorkout(log);
    saveExercisePerformances(perfs);
    clearActiveWorkout();
    if (status === "completed") onMarkComplete(); else onMarkPartial();
    onWorkoutLogged?.(log);
    setMode("done");
  }

  function handleQuickMarkComplete() {
    saveExercisePerformances(buildPlannedPerformances(exercises, today));
    onMarkComplete();
  }

  function handleQuickMarkPartial() {
    saveExercisePerformances(
      buildPlannedPerformances(exercises, today).map(p => ({ ...p, completed: false }))
    );
    onMarkPartial();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary label="workout-experience">
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-4">
        Today's Workout
      </div>

      {/* ── Idle: pre-workout hero ───────────────────────────────────────── */}
      {mode === "idle" && (
        <WorkoutHeroView
          workout={workout}
          environment={environment}
          onEnvironmentChange={onEnvironmentChange}
          completionStatus={completionStatus}
          stateWarning={stateWarning}
          confidenceLevel={confidenceLevel}
          onStart={handleStart}
          onQuickMarkComplete={handleQuickMarkComplete}
          onQuickMarkPartial={handleQuickMarkPartial}
          onMarkSkip={onMarkSkip}
        />
      )}

      {/* ── Active: guided exercise flow ─────────────────────────────────── */}
      {mode === "active" && (
        <GuidedExerciseFlow
          exercises={exercises}
          actuals={actuals}
          onChange={(idx, sets) => setActuals(prev => ({ ...prev, [idx]: sets }))}
          warmupActuals={warmupActuals}
          onWarmupChange={(idx, sets) => setWarmupActuals(prev => ({ ...prev, [idx]: sets }))}
          onRestStart={(totalSeconds, exerciseName) => {
            if (!restTimerEnabled) return; // preference off — continue without a forced screen
            // Find the next exercise name for the rest screen preview
            const currentIdx  = exercises.findIndex(e => e.name === exerciseName);
            const nextExercise = currentIdx >= 0 && currentIdx < exercises.length - 1
              ? exercises[currentIdx + 1].name
              : null;
            setRestTimer({ totalSeconds, exerciseName, nextExercise });
          }}
          elapsedSeconds={elapsedSeconds}
          environment={environment}
          onSwap={handleSwap}
          onFinish={handleFinish}
          overallDifficulty={overallDifficulty}
          onDifficultyChange={setOverallDifficulty}
          warmupBlock={workout.warmupBlock}
          recoveryBlock={workout.recoveryBlock}
          onAddExercise={handleAddExercise}
        />
      )}

      {/* ── Done: completion summary ─────────────────────────────────────── */}
      {mode === "done" && (
        <WorkoutCompletionView
          exercises={exercises}
          actuals={actuals}
          durationMinutes={finishedDuration}
          onDone={() => setMode("idle")}
        />
      )}

      {/* ── Rest screen ──────────────────────────────────────────────────── */}
      {restTimer && mode === "active" && (
        <RestScreen
          totalSeconds={restTimer.totalSeconds}
          nextExerciseName={restTimer.nextExercise}
          onDismiss={() => setRestTimer(null)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
