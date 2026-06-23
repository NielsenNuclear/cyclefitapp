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
      <span className="text-xs text-slate-400 w-40 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1">
        {!positive && (
          <div
            className="h-1.5 rounded bg-rose-500/60"
            style={{ width: `${bar * 5}%` }}
          />
        )}
        <span className={`text-xs font-mono font-semibold min-w-[2rem] text-right ${positive ? "text-emerald-400" : "text-rose-400"}`}>
          {positive ? "+" : ""}{impact}%
        </span>
        {positive && (
          <div
            className="h-1.5 rounded bg-emerald-500/60"
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
  high:   "text-emerald-400",
  medium: "text-amber-400",
  low:    "text-rose-400",
};

const CONFIDENCE_LABELS = {
  high:   "High",
  medium: "Medium",
  low:    "Low",
};

export function RecommendationExplanationCard({ explanation, validation }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!explanation) return null;

  const deltaPercent = Math.round((explanation.finalVolumeScale - 1) * 100);
  const direction    = deltaPercent > 2 ? "up" : deltaPercent < -2 ? "down" : "steady";

  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Why today's plan?</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${CONFIDENCE_COLORS[explanation.confidenceLevel]}`}>
            {CONFIDENCE_LABELS[explanation.confidenceLevel]} confidence
          </span>
          {validation && !validation.valid && (
            <span className="text-xs text-amber-400">⚠</span>
          )}
        </div>
      </div>

      {/* Volume direction chip */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          direction === "up"     ? "bg-emerald-900/40 text-emerald-300"
          : direction === "down" ? "bg-rose-900/40 text-rose-300"
          : "bg-slate-700 text-slate-300"
        }`}>
          Volume {direction === "up" ? `+${deltaPercent}%` : direction === "down" ? `${deltaPercent}%` : "steady"}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-300 leading-relaxed">
        {explanation.explanationSummary}
      </p>

      {/* Primary drivers */}
      {explanation.primaryDrivers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Primary factors</p>
          {explanation.primaryDrivers.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-300">{d}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(x => !x)}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {expanded ? "Hide breakdown ↑" : "Show signal breakdown ↓"}
      </button>

      {/* Expanded: per-signal impacts */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-slate-700/40">
          <p className="text-xs text-slate-500 uppercase tracking-wide pt-1">Signal breakdown</p>
          <ImpactRow label="Readiness"          impact={explanation.readinessImpact} />
          <ImpactRow label="Recovery"           impact={explanation.recoveryImpact} />
          <ImpactRow label="Cycle phase"        impact={explanation.cycleImpact} />
          <ImpactRow label="Adherence risk"     impact={explanation.adherenceImpact} />
          <ImpactRow label="Symptoms & fatigue" impact={explanation.symptomImpact} />
          <ImpactRow label="Prediction uncertainty" impact={explanation.uncertaintyImpact} />
          <ImpactRow label="Training momentum"  impact={explanation.momentumImpact} />

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
            <span className="text-xs text-slate-400">Net adjustment</span>
            <span className={`text-xs font-semibold font-mono ${
              deltaPercent >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {deltaPercent >= 0 ? "+" : ""}{deltaPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Validation warnings (dev-facing but shown subtly) */}
      {validation && !validation.valid && expanded && (
        <div className="space-y-1 pt-1 border-t border-amber-900/30">
          {validation.warnings.map(w => (
            <p key={w.code} className="text-xs text-amber-400/70">
              ⚠ {w.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
