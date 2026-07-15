"use client";

// ─── LockedInsight ────────────────────────────────────────────────────────────
// UX Stabilization Batch 3 (issue #12) — the single shared "not mature yet"
// presentational state. Every intelligence card that gates on
// lib/intelligence/dataMaturity.ts should render this instead of inventing its
// own lock treatment, so the experience is identical everywhere it appears.
// Renders in place of a real score/tier — callers should check
// getMaturityStage(...) !== "ready" before rendering their normal content at all,
// not overlay this on top of an already-computed judgment.

import { AxisIcon } from "./Icon";
import { checkInsRemaining, DEFAULT_MATURITY_THRESHOLD } from "@/lib/intelligence/dataMaturity";

interface LockedInsightProps {
  entryCount: number;
  threshold?: number;
  title?: string;
  className?: string;
}

export function LockedInsight({
  entryCount,
  threshold = DEFAULT_MATURITY_THRESHOLD,
  title,
  className = "",
}: LockedInsightProps) {
  const remaining = checkInsRemaining(entryCount, threshold);

  return (
    <div className={`flex items-start gap-3 rounded-xl bg-surface-hover border border-border px-4 py-3 ${className}`}>
      <AxisIcon name="lock" size="sm" className="text-ink-faint mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        {title && <div className="text-[11px] font-semibold text-ink-secondary">{title}</div>}
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Available after {remaining} more check-in{remaining === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
