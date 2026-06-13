"use client";

import type { OvulationEstimate } from "@/lib/cycle/ovulationEstimator";

const CONFIDENCE_CONFIG: Record<
  OvulationEstimate["confidence"],
  { label: string; badge: string }
> = {
  low:    { label: "Low confidence",    badge: "bg-[#F5F3EE] text-[#5C5850]" },
  medium: { label: "Medium confidence", badge: "bg-[#FDF6EC] text-[#854F0B]" },
  high:   { label: "High confidence",   badge: "bg-[#E1F5EE] text-[#085041]" },
};

const BASIS_LABEL: Record<OvulationEstimate["basis"], string> = {
  physiological: "Based on cycle length",
  behavioral:    "Based on readiness patterns",
  combined:      "Physiological + readiness data",
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
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
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Estimated ovulation window</CardLabel>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px] font-bold text-[#1C1B18]">
          Days {window[0]}–{window[2]}
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ml-1 ${conf.badge}`}>
          {conf.label}
        </span>
      </div>

      <p className="text-[12px] font-medium text-[#1C1B18] mb-1">
        Peak estimated on cycle day {estimatedDay}
      </p>
      <p className="text-[11px] text-[#9B9690] mb-3">
        {BASIS_LABEL[basis]}
      </p>

      <p className="text-[10px] text-[#BCBAB4] leading-relaxed border-t border-[#F0EDE6] pt-3">
        Not a medical assessment — behavioral estimate only. Log period dates regularly to improve accuracy.
      </p>
    </div>
  );
}
