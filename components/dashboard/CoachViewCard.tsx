"use client";

import type { CoachView } from "@/lib/coaching/coachView";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#534AB7] mb-3">
      {children}
    </div>
  );
}

interface CoachViewCardProps {
  view: CoachView | null;
}

export function CoachViewCard({ view }: CoachViewCardProps) {
  if (!view) return null;

  return (
    <div className="bg-[#F7F6FF] rounded-2xl border border-[#D8D4F5] p-5 shadow-[0_1px_12px_rgba(83,74,183,0.08)]">
      <CardLabel>What Axis recommends next</CardLabel>

      <p className="text-[14px] font-semibold text-[#1C1B18] leading-snug mb-4">
        {view.headline}
      </p>

      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-2">
          Recommended
        </p>
        <ul className="space-y-2">
          {view.actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#534AB7] text-[12px] leading-relaxed mt-0 shrink-0">•</span>
              <span className="text-[12px] text-[#1C1B18] leading-relaxed">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-[#D8D4F5] pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-1.5">
          Reason
        </p>
        <p className="text-[11px] text-[#5C5850] leading-relaxed">
          {view.reasoning}
        </p>
      </div>
    </div>
  );
}
