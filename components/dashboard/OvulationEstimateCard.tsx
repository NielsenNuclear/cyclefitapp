"use client";

import type { OvulationEstimate } from "@/lib/cycle/ovulationEstimator";

const CONFIDENCE_CONFIG: Record<
  OvulationEstimate["confidence"],
  { label: string; badge: string }
> = {
  low:    { label: "Low confidence",    badge: "bg-surface-subtle text-ink-secondary" },
  medium: { label: "Medium confidence", badge: "bg-caution-bg text-caution" },
  high:   { label: "High confidence",   badge: "bg-success-bg text-success-text" },
};

const BASIS_LABEL: Record<OvulationEstimate["basis"], string> = {
  physiological: "Based on cycle length",
  behavioral:    "Based on readiness patterns",
  combined:      "Physiological + readiness data",
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

interface OvulationEstimateCardProps {
  estimate: OvulationEstimate | null;
}

export function OvulationEstimateCard({ estimate }: OvulationEstimateCardProps) {
  if (!estimate) return null;

  const { estimatedDay, window, confidence, basis } = estimate;
  const conf = CONFIDENCE_CONFIG[confidence];

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Estimated ovulation window</CardLabel>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px] font-bold text-ink">
          Days {window[0]}–{window[2]}
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ml-1 ${conf.badge}`}>
          {conf.label}
        </span>
      </div>

      <p className="text-[12px] font-medium text-ink mb-1">
        Peak estimated on cycle day {estimatedDay}
      </p>
      <p className="text-[11px] text-ink-muted mb-3">
        {BASIS_LABEL[basis]}
      </p>

      <p className="text-[10px] text-ink-faint leading-relaxed border-t border-surface-hover pt-3">
        Not a medical assessment — behavioral estimate only. Log period dates regularly to improve accuracy.
      </p>
    </div>
  );
}
