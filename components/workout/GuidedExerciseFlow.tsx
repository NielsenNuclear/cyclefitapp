"use client";

// ─── components/workout/GuidedExerciseFlow.tsx ────────────────────────────────
// Phase UX-1 — guided one-exercise-at-a-time workout flow.
// One exercise is always dominant. Prev/next navigation visible but secondary.

import { useState } from "react";
import type { WorkoutExercise, WarmupBlock, RecoveryBlock } from "@/lib/exercises/generateWorkout";
import type { Exercise }         from "@/lib/exercises/exerciseLibrary";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { SetRecord }        from "./types";
import { ExerciseFocusCard }     from "./ExerciseFocusCard";
import { WarmupScreen }          from "./WarmupScreen";
import { CooldownScreen }        from "./CooldownScreen";
import { AddExerciseSheet }      from "./AddExerciseSheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  completedIndices,
}: {
  total:            number;
  current:          number;
  completedIndices: Set<number>;
}) {
  return (
    <div className="flex items-center gap-1.5 justify-center flex-wrap">
      {Array.from({ length: total }).map((_, i) => {
        const done    = completedIndices.has(i);
        const active  = i === current;
        return (
          <span
            key={i}
            className={`
              rounded-full transition-all duration-300
              ${done    ? "w-2 h-2 bg-[#085041]"   : ""}
              ${active  ? "w-2.5 h-2.5 bg-[#534AB7]" : ""}
              ${!done && !active ? "w-1.5 h-1.5 bg-[#E0DDD4]" : ""}
            `}
          />
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GuidedExerciseFlowProps {
  exercises:       WorkoutExercise[];
  actuals:         Record<number, SetRecord[]>;
  onChange:        (idx: number, sets: SetRecord[]) => void;
  /** Workout Engine Sprint — Phase A.1. Kept separate from actuals/onChange
   *  so warm-up completions never count as working volume. */
  warmupActuals:   Record<number, SetRecord[]>;
  onWarmupChange:  (idx: number, sets: SetRecord[]) => void;
  onRestStart:     (totalSeconds: number, exerciseName: string) => void;
  elapsedSeconds:  number;
  environment:     TrainingEnvironment;
  onSwap:          (exerciseIdx: number, newExercise: Exercise) => void;
  onFinish:        (status: "completed" | "partial") => void;
  overallDifficulty:    number;
  onDifficultyChange:   (v: number) => void;
  /** Optional — both are already computed by generateWorkout() on every
   *  session. When present, they add a warmup step before the first exercise
   *  and a cooldown step after the last, both skippable. */
  warmupBlock?:    WarmupBlock;
  recoveryBlock?:  RecoveryBlock;
  /** Appends a new exercise to the in-progress session (UX Stabilization #9). */
  onAddExercise:   (exercise: Exercise) => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function GuidedExerciseFlow({
  exercises,
  actuals,
  onChange,
  warmupActuals,
  onWarmupChange,
  onRestStart,
  elapsedSeconds,
  environment,
  onSwap,
  onFinish,
  overallDifficulty,
  onDifficultyChange,
  warmupBlock,
  recoveryBlock,
  onAddExercise,
}: GuidedExerciseFlowProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // Only show warmup if it exists and the user hasn't already made progress
  // (e.g. resuming an in-progress session after a refresh shouldn't re-show it).
  const [phase, setPhase] = useState<"warmup" | "main" | "cooldown">(() => {
    const alreadyStarted = Object.values(actuals).some(s => s.some(r => r.completed));
    return warmupBlock && !alreadyStarted ? "warmup" : "main";
  });

  const current   = exercises[currentIdx];
  const sets      = actuals[currentIdx] ?? [];

  const completedIndices = new Set<number>(
    exercises.map((_, i) => i).filter(i => {
      const s = actuals[i] ?? [];
      return s.length > 0 && s.every(s => s.completed);
    })
  );

  const currentDone  = completedIndices.has(currentIdx);
  const isFirst      = currentIdx === 0;
  const isLast       = currentIdx === exercises.length - 1;
  const anySetsDone  = Object.values(actuals).some(s => s.some(r => r.completed));
  const allDone      = exercises.every((_, i) => completedIndices.has(i));

  // Determine primary CTA based on state
  const primaryAction: "next_exercise" | "finish_workout" | null =
    currentDone && !isLast ? "next_exercise" :
    currentDone && isLast  ? "finish_workout" :
    null;

  if (phase === "warmup" && warmupBlock) {
    return <WarmupScreen block={warmupBlock} onStart={() => setPhase("main")} />;
  }

  if (phase === "cooldown" && recoveryBlock) {
    return <CooldownScreen block={recoveryBlock} onFinish={() => onFinish("completed")} />;
  }

  return (
    <div className="space-y-5">
      {/* ── Top bar: progress + timer ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9B9690] mb-1.5">
            Exercise {currentIdx + 1} of {exercises.length}
          </p>
          <ProgressDots
            total={exercises.length}
            current={currentIdx}
            completedIndices={completedIndices}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 bg-[#F5F3EE] rounded-full border border-[#E0DDD4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#534AB7] animate-pulse" />
          <span className="text-[11px] font-bold text-[#534AB7] tabular-nums">{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* ── Exercise focus card ──────────────────────────────────────── */}
      <ExerciseFocusCard
        key={currentIdx}
        ex={current}
        sets={sets}
        onChange={next => onChange(currentIdx, next)}
        warmupSets={warmupActuals[currentIdx] ?? []}
        onWarmupChange={next => onWarmupChange(currentIdx, next)}
        onRestStart={onRestStart}
        environment={environment}
        onSwap={newEx => onSwap(currentIdx, newEx)}
      />

      {/* ── Primary CTA: next exercise / finish ─────────────────────── */}
      {primaryAction === "next_exercise" && (
        <button
          type="button"
          onClick={() => setCurrentIdx(i => i + 1)}
          className="w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[15px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all"
        >
          Next Exercise →
        </button>
      )}

      {primaryAction === "finish_workout" && (
        <div className="space-y-3">
          {/* Overall difficulty */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#1C1B18]">Session difficulty</span>
              <span className="text-[11px] text-[#9B9690]">{overallDifficulty}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={overallDifficulty}
              onChange={e => onDifficultyChange(Number(e.target.value))}
              className="w-full accent-[#534AB7] cursor-pointer"
              aria-label="Overall session difficulty"
            />
            <div className="flex justify-between">
              <span className="text-[10px] text-[#9B9690]">Easy</span>
              <span className="text-[10px] text-[#9B9690]">Hard</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => recoveryBlock ? setPhase("cooldown") : onFinish("completed")}
            className="w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[15px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all"
          >
            {recoveryBlock ? "Continue to Cooldown" : "Finish Workout"}
          </button>
        </div>
      )}

      {/* ── Navigation + secondary actions ──────────────────────────── */}
      <div className="flex items-center gap-2">
        {!isFirst && (
          <button
            type="button"
            onClick={() => setCurrentIdx(i => i - 1)}
            className="flex-1 py-2.5 rounded-xl bg-[#F5F3EE] text-[#5C5850] text-[12px] font-medium border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
          >
            ← Prev
          </button>
        )}

        {!isLast && !currentDone && (
          <button
            type="button"
            onClick={() => setCurrentIdx(i => i + 1)}
            className="flex-1 py-2.5 rounded-xl bg-[#F5F3EE] text-[#5C5850] text-[12px] font-medium border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
          >
            Skip exercise →
          </button>
        )}

        {isLast && anySetsDone && !allDone && (
          <button
            type="button"
            onClick={() => onFinish("partial")}
            className="flex-1 py-2.5 rounded-xl bg-[#F5F3EE] text-[#5C5850] text-[12px] font-medium border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
          >
            Partial finish
          </button>
        )}

        {!isLast && anySetsDone && (
          <button
            type="button"
            onClick={() => onFinish("partial")}
            className="py-2.5 px-3 rounded-xl bg-[#F5F3EE] text-[#9B9690] text-[11px] font-medium border border-[#E0DDD4] hover:border-[#A09C94] transition-colors"
            aria-label="End workout early with partial completion"
          >
            End early
          </button>
        )}
      </div>

      {/* Add exercise (UX Stabilization #9) — available at any point mid-session */}
      <button
        type="button"
        onClick={() => setShowAddExercise(true)}
        className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-[#534AB7] hover:text-[#3C3489] transition-colors"
      >
        + Add Exercise
      </button>

      <AddExerciseSheet
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        environment={environment}
        onSelect={exercise => {
          onAddExercise(exercise);
          setShowAddExercise(false);
        }}
      />
    </div>
  );
}
