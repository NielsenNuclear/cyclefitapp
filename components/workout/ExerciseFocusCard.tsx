"use client";

// ─── components/workout/ExerciseFocusCard.tsx ─────────────────────────────────
// Phase UX-1 — single-exercise guided card.
// Shows one exercise at a time with stepper controls and a clear primary action.

import { useState, useMemo } from "react";
import type { WorkoutExercise }    from "@/lib/exercises/generateWorkout";
import type { Exercise }           from "@/lib/exercises/exerciseLibrary";
import type { TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { SetRecord }          from "./types";
import { SetStepper }              from "./SetStepper";
import { getExerciseHistory }      from "@/lib/history/exerciseHistory";
import { getExerciseSubstitutions } from "@/lib/exercises/exerciseSubstitutions";

// ─── Parse rest seconds ───────────────────────────────────────────────────────

function parseRestSeconds(rest: string): number {
  const min = rest.match(/(\d+)\s*min/);
  const sec = rest.match(/(\d+)\s*sec/);
  if (min) return parseInt(min[1], 10) * 60;
  if (sec) return parseInt(sec[1], 10);
  return 60;
}

function parseReps(str: string): number {
  return parseInt(str, 10) || 0;
}

// ─── Completed set summary row ────────────────────────────────────────────────

function CompletedSetRow({
  index,
  set,
  onUndo,
}: {
  index:  number;
  set:    SetRecord;
  onUndo: () => void;
}) {
  const repsNum = parseInt(set.actualReps, 10) || 0;
  const label   = set.weight
    ? `${set.weight} kg × ${repsNum} reps`
    : `${repsNum} reps`;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#F0FAF6] border border-[#A3DCCA]/60">
      <span className="w-5 h-5 rounded-full bg-[#085041] flex items-center justify-center flex-shrink-0">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          <polyline points="2,5.5 4.5,8 8,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[11px] font-bold text-[#9B9690] tabular-nums w-10 flex-shrink-0">
        Set {index + 1}
      </span>
      <span className="text-[12px] font-semibold text-[#085041] flex-1 min-w-0">{label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-[10px] text-[#9B9690] hover:text-[#5C5850] transition-colors flex-shrink-0"
      >
        Undo
      </button>
    </div>
  );
}

// ─── Previous best banner ─────────────────────────────────────────────────────

function PreviousBest({ exerciseName }: { exerciseName: string }) {
  const history = useMemo(() => getExerciseHistory(exerciseName), [exerciseName]);
  if (!history.bestSet || history.completionCount === 0) return null;

  const { bestSet } = history;
  const label = bestSet.weight > 0
    ? `${bestSet.weight} kg × ${bestSet.reps} reps`
    : `${bestSet.reps} reps`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#F3F2FD] rounded-xl border border-[#C9C5EE]">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B5ECC] flex-shrink-0">Last</span>
      <span className="text-[12px] font-semibold text-[#3C3489] flex-1 min-w-0 truncate">{label}</span>
      <span className="text-[10px] text-[#9B9690] flex-shrink-0">{history.completionCount}×</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseFocusCardProps {
  ex:          WorkoutExercise;
  sets:        SetRecord[];
  onChange:    (sets: SetRecord[]) => void;
  onRestStart: (totalSeconds: number, exerciseName: string) => void;
  environment: TrainingEnvironment;
  onSwap:      (newExercise: Exercise) => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExerciseFocusCard({
  ex,
  sets,
  onChange,
  onRestStart,
  environment,
  onSwap,
}: ExerciseFocusCardProps) {
  const [showNotes, setShowNotes]           = useState(false);
  const [showSwap,  setShowSwap]            = useState(false);
  const restDuration = parseRestSeconds(ex.rest);

  const completedCount = sets.filter(s => s.completed).length;
  const allDone        = completedCount === sets.length && sets.length > 0;

  // First uncompleted set is the active one
  const activeSetIdx   = sets.findIndex(s => !s.completed);

  // Active set defaults (weight = last completed or last best; reps = target)
  const activeSet      = activeSetIdx >= 0 ? sets[activeSetIdx] : null;

  function updateActiveSet(patch: Partial<SetRecord>) {
    if (activeSetIdx < 0) return;
    onChange(sets.map((s, i) => i === activeSetIdx ? { ...s, ...patch } : s));
  }

  function completeActiveSet() {
    if (activeSetIdx < 0) return;
    const isLastSet = activeSetIdx === sets.length - 1;
    const next = sets.map((s, i) =>
      i === activeSetIdx ? { ...s, completed: true } : s
    );
    onChange(next);
    if (!isLastSet) onRestStart(restDuration, ex.name);
  }

  function undoSet(idx: number) {
    onChange(sets.map((s, i) => i === idx ? { ...s, completed: false } : s));
  }

  const alternatives = useMemo(
    () => getExerciseSubstitutions({ exercise: ex.exercise, environment }).slice(0, 4),
    [ex.exercise, environment]
  );

  const muscles = ex.exercise.primaryMuscles.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Exercise header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2
            className="text-[1.35rem] font-semibold text-[#1C1B18] leading-snug"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {ex.name}
          </h2>
          <div className="flex-shrink-0 flex items-center gap-1 mt-1">
            <span className="text-[11px] font-bold text-[#534AB7] tabular-nums">
              {completedCount}/{ex.sets}
            </span>
            {allDone && (
              <span className="text-[11px] text-[#085041]">✓</span>
            )}
          </div>
        </div>

        {/* Muscle pills */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {muscles.map(m => (
            <span
              key={m}
              className="text-[10px] font-medium text-[#534AB7] bg-[#F0EEF8] px-2 py-0.5 rounded-full"
            >
              {m}
            </span>
          ))}
          <span className="text-[#D8D4CC]">·</span>
          <span className="text-[10px] text-[#9B9690]">{ex.sets} sets · {ex.reps} reps · {ex.rest}</span>
        </div>
      </div>

      {/* Previous best */}
      <PreviousBest exerciseName={ex.name} />

      {/* Completed sets */}
      {completedCount > 0 && (
        <div className="space-y-1.5">
          {sets.filter(s => s.completed).map((s, _i) => {
            const realIdx = sets.indexOf(s);
            return (
              <CompletedSetRow
                key={realIdx}
                index={realIdx}
                set={s}
                onUndo={() => undoSet(realIdx)}
              />
            );
          })}
        </div>
      )}

      {/* Active set */}
      {activeSet && !allDone && (
        <div className="bg-white rounded-2xl border-2 border-[#534AB7]/20 shadow-[0_2px_16px_rgba(83,74,183,0.08)] p-5">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9B9690]">
              Set {activeSetIdx + 1} of {sets.length}
            </span>
            {ex.rpe !== undefined && (
              <span className="text-[10px] font-semibold text-[#633806] bg-[#FDF6EC] px-2 py-0.5 rounded-full border border-[#E8C98A]">
                Target RPE {ex.rpe}
              </span>
            )}
          </div>

          {/* Steppers */}
          <div className="flex items-center justify-center gap-6">
            <SetStepper
              value={activeSet.weight}
              onChange={weight => updateActiveSet({ weight })}
              min={0}
              step={2.5}
              unit="kg"
              label="Weight"
            />
            <SetStepper
              value={parseReps(activeSet.actualReps) || parseReps(activeSet.targetReps) || undefined}
              onChange={v =>
                updateActiveSet({ actualReps: v !== undefined ? String(v) : activeSet.targetReps })
              }
              min={1}
              step={1}
              unit="reps"
              label="Reps"
            />
          </div>

          {/* Complete set button — the ONE primary action */}
          <button
            type="button"
            onClick={completeActiveSet}
            className="mt-5 w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[15px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all"
            aria-label={`Complete set ${activeSetIdx + 1}`}
          >
            Complete Set {activeSetIdx + 1}
          </button>
        </div>
      )}

      {/* Exercise done state */}
      {allDone && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#E1F5EE] rounded-2xl border border-[#A3DCCA]">
          <span className="text-[14px] font-semibold text-[#085041]">Exercise complete</span>
          <span className="text-[13px] text-[#085041]">✓</span>
        </div>
      )}

      {/* Secondary: technique, why today, swap */}
      <div className="space-y-2">
        {/* Notes / technique */}
        {(ex.notes || ex.exercise.biomechanicalNote) && (
          <button
            type="button"
            onClick={() => setShowNotes(n => !n)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F5F3EE] text-left"
          >
            <span className="text-[11px] font-semibold text-[#5C5850]">Technique notes</span>
            <span className="text-[10px] text-[#9B9690]">{showNotes ? "▲" : "▼"}</span>
          </button>
        )}
        {showNotes && (
          <div className="px-3 py-3 bg-[#F5F3EE] rounded-xl space-y-2">
            {ex.notes && (
              <p className="text-[11px] text-[#633806] leading-relaxed">{ex.notes}</p>
            )}
            {ex.exercise.biomechanicalNote && (
              <p className="text-[11px] text-[#5C5850] leading-relaxed">{ex.exercise.biomechanicalNote}</p>
            )}
            {ex.rationale && (
              <p className="text-[11px] text-[#3C3489] leading-relaxed italic">{ex.rationale}</p>
            )}
          </div>
        )}

        {/* Swap */}
        {alternatives.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowSwap(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F5F3EE] text-left"
            >
              <span className="text-[11px] font-semibold text-[#5C5850]">Swap exercise</span>
              <span className="text-[10px] text-[#9B9690]">{showSwap ? "▲" : "▼"}</span>
            </button>
            {showSwap && (
              <div className="space-y-1.5">
                {alternatives.map(alt => (
                  <button
                    key={alt.name}
                    type="button"
                    onClick={() => { onSwap(alt); setShowSwap(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#FAFAF7] rounded-xl border border-[#E5E2DA] text-left hover:border-[#534AB7]/40 transition-colors"
                  >
                    <span className="text-[12px] font-medium text-[#1C1B18]">{alt.name}</span>
                    <span className="text-[10px] text-[#9B9690]">{alt.equipment}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
