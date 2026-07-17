"use client";

import type { ConfidenceLevel } from "@/lib/accuracy/recommendationConfidence";

// ── ConfidenceBar ──────────────────────────────────────────────────────────
// Compact visual bar used inline within cards.

// Dashboard 2.0 — "low" maps to "Learning" rather than "Low confidence": the
// brief's preferred vocabulary avoids discouraging framing in favor of a
// learning-in-progress framing. See components/intelligence/ConfidenceBadge.tsx
// for the same discipline applied to the 5-tier confidence system.
const LEVEL_META: Record<ConfidenceLevel, { label: string; fill: string; track: string; text: string }> = {
  high:     { label: "High confidence",     fill: "bg-success",  track: "bg-success-bg",  text: "text-success-text"  },
  moderate: { label: "Moderate confidence", fill: "bg-brand",    track: "bg-brand-bg",    text: "text-brand-text"    },
  low:      { label: "Learning",            fill: "bg-caution",  track: "bg-caution-bg",  text: "text-caution-text"  },
};

const LEVEL_PCT: Record<ConfidenceLevel, number> = { high: 85, moderate: 55, low: 25 };

interface ConfidenceIndicatorProps {
  level:      ConfidenceLevel;
  score?:     number;          // 0–100, overrides default fill pct
  reasons?:   string[];
  compact?:   boolean;         // true → badge-only, false → bar + reasons
  className?: string;
}

export function ConfidenceIndicator({
  level, score, reasons, compact = false, className = "",
}: ConfidenceIndicatorProps) {
  const meta = LEVEL_META[level];
  const pct  = score ?? LEVEL_PCT[level];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        level === "high"     ? "bg-success-bg text-success-text border-success-border" :
        level === "moderate" ? "bg-brand-bg-mid text-brand-text border-brand-border" :
                               "bg-caution-bg text-caution-text border-caution-border"
      } ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.fill}`} aria-hidden="true" />
        {meta.label}
      </span>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="type-micro text-ink-muted">Confidence</span>
        <span className={`text-[11px] font-semibold ${meta.text}`}>{meta.label}</span>
      </div>

      {/* Bar */}
      <div className={`h-1.5 rounded-full overflow-hidden ${meta.track}`}>
        <div
          className={`h-full rounded-full ${meta.fill}`}
          style={{ width: `${pct}%`, transition: "width var(--duration-slow) var(--ease-out)" }}
        />
      </div>

      {/* Reasons */}
      {reasons && reasons.length > 0 && (
        <ul className="space-y-0.5 mt-1">
          {reasons.slice(0, 2).map((r, i) => (
            <li key={i} className="type-caption text-ink-muted flex items-start gap-1.5">
              <span className="mt-0.5 flex-shrink-0" aria-hidden="true">·</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
