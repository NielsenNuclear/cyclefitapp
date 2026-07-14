"use client";

import type { RecoveryCapacity, CapacityLevel } from "@/lib/adaptive/recoveryCapacity";

const LEVEL_CONFIG: Record<CapacityLevel, { label: string; badge: string; bar: string }> = {
  high:     { label: "High capacity",     badge: "bg-success-bg text-success-text", bar: "bg-success" },
  moderate: { label: "Moderate capacity", badge: "bg-brand-bg-mid text-brand-dark", bar: "bg-brand-light" },
  low:      { label: "Low capacity",      badge: "bg-caution-bg text-caution", bar: "bg-caution" },
};

const CONFIDENCE_CHIP: Record<RecoveryCapacity["confidence"], { label: string; cls: string }> = {
  established: { label: "Established", cls: "bg-success-bg text-success-text" },
  growing:     { label: "Growing",     cls: "bg-brand-bg-mid text-brand-dark" },
  early:       { label: "Early data",  cls: "bg-surface-subtle text-ink-muted" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
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
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
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
      <div className="h-1.5 bg-surface-hover rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${config.bar}`}
          style={{ width: `${scorePct}%` }}
        />
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed mb-2">
        {capacity.rationale}
      </p>

      {capacity.dataPoints > 0 && (
        <p className="text-[10px] text-ink-faint">
          Based on {capacity.dataPoints} logged session{capacity.dataPoints !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
