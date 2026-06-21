"use client";

import type { TrainingDecision }  from "@/lib/autoregulation/trainingDecisionEngine";
import type { OutcomePrediction } from "@/lib/autoregulation/outcomePrediction";

interface Props {
  decision:   TrainingDecision   | undefined;
  prediction: OutcomePrediction  | undefined;
}

const TYPE_COLOR: Record<string, string> = {
  proceed:    "text-emerald-400",
  scale_up:   "text-sky-400",
  scale_down: "text-amber-400",
  swap:       "text-violet-400",
  recover:    "text-rose-400",
};

const TYPE_BG: Record<string, string> = {
  proceed:    "bg-emerald-500/8 border-emerald-500/20",
  scale_up:   "bg-sky-500/8 border-sky-500/20",
  scale_down: "bg-amber-500/8 border-amber-500/20",
  swap:       "bg-violet-500/8 border-violet-500/20",
  recover:    "bg-rose-500/8 border-rose-500/20",
};

const TYPE_LABEL: Record<string, string> = {
  proceed:    "Full Session",
  scale_up:   "Enhanced Session",
  scale_down: "Scaled Session",
  swap:       "Modified Session",
  recover:    "Recovery Session",
};

const QUALITY_COLOR: Record<string, string> = {
  high:   "text-emerald-400",
  medium: "text-amber-400",
  low:    "text-rose-400",
};

const COST_COLOR: Record<string, string> = {
  minimal: "text-emerald-400",
  low:     "text-sky-400",
  medium:  "text-amber-400",
  high:    "text-rose-400",
};

export function TrainingDecisionCard({ decision, prediction }: Props) {
  if (!decision) return null;

  const typeColor = TYPE_COLOR[decision.type] ?? "text-white";
  const typeBg    = TYPE_BG[decision.type]    ?? "bg-white/5 border-white/10";
  const typeLabel = TYPE_LABEL[decision.type] ?? decision.type;

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${typeBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Today's Training Decision</h3>
        <span className={`text-xs font-semibold ${typeColor}`}>{typeLabel}</span>
      </div>

      {/* Headline */}
      <p className={`text-sm font-medium leading-snug ${typeColor}`}>{decision.headline}</p>

      {/* Key modifiers */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/5 rounded-xl py-2 px-1">
          <div className="text-sm font-semibold text-white">
            {Math.round(decision.finalVolumeScale * 100)}%
          </div>
          <div className="text-[9px] text-white/40 mt-0.5">Volume</div>
        </div>
        <div className="bg-white/5 rounded-xl py-2 px-1">
          <div className="text-sm font-semibold text-white">
            {decision.intensityMultiplier >= 1.0 ? "+" : ""}{Math.round((decision.intensityMultiplier - 1) * 100)}%
          </div>
          <div className="text-[9px] text-white/40 mt-0.5">Intensity</div>
        </div>
        <div className="bg-white/5 rounded-xl py-2 px-1">
          <div className="text-sm font-semibold text-white">
            {Math.round(decision.complexityScale * 100)}%
          </div>
          <div className="text-[9px] text-white/40 mt-0.5">Complexity</div>
        </div>
      </div>

      {/* Rationale */}
      {decision.rationale.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-white/35 font-semibold uppercase tracking-widest">Why</div>
          {decision.rationale.map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-white/25 mt-1.5 flex-shrink-0" />
              <p className="text-[11px] text-white/55 leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      )}

      {/* Exercise swaps */}
      {decision.shouldSwapExercises && decision.swapReasons.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-widest mb-1">
            Exercise Adjustments Active
          </div>
          <p className="text-[11px] text-white/50">
            {decision.swapReasons.join(" · ")} — complex lifts auto-swapped to lower-demand alternatives.
          </p>
        </div>
      )}

      {/* Outcome prediction */}
      {prediction && (
        <div className="border-t border-white/8 pt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-semibold text-white">{prediction.successProbability}%</div>
            <div className="text-[9px] text-white/35">Success</div>
          </div>
          <div>
            <div className={`text-sm font-semibold ${QUALITY_COLOR[prediction.expectedQuality] ?? "text-white"}`}>
              {prediction.expectedQuality.charAt(0).toUpperCase() + prediction.expectedQuality.slice(1)}
            </div>
            <div className="text-[9px] text-white/35">Quality</div>
          </div>
          <div>
            <div className={`text-sm font-semibold ${COST_COLOR[prediction.fatigueCost] ?? "text-white"}`}>
              {prediction.fatigueCost.charAt(0).toUpperCase() + prediction.fatigueCost.slice(1)}
            </div>
            <div className="text-[9px] text-white/35">Fatigue Cost</div>
          </div>
        </div>
      )}
    </div>
  );
}
