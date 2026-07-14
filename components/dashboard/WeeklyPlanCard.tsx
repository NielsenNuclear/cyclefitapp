"use client";

import type { WeeklyPlan } from "@/lib/planning/weeklyPlanner";

const INTENSITY_CONFIG: Record<WeeklyPlan["plannedIntensity"], { label: string; cls: string }> = {
  high:     { label: "High intensity",     cls: "bg-success-bg text-success-text" },
  moderate: { label: "Moderate intensity", cls: "bg-brand-bg-mid text-brand-dark" },
  low:      { label: "Low intensity",      cls: "bg-caution-bg text-caution" },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

interface WeeklyPlanCardProps {
  plan: WeeklyPlan | null;
}

export function WeeklyPlanCard({ plan }: WeeklyPlanCardProps) {
  if (!plan) return null;

  const intensity = INTENSITY_CONFIG[plan.plannedIntensity];

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>This week&rsquo;s plan</CardLabel>

      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${intensity.cls}`}>
          {intensity.label}
        </span>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-surface-subtle rounded-xl p-3 text-center">
          <div className="text-[22px] font-bold text-ink leading-none">
            {plan.targetSessions}
          </div>
          <div className="text-[10px] text-ink-muted mt-1">training days</div>
        </div>
        <div className="flex-1 bg-surface-subtle rounded-xl p-3 text-center">
          <div className="text-[22px] font-bold text-ink leading-none">
            {plan.recoveryDays}
          </div>
          <div className="text-[10px] text-ink-muted mt-1">recovery days</div>
        </div>
        <div className="flex-1 bg-surface-subtle rounded-xl p-3 text-center">
          <div className="text-[22px] font-bold text-ink leading-none">
            ~{plan.targetVolume}
          </div>
          <div className="text-[10px] text-ink-muted mt-1">sets planned</div>
        </div>
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed">{plan.rationale}</p>
    </div>
  );
}
