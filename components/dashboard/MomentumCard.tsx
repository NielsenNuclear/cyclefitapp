"use client";

import type { MomentumScore } from "@/lib/adherence/momentum";

interface Props {
  momentum: MomentumScore | undefined;
}

const LEVEL_COLOR: Record<string, string> = {
  strong:    "text-emerald-400",
  improving: "text-sky-400",
  flat:      "text-white/50",
  declining: "text-rose-400",
};

const LEVEL_BG: Record<string, string> = {
  strong:    "bg-emerald-500",
  improving: "bg-sky-500",
  flat:      "bg-white/30",
  declining: "bg-rose-500",
};

const LEVEL_LABEL: Record<string, string> = {
  strong:    "Strong ↑↑",
  improving: "Improving ↑",
  flat:      "Stable →",
  declining: "Declining ↓",
};

export function MomentumCard({ momentum }: Props) {
  if (!momentum || momentum.weeksAnalysed < 2) return null;

  const rates = momentum.weeklyRates;
  const max   = Math.max(...rates, 0.01);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Training Momentum</h3>
        <span className={`text-xs font-semibold ${LEVEL_COLOR[momentum.level]}`}>
          {LEVEL_LABEL[momentum.level]}
        </span>
      </div>

      {/* Weekly rate bars */}
      <div className="flex items-end gap-1.5 h-16">
        {rates.map((r, i) => {
          const height = Math.max(4, Math.round((r / max) * 56));
          const isLast = i === rates.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isLast ? LEVEL_BG[momentum.level] : "bg-white/20"
                }`}
                style={{ height: `${height}px` }}
              />
              <span className="text-[9px] text-white/25">W{i + 1}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-white/50 leading-relaxed">{momentum.description}</p>

      {/* Latest week rate */}
      {rates.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-white">
              {Math.round(rates[rates.length - 1] * 100)}%
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">This week</div>
          </div>
          {rates.length >= 2 && (
            <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-semibold text-white">
                {Math.round(rates[rates.length - 2] * 100)}%
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">Last week</div>
            </div>
          )}
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-white">
              {Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 100)}%
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">Average</div>
          </div>
        </div>
      )}
    </div>
  );
}
