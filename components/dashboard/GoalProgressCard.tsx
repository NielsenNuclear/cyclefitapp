"use client";

import { useMemo }              from "react";
import { computeGoalSnapshot }  from "@/lib/goals/goalTracking";
import { computeGoalProgress }  from "@/lib/goals/goalProgress";
import { computeGoalForecast }  from "@/lib/goals/goalForecast";
import type { GoalType }        from "@/lib/exercises/goalBasedSelection";

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-[#F0EDE4] my-3" />;
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete:  "bg-[#E1F5EE] text-[#085041]",
    ahead:     "bg-[#EFF1FD] text-[#3B31A8]",
    on_track:  "bg-[#EFF1FD] text-[#534AB7]",
    behind:    "bg-[#FDF6EC] text-[#633806]",
    stalled:   "bg-[#FDE8E8] text-[#8B1A1A]",
  };
  const labels: Record<string, string> = {
    complete: "Goal reached", ahead: "Ahead of pace", on_track: "On track",
    behind: "Behind pace", stalled: "Stalled",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] ?? styles.on_track}`}>
      {labels[status] ?? status}
    </span>
  );
}

const GOAL_LABELS: Record<GoalType, string> = {
  strength:             "Build Strength",
  hypertrophy:          "Build Muscle",
  fat_loss:             "Fat Loss",
  general_fitness:      "General Fitness",
  athletic_performance: "Athletic Performance",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface GoalProgressCardProps {
  goalType:       GoalType;
  sessionsPerWeek: number;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function GoalProgressCard({ goalType, sessionsPerWeek }: GoalProgressCardProps) {
  const snapshot = useMemo(
    () => computeGoalSnapshot(goalType, sessionsPerWeek),
    [goalType, sessionsPerWeek],
  );
  const progress = useMemo(() => computeGoalProgress(snapshot), [snapshot]);
  const forecast = useMemo(
    () => computeGoalForecast(progress, {
      targetValue:   snapshot.targetValue,
      currentValue:  snapshot.currentValue,
      unit:          snapshot.unit,
      baselineValue: snapshot.baselineValue,
    }),
    [progress, snapshot],
  );

  if (!snapshot.hasEnoughData) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
          Goal Progress · {GOAL_LABELS[goalType]}
        </div>
        <p className="text-[12px] text-[#9B9690] leading-relaxed">
          {progress.coachingMessage}
        </p>
      </div>
    );
  }

  const pct      = Math.min(100, Math.max(0, progress.percentComplete));
  const barWidth = `${Math.round(pct)}%`;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690]">
          Goal Progress
        </div>
        <StatusChip status={forecast.status} />
      </div>

      {/* Goal label */}
      <div className="text-[14px] font-semibold text-[#1C1B18] mb-3">
        {GOAL_LABELS[goalType]}
      </div>

      {/* Progress bar */}
      <div className="mb-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-[#9B9690]">{snapshot.metricLabel}</span>
          <span className="text-[11px] font-semibold text-[#534AB7]">{Math.round(pct)}%</span>
        </div>
        <div className="h-2 bg-[#F0EDE4] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#534AB7] rounded-full transition-all"
            style={{ width: barWidth }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#9B9690]">
            {snapshot.baselineValue} {snapshot.unit}
          </span>
          <span className="text-[10px] text-[#9B9690]">
            {snapshot.targetValue} {snapshot.unit}
          </span>
        </div>
      </div>

      <Divider />

      {/* Metric stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="text-[13px] font-bold text-[#1C1B18]">
            {snapshot.currentValue} <span className="text-[10px] font-normal text-[#9B9690]">{snapshot.unit}</span>
          </div>
          <div className="text-[9px] text-[#9B9690] uppercase tracking-wide mt-0.5">Current</div>
        </div>
        <div className="text-center">
          <div className={`text-[13px] font-bold ${progress.changeFromBase >= 0 ? "text-[#085041]" : "text-[#8B1A1A]"}`}>
            {progress.changeFromBase >= 0 ? "+" : ""}{progress.changeFromBase}
          </div>
          <div className="text-[9px] text-[#9B9690] uppercase tracking-wide mt-0.5">vs Baseline</div>
        </div>
        <div className="text-center">
          <div className="text-[13px] font-bold text-[#1C1B18]">
            {progress.etaWeeks ? `${progress.etaWeeks}w` : "—"}
          </div>
          <div className="text-[9px] text-[#9B9690] uppercase tracking-wide mt-0.5">ETA</div>
        </div>
      </div>

      {/* Forecast summary */}
      <p className="text-[12px] text-[#5C5850] leading-relaxed">
        {forecast.summaryLine}
      </p>

      <Divider />

      {/* Coaching message */}
      <p className="text-[11px] text-[#6B6860] leading-relaxed">
        {progress.coachingMessage}
      </p>

      {/* 4-week projection if meaningful */}
      {forecast.hasEnoughData && progress.weeklyVelocity > 0 && !progress.isComplete && (
        <>
          <Divider />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6B6860]">4-week projection</span>
            <span className="text-[11px] font-semibold text-[#534AB7]">
              {forecast.projectedIn4Wks} {snapshot.unit}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
