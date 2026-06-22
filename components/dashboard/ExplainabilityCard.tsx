"use client";

import type { RecommendationEvidence } from "@/lib/evidence/recommendationEvidence";
import type { Counterfactual }          from "@/lib/evidence/counterfactualEngine";

interface Props {
  evidence:       RecommendationEvidence | undefined;
  counterfactual: Counterfactual | undefined;
}

const WEIGHT_COLOR: Record<string, string> = {
  high:   "text-white/70",
  medium: "text-white/50",
  low:    "text-white/30",
};

const WEIGHT_DOT: Record<string, string> = {
  high:   "bg-violet-400",
  medium: "bg-sky-400",
  low:    "bg-white/20",
};

export function ExplainabilityCard({ evidence, counterfactual }: Props) {
  if (!evidence) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Why This Recommendation</h3>
        <span className="text-[10px] text-white/30">{evidence.confidence}% confident</span>
      </div>

      {/* Recommendation headline */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-white capitalize">{evidence.recommendation}</span>
        <span className="text-[10px] text-white/30">Based on {evidence.sampleSize} sessions</span>
      </div>

      {/* Supporting signals */}
      <div className="space-y-2">
        <div className="text-[10px] text-white/25 uppercase tracking-widest">Supporting signals</div>
        {evidence.signals.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${WEIGHT_DOT[s.weight] ?? "bg-white/20"}`} />
              <span className={`text-[11px] ${WEIGHT_COLOR[s.weight] ?? "text-white/40"}`}>{s.label}</span>
            </div>
            <span className="text-[11px] text-white/40">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Rationale */}
      <p className="text-[11px] text-white/35 leading-relaxed border-t border-white/8 pt-3">
        {evidence.rationale}
      </p>

      {/* Counterfactual */}
      {counterfactual && counterfactual.flipConditions.length > 0 && (
        <div className="border-t border-white/8 pt-3 space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">What would change this?</div>
          {counterfactual.flipConditions.slice(0, 2).map((c, i) => (
            <div key={i} className="bg-white/5 rounded-xl px-3 py-2 space-y-0.5">
              <div className="text-[10px] font-semibold text-sky-400">{c.factor}: {c.change}</div>
              <div className="text-[10px] text-white/35">{c.impact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
