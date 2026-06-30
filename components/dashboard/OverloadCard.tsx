"use client";

import type { OverloadRecommendation, OverloadDecision } from "@/lib/progression/progressiveOverload";

const DECISION_CONFIG: Record<OverloadDecision, { label: string; badge: string; arrow: string }> = {
  increase: { label: "Increase load",  badge: "bg-[#E1F5EE] text-[#085041]", arrow: "↑" },
  maintain: { label: "Maintain load",  badge: "bg-[#F5F3EE] text-[#5C5850]", arrow: "→" },
  reduce:   { label: "Reduce load",    badge: "bg-[#FDF6EC] text-[#854F0B]", arrow: "↓" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

interface OverloadCardProps {
  recommendation: OverloadRecommendation | null;
}

export function OverloadCard({ recommendation }: OverloadCardProps) {
  if (!recommendation) return null;

  const config = DECISION_CONFIG[recommendation.decision];

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Progressive overload</CardLabel>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
          {config.arrow} {config.label}
        </span>
      </div>

      <p className="text-[12px] font-medium text-[#1C1B18] mb-1.5">
        {recommendation.suggestion}
      </p>
      <p className="text-[11px] text-[#9B9690] leading-relaxed">
        {recommendation.rationale}
      </p>
    </div>
  );
}
