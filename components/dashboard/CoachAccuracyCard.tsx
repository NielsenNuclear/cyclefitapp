"use client";

import type { AccuracyReport } from "@/lib/adaptive/readinessValidation";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function AccuracyBar({ rate }: { rate: number }) {
  const pct   = Math.round(rate * 100);
  const color =
    pct >= 80 ? "bg-[#0F6E56]" :
    pct >= 65 ? "bg-[#534AB7]" :
                "bg-[#854F0B]";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-[6px] bg-[#F0EDE4] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-semibold text-[#1C1B18] w-10 text-right">{pct}%</span>
    </div>
  );
}

interface CoachAccuracyCardProps {
  report: AccuracyReport;
}

export function CoachAccuracyCard({ report }: CoachAccuracyCardProps) {
  if (report.totalSamples < 3) return null;

  const primaryRate  = report.last30Days > 0 ? report.last30Days : report.lifetime;
  const primaryPct   = Math.round(primaryRate * 100);
  const periodLabel  = report.last30Days > 0 ? "last 30 days" : "all time";

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Coach accuracy</CardLabel>

      <p className="text-[12px] text-[#1C1B18] leading-relaxed mb-4">
        Axis correctly predicted readiness{" "}
        <span className="font-semibold">{primaryPct}%</span> of the time over the {periodLabel}.
      </p>

      <div className="space-y-3">
        {report.last30Days > 0 && (
          <div>
            <div className="text-[10px] text-[#9B9690] mb-1">Last 30 days</div>
            <AccuracyBar rate={report.last30Days} />
          </div>
        )}
        {report.last90Days > 0 && (
          <div>
            <div className="text-[10px] text-[#9B9690] mb-1">Last 90 days</div>
            <AccuracyBar rate={report.last90Days} />
          </div>
        )}
        <div>
          <div className="text-[10px] text-[#9B9690] mb-1">All time ({report.totalSamples} sessions)</div>
          <AccuracyBar rate={report.lifetime} />
        </div>
      </div>
    </div>
  );
}
