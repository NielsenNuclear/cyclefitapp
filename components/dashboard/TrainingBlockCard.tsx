"use client";

import type { TrainingBlock, BlockGoal } from "@/lib/planning/trainingBlocks";

const GOAL_COLORS: Record<BlockGoal, { badge: string; bar: string }> = {
  Strength:          { badge: "bg-[#EEEDFE] text-[#3C3489]", bar: "bg-[#6B5CE7]" },
  Hypertrophy:       { badge: "bg-[#E1F5EE] text-[#085041]", bar: "bg-[#0E9F6E]" },
  "Fat Loss":        { badge: "bg-[#FDF6EC] text-[#854F0B]", bar: "bg-[#F59E0B]" },
  "General Fitness": { badge: "bg-[#F5F3EE] text-[#5C5850]", bar: "bg-[#9B9690]"  },
  Performance:       { badge: "bg-[#EEF2FF] text-[#3730A3]", bar: "bg-[#4F46E5]" },
  Recovery:          { badge: "bg-[#FEF2F2] text-[#991B1B]", bar: "bg-[#EF4444]" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

interface TrainingBlockCardProps {
  block: TrainingBlock | null;
}

export function TrainingBlockCard({ block }: TrainingBlockCardProps) {
  if (!block) return null;

  const colors = GOAL_COLORS[block.primaryGoal];
  const pct    = Math.min(100, Math.round((block.currentWeek / block.totalWeeks) * 100));

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Training block</CardLabel>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
          {block.primaryGoal} Block
        </span>
        <span className="text-[12px] font-semibold text-[#1C1B18]">
          Week {block.currentWeek} of {block.totalWeeks}
        </span>
      </div>

      <div className="h-1.5 bg-[#F0EDE4] rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[11px] text-[#5C5850] leading-relaxed">
        {block.plannedProgression}
      </p>
    </div>
  );
}
