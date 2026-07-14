"use client";

import { useState } from "react";
import type { ExplanationPoint } from "@/types/recommendation";
import { color as tokenColor } from "@/lib/design/tokens";

interface RecommendationExplanationProps {
  points: ExplanationPoint[];
  disclaimer: string;
}

const WEIGHT_STYLES: Record<string, { badge: string; label: string }> = {
  Primary:   { badge: "bg-brand-bg-mid text-brand-dark border-brand-border", label: "Primary signal" },
  Secondary: { badge: "bg-surface-hover text-ink-secondary border-border-strong", label: "Secondary" },
  Advisory:  { badge: "bg-success-bg text-success-text border-success-border", label: "Advisory" },
};

function ExplanationRow({ point, index }: { point: ExplanationPoint; index: number }) {
  const style = WEIGHT_STYLES[point.weight];

  return (
    <div
      className="flex gap-4 pb-5 border-b border-surface-hover last:border-0 last:pb-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Index + weight badge (vertical) */}
      <div className="flex flex-col items-center gap-2 pt-0.5 flex-shrink-0" style={{ minWidth: 24 }}>
        <div className="w-6 h-6 rounded-full bg-surface-hover border border-border-strong flex items-center justify-center text-[10px] font-bold text-ink-muted">
          {index + 1}
        </div>
        {index < 10 && (
          <div className="w-px flex-1 bg-surface-hover min-h-[12px]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Signal + weight */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-[12px] font-semibold text-ink">{point.signal}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
            {style.label}
          </span>
        </div>

        {/* Observation */}
        <div className="text-[11px] text-ink-muted mb-1.5 font-medium">
          Observed: <span className="text-ink-secondary font-normal">{point.observation}</span>
        </div>

        {/* Implication */}
        <p className="text-[12px] text-ink-secondary leading-relaxed">{point.implication}</p>
      </div>
    </div>
  );
}

export function RecommendationExplanation({ points, disclaimer }: RecommendationExplanationProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-[0_1px_12px_rgba(0,0,0,0.04)] overflow-hidden">

      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-canvas transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-bg-mid flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tokenColor.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
              <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
              <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="text-[13px] font-semibold text-ink">Why these recommendations?</div>
            <div className="text-[11px] text-ink-muted">{points.length} signals analysed</div>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={tokenColor.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-surface-hover">
          <p className="text-[12px] text-ink-muted leading-relaxed pt-4 pb-5">
            These recommendations are generated from your profile data and today's signals. The engine reasons across multiple inputs — phase is one of several, and never overrides readiness signals.
          </p>

          <div className="space-y-0">
            {points.map((point, i) => (
              <ExplanationRow key={point.signal} point={point} index={i} />
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-5 pt-4 border-t border-surface-hover">
            <div className="flex gap-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tokenColor.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[11px] text-ink-muted leading-relaxed italic">{disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
