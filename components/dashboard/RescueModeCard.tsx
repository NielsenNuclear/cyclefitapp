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
          <h3 className="text-sm font-semibold text-[#1C1B18]">Protecting Your Momentum</h3>
          <p className="text-[11px] text-[#9B9690] mt-0.5">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</p>
        </div>
        <button
          onClick={onExit}
          className="text-[11px] text-[#9B9690] hover:text-[#5C5850] border border-[#EAE7DE] rounded-full px-3 py-1 transition-colors flex-shrink-0"
        >
          Exit mode
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="text-[10px] text-[#9B9690] flex justify-between">
          <span>Started</span>
          <span>Day {7 - daysRemaining + 1} of 7</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-black/8">
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
          <div key={label} className="bg-[#F1EFE8] border border-[#EAE7DE] rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-[#9B9690] mb-0.5">{label}</div>
            <div className="text-xs font-medium text-[#1C1B18]">{value}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#9B9690] leading-relaxed text-center">
        Rescue mode reduces volume and expectations so you stay in the habit without burning out further.
        Axis will gradually restore normal load once momentum returns.
      </p>
    </div>
  );
}
