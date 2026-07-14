"use client";

import type { InsightReport, Insight, InsightCategory } from "@/lib/insights/generateInsights";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

const CATEGORY_CHIP: Record<InsightCategory, string> = {
  cycle:       "bg-brand-bg-mid text-brand-dark border-brand-border",
  training:    "bg-surface-hover text-ink-secondary border-border-strong",
  recovery:    "bg-success-bg text-success-text border-success-border",
  volume:      "bg-caution-bg text-caution-text border-caution-border",
  progression: "bg-info-bg text-info border-info-border",
  readiness:   "bg-brand-bg-mid text-brand-dark border-brand-border",
};

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  cycle:       "Cycle",
  training:    "Training",
  recovery:    "Recovery",
  volume:      "Volume",
  progression: "Progress",
  readiness:   "Readiness",
};

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <div className="py-3 border-b border-surface-hover last:border-0">
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border mb-1.5 ${CATEGORY_CHIP[insight.category]}`}
      >
        {CATEGORY_LABEL[insight.category]}
      </span>
      <p className="text-[12px] text-ink-secondary leading-relaxed">{insight.body}</p>
    </div>
  );
}

interface InsightsCardProps {
  report: InsightReport | null;
}

export function InsightsCard({ report }: InsightsCardProps) {
  if (!report || report.insights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Insights</CardLabel>
      <div>
        {report.insights.map((insight, i) => (
          <InsightRow key={i} insight={insight} />
        ))}
      </div>
    </div>
  );
}
