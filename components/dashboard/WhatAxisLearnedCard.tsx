"use client";

import type { PhysiologyFingerprint }       from "@/lib/adaptive/physiologyMemory";
import type { PatternConfidence }            from "@/lib/adaptive/patternConfidence";
import type { RecoveryCapacity }             from "@/lib/adaptive/recoveryCapacity";
import type { PersonalWeights }              from "@/lib/adaptive/personalWeighting";
import type { PersonalizationProgress }      from "@/lib/adaptive/personalizationProgress";

interface Props {
  fingerprint:             PhysiologyFingerprint | null;
  patternConfidences:      PatternConfidence[];
  recoveryCapacity:        RecoveryCapacity | null;
  personalWeights:         PersonalWeights | null;
  personalizationProgress: PersonalizationProgress | null;
}

function cycleOrdinal(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 1) return `Day ${sorted[0]}`;
  const last = sorted.pop()!;
  return sorted.length === 1
    ? `Days ${sorted[0]} and ${last}`
    : `Days ${sorted.join(", ")} and ${last}`;
}

export function WhatAxisLearnedCard({
  fingerprint,
  patternConfidences,
  recoveryCapacity,
  personalWeights,
  personalizationProgress,
}: Props) {
  // Require at least some learning before showing this card
  if (!personalizationProgress || personalizationProgress.overallProgress < 10) return null;
  if (!fingerprint && patternConfidences.length === 0 && !personalWeights?.isCalibrated) return null;

  const reliablePatterns = patternConfidences.filter(p => p.isReliable).slice(0, 2);

  // Dominant readiness factor
  let dominantFactor: string | null = null;
  if (personalWeights?.isCalibrated) {
    const { sleep, stress, symptoms } = personalWeights;
    if (sleep >= stress && sleep >= symptoms && sleep > 0.40)        dominantFactor = "sleep quality";
    else if (stress >= sleep && stress >= symptoms && stress > 0.40) dominantFactor = "stress levels";
    else if (symptoms > 0.40)                                         dominantFactor = "symptom patterns";
  }

  // Recovery capacity label
  const capacityLabel: Record<string, string> = {
    high:     "High — recovers well between sessions",
    moderate: "Moderate — standard recovery between sessions",
    low:      "Low — benefits from extra recovery time",
  };

  const tier         = personalizationProgress.tier;
  const tierColor    =
    tier === "Highly Personalized" ? "text-brand" :
    tier === "Personalized"        ? "text-success"   :
    tier === "Learning"            ? "text-caution"  :
    "text-ink-muted";

  const hasStrengthDays  = fingerprint && fingerprint.bestStrengthDays.length > 0
    && fingerprint.entryCount >= 30;
  const hasRecoveryDays  = fingerprint && fingerprint.worstRecoveryDays.length > 0
    && fingerprint.entryCount >= 30;

  const hasAnything = hasStrengthDays || hasRecoveryDays || reliablePatterns.length > 0
    || dominantFactor || recoveryCapacity;

  if (!hasAnything) return null;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">What Axis Has Learned</h2>
        <span className={`text-xs font-medium ${tierColor}`}>{tier}</span>
      </div>

      <div className="space-y-3">
        {/* Best performance window */}
        {hasStrengthDays && (
          <div className="space-y-0.5">
            <p className="text-ink-secondary text-xs uppercase tracking-wide">Peak performance window</p>
            <p className="text-[13px] text-ink">
              {cycleOrdinal(fingerprint!.bestStrengthDays)} of your cycle
            </p>
            <p className="text-ink-muted text-xs">
              Based on {fingerprint!.entryCount} tracked sessions
            </p>
          </div>
        )}

        {/* Challenging recovery days */}
        {hasRecoveryDays && (
          <div className="space-y-0.5">
            <p className="text-ink-secondary text-xs uppercase tracking-wide">Lower readiness window</p>
            <p className="text-[13px] text-ink">
              {cycleOrdinal(fingerprint!.worstRecoveryDays)} of your cycle
            </p>
            <p className="text-ink-muted text-xs">Lighter sessions tend to work better here</p>
          </div>
        )}

        {/* Reliable symptom patterns */}
        {reliablePatterns.length > 0 && (
          <div className="space-y-1">
            <p className="text-ink-secondary text-xs uppercase tracking-wide">Consistent symptom patterns</p>
            {reliablePatterns.map(p => (
              <div key={p.patternId} className="flex items-start justify-between gap-2">
                <p className="text-[13px] text-ink">{p.symptomName}</p>
                <span className="text-ink-muted text-xs whitespace-nowrap">
                  {Math.round(p.confidence * 100)}% of cycles · {p.phase.replace(" Phase", "")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Dominant readiness predictor */}
        {dominantFactor && (
          <div className="space-y-0.5">
            <p className="text-ink-secondary text-xs uppercase tracking-wide">Strongest readiness signal</p>
            <p className="text-[13px] text-ink capitalize">{dominantFactor}</p>
            <p className="text-ink-muted text-xs">
              Most predictive of your day-to-day readiness score
            </p>
          </div>
        )}

        {/* Recovery capacity */}
        {recoveryCapacity && recoveryCapacity.confidence !== "early" && (
          <div className="space-y-0.5">
            <p className="text-ink-secondary text-xs uppercase tracking-wide">Recovery capacity</p>
            <p className="text-[13px] text-ink">
              {capacityLabel[recoveryCapacity.level] ?? recoveryCapacity.level}
            </p>
            <p className="text-ink-muted text-xs">
              {recoveryCapacity.confidence === "established" ? "Established" : "Growing"} pattern
              · {recoveryCapacity.dataPoints} sessions tracked
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
