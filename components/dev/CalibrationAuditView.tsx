"use client";

import { loadPredictionRegistry } from "@/lib/intelligence/calibration/predictionRegistry";

export function CalibrationAuditView() {
  if (process.env.NODE_ENV !== "development") return null;

  const recent = loadPredictionRegistry()
    .filter(p => p.evaluated)
    .slice(-20)
    .reverse();

  if (recent.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 space-y-3 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="text-emerald-500 text-xs font-semibold">DEV</span>
        <h3 className="text-slate-300 font-semibold">Calibration Audit — last {recent.length} evaluated predictions</h3>
      </div>

      <div className="grid grid-cols-6 gap-1 text-slate-500 text-xs uppercase">
        <span>Date</span>
        <span>Domain</span>
        <span>Predicted</span>
        <span>Actual</span>
        <span>Error</span>
        <span>Accuracy</span>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {recent.map(p => {
          const acc = p.accuracyScore ?? 0;
          const color =
            acc >= 0.85 ? "text-emerald-400"
            : acc >= 0.65 ? "text-amber-400"
            : "text-rose-400";

          return (
            <div key={p.id} className="grid grid-cols-6 gap-1 text-xs">
              <span className="text-slate-500">{p.timestamp}</span>
              <span className="text-slate-300 capitalize">{p.domain}</span>
              <span className="text-slate-300">
                {p.domain === "adherence"
                  ? `${Math.round(p.predictedValue * 100)}%`
                  : p.predictedValue}
              </span>
              <span className="text-slate-300">
                {p.actualValue !== undefined
                  ? (p.domain === "adherence" ? (p.actualValue === 1 ? "Yes" : "No") : p.actualValue)
                  : "—"}
              </span>
              <span className="text-slate-400">{p.errorMagnitude ?? "—"}</span>
              <span className={color}>{Math.round(acc * 100)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
