"use client";

import type { MinimumViableWorkout } from "@/lib/adherence/minimumWorkout";

interface Props {
  workout:     MinimumViableWorkout;
  onDismiss:   () => void;
}

export function MinimumViableWorkoutCard({ workout, onDismiss }: Props) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-widest mb-0.5">
            Rescue Session
          </div>
          <h3 className="text-sm font-semibold text-white">{workout.name}</h3>
          <p className="text-[11px] text-white/45 mt-0.5">
            {workout.durationMin} min · No equipment needed
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/30 hover:text-white/60 text-lg leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <p className="text-[11px] text-white/55 leading-relaxed">{workout.rationale}</p>

      <div className="space-y-2">
        {workout.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-white/5 border border-white/8 rounded-xl px-3 py-2.5"
          >
            <div>
              <div className="text-xs font-medium text-white">{ex.name}</div>
              <div className="text-[10px] text-white/40 mt-0.5">
                {ex.sets} sets × {ex.reps}
              </div>
            </div>
            <div className="text-[10px] text-white/30">
              {ex.restSec}s rest
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-white/30 text-center">
        Something is always better than nothing. Ten minutes today keeps the habit alive.
      </p>
    </div>
  );
}
