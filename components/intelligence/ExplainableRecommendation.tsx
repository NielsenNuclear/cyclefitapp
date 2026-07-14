"use client";

import { useState }                                 from "react";
import type { TrainingRecommendation }               from "@/types/recommendation";
import type { RecommendationExplanation }            from "@/lib/intelligence/recommendationExplanation";
import type { RecommendationEvidence }               from "@/lib/evidence/recommendationEvidence";
import type { RecommendationConfidence }             from "@/lib/accuracy/recommendationConfidence";
import { ConfidenceIndicator }                       from "./ConfidenceIndicator";
import { EvidenceSignals }                           from "./SignalContributions";
import { Divider }                                   from "@/components/ui/Divider";
import { AxisIcon }                                  from "@/components/ui/Icon";

// ── Impact bar ─────────────────────────────────────────────────────────────
// Shows a signed percentage-point impact as a horizontal bar, not a number.

function ImpactBar({ value }: { value: number }) {
  if (Math.abs(value) < 1) return null;
  const pct      = Math.min(100, Math.abs(value) * 4);
  const positive = value > 0;
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <div className={`h-1.5 rounded-full ${positive ? "bg-success" : "bg-caution"}`}
        style={{ width: `${pct}%`, maxWidth: 64, minWidth: 4 }}
      />
      <span className={`text-[10px] font-semibold ${positive ? "text-success-text" : "text-caution-text"}`}>
        {positive ? "↑" : "↓"}
      </span>
    </div>
  );
}

// ── Driver list ────────────────────────────────────────────────────────────

function DriverList({ drivers }: { drivers: string[] }) {
  if (drivers.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {drivers.map((d, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-brand text-[10px] font-bold mt-0.5 flex-shrink-0">·</span>
          <span className="text-[12px] text-ink-secondary leading-snug">{d}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Signal impact grid ─────────────────────────────────────────────────────

type ImpactKey = "readinessImpact" | "recoveryImpact" | "cycleImpact" | "adherenceImpact"
               | "momentumImpact" | "symptomImpact" | "burnoutImpact";

const IMPACT_LABELS: Record<ImpactKey, string> = {
  readinessImpact:   "Readiness",
  recoveryImpact:    "Recovery",
  cycleImpact:       "Cycle phase",
  adherenceImpact:   "Consistency",
  momentumImpact:    "Momentum",
  symptomImpact:     "Symptoms",
  burnoutImpact:     "Burnout risk",
};

function ImpactGrid({ explanation }: { explanation: RecommendationExplanation }) {
  const keys: ImpactKey[] = [
    "readinessImpact", "recoveryImpact", "cycleImpact",
    "adherenceImpact", "momentumImpact", "symptomImpact", "burnoutImpact",
  ];
  const active = keys.filter(k => Math.abs(explanation[k]) >= 1);
  if (active.length === 0) return null;

  return (
    <div>
      <p className="type-micro text-ink-muted mb-2">Signal influence</p>
      <div className="space-y-2">
        {active.map(k => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-ink-secondary w-[90px] flex-shrink-0">
              {IMPACT_LABELS[k]}
            </span>
            <div className="flex-1">
              <ImpactBar value={explanation[k]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ExplainableRecommendationProps {
  training:      TrainingRecommendation;
  explanation?:  RecommendationExplanation | null;
  evidence?:     RecommendationEvidence | null;
  confidence?:   RecommendationConfidence | null;
  className?:    string;
}

export function ExplainableRecommendation({
  training, explanation, evidence, confidence, className = "",
}: ExplainableRecommendationProps) {
  const [expanded, setExpanded] = useState(false);

  // Volume-scale → human label
  const scaleLabel = !explanation ? "" :
    explanation.finalVolumeScale >= 1.08 ? "Volume increased" :
    explanation.finalVolumeScale >= 1.02 ? "Volume slightly increased" :
    explanation.finalVolumeScale <= 0.70 ? "Volume significantly reduced" :
    explanation.finalVolumeScale <= 0.82 ? "Volume reduced" :
    explanation.finalVolumeScale <= 0.92 ? "Volume slightly reduced" :
    "Standard volume";

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>

      {/* ── Recommendation headline ───────────────────────────────────── */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="type-micro text-ink-muted">Today's Recommendation</p>
          {confidence && (
            <ConfidenceIndicator level={confidence.level} compact />
          )}
        </div>

        {/* Badge + headline */}
        <div className="flex items-center gap-2.5 mb-2">
          <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold border ${
            training.badge === "Push"     ? "bg-success-bg text-success-text border-success-border" :
            training.badge === "Maintain" ? "bg-brand-bg-mid text-brand-text border-brand-border" :
            training.badge === "Watch"    ? "bg-caution-bg text-caution-text border-caution-border" :
                                           "bg-neutral-bg text-neutral-text border-neutral-border"
          }`}>
            {training.badge}
          </span>
          <span className="text-[13px] font-semibold text-ink leading-snug">{training.headline}</span>
        </div>

        <p className="text-[12px] text-ink-secondary leading-relaxed">{training.body}</p>

        {/* Quick signal drivers as pills */}
        {training.signalDrivers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {training.signalDrivers.slice(0, 3).map((d, i) => (
              <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-subtle text-ink-muted border border-border">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Expandable "Why?" section ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors duration-normal text-left focus-ring"
        aria-expanded={expanded}
      >
        <span className="text-[12px] font-semibold text-brand">
          {expanded ? "Hide explanation" : "Why this recommendation?"}
        </span>
        <AxisIcon
          name="chevron-down"
          size={14}
          strokeWidth={1.5}
          className={`text-ink-muted transition-transform duration-normal ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-4 border-t border-border bg-surface">

          {/* Summary narrative */}
          {explanation?.explanationSummary && (
            <p className="text-[12px] text-ink-secondary leading-relaxed">
              {explanation.explanationSummary}
            </p>
          )}

          {/* Primary drivers */}
          {explanation?.primaryDrivers && explanation.primaryDrivers.length > 0 && (
            <div>
              <p className="type-micro text-ink-muted mb-2">Primary drivers</p>
              <DriverList drivers={explanation.primaryDrivers} />
            </div>
          )}

          {/* Signal influence grid */}
          {explanation && <ImpactGrid explanation={explanation} />}

          {/* Volume scale note */}
          {scaleLabel && (
            <div className="flex items-center justify-between py-2 px-3 bg-surface-subtle rounded-xl">
              <span className="text-[11px] text-ink-muted">Today's volume</span>
              <span className="text-[11px] font-semibold text-ink">{scaleLabel}</span>
            </div>
          )}

          <Divider />

          {/* Evidence signals */}
          {evidence?.signals && evidence.signals.length > 0 && (
            <EvidenceSignals signals={evidence.signals} />
          )}

          {/* Confidence detail */}
          {confidence && (
            <ConfidenceIndicator
              level={confidence.level}
              score={confidence.score}
              reasons={confidence.reasons}
            />
          )}

          {/* Scientific rationale (collapsed by default) */}
          {training.rationale && (
            <details className="group">
              <summary className="type-micro text-ink-muted cursor-pointer list-none flex items-center gap-1.5 select-none">
                <AxisIcon
                  name="caret-right"
                  size={10}
                  strokeWidth={1.5}
                  className="transition-transform group-open:rotate-90 flex-shrink-0"
                />
                Scientific basis
              </summary>
              <p className="mt-2 text-[11px] text-ink-muted leading-relaxed pl-4">
                {training.rationale}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
