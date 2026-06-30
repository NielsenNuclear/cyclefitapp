"use client";

import type { RecommendationEvidence } from "@/lib/evidence/recommendationEvidence";
import type { Counterfactual }          from "@/lib/evidence/counterfactualEngine";

interface Props {
  evidence:       RecommendationEvidence | undefined;
  counterfactual: Counterfactual | undefined;
}

const WEIGHT_COLOR: Record<string, string> = {
  high:   "text-[#1C1B18]",
  medium: "text-[#6B6860]",
  low:    "text-[#C8C5BC]",
};

const WEIGHT_DOT: Record<string, string> = {
  high:   "bg-violet-400",
  medium: "bg-sky-400",
  low:    "bg-[#EAE7DE]",
};

export function ExplainabilityCard({ evidence, counterfactual }: Props) {
  if (!evidence) return null;

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Why This Recommendation</h3>
        <span className="text-[10px] text-[#C8C5BC]">{evidence.confidence}% confident</span>
      </div>

      {/* Recommendation headline */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-[#1C1B18] capitalize">{evidence.recommendation}</span>
        <span className="text-[10px] text-[#C8C5BC]">Based on {evidence.sampleSize} sessions</span>
      </div>

      {/* Supporting signals */}
      <div className="space-y-2">
        <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Supporting signals</div>
        {evidence.signals.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${WEIGHT_DOT[s.weight] ?? "bg-[#EAE7DE]"}`} />
              <span className={`text-[11px] ${WEIGHT_COLOR[s.weight] ?? "text-[#9B9690]"}`}>{s.label}</span>
            </div>
            <span className="text-[11px] text-[#9B9690]">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Rationale */}
      <p className="text-[11px] text-[#9B9690] leading-relaxed border-t border-[#EAE7DE] pt-3">
        {evidence.rationale}
      </p>

      {/* Counterfactual */}
      {counterfactual && counterfactual.flipConditions.length > 0 && (
        <div className="border-t border-[#EAE7DE] pt-3 space-y-2">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">What would change this?</div>
          {counterfactual.flipConditions.slice(0, 2).map((c, i) => (
            <div key={i} className="bg-[#F1EFE8] rounded-xl px-3 py-2 space-y-0.5">
              <div className="text-[10px] font-semibold text-[#1B4FA0]">{c.factor}: {c.change}</div>
              <div className="text-[10px] text-[#9B9690]">{c.impact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
