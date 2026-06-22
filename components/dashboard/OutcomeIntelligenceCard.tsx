"use client";

import type { GoalSuccessModel }   from "@/lib/outcomes/goalSuccessModel";
import type { BehaviorImpactReport } from "@/lib/outcomes/behaviorImpactRanking";
import type { BottleneckReport }   from "@/lib/outcomes/bottleneckDetection";
import type { LeveragePoint }      from "@/lib/outcomes/leveragePointEngine";
import type { CompletionForecast } from "@/lib/outcomes/completionForecast";

interface Props {
  successModel:   GoalSuccessModel | undefined;
  behaviorImpact: BehaviorImpactReport | undefined;
  bottlenecks:    BottleneckReport | undefined;
  leveragePoint:  LeveragePoint | undefined;
  forecast:       CompletionForecast | undefined;
}

const TIER_COLOR: Record<string, string> = {
  accelerating: "text-emerald-400",
  on_track:     "text-sky-400",
  stalled:      "text-amber-400",
  declining:    "text-rose-400",
};

const SEVERITY_DOT: Record<string, string> = {
  severe:   "bg-rose-400",
  moderate: "bg-amber-400",
  mild:     "bg-sky-400",
};

const PRIORITY_BOX: Record<string, string> = {
  critical: "bg-rose-500/10 border-rose-500/25 text-rose-300",
  high:     "bg-amber-500/10 border-amber-500/25 text-amber-300",
  moderate: "bg-sky-500/10 border-sky-500/25 text-sky-300",
};

const CONF_COLOR: Record<string, string> = {
  high:     "text-emerald-400",
  moderate: "text-sky-400",
  low:      "text-white/30",
};

export function OutcomeIntelligenceCard({
  successModel,
  behaviorImpact,
  bottlenecks,
  leveragePoint,
  forecast,
}: Props) {
  const hasContent =
    (successModel?.dataReady) ||
    (bottlenecks?.dataReady) ||
    (forecast?.dataReady);

  if (!hasContent) return null;

  const tierColor = TIER_COLOR[successModel?.currentTier ?? ""] ?? "text-white/40";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Outcome Intelligence</h3>
        {successModel?.dataReady && (
          <span className={`text-xs font-semibold capitalize ${tierColor}`}>
            {successModel.currentTier.replace("_", " ")}
          </span>
        )}
      </div>

      {/* Top predictor + bottleneck summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-xl px-3 py-2.5">
          <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Top predictor</div>
          <div className="text-[11px] font-semibold text-white/75">
            {behaviorImpact?.behaviors[0]?.label ?? "—"}
          </div>
          {behaviorImpact?.behaviors[0] && (
            <div className="text-[9px] text-white/35 mt-0.5">
              impact {behaviorImpact.behaviors[0].impactScore}/100
            </div>
          )}
        </div>
        <div className="bg-white/5 rounded-xl px-3 py-2.5">
          <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Primary bottleneck</div>
          <div className="text-[11px] font-semibold text-white/75">
            {bottlenecks?.primaryBottleneck?.label ?? (bottlenecks?.dataReady ? "None detected" : "—")}
          </div>
          {bottlenecks?.primaryBottleneck && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[bottlenecks.primaryBottleneck.severity]}`} />
              <span className="text-[9px] text-white/35">{bottlenecks.primaryBottleneck.severity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottleneck list */}
      {bottlenecks?.allBottlenecks && bottlenecks.allBottlenecks.length > 1 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">All constraints</div>
          {bottlenecks.allBottlenecks.map((b) => (
            <div key={b.category} className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[b.severity]}`} />
              <div className="flex-1 text-[10px] text-white/55">{b.label}</div>
              <div className="text-[9px] text-white/30">−{b.estimatedReadinessDrag} pts</div>
              <div className="w-14 h-1 rounded-full bg-white/8">
                <div
                  className={`h-1 rounded-full ${SEVERITY_DOT[b.severity].replace("bg-", "bg-")}`}
                  style={{ width: `${b.currentScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leverage point */}
      {leveragePoint && (
        <div className={`border rounded-xl px-3 py-2.5 space-y-1 ${PRIORITY_BOX[leveragePoint.priority] ?? "bg-white/5 border-white/10 text-white/50"}`}>
          <div className="text-[9px] font-semibold uppercase tracking-widest opacity-70">
            Best leverage point
          </div>
          <div className="text-[12px] font-semibold text-white">{leveragePoint.label}</div>
          <div className="text-[10px] opacity-80">{leveragePoint.actionableAdvice}</div>
          <div className="text-[9px] opacity-55 italic">{leveragePoint.estimatedGain}</div>
        </div>
      )}

      {/* Completion forecast */}
      {forecast?.dataReady && (
        <div className="space-y-2 pt-1 border-t border-white/8">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">Goal completion forecast</div>
          <div className="grid grid-cols-3 gap-1.5">
            {forecast.periods.map((p) => (
              <div key={p.days} className="bg-white/5 rounded-xl py-2 px-1 text-center">
                <div className="text-sm font-bold text-white">{p.probability}%</div>
                <div className="text-[9px] text-white/30 mt-0.5">{p.label}</div>
                <div className={`text-[8px] mt-0.5 ${CONF_COLOR[p.confidence]}`}>{p.confidence}</div>
              </div>
            ))}
          </div>
          {forecast.projectedEtaWeeks !== null && (
            <div className="text-[10px] text-white/35 text-center">
              Current velocity → goal in ~{forecast.projectedEtaWeeks}w
            </div>
          )}
        </div>
      )}
    </div>
  );
}
