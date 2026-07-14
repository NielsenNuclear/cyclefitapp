"use client";

import type { RecoveryWindow } from "@/lib/cycle/recoveryWindows";

const CONFIDENCE_CONFIG: Record<
  RecoveryWindow["confidence"],
  { label: string; badge: string }
> = {
  low:      { label: "Low confidence",      badge: "bg-surface-subtle text-ink-secondary" },
  moderate: { label: "Moderate confidence", badge: "bg-caution-bg text-caution" },
  high:     { label: "High confidence",     badge: "bg-success-bg text-success-text" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

interface RecoveryWindowCardProps {
  window: RecoveryWindow | null;
}

export function RecoveryWindowCard({ window: rw }: RecoveryWindowCardProps) {
  if (!rw || rw.confidence === "low") return null;

  const conf = CONFIDENCE_CONFIG[rw.confidence];
  const span = rw.endDay - rw.startDay + 1;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery window</CardLabel>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px] font-bold text-ink">
          Days {rw.startDay}–{rw.endDay}
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ml-1 ${conf.badge}`}>
          {conf.label}
        </span>
      </div>

      <p className="text-[12px] font-medium text-ink mb-1">
        {span}-day window — lowest point on cycle day {rw.nadirDay}
      </p>
      <p className="text-[11px] text-ink-muted">
        Average readiness during this window: {rw.meanReadiness}/100 — plan lighter sessions here
      </p>
    </div>
  );
}
