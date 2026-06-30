"use client";

import type { TrainingDecision }  from "@/lib/autoregulation/trainingDecisionEngine";
import type { OutcomePrediction } from "@/lib/autoregulation/outcomePrediction";

interface Props {
  decision:   TrainingDecision   | undefined;
  prediction: OutcomePrediction  | undefined;
}

// Colored tint backgrounds — signal decision type at a glance
const TYPE_BG: Record<string, string> = {
  proceed:    "bg-[#F0FAF6] border-[#A3DCCA]",
  scale_up:   "bg-[#E3EFFE] border-[#A8C4F0]",
  scale_down: "bg-[#FDF6EC] border-[#E8C98A]",
  swap:       "bg-[#F3F2FD] border-[#C9C5EE]",
  recover:    "bg-[#EEF0F2] border-[#D1D5DB]",
};

const TYPE_COLOR: Record<string, string> = {
  proceed:    "text-[#085041]",
  scale_up:   "text-[#1B4FA0]",
  scale_down: "text-[#633806]",
  swap:       "text-[#3C3489]",
  recover:    "text-[#3D4451]",
};

const TYPE_LABEL: Record<string, string> = {
  proceed:    "Full session",
  scale_up:   "Enhanced session",
  scale_down: "Scaled session",
  swap:       "Modified session",
  recover:    "Recovery session",
};

const QUALITY_COLOR: Record<string, string> = {
  high:   "text-[#0F6E56]",
  medium: "text-[#854F0B]",
  low:    "text-[#C0392B]",
};

const COST_COLOR: Record<string, string> = {
  minimal: "text-[#0F6E56]",
  low:     "text-[#0F6E56]",
  medium:  "text-[#854F0B]",
  high:    "text-[#C0392B]",
};

export function TrainingDecisionCard({ decision, prediction }: Props) {
  if (!decision) return null;

  const typeBg    = TYPE_BG[decision.type]    ?? "bg-[#F5F3EE] border-[#EAE7DE]";
  const typeColor = TYPE_COLOR[decision.type] ?? "text-[#1C1B18]";
  const typeLabel = TYPE_LABEL[decision.type] ?? decision.type;

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${typeBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#1C1B18]">Today's training</h3>
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
            <div className="text-[14px] font-semibold text-[#1C1B18]">{value}</div>
            <div className="text-[10px] text-[#9B9690] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Rationale */}
      {decision.rationale.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#9B9690] font-semibold uppercase tracking-[0.10em]">
            Why this plan
          </div>
          {decision.rationale.map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-black/20 mt-1.5 flex-shrink-0" />
              <p className="text-[12px] text-[#5C5850] leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      )}

      {/* Exercise substitutions */}
      {decision.shouldSwapExercises && decision.swapReasons.length > 0 && (
        <div className="bg-[#EEEDFE] border border-[#C4C0EE] rounded-xl px-3 py-2">
          <div className="text-[10px] text-[#534AB7] font-semibold uppercase tracking-[0.10em] mb-1">
            Smart substitutions active
          </div>
          <p className="text-[12px] text-[#5C5850]">
            {decision.swapReasons.join(" · ")} — complex lifts swapped to lower-demand alternatives.
          </p>
        </div>
      )}

      {/* Outcome prediction */}
      {prediction && (
        <div className="border-t border-black/8 pt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[14px] font-semibold text-[#1C1B18]">{prediction.successProbability}%</div>
            <div className="text-[10px] text-[#9B9690]">Success</div>
          </div>
          <div>
            <div className={`text-[14px] font-semibold ${QUALITY_COLOR[prediction.expectedQuality] ?? "text-[#1C1B18]"}`}>
              {prediction.expectedQuality.charAt(0).toUpperCase() + prediction.expectedQuality.slice(1)}
            </div>
            <div className="text-[10px] text-[#9B9690]">Quality</div>
          </div>
          <div>
            <div className={`text-[14px] font-semibold ${COST_COLOR[prediction.fatigueCost] ?? "text-[#1C1B18]"}`}>
              {prediction.fatigueCost.charAt(0).toUpperCase() + prediction.fatigueCost.slice(1)}
            </div>
            <div className="text-[10px] text-[#9B9690]">Fatigue cost</div>
          </div>
        </div>
      )}
    </div>
  );
}
