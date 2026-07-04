"use client";

import type { RecommendationExplanation } from "@/lib/intelligence/recommendationExplanation";

// ── Delta helpers ──────────────────────────────────────────────────────────

function DeltaRow({
  label,
  delta,
  unit = "",
  inverse = false,
}: {
  label:    string;
  delta:    number;
  unit?:    string;
  inverse?: boolean; // true = negative delta is good (e.g. burnout)
}) {
  if (Math.abs(delta) < 1) return null;
  const isGood = inverse ? delta < 0 : delta > 0;
  const arrow  = delta > 0 ? "↑" : "↓";
  const abs    = Math.abs(Math.round(delta));
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <div className={`flex items-center gap-1 text-[12px] font-semibold ${
        isGood ? "text-success-text" : "text-caution-text"
      }`}>
        <span>{arrow}</span>
        <span className="tabular-nums">{abs}{unit}</span>
      </div>
    </div>
  );
}

// ── VolumeArrow ────────────────────────────────────────────────────────────

function VolumeArrow({ from, to }: { from: number; to: number }) {
  const delta = to - from;
  if (Math.abs(delta) < 0.01) {
    return <span className="text-[12px] text-ink-muted">No change</span>;
  }
  const pct    = Math.round(Math.abs(delta) * 100);
  const isUp   = delta > 0;
  return (
    <div className={`flex items-center gap-1 text-[12px] font-semibold ${isUp ? "text-success-text" : "text-caution-text"}`}>
      <span>{isUp ? "↑" : "↓"}</span>
      <span>{pct}% volume {isUp ? "increase" : "reduction"}</span>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface WhatChangedCardProps {
  today:      RecommendationExplanation;
  yesterday:  RecommendationExplanation;
  className?: string;
}

export function WhatChangedCard({ today, yesterday, className = "" }: WhatChangedCardProps) {
  const signalDeltas = [
    { label: "Readiness",   delta: today.readinessImpact   - yesterday.readinessImpact   },
    { label: "Recovery",    delta: today.recoveryImpact    - yesterday.recoveryImpact    },
    { label: "Cycle phase", delta: today.cycleImpact       - yesterday.cycleImpact       },
    { label: "Consistency", delta: today.adherenceImpact   - yesterday.adherenceImpact   },
    { label: "Momentum",    delta: today.momentumImpact    - yesterday.momentumImpact    },
    { label: "Symptoms",    delta: today.symptomImpact     - yesterday.symptomImpact,    inverse: true },
    { label: "Burnout risk",delta: today.burnoutImpact     - yesterday.burnoutImpact,    inverse: true },
  ].filter(d => Math.abs(d.delta) >= 1);

  const volumeChanged = Math.abs(today.finalVolumeScale - yesterday.finalVolumeScale) >= 0.02;
  const confidenceChanged = today.confidenceLevel !== yesterday.confidenceLevel;

  // Nothing meaningful changed
  if (signalDeltas.length === 0 && !volumeChanged && !confidenceChanged) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">Compared with yesterday</p>
        <p className="text-[12px] text-ink-muted">No significant changes since your last recommendation.</p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
      <p className="type-micro text-ink-muted mb-3">Compared with yesterday</p>

      {/* Signal deltas */}
      {signalDeltas.length > 0 && (
        <div className="divide-y divide-border/50 mb-3">
          {signalDeltas.map(d => (
            <DeltaRow
              key={d.label}
              label={d.label}
              delta={d.delta}
              inverse={d.inverse}
            />
          ))}
        </div>
      )}

      {/* Volume outcome */}
      {volumeChanged && (
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="type-micro text-ink-muted">Volume recommendation</span>
          <VolumeArrow from={yesterday.finalVolumeScale} to={today.finalVolumeScale} />
        </div>
      )}

      {/* Confidence shift */}
      {confidenceChanged && (
        <div className="pt-2 flex items-center justify-between">
          <span className="type-micro text-ink-muted">Confidence</span>
          <span className="text-[11px] font-semibold text-ink-secondary">
            {yesterday.confidenceLevel} → {today.confidenceLevel}
          </span>
        </div>
      )}
    </div>
  );
}
