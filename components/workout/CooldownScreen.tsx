"use client";

// ─── components/workout/CooldownScreen.tsx ────────────────────────────────────
// UX Stabilization Batch 1 — restores the cooldown step after the main lifts,
// before the workout is marked finished. The data (RecoveryBlock) was already
// computed by generateWorkout() on every session; this is the first UI consumer
// of it. See docs/ux/UXStabilizationAudit.md #2.

import type { RecoveryBlock } from "@/lib/exercises/generateWorkout";
import type { MobilityItem }  from "@/lib/exercises/generateWorkout";

interface CooldownScreenProps {
  block:    RecoveryBlock;
  onFinish: () => void;
}

function StretchRow({ item }: { item: MobilityItem }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[#F0EDE4] last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[#1C1B18]">{item.name}</div>
        {item.notes && (
          <div className="text-[11px] text-[#9B9690] mt-0.5">{item.notes}</div>
        )}
      </div>
      <span className="text-[11px] font-semibold text-[#5C5850] flex-shrink-0 tabular-nums">
        {item.duration}
      </span>
    </div>
  );
}

export function CooldownScreen({ block, onFinish }: CooldownScreenProps) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-1.5">
          Cooldown · ~{block.totalMinutes} min
        </p>
        <h2
          className="text-[1.15rem] font-light text-[#1C1B18] leading-snug"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          Wind down
        </h2>
      </div>

      {/* Stretches */}
      {block.stretches.length > 0 && (
        <div className="px-4 py-3 bg-white rounded-2xl border border-[#EAE7DE]">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9B9690] mb-1.5">
            Stretches
          </p>
          {block.stretches.map(item => <StretchRow key={item.id} item={item} />)}
        </div>
      )}

      {/* Breathwork */}
      {block.breathwork && (
        <div className="px-4 py-3 bg-[#F3F2FD] rounded-2xl border border-[#C9C5EE]">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#534AB7] mb-1">
            Breathwork
          </p>
          <p className="text-[11px] text-[#3C3489] leading-relaxed">{block.breathwork}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onFinish}
        className="w-full py-4 rounded-2xl bg-[#534AB7] text-white text-[15px] font-semibold tracking-wide hover:bg-[#3C3489] active:scale-[0.98] transition-all"
      >
        Finish Workout
      </button>
      <button
        type="button"
        onClick={onFinish}
        className="w-full text-center text-[12px] font-medium text-[#9B9690] hover:text-[#5C5850] transition-colors -mt-2"
      >
        Skip cooldown
      </button>
    </div>
  );
}
