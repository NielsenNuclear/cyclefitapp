"use client";
// ─── components/intelligence/SafetyConstraintBanner.tsx ───────────────────────
// Phase A — User-facing safety constraint notification.
// Renders only when safety rules have constrained today's recommendation.

import { useState } from "react";
import type { SafetyResult } from "@/lib/intelligence/safety/SafetyEngine";

interface Props {
  result: SafetyResult;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-danger",
  high:     "text-caution",
  moderate: "text-info",
};

export function SafetyConstraintBanner({ result }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { explanation, evaluation } = result;

  if (!explanation.hasConstraints) return null;

  const activations = [
    ...evaluation.criticalActivations,
    ...evaluation.highActivations,
  ].filter(r => r.userMessage);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-caution mt-0.5 flex-shrink-0" />
          <p className="text-sm font-semibold text-ink leading-snug">
            {explanation.headline}
          </p>
        </div>
        {activations.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-ink-muted hover:text-ink transition-colors flex-shrink-0 mt-0.5"
          >
            {expanded ? "Less" : "Details"}
          </button>
        )}
      </div>

      {explanation.detail && (
        <p className="text-xs text-ink-secondary leading-relaxed pl-4">{explanation.detail}</p>
      )}

      {expanded && activations.length > 0 && (
        <div className="pt-2 space-y-2 border-t border-border pl-4">
          {activations.map(r => (
            <div key={r.ruleId} className="flex items-start gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 flex-shrink-0 ${PRIORITY_COLOR[r.priority] ?? "text-ink-muted"}`}>
                {r.priority}
              </span>
              <p className="text-xs text-ink-secondary">{r.userMessage}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
