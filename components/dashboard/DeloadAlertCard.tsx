"use client";

import type { DeloadRecommendation } from "@/lib/recovery/deloadDetection";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#854F0B] mb-3">
      {children}
    </div>
  );
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.70) return "Moderate confidence";
  return "Early signal";
}

interface DeloadAlertCardProps {
  recommendation: DeloadRecommendation | null;
}

export function DeloadAlertCard({ recommendation }: DeloadAlertCardProps) {
  if (!recommendation?.needed) return null;

  const confLabel = confidenceLabel(recommendation.confidence);
  const confPct   = Math.round(recommendation.confidence * 100);

  return (
    <div className="bg-[#FFFBF5] rounded-2xl border border-[#F5D9B0] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery alert</CardLabel>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-semibold text-[#1C1B18]">
          A deload week is recommended
        </p>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FDF6EC] text-[#854F0B]">
          {confLabel} · {confPct}%
        </span>
      </div>

      <p className="text-[11px] text-[#5C5850] leading-relaxed mb-4">
        {recommendation.rationale}
      </p>

      <div className="bg-[#FEF3E2] rounded-xl p-3">
        <p className="text-[11px] font-semibold text-[#854F0B] mb-1">What to do this week</p>
        <ul className="space-y-1">
          <li className="text-[11px] text-[#5C5850]">· Reduce volume by 40–50%</li>
          <li className="text-[11px] text-[#5C5850]">· Keep intensity light to moderate</li>
          <li className="text-[11px] text-[#5C5850]">· Prioritise sleep and active recovery</li>
        </ul>
      </div>
    </div>
  );
}
