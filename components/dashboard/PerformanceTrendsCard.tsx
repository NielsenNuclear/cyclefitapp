"use client";

import type { ExerciseProgressSummary, ExerciseTrend, ProgressionState } from "@/lib/progression/exerciseProgress";

const PROGRESSION_CONFIG: Record<ProgressionState, { label: string; cls: string }> = {
  progressing: { label: "Progressing", cls: "bg-[#E1F5EE] text-[#085041]"   },
  stalled:     { label: "Stalled",     cls: "bg-[#FEF9EC] text-[#854F0B]"   },
  regressing:  { label: "Regressing",  cls: "bg-[#FDF1F0] text-[#8B2318]"   },
  new:         { label: "Early data",  cls: "bg-[#F5F3EE] text-[#9B9690]"   },
};

const TREND_LABELS: Record<ExerciseTrend, string> = {
  improving:         "Effort ↓",
  stable:            "Effort stable",
  declining:         "Effort ↑",
  insufficient_data: "",
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function ExerciseRow({ summary }: { summary: ExerciseProgressSummary }) {
  const prog      = PROGRESSION_CONFIG[summary.progressionStatus];
  const trendLabel = TREND_LABELS[summary.trend];

  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[12px] font-medium text-[#1C1B18] leading-snug">
          {summary.exerciseName}
        </span>
        <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${prog.cls}`}>
          {prog.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="text-[10px] text-[#9B9690]">
          {summary.completedCount} session{summary.completedCount !== 1 ? "s" : ""}
        </span>
        {summary.skippedCount > 0 && (
          <>
            <span className="text-[#D8D4CC]">·</span>
            <span className="text-[10px] text-[#C0553A]">
              {summary.skippedCount} skipped
            </span>
          </>
        )}
        {summary.averageRPE > 0 && (
          <>
            <span className="text-[#D8D4CC]">·</span>
            <span className="text-[10px] text-[#9B9690]">
              Avg effort {summary.averageRPE}/10
            </span>
          </>
        )}
        {trendLabel && (
          <>
            <span className="text-[#D8D4CC]">·</span>
            <span className="text-[10px] text-[#9B9690]">
              {trendLabel}
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
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Exercise progression</CardLabel>
      <p className="text-[11px] text-[#9B9690] mb-1 leading-relaxed">
        Last 30 days · Tracking appearances and completion
      </p>
      <div>
        {top.map(s => (
          <ExerciseRow key={s.exerciseName} summary={s} />
        ))}
      </div>
    </div>
  );
}
