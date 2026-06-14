"use client";

import type { AdaptiveInsight } from "@/lib/adaptive/adaptiveDecisionEngine";

interface AdaptiveInsightsCardProps {
  insights: AdaptiveInsight[];
}

const CATEGORY_COLOR: Record<string, string> = {
  strength:     "bg-indigo-50 border-indigo-100",
  recovery:     "bg-blue-50 border-blue-100",
  symptoms:     "bg-purple-50 border-purple-100",
  adherence:    "bg-green-50 border-green-100",
  intervention: "bg-amber-50 border-amber-100",
  weighting:    "bg-teal-50 border-teal-100",
};

const CATEGORY_DOT: Record<string, string> = {
  strength:     "bg-indigo-400",
  recovery:     "bg-blue-400",
  symptoms:     "bg-purple-400",
  adherence:    "bg-green-400",
  intervention: "bg-amber-400",
  weighting:    "bg-teal-400",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-emerald-400" :
    pct >= 45 ? "bg-amber-400"   :
               "bg-gray-300";

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

export function AdaptiveInsightsCard({ insights }: AdaptiveInsightsCardProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Adaptive Insights</h2>
        <p className="text-sm text-gray-400">
          Completing daily check-ins and logging workouts helps Axis learn your personal patterns. Insights appear once enough data has been observed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-50">
        <h2 className="text-base font-semibold text-gray-900">Adaptive Insights</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Patterns observed from your training and cycle history
        </p>
      </div>

      <div className="divide-y divide-gray-50">
        {insights.map(insight => {
          const bgBorder = CATEGORY_COLOR[insight.category] ?? "bg-gray-50 border-gray-100";
          const dot      = CATEGORY_DOT[insight.category]  ?? "bg-gray-300";
          return (
            <div
              key={insight.id}
              className={`mx-4 my-3 rounded-xl border px-4 py-3 ${bgBorder}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${dot}`} />
                <p className="text-sm text-gray-800 leading-snug">{insight.text}</p>
              </div>
              <ConfidenceBar value={insight.confidence} />
            </div>
          );
        })}
      </div>

      <p className="px-5 pb-4 pt-1 text-[10px] text-gray-400 leading-relaxed">
        Insights reflect observed patterns from your logged data and update as more history accumulates.
      </p>
    </div>
  );
}
