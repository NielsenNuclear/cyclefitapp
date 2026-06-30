"use client";

import type { PredictionAccuracyReport } from "@/lib/autoregulation/outcomeValidation";

interface Props {
  report: PredictionAccuracyReport | undefined;
}

const TREND_COLOR: Record<string, string> = {
  improving:    "text-[#0F6E56]",
  stable:       "text-[#1B4FA0]",
  declining:    "text-[#C0392B]",
  insufficient: "text-[#9B9690]",
};

const TREND_LABEL: Record<string, string> = {
  improving:    "Improving ↑",
  stable:       "Stable →",
  declining:    "Declining ↓",
  insufficient: "Building...",
};

export function PredictionAccuracyCard({ report }: Props) {
  if (!report || report.sampleSize < 3) return null;

  const trendColor = TREND_COLOR[report.trend] ?? "text-[#1C1B18]";
  const trendLabel = TREND_LABEL[report.trend] ?? report.trend;

  const maturityNote =
    report.dataMaturity === "high"   ? "Strong dataset — predictions are well-calibrated."
    : report.dataMaturity === "medium" ? "Growing dataset — accuracy improving."
    : "Early data — accuracy will improve with more sessions.";

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Prediction Accuracy</h3>
        <span className={`text-xs font-semibold ${trendColor}`}>{trendLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#F1EFE8] rounded-xl py-3 px-1">
          <div className="text-lg font-semibold text-[#1C1B18]">{report.overallAccuracy}%</div>
          <div className="text-[9px] text-[#9B9690] mt-0.5">Overall</div>
        </div>
        <div className="bg-[#F1EFE8] rounded-xl py-3 px-1">
          <div className="text-lg font-semibold text-[#1C1B18]">{report.successAccuracy}%</div>
          <div className="text-[9px] text-[#9B9690] mt-0.5">Success Rate</div>
        </div>
        <div className="bg-[#F1EFE8] rounded-xl py-3 px-1">
          <div className="text-lg font-semibold text-[#1C1B18]">{report.sampleSize}</div>
          <div className="text-[9px] text-[#9B9690] mt-0.5">Sessions</div>
        </div>
      </div>

      <p className="text-[11px] text-[#9B9690] leading-relaxed text-center">{maturityNote}</p>
    </div>
  );
}
