"use client";

import type { TrainingBlock, BlockGoal } from "@/lib/planning/trainingBlocks";

const GOAL_COLORS: Record<BlockGoal, { badge: string; bar: string }> = {
  Strength:          { badge: "bg-brand-bg-mid text-brand-dark", bar: "bg-brand-light" },
  Hypertrophy:       { badge: "bg-success-bg text-success-text", bar: "bg-success" },
  "Fat Loss":        { badge: "bg-caution-bg text-caution", bar: "bg-caution" },
  "General Fitness": { badge: "bg-surface-subtle text-ink-secondary", bar: "bg-ink-muted"  },
  Performance:       { badge: "bg-brand-bg-mid text-brand-dark", bar: "bg-brand" },
  Recovery:          { badge: "bg-danger-bg text-danger", bar: "bg-danger" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
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
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Training block</CardLabel>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
          {block.primaryGoal} Block
        </span>
        <span className="text-[12px] font-semibold text-ink">
          Week {block.currentWeek} of {block.totalWeeks}
        </span>
      </div>

      <div className="h-1.5 bg-surface-hover rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed">
        {block.plannedProgression}
      </p>
    </div>
  );
}
