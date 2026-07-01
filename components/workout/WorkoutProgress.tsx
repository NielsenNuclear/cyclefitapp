"use client";
import type { WorkoutExercise } from "@/lib/exercises/generateWorkout";
import type { SetRecord }        from "./types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface WorkoutProgressProps {
  exercises:      WorkoutExercise[];
  actuals:        Record<number, SetRecord[]>;
  elapsedSeconds: number;
  workoutName:    string;
}

export function WorkoutProgress({ exercises, actuals, elapsedSeconds, workoutName }: WorkoutProgressProps) {
  const completedCount = exercises.reduce((count, _, i) => {
    const sets = actuals[i] ?? [];
    return count + (sets.length > 0 && sets.every(s => s.completed) ? 1 : 0);
  }, 0);
  const total = exercises.length;
  const pct   = total > 0 ? completedCount / total : 0;

  // First exercise that still has incomplete sets
  const currentIdx = exercises.findIndex((_, i) => {
    const sets = actuals[i] ?? [];
    return sets.length === 0 || sets.some(s => !s.completed);
  });
  const currentName = currentIdx >= 0 ? exercises[currentIdx].name : workoutName;

  return (
    <div className="-mx-5 px-5 pt-3 pb-2.5 mb-4 border-b border-[#EAE7DE]/60 bg-[#FDFCF9]/95">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold text-[#534AB7] flex-shrink-0 tabular-nums">
            {completedCount}/{total}
          </span>
          <span className="text-[12px] font-medium text-[#1C1B18] truncate">{currentName}</span>
        </div>
        <span className="text-[12px] font-semibold text-[#534AB7] tabular-nums flex-shrink-0 ml-3">
          ● {formatTime(elapsedSeconds)}
        </span>
      </div>
      <div className="h-1.5 bg-[#EAE7DE] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#534AB7] rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
