"use client";

import type { InsightReport, Insight, InsightCategory } from "@/lib/insights/generateInsights";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

const CATEGORY_CHIP: Record<InsightCategory, string> = {
  cycle:       "bg-[#F3F2FD] text-[#3C3489] border-[#C9C5EE]",
  training:    "bg-[#F1EFE8] text-[#5C5850] border-[#E0DDD4]",
  recovery:    "bg-[#E1F5EE] text-[#085041] border-[#A3DCCA]",
  volume:      "bg-[#FDF6EC] text-[#633806] border-[#E8C98A]",
  progression: "bg-[#EEF4FD] text-[#1A3F8F] border-[#B3CEEF]",
};

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  cycle:       "Cycle",
  training:    "Training",
  recovery:    "Recovery",
  volume:      "Volume",
  progression: "Progress",
};

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <div className="py-3 border-b border-[#F0EDE4] last:border-0">
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border mb-1.5 ${CATEGORY_CHIP[insight.category]}`}
      >
        {CATEGORY_LABEL[insight.category]}
      </span>
      <p className="text-[12px] text-[#4A4740] leading-relaxed">{insight.body}</p>
    </div>
  );
}

interface InsightsCardProps {
  report: InsightReport | null;
}

export function InsightsCard({ report }: InsightsCardProps) {
  if (!report || report.insights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Insights</CardLabel>
      <div>
        {report.insights.map((insight, i) => (
          <InsightRow key={i} insight={insight} />
        ))}
      </div>
    </div>
  );
}
