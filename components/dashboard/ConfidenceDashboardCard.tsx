"use client";

import type { RecommendationConfidence } from "@/lib/accuracy/recommendationConfidence";
import type { CalibrationReport }        from "@/lib/accuracy/calibrationEngine";
import type { DriftReport }              from "@/lib/accuracy/driftDetection";

interface Props {
  confidence:   RecommendationConfidence | undefined;
  calibration:  CalibrationReport | undefined;
  drift:        DriftReport | undefined;
}

const LEVEL_COLOR: Record<string, string> = {
  low:      "text-[#C0392B]",
  moderate: "text-[#854F0B]",
  high:     "text-[#0F6E56]",
};

const LEVEL_BAR: Record<string, string> = {
  low:      "bg-rose-500",
  moderate: "bg-amber-500",
  high:     "bg-emerald-500",
};

export function ConfidenceDashboardCard({ confidence, calibration, drift }: Props) {
  if (!confidence) return null;

  const levelColor = LEVEL_COLOR[confidence.level] ?? "text-[#1C1B18]";
  const levelBar   = LEVEL_BAR[confidence.level]   ?? "bg-[#C8C5BC]";

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Prediction Confidence</h3>
        <span className={`text-xs font-semibold capitalize ${levelColor}`}>{confidence.level}</span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-[#9B9690]">
          <span>Axis confidence in today's plan</span>
          <span>{confidence.score}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-black/8">
          <div className={`h-2.5 rounded-full transition-all ${levelBar}`} style={{ width: `${confidence.score}%` }} />
        </div>
      </div>

      {/* Reasons */}
      {confidence.reasons.length > 0 && (
        <div className="space-y-1">
          {confidence.reasons.map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#0F6E56] text-[9px] mt-0.5">✓</span>
              <span className="text-[11px] text-[#9B9690]">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calibration */}
      {calibration && (
        <div className="pt-1 border-t border-[#EAE7DE] space-y-1">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Calibration</div>
          <div className="grid grid-cols-3 gap-2">
            {(["readiness", "recovery", "performance"] as const).map(k => {
              const b = calibration[k];
              return (
                <div key={k} className="bg-[#F1EFE8] rounded-xl p-2 text-center">
                  <div className={`text-sm font-semibold ${b.type === "calibrated" ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>
                    {b.type === "calibrated" ? "✓" : `${b.bias > 0 ? "+" : ""}${b.bias}`}
                  </div>
                  <div className="text-[9px] text-[#C8C5BC] mt-0.5 capitalize">{k}</div>
                </div>
              );
            })}
          </div>
          {calibration.selfCorrecting && (
            <p className="text-[10px] text-[#0F6E56]/70 pt-0.5">Self-correcting mode active.</p>
          )}
        </div>
      )}

      {/* Drift warning */}
      {drift?.driftDetected && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 space-y-0.5">
          <div className="text-[10px] font-semibold text-[#854F0B]">Pattern shift detected</div>
          <div className="text-[10px] text-[#9B9690]">{drift.message}</div>
        </div>
      )}
    </div>
  );
}
