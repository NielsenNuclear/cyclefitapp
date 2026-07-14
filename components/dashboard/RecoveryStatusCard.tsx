"use client";

import type { TrainingLoadReport } from "@/lib/analytics/trainingLoad";
import type { RecoveryStatus, WorkloadTrend } from "@/lib/analytics/trainingLoad";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<RecoveryStatus, string> = {
  "Recovered":        "bg-success-bg text-success-text border-success-border",
  "Normal":           "bg-surface-hover text-ink-secondary border-border-strong",
  "Elevated Fatigue": "bg-caution-bg text-caution-text border-caution-border",
  "High Fatigue":     "bg-danger-bg text-danger border-danger-border",
};

const TREND_LABEL: Record<WorkloadTrend, string> = {
  "Increasing": "↑ Increasing",
  "Stable":     "→ Stable",
  "Decreasing": "↓ Decreasing",
};

const TREND_COLOR: Record<WorkloadTrend, string> = {
  "Increasing": "text-caution-text",
  "Stable":     "text-ink-secondary",
  "Decreasing": "text-success-text",
};

interface RecoveryStatusCardProps {
  report: TrainingLoadReport | null;
}

export function RecoveryStatusCard({ report }: RecoveryStatusCardProps) {
  if (!report) {
    return (
      <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <CardLabel>Recovery Status</CardLabel>
        <p className="text-[12px] text-ink-muted">Building your training load profile…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
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
        <div className="px-3 py-2 bg-surface-subtle rounded-xl">
          <div className="text-[9px] text-ink-muted uppercase tracking-wider mb-0.5">
            This Week
          </div>
          <div className="text-[13px] font-medium text-ink">
            {report.completedWorkouts} session{report.completedWorkouts !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="px-3 py-2 bg-surface-subtle rounded-xl">
          <div className="text-[9px] text-ink-muted uppercase tracking-wider mb-0.5">
            Weekly Sets
          </div>
          <div className="text-[13px] font-medium text-ink">
            {report.weeklyVolume}
          </div>
        </div>
      </div>
    </div>
  );
}
