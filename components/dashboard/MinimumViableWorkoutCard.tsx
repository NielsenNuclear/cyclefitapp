"use client";

import type { MinimumViableWorkout } from "@/lib/adherence/minimumWorkout";

interface Props {
  workout:     MinimumViableWorkout;
  onDismiss:   () => void;
}

export function MinimumViableWorkoutCard({ workout, onDismiss }: Props) {
  return (
    <div className="bg-[#FAEEDA] border border-[#E4C88A] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-[#854F0B] font-semibold uppercase tracking-widest mb-0.5">
            Rescue Session
          </div>
          <h3 className="text-sm font-semibold text-[#1C1B18]">{workout.name}</h3>
          <p className="text-[11px] text-[#9B9690] mt-0.5">
            {workout.durationMin} min · No equipment needed
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#9B9690] hover:text-[#5C5850] text-lg leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <p className="text-[11px] text-[#6B6860] leading-relaxed">{workout.rationale}</p>

      <div className="space-y-2">
        {workout.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-white/60 border border-[#E4C88A] rounded-xl px-3 py-2.5"
          >
            <div>
              <div className="text-xs font-medium text-[#1C1B18]">{ex.name}</div>
              <div className="text-[10px] text-[#9B9690] mt-0.5">
                {ex.sets} sets × {ex.reps}
              </div>
            </div>
            <div className="text-[10px] text-[#9B9690]">
              {ex.restSec}s rest
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#9B9690] text-center">
        Something is always better than nothing. Ten minutes today keeps the habit alive.
      </p>
    </div>
  );
}
