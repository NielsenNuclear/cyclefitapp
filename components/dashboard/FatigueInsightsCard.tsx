"use client";

import { useMemo } from "react";
import { getFatigueHistory, getRecentFatigueHistory } from "@/lib/recovery/fatigueHistory";
import { computeCorrelations, consecutiveSessionImpact } from "@/lib/recovery/recoveryCorrelation";
import type { FatiguePrediction } from "@/lib/recovery/fatiguePrediction";

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-[#F0EDE4] my-3" />;
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low:      "bg-[#E1F5EE] text-[#085041]",
    moderate: "bg-[#FDF6EC] text-[#633806]",
    high:     "bg-[#FDE8E8] text-[#8B1A1A]",
    critical: "bg-[#FDE8E8] text-[#8B1A1A] font-bold",
    insufficient_data: "bg-[#F5F3EE] text-[#9B9690]",
  };
  const labels: Record<string, string> = {
    low: "Low", moderate: "Moderate", high: "High", critical: "Critical", insufficient_data: "—",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[level] ?? styles.low}`}>
      {labels[level] ?? level}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FatigueInsightsCardProps {
  prediction?: FatiguePrediction;  // pre-computed by dashboard; optional
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function FatigueInsightsCard({ prediction }: FatigueInsightsCardProps) {
  const history = useMemo(() => getFatigueHistory(), []);
  const recent7 = useMemo(() => getRecentFatigueHistory(7), []);

  const correlationReport = useMemo(() => computeCorrelations(history), [history]);
  const consecutiveImpact = useMemo(
    () => consecutiveSessionImpact(history, 3),
    [history]
  );

  const entryCount = history.length;

  if (entryCount < 3) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
          Recovery Intelligence
        </div>
        <p className="text-[12px] text-[#9B9690] leading-relaxed">
          Complete 3+ daily check-ins to unlock recovery pattern insights.
        </p>
      </div>
    );
  }

  const hasPrediction = prediction?.hasEnoughData;
  const day3 = prediction?.day3;
  const day7 = prediction?.day7;

  const topCorrelation = correlationReport.correlations[0];
  const hasConsecutiveData = consecutiveImpact.sampleSize >= 2;

  // Load trend for the week
  const avgLoad = recent7.length > 0
    ? recent7.reduce((s, e) => s + e.trainingLoad, 0) / recent7.length
    : 0;
  const loadLabel = avgLoad >= 4 ? "High" : avgLoad >= 2 ? "Moderate" : "Low";

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690]">
          Recovery Intelligence
        </div>
        <span className="text-[10px] text-[#9B9690]">{entryCount} days tracked</span>
      </div>

      <div className="space-y-3">

        {/* Fatigue risk forecast */}
        {hasPrediction && day3 && day7 && (
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">
              Fatigue forecast
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-[#FAFAF7] rounded-xl border border-[#E5E2DA]">
                <div className="text-[10px] text-[#9B9690] mb-1">3-day risk</div>
                <RiskBadge level={day3.riskLevel} />
                <div className="text-[10px] text-[#6B6860] mt-1">{day3.riskScore}%</div>
              </div>
              <div className="px-3 py-2 bg-[#FAFAF7] rounded-xl border border-[#E5E2DA]">
                <div className="text-[10px] text-[#9B9690] mb-1">7-day risk</div>
                <RiskBadge level={day7.riskLevel} />
                <div className="text-[10px] text-[#6B6860] mt-1">{day7.riskScore}%</div>
              </div>
            </div>
            {day3.riskLevel !== "low" && (
              <p className="text-[11px] text-[#5C5850] leading-relaxed mt-2">
                {day3.guidance}
              </p>
            )}
          </div>
        )}

        {/* Top correlation insight */}
        {correlationReport.hasEnoughData && topCorrelation && (
          <>
            <Divider />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#9B9690] mb-2">
                What predicts your recovery
              </div>
              <p className="text-[12px] font-medium text-[#1C1B18] leading-snug">
                {topCorrelation.insight}
              </p>
              {correlationReport.correlations.slice(1, 3).map(c => (
                <p key={c.signal} className="text-[11px] text-[#6B6860] leading-relaxed mt-1">
                  {c.insight}
                </p>
              ))}
            </div>
          </>
        )}

        {/* Consecutive session impact */}
        {hasConsecutiveData && consecutiveImpact.delta < -5 && (
          <>
            <Divider />
            <div className="px-2.5 py-2 bg-[#FDF6EC] rounded-lg border border-[#E8C98A]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#633806] mb-1">
                Pattern detected
              </div>
              <p className="text-[11px] text-[#633806] leading-relaxed">
                3 consecutive training sessions reduce your recovery score by{" "}
                <span className="font-semibold">{Math.abs(consecutiveImpact.delta)} points</span>{" "}
                on average ({consecutiveImpact.sampleSize} observations).
              </p>
            </div>
          </>
        )}

        {/* Current week load */}
        <Divider />
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[#6B6860]">This week's training load</div>
          <span className={`text-[11px] font-semibold ${
            loadLabel === "High" ? "text-[#B25E1B]" :
            loadLabel === "Moderate" ? "text-[#534AB7]" :
            "text-[#085041]"
          }`}>
            {loadLabel}
          </span>
        </div>

        {/* Low data state for correlations */}
        {!correlationReport.hasEnoughData && (
          <p className="text-[11px] text-[#9B9690] leading-relaxed">
            {correlationReport.minSampleRequired - correlationReport.totalDays} more check-ins needed to reveal your personal recovery patterns.
          </p>
        )}

      </div>
    </div>
  );
}
