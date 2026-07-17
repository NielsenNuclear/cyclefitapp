"use client";

// ─── components/workout/CooldownScreen.tsx ────────────────────────────────────
// UX Stabilization Batch 1 — restores the cooldown step after the main lifts,
// before the workout is marked finished. The data (RecoveryBlock) was already
// computed by generateWorkout() on every session; this is the first UI consumer
// of it. See docs/ux/UXStabilizationAudit.md #2.
//
// Workout Engine Sprint — Phase C.9: re-skinned for the dark Workout Mode
// canvas (docs/ux/WorkoutModeProposal.md) — this only ever renders inside
// WorkoutModeShell now, so the dark palette applies unconditionally.

import type { RecoveryBlock } from "@/lib/exercises/generateWorkout";
import type { MobilityItem }  from "@/lib/exercises/generateWorkout";

interface CooldownScreenProps {
  block:    RecoveryBlock;
  onFinish: () => void;
}

function StretchRow({ item }: { item: MobilityItem }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/10 last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[#F5F3EE]">{item.name}</div>
        {item.notes && (
          <div className="text-[11px] text-[#8A8580] mt-0.5">{item.notes}</div>
        )}
      </div>
      <span className="text-[11px] font-semibold text-[#B5B0A6] flex-shrink-0 tabular-nums">
        {item.duration}
      </span>
    </div>
  );
}

export function CooldownScreen({ block, onFinish }: CooldownScreenProps) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A8580] mb-1.5">
          Cooldown · ~{block.totalMinutes} min
        </p>
        <h2
          className="text-[1.15rem] font-light text-[#F5F3EE] leading-snug"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          Wind down
        </h2>
      </div>

      {/* Stretches */}
      {block.stretches.length > 0 && (
        <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8580] mb-1.5">
            Stretches
          </p>
          {block.stretches.map(item => <StretchRow key={item.id} item={item} />)}
        </div>
      )}

      {/* Breathwork */}
      {block.breathwork && (
        <div className="px-4 py-3 bg-[#534AB7]/10 rounded-2xl border border-[#534AB7]/30">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8B84DD] mb-1">
            Breathwork
          </p>
          <p className="text-[11px] text-[#D6D2F5] leading-relaxed">{block.breathwork}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onFinish}
        className="w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[15px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all min-h-[56px]"
      >
        Finish Workout
      </button>
      <button
        type="button"
        onClick={onFinish}
        className="w-full text-center text-[12px] font-medium text-[#8A8580] hover:text-[#F5F3EE] transition-colors -mt-2 min-h-[44px]"
      >
        Skip cooldown
      </button>
    </div>
  );
}
