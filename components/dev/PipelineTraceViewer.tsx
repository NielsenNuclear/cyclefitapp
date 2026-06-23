"use client";

import type { PipelineTrace } from "@/lib/intelligence/pipelineTrace";

interface Props {
  trace: PipelineTrace | undefined;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-300 font-mono">{String(value)}</span>
    </div>
  );
}

export function PipelineTraceViewer({ trace }: Props) {
  if (process.env.NODE_ENV !== "development") return null;
  if (!trace) return null;

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 space-y-4 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="text-emerald-500 text-xs font-semibold">DEV</span>
        <h3 className="text-slate-300 font-semibold">Pipeline Trace — {trace.timestamp}</h3>
      </div>

      {/* Inputs */}
      <div className="space-y-1">
        <p className="text-slate-500 text-xs uppercase tracking-wide">Inputs</p>
        <Row label="Readiness"      value={`${trace.inputs.readiness}/100`} />
        <Row label="Recovery score" value={`${trace.inputs.recoveryScore}/100`} />
        <Row label="Cycle phase"    value={trace.inputs.cyclePhase} />
        <Row label="Adherence risk" value={trace.inputs.adherenceRisk} />
        <Row label="Burnout risk"   value={`${trace.inputs.burnoutRisk}/100`} />
        <Row label="Fatigue score"  value={`${trace.inputs.fatigueScore}/100`} />
        <Row label="Symptoms"       value={`${trace.inputs.symptomCount}`} />
        <Row label="Uncertainty"    value={trace.inputs.uncertainty.toFixed(2)} />
      </div>

      {/* Arrow */}
      <div className="text-center text-slate-600">↓</div>

      {/* Modifiers */}
      <div className="space-y-1">
        <p className="text-slate-500 text-xs uppercase tracking-wide">Modifiers</p>
        <Row label="Readiness scale"   value={trace.modifiers.readinessScale.toFixed(2)} />
        <Row label="Recovery scale"    value={trace.modifiers.recoveryScale.toFixed(2)} />
        <Row label="Cycle scale"       value={trace.modifiers.cycleScale.toFixed(2)} />
        <Row label="Adherence scale"   value={trace.modifiers.adherenceScale.toFixed(2)} />
        <Row label="Uncertainty scale" value={trace.modifiers.uncertaintyScale.toFixed(2)} />
      </div>

      {/* Arrow */}
      <div className="text-center text-slate-600">↓</div>

      {/* Outputs */}
      <div className="space-y-1">
        <p className="text-slate-500 text-xs uppercase tracking-wide">Outputs</p>
        <Row label="Volume scale"        value={trace.outputs.volumeScale.toFixed(2)} />
        <Row label="Workout mode"        value={trace.outputs.workoutMode} />
        <Row label="Recommendation"      value={trace.outputs.recommendationLevel} />
      </div>
    </div>
  );
}
