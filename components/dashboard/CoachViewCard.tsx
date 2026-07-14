"use client";

import type { CoachView } from "@/lib/coaching/coachView";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand mb-3">
      {children}
    </div>
  );
}

interface CoachViewCardProps {
  view: CoachView | null;
}

export function CoachViewCard({ view }: CoachViewCardProps) {
  if (!view) return null;

  return (
    <div className="bg-brand-bg-mid rounded-2xl border border-brand-border p-5 shadow-[0_1px_12px_rgba(83,74,183,0.08)]">
      <CardLabel>What Axis recommends next</CardLabel>

      <p className="text-[14px] font-semibold text-ink leading-snug mb-4">
        {view.headline}
      </p>

      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">
          Recommended
        </p>
        <ul className="space-y-2">
          {view.actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-brand text-[12px] leading-relaxed mt-0 shrink-0">•</span>
              <span className="text-[12px] text-ink leading-relaxed">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-brand-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">
          Reason
        </p>
        <p className="text-[11px] text-ink-secondary leading-relaxed">
          {view.reasoning}
        </p>
      </div>
    </div>
  );
}
