"use client";

import type { TrainingLoadReport } from "@/lib/analytics/trainingLoad";
import type { RecoveryStatus, WorkloadTrend } from "@/lib/analytics/trainingLoad";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<RecoveryStatus, string> = {
  "Recovered":        "bg-[#E1F5EE] text-[#085041] border-[#A3DCCA]",
  "Normal":           "bg-[#F1EFE8] text-[#5C5850] border-[#E0DDD4]",
  "Elevated Fatigue": "bg-[#FDF6EC] text-[#633806] border-[#E8C98A]",
  "High Fatigue":     "bg-[#FDE8E8] text-[#8B1A1A] border-[#F5BCBC]",
};

const TREND_LABEL: Record<WorkloadTrend, string> = {
  "Increasing": "↑ Increasing",
  "Stable":     "→ Stable",
  "Decreasing": "↓ Decreasing",
};

const TREND_COLOR: Record<WorkloadTrend, string> = {
  "Increasing": "text-[#633806]",
  "Stable":     "text-[#5C5850]",
  "Decreasing": "text-[#085041]",
};

interface RecoveryStatusCardProps {
  report: TrainingLoadReport | null;
}

export function RecoveryStatusCard({ report }: RecoveryStatusCardProps) {
  if (!report) {
    return (
      <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <CardLabel>Recovery Status</CardLabel>
        <p className="text-[12px] text-[#9B9690]">Building your training load profile…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery Status</CardLabel>

      {/* Status badge + trend */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[report.recoveryStatus]}`}
        >
          {report.recoveryStatus}
        </span>
        <span className={`text-[11px] font-medium ${TREND_COLOR[report.workloadTrend]}`}>
          {TREND_LABEL[report.workloadTrend]}
        </span>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[#F5F3EE] rounded-xl">
          <div className="text-[9px] text-[#9B9690] uppercase tracking-wider mb-0.5">
            This Week
          </div>
          <div className="text-[13px] font-medium text-[#1C1B18]">
            {report.completedWorkouts} session{report.completedWorkouts !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="px-3 py-2 bg-[#F5F3EE] rounded-xl">
          <div className="text-[9px] text-[#9B9690] uppercase tracking-wider mb-0.5">
            Weekly Sets
          </div>
          <div className="text-[13px] font-medium text-[#1C1B18]">
            {report.weeklyVolume}
          </div>
        </div>
      </div>
    </div>
  );
}
