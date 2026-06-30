"use client";

import type { CycleHealthReport } from "@/lib/cycle/cycleHealth";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

interface CycleHealthCardProps {
  report: CycleHealthReport | null;
}

export function CycleHealthCard({ report }: CycleHealthCardProps) {
  if (!report || !report.hasObservations) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Cycle observations</CardLabel>

      <ul className="space-y-2.5 mb-4">
        {report.observations.map(obs => (
          <li key={obs.id} className="flex items-start gap-2.5">
            <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-[#C8B89A] flex-shrink-0" />
            <p className="text-[12px] font-medium text-[#1C1B18] leading-relaxed">
              {obs.observation}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-[#BCBAB4] leading-relaxed border-t border-[#F0EDE6] pt-3">
        {report.disclaimer}
      </p>
    </div>
  );
}
