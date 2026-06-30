"use client";

import type { OutcomeScorecard }     from "@/lib/outcomes/outcomeScorecard";
import type { LeveragePoint }        from "@/lib/outcomes/leveragePointEngine";
import type { SuccessPatternReport } from "@/lib/outcomes/successPatternDetection";

interface Props {
  scorecard:       OutcomeScorecard | undefined;
  leveragePoint:   LeveragePoint | undefined;
  successPatterns: SuccessPatternReport | undefined;
}

const TIER_COLOR: Record<string, string> = {
  excellent: "text-[#0F6E56]",
  good:      "text-[#1B4FA0]",
  fair:      "text-[#854F0B]",
  poor:      "text-[#C0392B]",
};

const TIER_BAR: Record<string, string> = {
  excellent: "bg-emerald-500",
  good:      "bg-sky-500",
  fair:      "bg-amber-500",
  poor:      "bg-rose-500",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-rose-500/15 border-rose-500/30 text-[#9B2015]",
  high:     "bg-amber-500/15 border-amber-500/30 text-[#633806]",
  moderate: "bg-sky-500/15 border-sky-500/30 text-[#1B4FA0]",
};

export function OutcomeOptimizationCard({ scorecard, leveragePoint, successPatterns }: Props) {
  if (!scorecard) return null;

  const tierColor = TIER_COLOR[scorecard.tier] ?? "text-[#1C1B18]";
  const tierBar   = TIER_BAR[scorecard.tier]   ?? "bg-[#C8C5BC]";

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Outcome Optimization</h3>
        <span className={`text-xs font-semibold capitalize ${tierColor}`}>{scorecard.tier.replace("_", " ")}</span>
      </div>

      <p className="text-[12px] text-[#5C5850] leading-relaxed">{scorecard.headline}</p>

      {/* Composite score */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#9B9690]">
          <span>Outcome score</span>
          <span>{scorecard.score}/100</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-black/8">
          <div className={`h-2.5 rounded-full ${tierBar}`} style={{ width: `${scorecard.score}%` }} />
        </div>
      </div>

      {/* Component mini-grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Velocity",    value: scorecard.velocityScore    },
          { label: "Compliance",  value: scorecard.complianceScore  },
          { label: "Momentum",    value: scorecard.momentumScore    },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#F1EFE8] rounded-xl py-2 px-1 text-center">
            <div className="text-sm font-semibold text-[#1C1B18]">{value}</div>
            <div className="text-[9px] text-[#C8C5BC] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Success probability */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#9B9690]">Goal completion probability</span>
        <span className={`font-semibold ${tierColor}`}>{scorecard.successProbability}%</span>
      </div>

      {/* Leverage point */}
      {leveragePoint && (
        <div className={`border rounded-xl px-3 py-2.5 space-y-1 ${PRIORITY_COLOR[leveragePoint.priority] ?? "bg-[#F1EFE8] border-[#EAE7DE] text-[#6B6860]"}`}>
          <div className="text-[10px] font-semibold uppercase tracking-widest">Highest leverage</div>
          <div className="text-[12px] font-semibold text-[#1C1B18]">{leveragePoint.label}</div>
          <div className="text-[10px]">{leveragePoint.actionableAdvice}</div>
        </div>
      )}

      {/* Success patterns */}
      {successPatterns?.dataReady && successPatterns.patterns.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[#EAE7DE]">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Your success patterns</div>
          {successPatterns.patterns.slice(0, 2).map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#0F6E56] text-[9px] mt-0.5">✓</span>
              <span className="text-[11px] text-[#9B9690]">{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Acceleration tips */}
      {scorecard.accelerationTips.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[#EAE7DE]">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Acceleration</div>
          {scorecard.accelerationTips.slice(0, 2).map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#1B4FA0] text-[9px] mt-0.5">→</span>
              <span className="text-[11px] text-[#9B9690]">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
