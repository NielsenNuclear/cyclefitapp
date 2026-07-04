"use client";

import type { AdaptiveInsight, InsightCategory } from "@/lib/adaptive/adaptiveDecisionEngine";
import { ConfidenceIndicator }                    from "./ConfidenceIndicator";
import type { ConfidenceLevel }                   from "@/lib/accuracy/recommendationConfidence";

// ── Category icons (emoji-free, text-based) ────────────────────────────────

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  strength:     "Strength",
  recovery:     "Recovery",
  symptoms:     "Symptoms",
  adherence:    "Consistency",
  intervention: "Adjustment",
  weighting:    "Personalization",
};

const CATEGORY_COLOR: Record<InsightCategory, string> = {
  strength:     "bg-brand-bg-mid text-brand-text border-brand-border",
  recovery:     "bg-success-bg text-success-text border-success-border",
  symptoms:     "bg-caution-bg text-caution-text border-caution-border",
  adherence:    "bg-info-bg text-info-text border-info-border",
  intervention: "bg-neutral-bg text-neutral-text border-neutral-border",
  weighting:    "bg-surface-subtle text-ink-secondary border-border",
};

function confidenceFromScore(n: number): ConfidenceLevel {
  if (n >= 0.75) return "high";
  if (n >= 0.45) return "moderate";
  return "low";
}

// ── InsightRow ─────────────────────────────────────────────────────────────

function InsightRow({ insight }: { insight: AdaptiveInsight }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
        CATEGORY_COLOR[insight.category]
      }`}>
        {CATEGORY_LABEL[insight.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-ink-secondary leading-snug">{insight.text}</p>
        <div className="mt-1.5">
          <ConfidenceIndicator
            level={confidenceFromScore(insight.confidence)}
            score={Math.round(insight.confidence * 100)}
            compact
          />
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface AdaptiveInsightsPanelProps {
  insights:   AdaptiveInsight[];
  className?: string;
}

export function AdaptiveInsightsPanel({ insights, className = "" }: AdaptiveInsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">Adaptive Intelligence</p>
        <p className="text-[12px] text-ink-muted">
          Keep logging workouts and check-ins — personalised insights will appear as your engine learns.
        </p>
      </div>
    );
  }

  // Group by category for cleaner display
  const grouped = insights.reduce<Map<InsightCategory, AdaptiveInsight[]>>((acc, ins) => {
    const list = acc.get(ins.category) ?? [];
    list.push(ins);
    acc.set(ins.category, list);
    return acc;
  }, new Map());

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      <div className="px-5 pt-5 pb-3">
        <p className="type-micro text-ink-muted mb-0.5">Adaptive Intelligence</p>
        <p className="text-[11px] text-ink-muted">
          {insights.length} personalised {insights.length === 1 ? "observation" : "observations"} from your history
        </p>
      </div>

      <div className="divide-y divide-border/60 px-5">
        {Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat}>
            {items.map(insight => (
              <InsightRow key={insight.id} insight={insight} />
            ))}
          </div>
        ))}
      </div>

      <div className="px-5 py-3 bg-surface-raised border-t border-border">
        <p className="text-[10px] text-ink-muted leading-relaxed">
          These observations are based on your personal training history. They update as you log more sessions.
        </p>
      </div>
    </div>
  );
}
