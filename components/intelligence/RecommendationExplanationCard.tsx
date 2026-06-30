"use client";

import { useState } from "react";
import type { RecommendationExplanation } from "@/lib/intelligence/recommendationExplanation";
import type { ValidationResult }          from "@/lib/intelligence/validationEngine";

interface ImpactRowProps {
  label:  string;
  impact: number;
}

function ImpactRow({ label, impact }: ImpactRowProps) {
  if (impact === 0) return null;
  const positive = impact > 0;
  const bar = Math.min(Math.abs(impact), 20);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-[#6B6860] w-40 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1">
        {!positive && (
          <div
            className="h-[3px] rounded bg-[#C0392B]"
            style={{ width: `${bar * 5}%` }}
          />
        )}
        <span className={`text-[12px] font-mono font-semibold min-w-[2rem] text-right ${
          positive ? "text-[#0F6E56]" : "text-[#C0392B]"
        }`}>
          {positive ? "+" : ""}{impact}%
        </span>
        {positive && (
          <div
            className="h-[3px] rounded bg-[#0F6E56]"
            style={{ width: `${bar * 5}%` }}
          />
        )}
      </div>
    </div>
  );
}

interface Props {
  explanation:  RecommendationExplanation | undefined;
  validation:   ValidationResult          | undefined;
}

const CONFIDENCE_COLORS = {
  high:   "text-[#0F6E56]",
  medium: "text-[#854F0B]",
  low:    "text-[#C0392B]",
};

const CONFIDENCE_LABELS = {
  high:   "High confidence",
  medium: "Moderate confidence",
  low:    "Low confidence",
};

export function RecommendationExplanationCard({ explanation, validation }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!explanation) return null;

  const deltaPercent = Math.round((explanation.finalVolumeScale - 1) * 100);
  const direction    = deltaPercent > 2 ? "up" : deltaPercent < -2 ? "down" : "steady";

  const chipClass =
    direction === "up"   ? "bg-[#E1F5EE] text-[#085041]"
    : direction === "down" ? "bg-[#FDF3F2] text-[#9B2015]"
    : "bg-[#F1EFE8] text-[#5C5850]";

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#1C1B18]">Why today's plan?</h3>
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-medium ${CONFIDENCE_COLORS[explanation.confidenceLevel]}`}>
            {CONFIDENCE_LABELS[explanation.confidenceLevel]}
          </span>
          {validation && !validation.valid && (
            <span className="text-[12px] text-[#854F0B]">⚠</span>
          )}
        </div>
      </div>

      {/* Volume direction chip */}
      <div className="flex items-center gap-2">
        <span className={`text-[12px] px-2.5 py-0.5 rounded-full font-medium border ${chipClass} ${
          direction === "up"   ? "border-[#A8DFC8]"
          : direction === "down" ? "border-[#F5C5C0]"
          : "border-[#EAE7DE]"
        }`}>
          Volume {direction === "up" ? `+${deltaPercent}%` : direction === "down" ? `${deltaPercent}%` : "steady"}
        </span>
      </div>

      {/* Summary */}
      <p className="text-[13px] text-[#5C5850] leading-relaxed">
        {explanation.explanationSummary}
      </p>

      {/* Primary drivers */}
      {explanation.primaryDrivers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690]">
            Primary factors
          </p>
          {explanation.primaryDrivers.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#C8C5BC] text-[12px]">•</span>
              <span className="text-[12px] text-[#5C5850]">{d}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(x => !x)}
        className="text-[12px] text-[#9B9690] hover:text-[#534AB7] transition-colors"
      >
        {expanded ? "Hide breakdown ↑" : "What influenced this ↓"}
      </button>

      {/* Expanded: per-signal impacts */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-black/6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690] pt-1">
            Signal breakdown
          </p>
          <ImpactRow label="Readiness"           impact={explanation.readinessImpact} />
          <ImpactRow label="Recovery"            impact={explanation.recoveryImpact} />
          <ImpactRow label="Cycle phase"         impact={explanation.cycleImpact} />
          <ImpactRow label="Adherence risk"      impact={explanation.adherenceImpact} />
          <ImpactRow label="Symptoms & fatigue"  impact={explanation.symptomImpact} />
          <ImpactRow label="Forecast confidence" impact={explanation.uncertaintyImpact} />
          <ImpactRow label="Training momentum"   impact={explanation.momentumImpact} />

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-black/6">
            <span className="text-[12px] text-[#6B6860]">Total volume change</span>
            <span className={`text-[12px] font-semibold font-mono ${
              deltaPercent >= 0 ? "text-[#0F6E56]" : "text-[#C0392B]"
            }`}>
              {deltaPercent >= 0 ? "+" : ""}{deltaPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {validation && !validation.valid && expanded && (
        <div className="space-y-1 pt-1 border-t border-[#F5C5C0]">
          {validation.warnings.map(w => (
            <p key={w.code} className="text-[12px] text-[#854F0B]">
              ⚠ {w.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
