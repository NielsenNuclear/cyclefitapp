"use client";

import type { TrainingDecision }  from "@/lib/autoregulation/trainingDecisionEngine";
import type { OutcomePrediction } from "@/lib/autoregulation/outcomePrediction";

interface Props {
  decision:   TrainingDecision   | undefined;
  prediction: OutcomePrediction  | undefined;
}

// Colored tint backgrounds — signal decision type at a glance
const TYPE_BG: Record<string, string> = {
  proceed:    "bg-success-bg border-success-border",
  scale_up:   "bg-info-bg border-info-border",
  scale_down: "bg-caution-bg border-caution-border",
  swap:       "bg-brand-bg-mid border-brand-border",
  recover:    "bg-neutral-bg border-neutral-border",
};

const TYPE_COLOR: Record<string, string> = {
  proceed:    "text-success-text",
  scale_up:   "text-info",
  scale_down: "text-caution-text",
  swap:       "text-brand-dark",
  recover:    "text-neutral-text",
};

const TYPE_LABEL: Record<string, string> = {
  proceed:    "Full session",
  scale_up:   "Enhanced session",
  scale_down: "Scaled session",
  swap:       "Modified session",
  recover:    "Recovery session",
};

const QUALITY_COLOR: Record<string, string> = {
  high:   "text-success",
  medium: "text-caution",
  low:    "text-danger",
};

const COST_COLOR: Record<string, string> = {
  minimal: "text-success",
  low:     "text-success",
  medium:  "text-caution",
  high:    "text-danger",
};

export function TrainingDecisionCard({ decision, prediction }: Props) {
  if (!decision) return null;

  const typeBg    = TYPE_BG[decision.type]    ?? "bg-surface-subtle border-border";
  const typeColor = TYPE_COLOR[decision.type] ?? "text-ink";
  const typeLabel = TYPE_LABEL[decision.type] ?? decision.type;

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${typeBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Today's training</h3>
        <span className={`text-[13px] font-semibold ${typeColor}`}>{typeLabel}</span>
      </div>

      {/* Headline */}
      <p className={`text-[14px] font-medium leading-snug ${typeColor}`}>{decision.headline}</p>

      {/* Key modifiers */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: `${Math.round(decision.finalVolumeScale * 100)}%`,  label: "Volume" },
          { value: `${decision.intensityMultiplier >= 1.0 ? "+" : ""}${Math.round((decision.intensityMultiplier - 1) * 100)}%`, label: "Intensity" },
          { value: `${Math.round(decision.complexityScale * 100)}%`,   label: "Complexity" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-black/5 rounded-xl py-2 px-1">
            <div className="text-[14px] font-semibold text-ink">{value}</div>
            <div className="text-[10px] text-ink-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Rationale */}
      {decision.rationale.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-ink-muted font-semibold uppercase tracking-[0.10em]">
            Why this plan
          </div>
          {decision.rationale.map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-black/20 mt-1.5 flex-shrink-0" />
              <p className="text-[12px] text-ink-secondary leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      )}

      {/* Exercise substitutions */}
      {decision.shouldSwapExercises && decision.swapReasons.length > 0 && (
        <div className="bg-brand-bg-mid border border-brand-border rounded-xl px-3 py-2">
          <div className="text-[10px] text-brand font-semibold uppercase tracking-[0.10em] mb-1">
            Smart substitutions active
          </div>
          <p className="text-[12px] text-ink-secondary">
            {decision.swapReasons.join(" · ")} — complex lifts swapped to lower-demand alternatives.
          </p>
        </div>
      )}

      {/* Outcome prediction */}
      {prediction && (
        <div className="border-t border-black/8 pt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[14px] font-semibold text-ink">{prediction.successProbability}%</div>
            <div className="text-[10px] text-ink-muted">Success</div>
          </div>
          <div>
            <div className={`text-[14px] font-semibold ${QUALITY_COLOR[prediction.expectedQuality] ?? "text-ink"}`}>
              {prediction.expectedQuality.charAt(0).toUpperCase() + prediction.expectedQuality.slice(1)}
            </div>
            <div className="text-[10px] text-ink-muted">Quality</div>
          </div>
          <div>
            <div className={`text-[14px] font-semibold ${COST_COLOR[prediction.fatigueCost] ?? "text-ink"}`}>
              {prediction.fatigueCost.charAt(0).toUpperCase() + prediction.fatigueCost.slice(1)}
            </div>
            <div className="text-[10px] text-ink-muted">Fatigue cost</div>
          </div>
        </div>
      )}
    </div>
  );
}
