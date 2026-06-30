"use client";

import type { RecoveryCapacity, CapacityLevel } from "@/lib/adaptive/recoveryCapacity";

const LEVEL_CONFIG: Record<CapacityLevel, { label: string; badge: string; bar: string }> = {
  high:     { label: "High capacity",     badge: "bg-[#E1F5EE] text-[#085041]", bar: "bg-[#0E9F6E]" },
  moderate: { label: "Moderate capacity", badge: "bg-[#EEEDFE] text-[#3C3489]", bar: "bg-[#6B5CE7]" },
  low:      { label: "Low capacity",      badge: "bg-[#FDF6EC] text-[#854F0B]", bar: "bg-[#F59E0B]" },
};

const CONFIDENCE_CHIP: Record<RecoveryCapacity["confidence"], { label: string; cls: string }> = {
  established: { label: "Established", cls: "bg-[#E1F5EE] text-[#085041]" },
  growing:     { label: "Growing",     cls: "bg-[#EEEDFE] text-[#3C3489]" },
  early:       { label: "Early data",  cls: "bg-[#F5F3EE] text-[#9B9690]" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

interface RecoveryCapacityCardProps {
  capacity: RecoveryCapacity | null;
}

export function RecoveryCapacityCard({ capacity }: RecoveryCapacityCardProps) {
  if (!capacity) return null;

  const config     = LEVEL_CONFIG[capacity.level];
  const chip       = CONFIDENCE_CHIP[capacity.confidence];
  const scorePct   = Math.min(100, capacity.score);

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery capacity</CardLabel>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
          {config.label}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${chip.cls}`}>
          {chip.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-[#F0EDE4] rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${config.bar}`}
          style={{ width: `${scorePct}%` }}
        />
      </div>

      <p className="text-[11px] text-[#5C5850] leading-relaxed mb-2">
        {capacity.rationale}
      </p>

      {capacity.dataPoints > 0 && (
        <p className="text-[10px] text-[#C8C5BC]">
          Based on {capacity.dataPoints} logged session{capacity.dataPoints !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
