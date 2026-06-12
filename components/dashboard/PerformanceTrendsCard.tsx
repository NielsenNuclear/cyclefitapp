"use client";

import type { ExerciseProgressSummary, ExerciseTrend } from "@/lib/progression/exerciseProgress";

const TREND_CONFIG: Record<ExerciseTrend, { label: string; cls: string }> = {
  improving:         { label: "Improving",  cls: "bg-[#E1F5EE] text-[#085041]"   },
  stable:            { label: "Stable",     cls: "bg-[#F5F3EE] text-[#5C5850]"   },
  declining:         { label: "Declining",  cls: "bg-[#FDF6EC] text-[#854F0B]"   },
  insufficient_data: { label: "Early data", cls: "bg-[#F5F3EE] text-[#9B9690]"   },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function ExerciseRow({ summary }: { summary: ExerciseProgressSummary }) {
  const trend = TREND_CONFIG[summary.trend];
  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[12px] font-medium text-[#1C1B18] leading-snug">
          {summary.exerciseName}
        </span>
        <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${trend.cls}`}>
          {trend.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[#9B9690]">
          {summary.frequency} session{summary.frequency !== 1 ? "s" : ""}
        </span>
        {summary.averageRPE > 0 && (
          <>
            <span className="text-[#D8D4CC]">·</span>
            <span className="text-[10px] text-[#9B9690]">
              Avg effort {summary.averageRPE}/10
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface PerformanceTrendsCardProps {
  summaries: ExerciseProgressSummary[];
}

export function PerformanceTrendsCard({ summaries }: PerformanceTrendsCardProps) {
  if (summaries.length === 0) return null;

  const top = summaries.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Performance trends</CardLabel>
      <p className="text-[11px] text-[#9B9690] mb-1 leading-relaxed">
        Last 30 days · Based on logged sessions
      </p>
      <div>
        {top.map(s => (
          <ExerciseRow key={s.exerciseName} summary={s} />
        ))}
      </div>
    </div>
  );
}
