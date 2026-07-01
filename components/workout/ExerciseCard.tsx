"use client";
import { useState, useMemo }        from "react";
import type { WorkoutExercise }      from "@/lib/exercises/generateWorkout";
import { getExerciseHistory }        from "@/lib/history/exerciseHistory";
import type { SetRecord }            from "./types";
import { SetRow }                    from "./SetRow";

function parseRestSeconds(rest: string): number {
  const min = rest.match(/(\d+)\s*min/);
  const sec = rest.match(/(\d+)\s*sec/);
  if (min) return parseInt(min[1], 10) * 60;
  if (sec) return parseInt(sec[1], 10);
  return 60;
}

// Collapsed summary shown when all sets are done
function ExerciseSummary({ ex, sets }: { ex: WorkoutExercise; sets: SetRecord[] }) {
  const done      = sets.filter(s => s.completed);
  const avgWeight = done.length > 0
    ? done.reduce((sum, s) => sum + (s.weight ?? 0), 0) / done.length
    : 0;
  const avgReps   = done.length > 0
    ? done.reduce((sum, s) => sum + (parseInt(s.actualReps, 10) || 0), 0) / done.length
    : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#085041] font-medium truncate">
          {done.length} sets complete
          {avgWeight > 0 && ` · ${Math.round(avgWeight * 10) / 10}kg`}
          {avgReps > 0   && ` × ${Math.round(avgReps)} reps`}
        </div>
      </div>
    </div>
  );
}

// Last session auto-fill banner
function LastSessionBanner({ exerciseName }: { exerciseName: string }) {
  const history = useMemo(() => getExerciseHistory(exerciseName), [exerciseName]);
  if (!history.bestSet || history.completionCount === 0) return null;

  const { bestSet } = history;
  const label = bestSet.weight > 0
    ? `${bestSet.weight}kg × ${bestSet.reps} reps`
    : `${bestSet.reps} reps`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#F3F2FD] rounded-xl border border-[#C9C5EE] mb-3">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B5ECC] flex-shrink-0">Last</span>
      <span className="text-[12px] font-semibold text-[#3C3489] flex-1 min-w-0 truncate">{label}</span>
      <span className="text-[10px] text-[#9B9690] flex-shrink-0">{history.completionCount}×</span>
    </div>
  );
}

interface ExerciseCardProps {
  ex:           WorkoutExercise;
  sets:         SetRecord[];
  onChange:     (sets: SetRecord[]) => void;
  onRestStart:  (totalSeconds: number, exerciseName: string) => void;
}

export function ExerciseCard({ ex, sets, onChange, onRestStart }: ExerciseCardProps) {
  const restDuration   = parseRestSeconds(ex.rest);
  const hasRpe         = ex.rpe !== undefined;
  const completedCount = sets.filter(s => s.completed).length;
  const allDone        = completedCount === sets.length && sets.length > 0;
  const [expanded, setExpanded] = useState(true);

  function updateSet(i: number, patch: Partial<SetRecord>) {
    const next = sets.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange(next);

    // Start rest timer when a set is newly marked complete (not after last set)
    if (patch.completed === true && !sets[i].completed) {
      const isLastSet = i === sets.length - 1 && next.every(s => s.completed);
      if (!isLastSet) onRestStart(restDuration, ex.name);
    }
  }

  // First uncompleted set index — highlighted as "active"
  const activeSetIdx = sets.findIndex(s => !s.completed);

  // Auto-collapse when all sets done, auto-expand if a set is unchecked
  const isExpanded = expanded && !allDone || (expanded && allDone);

  return (
    <div
      className={`
        mb-3 rounded-2xl border overflow-hidden transition-colors duration-300
        ${allDone
          ? "border-[#A3DCCA] bg-[#F0FAF6]"
          : "border-[#EAE7DE] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.03)]"
        }
      `}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-3.5 pb-3 text-left"
      >
        <div className="flex items-start gap-2 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {allDone ? (
                <span className="w-4 h-4 rounded-full bg-[#085041] flex items-center justify-center flex-shrink-0">
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <polyline
                      points="2,5.5 4.5,8 8,3"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
              <h3 className="text-[14px] font-semibold text-[#1C1B18] leading-snug truncate">
                {ex.name}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#9B9690]">{ex.exercise.movementPattern}</span>
              <span className="text-[#D8D4CC]">·</span>
              {ex.exercise.primaryMuscles.slice(0, 2).map(m => (
                <span key={m} className="text-[10px] text-[#534AB7] font-medium">{m}</span>
              ))}
              {ex.sets > 0 && (
                <>
                  <span className="text-[#D8D4CC]">·</span>
                  <span className="text-[10px] text-[#9B9690]">
                    {ex.sets} × {ex.reps}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className={`text-[12px] font-bold tabular-nums ${allDone ? "text-[#085041]" : "text-[#9B9690]"}`}>
              {completedCount}/{ex.sets}
            </span>
            <span className="text-[10px] text-[#C5C1B7]">{isExpanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Done summary inside header */}
        {allDone && isExpanded && (
          <div className="mt-2">
            <ExerciseSummary ex={ex} sets={sets} />
          </div>
        )}

        {/* Why today — shown only when not done */}
        {ex.rationale && !allDone && (
          <div className="mt-2 text-[10px] text-[#6B5ECC] leading-relaxed line-clamp-2">
            {ex.rationale}
          </div>
        )}
      </button>

      {/* ── Body ───────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="px-3 pb-4">
          {!allDone && <LastSessionBanner exerciseName={ex.name} />}

          {/* Column headers */}
          <div
            className="grid gap-2 mb-1 px-2"
            style={{ gridTemplateColumns: `24px 1fr 1fr ${hasRpe ? "76px " : ""}48px` }}
          >
            <div />
            <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9B9690] text-center">
              Weight
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9B9690] text-center">
              Reps
            </div>
            {hasRpe && (
              <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9B9690] text-center">
                RPE
              </div>
            )}
            <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9B9690] text-center">
              ✓
            </div>
          </div>

          {/* Set rows — always visible so users can undo completed sets */}
          <div className="space-y-1">
            {sets.map((set, i) => (
              <SetRow
                key={i}
                setIndex={i}
                set={set}
                hasRpe={hasRpe}
                isActive={i === activeSetIdx}
                onChange={patch => updateSet(i, patch)}
              />
            ))}
          </div>

          {/* Coach's note / form reminders */}
          {ex.notes && !allDone && (
            <div className="mt-3 px-3 py-2 bg-[#FDF6EC] rounded-xl border border-[#E8C98A]">
              <p className="text-[10px] text-[#633806] leading-relaxed">{ex.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
