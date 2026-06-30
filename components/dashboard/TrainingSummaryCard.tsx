"use client";

import type { WorkoutHistorySummary } from "@/lib/history/workoutHistory";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <span
        className="text-[1.35rem] font-light text-[#1C1B18] leading-none"
        style={{ fontFamily: "'Lora', Georgia, serif" }}
      >
        {value}
      </span>
      <span className="text-[9px] text-[#9B9690] uppercase tracking-wider text-center">
        {label}
      </span>
    </div>
  );
}

interface TrainingSummaryCardProps {
  summary: WorkoutHistorySummary | null;
}

export function TrainingSummaryCard({ summary }: TrainingSummaryCardProps) {
  if (!summary || summary.totalWorkouts === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <CardLabel>Training Summary</CardLabel>
        <p className="text-[12px] text-[#9B9690] leading-relaxed">
          No workouts logged yet. Complete a session to start tracking your progress.
        </p>
      </div>
    );
  }

  const completionPct = Math.round(summary.completionRate * 100);

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Training Summary</CardLabel>

      <div className="grid grid-cols-3 divide-x divide-[#F0EDE4]">
        <StatCell value={summary.workoutsThisWeek} label="This Week" />
        <StatCell value={`${completionPct}%`}      label="Completion" />
        <StatCell value={summary.currentStreak}    label="Day Streak" />
      </div>

      <p className="mt-3 text-[10px] text-[#9B9690]">
        {summary.totalCompleted} of {summary.totalWorkouts} total sessions completed
        {summary.longestStreak > 1 && ` · best streak ${summary.longestStreak} days`}
      </p>
    </div>
  );
}
