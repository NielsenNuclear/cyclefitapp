"use client";

import type { InsightDiscoveryReport, DiscoveredInsight } from "@/lib/insights/insightDiscovery";

// ── Priority badge ─────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, string> = {
  high:   "bg-caution-bg text-caution-text border-caution-border",
  medium: "bg-brand-bg-mid text-brand-text border-brand-border",
  low:    "bg-surface-subtle text-ink-muted border-border",
};

const CATEGORY_LABEL: Record<string, string> = {
  recovery:     "Recovery",
  performance:  "Performance",
  adherence:    "Adherence",
  scheduling:   "Scheduling",
  volume:       "Volume",
  correlation:  "Pattern",
  efficiency:   "Efficiency",
};

// ── Insight row ────────────────────────────────────────────────────────────

function InsightRow({ insight }: { insight: DiscoveredInsight }) {
  return (
    <div className="py-3.5 border-b border-border/60 last:border-0">
      {/* Category + priority */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="type-micro text-ink-muted">{CATEGORY_LABEL[insight.category] ?? insight.category}</span>
        {insight.priority === "high" && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLE.high}`}>
            Notable
          </span>
        )}
      </div>

      {/* Headline */}
      <p className="text-[13px] font-semibold text-ink leading-snug">{insight.headline}</p>

      {/* Detail */}
      <p className="text-[11px] text-ink-secondary leading-relaxed mt-1">{insight.detail}</p>

      {/* Action */}
      <div className="mt-2 flex items-start gap-1.5">
        <span className="text-brand text-[11px] flex-shrink-0 font-bold mt-0.5">→</span>
        <p className="text-[11px] text-brand-text font-medium leading-snug">{insight.action}</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface InsightDiscoveryCardProps {
  report:     InsightDiscoveryReport;
  className?: string;
}

export function InsightDiscoveryCard({ report, className = "" }: InsightDiscoveryCardProps) {
  if (!report.dataReady || report.insights.length === 0) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">Discovered Insights</p>
        <p className="text-[12px] text-ink-muted">
          Keep logging check-ins and sessions — personalised discoveries appear as patterns emerge.
        </p>
      </div>
    );
  }

  const highlight    = report.weeklyHighlight;
  const remaining    = report.insights.filter(i => i !== highlight).slice(0, 4);

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <p className="type-micro text-ink-muted mb-0.5">Discovered Insights</p>
        <p className="text-[11px] text-ink-muted">
          {report.totalInsights} pattern{report.totalInsights !== 1 ? "s" : ""} found in your data
        </p>
      </div>

      {/* Weekly highlight */}
      {highlight && (
        <div className="px-5 py-4 bg-brand-bg border-b border-brand-border">
          <p className="type-micro text-brand-text mb-2">This week's top insight</p>
          <p className="text-[13px] font-semibold text-ink leading-snug">{highlight.headline}</p>
          <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">{highlight.detail}</p>
          <div className="mt-2 flex items-start gap-1.5">
            <span className="text-brand text-[11px] flex-shrink-0 font-bold mt-0.5">→</span>
            <p className="text-[11px] text-brand-text font-medium leading-snug">{highlight.action}</p>
          </div>
        </div>
      )}

      {/* Remaining insights */}
      {remaining.length > 0 && (
        <div className="px-5 py-2">
          {remaining.map(insight => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Footer caveat */}
      <div className="px-5 py-3 bg-surface-raised border-t border-border">
        <p className="text-[10px] text-ink-muted leading-relaxed">
          Insights reflect observed patterns in your data. Correlations don't imply causation — consult a professional for clinical decisions.
        </p>
      </div>
    </div>
  );
}
