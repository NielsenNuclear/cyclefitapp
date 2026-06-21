"use client";

import type { RescueModeState } from "@/lib/adherence/rescueMode";

interface Props {
  rescueMode:    RescueModeState | null;
  onExit:        () => void;
}

export function RescueModeCard({ rescueMode, onExit }: Props) {
  if (!rescueMode) return null;

  const { adjustments, daysRemaining } = rescueMode;
  const progress = Math.max(0, Math.min(100, ((7 - daysRemaining) / 7) * 100));

  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-widest mb-0.5">
            Rescue Mode Active
          </div>
          <h3 className="text-sm font-semibold text-white">Protecting Your Momentum</h3>
          <p className="text-[11px] text-white/45 mt-0.5">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</p>
        </div>
        <button
          onClick={onExit}
          className="text-[11px] text-white/40 hover:text-white/70 border border-white/15 rounded-full px-3 py-1 transition-colors flex-shrink-0"
        >
          Exit mode
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="text-[10px] text-white/35 flex justify-between">
          <span>Started</span>
          <span>Day {7 - daysRemaining + 1} of 7</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-rose-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Adjusted expectations */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Sessions",     value: `${adjustments.targetSessions} / week`    },
          { label: "Duration",     value: `${adjustments.sessionDurationMin} min`    },
          { label: "Nutrition",    value: adjustments.nutritionFocus                 },
          { label: "Recovery",     value: `${adjustments.recoveryHabits} habit / day` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-white/40 mb-0.5">{label}</div>
            <div className="text-xs font-medium text-white">{value}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-white/45 leading-relaxed text-center">
        Rescue mode reduces volume and expectations so you stay in the habit without burning out further.
        Axis will gradually restore normal load once momentum returns.
      </p>
    </div>
  );
}
