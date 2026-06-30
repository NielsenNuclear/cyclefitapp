"use client";

import type { TrainingWindow } from "@/lib/cycle/trainingWindows";

const CONFIDENCE_CONFIG: Record<
  TrainingWindow["confidence"],
  { label: string; badge: string }
> = {
  low:      { label: "Low confidence",      badge: "bg-[#F5F3EE] text-[#5C5850]" },
  moderate: { label: "Moderate confidence", badge: "bg-[#FDF6EC] text-[#854F0B]" },
  high:     { label: "High confidence",     badge: "bg-[#E1F5EE] text-[#085041]" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

interface TrainingWindowCardProps {
  window: TrainingWindow | null;
}

export function TrainingWindowCard({ window: tw }: TrainingWindowCardProps) {
  if (!tw || tw.confidence === "low") return null;

  const conf = CONFIDENCE_CONFIG[tw.confidence];
  const span = tw.endDay - tw.startDay + 1;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Prime training window</CardLabel>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px] font-bold text-[#1C1B18]">
          Days {tw.startDay}–{tw.endDay}
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ml-1 ${conf.badge}`}>
          {conf.label}
        </span>
      </div>

      <p className="text-[12px] font-medium text-[#1C1B18] mb-1">
        {span}-day window — peak on cycle day {tw.peakDay}
      </p>
      <p className="text-[11px] text-[#9B9690]">
        Average readiness during this window: {tw.meanReadiness}/100
      </p>
    </div>
  );
}
