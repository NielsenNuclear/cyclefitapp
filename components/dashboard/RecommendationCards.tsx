"use client";

import type { RecoveryRecommendation } from "@/types/recommendation";
import { AxisIcon } from "@/components/ui/Icon";

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[12px] text-ink-secondary leading-relaxed">
      <span className="mt-[5px] w-1 h-1 rounded-full bg-ink-faint flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

// TrainingCard moved into components/dashboard/WorkoutCard.tsx (as
// TrainingHeader) — Dashboard 3.0 Layer 1 consolidation. See
// docs/ux/UXStabilizationAudit.md.

// ─── RecoveryCard ─────────────────────────────────────────────────────────────

export function RecoveryCard({ recovery }: { recovery: RecoveryRecommendation }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery</CardLabel>

      <h3
        className="text-[1.1rem] font-light text-ink leading-snug mb-3"
        style={{ fontFamily: "'Lora', Georgia, serif" }}
      >
        {recovery.focus}
      </h3>

      <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">{recovery.body}</p>

      {/* Sleep target */}
      <div className="flex items-start gap-2.5 p-3 bg-surface-subtle rounded-xl mb-4">
        <span className="text-brand mt-0.5">
          <AxisIcon name="moon" size={13} />
        </span>
        <p className="text-[11px] text-ink-secondary leading-relaxed">{recovery.sleepTarget}</p>
      </div>

      {/* Practices */}
      {recovery.practices.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Practices</div>
          <ul className="space-y-1.5">
            {recovery.practices.map((p, i) => <ListItem key={i}>{p}</ListItem>)}
          </ul>
        </div>
      )}

      {/* Stress note */}
      {recovery.stressNote && (
        <div className="mt-3 p-3 bg-caution-bg rounded-xl border border-caution-border">
          <p className="text-[11px] text-caution-text leading-relaxed">{recovery.stressNote}</p>
        </div>
      )}
    </div>
  );
}
