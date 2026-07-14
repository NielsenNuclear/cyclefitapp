"use client";

import { useMemo } from "react";
import { getFatigueHistory, getRecentFatigueHistory } from "@/lib/recovery/fatigueHistory";
import { computeCorrelations, consecutiveSessionImpact } from "@/lib/recovery/recoveryCorrelation";
import type { FatiguePrediction } from "@/lib/recovery/fatiguePrediction";

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-surface-hover my-3" />;
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low:      "bg-success-bg text-success-text",
    moderate: "bg-caution-bg text-caution-text",
    high:     "bg-danger-bg text-danger",
    critical: "bg-danger-bg text-danger font-bold",
    insufficient_data: "bg-surface-subtle text-ink-muted",
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
      <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
          Recovery Intelligence
        </div>
        <p className="text-[12px] text-ink-muted leading-relaxed">
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
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Recovery Intelligence
        </div>
        <span className="text-[10px] text-ink-muted">{entryCount} days tracked</span>
      </div>

      <div className="space-y-3">

        {/* Fatigue risk forecast */}
        {hasPrediction && day3 && day7 && (
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted mb-2">
              Fatigue forecast
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-canvas rounded-xl border border-border">
                <div className="text-[10px] text-ink-muted mb-1">3-day risk</div>
                <RiskBadge level={day3.riskLevel} />
                <div className="text-[10px] text-ink-secondary mt-1">{day3.riskScore}%</div>
              </div>
              <div className="px-3 py-2 bg-canvas rounded-xl border border-border">
                <div className="text-[10px] text-ink-muted mb-1">7-day risk</div>
                <RiskBadge level={day7.riskLevel} />
                <div className="text-[10px] text-ink-secondary mt-1">{day7.riskScore}%</div>
              </div>
            </div>
            {day3.riskLevel !== "low" && (
              <p className="text-[11px] text-ink-secondary leading-relaxed mt-2">
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
              <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                What predicts your recovery
              </div>
              <p className="text-[12px] font-medium text-ink leading-snug">
                {topCorrelation.insight}
              </p>
              {correlationReport.correlations.slice(1, 3).map(c => (
                <p key={c.signal} className="text-[11px] text-ink-secondary leading-relaxed mt-1">
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
            <div className="px-2.5 py-2 bg-caution-bg rounded-lg border border-caution-border">
              <div className="text-[9px] font-bold uppercase tracking-widest text-caution-text mb-1">
                Pattern detected
              </div>
              <p className="text-[11px] text-caution-text leading-relaxed">
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
          <div className="text-[11px] text-ink-secondary">This week's training load</div>
          <span className={`text-[11px] font-semibold ${
            loadLabel === "High" ? "text-nutrition" :
            loadLabel === "Moderate" ? "text-brand" :
            "text-success-text"
          }`}>
            {loadLabel}
          </span>
        </div>

        {/* Low data state for correlations */}
        {!correlationReport.hasEnoughData && (
          <p className="text-[11px] text-ink-muted leading-relaxed">
            {correlationReport.minSampleRequired - correlationReport.totalDays} more check-ins needed to reveal your personal recovery patterns.
          </p>
        )}

      </div>
    </div>
  );
}
