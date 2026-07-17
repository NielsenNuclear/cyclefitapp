"use client";

// ─── components/dashboard/RecommendationWhyCard.tsx ───────────────────────────
// Dashboard 2.0 — Layer 1. Merges four previously-separate "why" surfaces
// (RecommendationExplanationCard, ExplainableRecommendation,
// RecommendationExplanation, ExplainabilityCard) plus TodayHighlights into
// one progressively-disclosed card: Collapsed → Expanded → Detailed.
// See docs/ux/UXStabilizationAudit.md Batch 15 for the merge rationale.
//
// No raw numeric percentages are rendered anywhere in this card — the brief's
// "avoid numerical contribution percentages, use qualitative language" rule
// applies throughout. Signal impact is shown as a directional bar (via
// ImpactBar, arrow-only) or a qualitative level (via SignalContributions'
// pip rows), never a number.

import { useState } from "react";
import type { TrainingRecommendation, ExplanationPoint } from "@/types/recommendation";
import type { RecommendationExplanation as RecommendationExplanationData } from "@/lib/intelligence/recommendationExplanation";
import type { ValidationResult }        from "@/lib/intelligence/validationEngine";
import type { RecommendationEvidence }  from "@/lib/evidence/recommendationEvidence";
import type { RecommendationConfidence } from "@/lib/accuracy/recommendationConfidence";
import type { Counterfactual }          from "@/lib/evidence/counterfactualEngine";
import { ConfidenceIndicator }          from "@/components/intelligence/ConfidenceIndicator";
import { EvidenceSignals }              from "@/components/intelligence/SignalContributions";
import { Divider }                      from "@/components/ui/Divider";
import { AxisIcon }                     from "@/components/ui/Icon";

// ── Today highlights (folded in from TodayHighlights.tsx) ──────────────────

interface HighlightInputs {
  readinessCategory?: string;
  recoveryCategory?:  string;
  recoveryTrend?:     string;
  phaseName:          string;
  daysUntilNextPhase: number;
  fatigueZone?:       string;
  momentumDirection?: string;
}

interface Highlight { text: string; tone: "positive" | "warning" | "neutral"; }

const TONE: Record<Highlight["tone"], { container: string; text: string }> = {
  positive: { container: "bg-success-bg border-success-border", text: "text-success-text" },
  warning:  { container: "bg-caution-bg border-caution-border", text: "text-caution-text" },
  neutral:  { container: "bg-surface-hover border-border",      text: "text-ink-secondary" },
};

function deriveHighlights(p: HighlightInputs): Highlight[] {
  const items: Highlight[] = [];
  if (p.fatigueZone === "overreached") {
    items.push({ text: "Fatigue is elevated — today's volume has been adjusted", tone: "warning" });
  }
  if (p.readinessCategory === "optimal") {
    items.push({ text: "Conditions are excellent for a strong session today", tone: "positive" });
  } else if (p.readinessCategory === "cautious") {
    items.push({ text: "Readiness is lower than usual — listen to your body today", tone: "warning" });
  } else if (p.readinessCategory === "recover") {
    items.push({ text: "Your body is asking for rest — recovery is the priority", tone: "warning" });
  }
  if (p.recoveryTrend === "improving" && p.recoveryCategory !== "Poor") {
    items.push({ text: "Recovery has been trending upward over the past week", tone: "positive" });
  } else if (p.recoveryTrend === "rapidly_declining") {
    items.push({ text: "Recovery has been declining — easier sessions support rebuilding", tone: "warning" });
  }
  if ((p.phaseName === "Ovulatory" || p.phaseName === "Follicular") && p.daysUntilNextPhase <= 3) {
    items.push({ text: "Peak performance window — ideal timing for higher-intensity training", tone: "positive" });
  } else if (p.phaseName === "Ovulatory") {
    items.push({ text: "You may be in a peak performance window this week", tone: "positive" });
  } else if (p.phaseName === "Late Luteal") {
    items.push({ text: "Prioritise consistency over intensity during this phase", tone: "neutral" });
  } else if (p.phaseName === "Menstrual") {
    items.push({ text: "Shorter, gentler sessions support recovery during menstruation", tone: "neutral" });
  }
  if (p.momentumDirection === "building") {
    items.push({ text: "Training momentum is building — consistency is paying off", tone: "positive" });
  } else if (p.momentumDirection === "fading") {
    items.push({ text: "Momentum is softening — showing up today will help maintain progress", tone: "neutral" });
  }
  return items.slice(0, 2);
}

// ── Impact bar — directional only, never a number (from ExplainableRecommendation) ──

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

type ImpactKey = "readinessImpact" | "recoveryImpact" | "cycleImpact" | "adherenceImpact"
               | "momentumImpact" | "symptomImpact" | "burnoutImpact";

const IMPACT_LABELS: Record<ImpactKey, string> = {
  readinessImpact: "Readiness",
  recoveryImpact:  "Recovery",
  cycleImpact:     "Cycle phase",
  adherenceImpact: "Consistency",
  momentumImpact:  "Momentum",
  symptomImpact:   "Symptoms",
  burnoutImpact:   "Burnout risk",
};

function ImpactGrid({ explanation }: { explanation: RecommendationExplanationData }) {
  const keys: ImpactKey[] = [
    "readinessImpact", "recoveryImpact", "cycleImpact",
    "adherenceImpact", "momentumImpact", "symptomImpact", "burnoutImpact",
  ];
  const active = keys.filter(k => Math.abs(explanation[k] ?? 0) >= 1);
  if (active.length === 0) return null;

  return (
    <div>
      <p className="type-micro text-ink-muted mb-2">Signal influence</p>
      <div className="space-y-2">
        {active.map(k => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-ink-secondary w-[90px] flex-shrink-0">{IMPACT_LABELS[k]}</span>
            <div className="flex-1"><ImpactBar value={explanation[k] ?? 0} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Signal-by-signal detail rows (folded in from RecommendationExplanation.tsx) ──

const WEIGHT_STYLES: Record<ExplanationPoint["weight"], { badge: string; label: string }> = {
  Primary:   { badge: "bg-brand-bg-mid text-brand-dark border-brand-border",   label: "Primary signal" },
  Secondary: { badge: "bg-surface-hover text-ink-secondary border-border-strong", label: "Secondary" },
  Advisory:  { badge: "bg-success-bg text-success-text border-success-border", label: "Advisory" },
};

function ExplanationRow({ point }: { point: ExplanationPoint }) {
  const style = WEIGHT_STYLES[point.weight];
  return (
    <div className="py-3 border-b border-surface-hover last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-[12px] font-semibold text-ink">{point.signal}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>{style.label}</span>
      </div>
      <div className="text-[11px] text-ink-muted mb-1 font-medium">
        Observed: <span className="text-ink-secondary font-normal">{point.observation}</span>
      </div>
      <p className="text-[12px] text-ink-secondary leading-relaxed">{point.implication}</p>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface RecommendationWhyCardProps {
  training:       TrainingRecommendation;
  explanation?:   RecommendationExplanationData | null;
  validation?:    ValidationResult | null;
  evidence?:      RecommendationEvidence | null;
  confidence?:    RecommendationConfidence | null;
  counterfactual?: Counterfactual | null;
  points:         ExplanationPoint[];
  disclaimer:     string;
  highlights:     HighlightInputs;
  className?:     string;
}

export function RecommendationWhyCard({
  training, explanation, validation, evidence, confidence, counterfactual,
  points, disclaimer, highlights, className = "",
}: RecommendationWhyCardProps) {
  const [expanded, setExpanded]     = useState(false);
  const [showSignals, setShowSignals] = useState(false);

  const scaleLabel = !explanation ? "" :
    explanation.finalVolumeScale >= 1.08 ? "Volume increased" :
    explanation.finalVolumeScale >= 1.02 ? "Volume slightly increased" :
    explanation.finalVolumeScale <= 0.70 ? "Volume significantly reduced" :
    explanation.finalVolumeScale <= 0.82 ? "Volume reduced" :
    explanation.finalVolumeScale <= 0.92 ? "Volume slightly reduced" :
    "Standard volume";

  const todaysHighlights = deriveHighlights(highlights);

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      {/* ── Collapsed: headline + confidence + at-a-glance narrative ─────── */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="type-micro text-ink-muted">Today&apos;s Recommendation</p>
          {confidence && <ConfidenceIndicator level={confidence.level} compact />}
        </div>

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

        {todaysHighlights.length > 0 && (
          <div className="space-y-2 mt-3">
            {todaysHighlights.map((h, i) => {
              const s = TONE[h.tone];
              return (
                <div key={i} className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${s.container}`}>
                  <span className={`text-[12px] leading-relaxed ${s.text}`}>{h.text}</span>
                </div>
              );
            })}
          </div>
        )}

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

      {/* ── Expand toggle ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors duration-normal text-left focus-ring min-h-[44px]"
        aria-expanded={expanded}
      >
        <span className="text-[12px] font-semibold text-brand">
          {expanded ? "Hide explanation" : "Why this recommendation?"}
        </span>
        <AxisIcon
          name="chevron-down" size={14} strokeWidth={1.5}
          className={`text-ink-muted transition-transform duration-normal ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Expanded ──────────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 py-4 space-y-4 border-t border-border bg-surface">
          {explanation?.explanationSummary && (
            <p className="text-[12px] text-ink-secondary leading-relaxed">{explanation.explanationSummary}</p>
          )}

          {explanation?.primaryDrivers && explanation.primaryDrivers.length > 0 && (
            <div>
              <p className="type-micro text-ink-muted mb-2">Primary drivers</p>
              <ul className="space-y-1.5">
                {explanation.primaryDrivers.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand text-[10px] font-bold mt-0.5 flex-shrink-0">·</span>
                    <span className="text-[12px] text-ink-secondary leading-snug">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation && <ImpactGrid explanation={explanation} />}

          {scaleLabel && (
            <div className="flex items-center justify-between py-2 px-3 bg-surface-subtle rounded-xl">
              <span className="text-[11px] text-ink-muted">Today&apos;s volume</span>
              <span className="text-[11px] font-semibold text-ink">{scaleLabel}</span>
            </div>
          )}

          {validation && !validation.valid && (
            <div className="space-y-1 pt-1 border-t border-caution-border">
              {validation.warnings.map(w => (
                <p key={w.code} className="text-[12px] text-caution-text">⚠ {w.message}</p>
              ))}
            </div>
          )}

          <Divider />

          {evidence?.signals && evidence.signals.length > 0 && <EvidenceSignals signals={evidence.signals} />}

          {confidence && (
            <ConfidenceIndicator level={confidence.level} score={confidence.score} reasons={confidence.reasons} />
          )}

          {/* Counterfactual — folded in from ExplainabilityCard */}
          {counterfactual && counterfactual.flipConditions.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-[10px] text-ink-faint uppercase tracking-widest">What would change this?</div>
              {counterfactual.flipConditions.slice(0, 2).map((c, i) => (
                <div key={i} className="bg-surface-hover rounded-xl px-3 py-2 space-y-0.5">
                  <div className="text-[10px] font-semibold text-info">{c.factor}: {c.change}</div>
                  <div className="text-[10px] text-ink-muted">{c.impact}</div>
                </div>
              ))}
            </div>
          )}

          {/* Signal-by-signal detail — deepest tier, its own nested disclosure (folded in from RecommendationExplanation) */}
          {points.length > 0 && (
            <details className="group" open={showSignals} onToggle={e => setShowSignals(e.currentTarget.open)}>
              <summary className="type-micro text-ink-muted cursor-pointer list-none flex items-center gap-1.5 select-none">
                <AxisIcon name="caret-right" size={10} strokeWidth={1.5} className="transition-transform group-open:rotate-90 flex-shrink-0" />
                Full signal-by-signal breakdown ({points.length} signals)
              </summary>
              <div className="mt-2 pl-4">
                {points.map(point => <ExplanationRow key={point.signal} point={point} />)}
              </div>
            </details>
          )}

          {training.rationale && (
            <details className="group">
              <summary className="type-micro text-ink-muted cursor-pointer list-none flex items-center gap-1.5 select-none">
                <AxisIcon name="caret-right" size={10} strokeWidth={1.5} className="transition-transform group-open:rotate-90 flex-shrink-0" />
                Scientific basis
              </summary>
              <p className="mt-2 text-[11px] text-ink-muted leading-relaxed pl-4">{training.rationale}</p>
            </details>
          )}

          <p className="text-[11px] text-ink-muted leading-relaxed italic border-t border-surface-hover pt-3">
            {disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
