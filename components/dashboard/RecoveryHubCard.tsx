"use client";

// ─── components/dashboard/RecoveryHubCard.tsx ─────────────────────────────────
// Dashboard 2.0 — Layer 2. Merges 8 of 10 previously-separate recovery cards
// (RecoveryIntelligenceCard, FatigueCard, FatigueInsightsCard,
// RecoveryOptimizationCard, RecoveryCapacityCard, PersonalRecoveryCard,
// RecoveryStatusCard, ReadinessCard) into one card answering a single
// question — "Can I recover well today?" — with a Summary → Details
// progressive-disclosure split. BurnoutPreventionCard and RecoveryCheckinCard
// stay separate (different underlying model / an input, not a display).
// See docs/ux/UXStabilizationAudit.md Batch 16 for the merge rationale.
//
// Rewritten onto DS-2 tokens throughout — the four source cards it draws the
// most from (RecoveryIntelligenceCard, RecoveryOptimizationCard, FatigueCard's
// zone colors) mixed raw Tailwind grays with tokens; this card uses tokens
// exclusively, per the brief's "preserve the Design System" requirement.

import { useState, useMemo } from "react";
import type { RecoveryScore }          from "@/lib/recovery/recoveryScore";
import type { RecoveryTrend }          from "@/lib/recovery/recoveryTrend";
import type { RecoveryDebt }           from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }            from "@/lib/recovery/burnoutRisk";
import type { HealthTrend }            from "@/lib/recovery/healthTrendAnalysis";
import type { RecoveryPlan }           from "@/lib/recovery/recoveryPlanning";
import type { SymptomEscalationEntry } from "@/lib/recovery/symptomEscalation";
import type {
  RecoveryCategory,
  PlanUrgency,
  DebtCategory,
  BurnoutLevel,
  RecoveryTrendStatus,
} from "@/lib/recovery/recoveryTypes";
import type { RecoveryStrategyOutcome } from "@/lib/recovery/recoveryLearning";
import { strategyLabel }                from "@/lib/recovery/recoveryLearning";
import type { FatigueScoreEntry }       from "@/lib/autoregulation/fatigueModel";
import type { FatiguePrediction }       from "@/lib/recovery/fatiguePrediction";
import type { RecoveryEffectivenessReport, EffectivenessTier } from "@/lib/recovery/recoveryEffectiveness";
import type { RecoveryForecast }        from "@/lib/recovery/recoveryForecast";
import type { RecoveryCapacity }        from "@/lib/adaptive/recoveryCapacity";
import type { TrainingLoadReport }      from "@/lib/analytics/trainingLoad";
import type { PersonalRecoveryProfile } from "@/lib/recovery/personalRecoveryProfile";
import type { RecoveryBank }            from "@/lib/recovery/recoveryBank";
import type { RecoveryOutlook }         from "@/lib/recovery/recoveryOutlook";
import { getFatigueHistory, getRecentFatigueHistory } from "@/lib/recovery/fatigueHistory";
import { computeCorrelations, consecutiveSessionImpact } from "@/lib/recovery/recoveryCorrelation";
import { LockedInsight } from "@/components/ui/LockedInsight";
import { AxisIcon }      from "@/components/ui/Icon";

// ── Colour maps (DS-2 tokens) ──────────────────────────────────────────────

const SCORE_COLOR: Record<RecoveryCategory, string> = {
  Excellent: "text-success", Good: "text-success", Moderate: "text-caution",
  Compromised: "text-caution", Poor: "text-danger",
};
const SCORE_BAR: Record<RecoveryCategory, string> = {
  Excellent: "bg-success", Good: "bg-success", Moderate: "bg-caution",
  Compromised: "bg-caution", Poor: "bg-danger",
};
const SCORE_CHIP: Record<RecoveryCategory, string> = {
  Excellent: "bg-success-bg text-success-text", Good: "bg-success-bg text-success-text",
  Moderate: "bg-caution-bg text-caution-text", Compromised: "bg-caution-bg text-caution-text",
  Poor: "bg-danger-bg text-danger",
};
const URGENCY_CHIP: Record<PlanUrgency, string> = {
  none: "bg-surface-hover text-ink-muted", low: "bg-success-bg text-success-text",
  moderate: "bg-caution-bg text-caution-text", high: "bg-caution-bg text-caution-text",
  critical: "bg-danger-bg text-danger",
};
const DEBT_CHIP: Record<DebtCategory, string> = {
  low: "bg-success-bg text-success-text", moderate: "bg-caution-bg text-caution-text",
  elevated: "bg-caution-bg text-caution-text", high: "bg-danger-bg text-danger",
  critical: "bg-danger-bg text-danger",
};
const BURNOUT_CHIP: Record<BurnoutLevel, string> = {
  low: "bg-success-bg text-success-text", moderate: "bg-caution-bg text-caution-text",
  high: "bg-danger-bg text-danger", severe: "bg-danger-bg text-danger",
};
const TREND_CHIP: Record<RecoveryTrendStatus, string> = {
  improving: "bg-success-bg text-success-text", stable: "bg-surface-hover text-ink-muted",
  declining: "bg-caution-bg text-caution-text", rapidly_declining: "bg-danger-bg text-danger",
};
const TREND_LABEL: Record<RecoveryTrendStatus, string> = {
  improving: "Improving", stable: "Stable", declining: "Declining", rapidly_declining: "↓ Rapid",
};
const ZONE_COLOR: Record<string, string> = {
  fresh: "text-success", normal: "text-info", fatigued: "text-caution", overreached: "text-danger",
};
const ZONE_BAR: Record<string, string> = {
  fresh: "bg-success", normal: "bg-info", fatigued: "bg-caution", overreached: "bg-danger",
};
const ZONE_LABEL: Record<string, string> = {
  fresh: "Fresh", normal: "Normal", fatigued: "Accumulating Fatigue", overreached: "Overreached",
};
const CAPACITY_BADGE: Record<"low" | "moderate" | "high", string> = {
  high: "bg-success-bg text-success-text", moderate: "bg-surface-hover text-ink-secondary", low: "bg-danger-bg text-danger",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}
function Divider() { return <div className="border-t border-surface-hover my-4" />; }

// ── Props ──────────────────────────────────────────────────────────────────

interface RecoveryHubCardProps {
  recoveryScore:      RecoveryScore | null;
  recoveryTrend:      RecoveryTrend | null;
  recoveryDebt:       RecoveryDebt | null;
  burnoutRisk:        BurnoutRisk | null;
  healthTrend:        HealthTrend | null;
  recoveryPlan:       RecoveryPlan | null;
  symptomEscalations: SymptomEscalationEntry[];
  strategyOutcomes?:  RecoveryStrategyOutcome[];
  fatigueEntry?:      FatigueScoreEntry;
  fatiguePrediction?: FatiguePrediction;
  effectiveness:      RecoveryEffectivenessReport | null;
  forecast:           RecoveryForecast | null;
  capacity:           RecoveryCapacity | null;
  loadReport:         TrainingLoadReport | null;
  personalProfile?:   PersonalRecoveryProfile;
  recoveryBank?:      RecoveryBank;
  recoveryOutlook?:   RecoveryOutlook;
}

// ── Main ───────────────────────────────────────────────────────────────────

export function RecoveryHubCard({
  recoveryScore, recoveryTrend, recoveryDebt, burnoutRisk, healthTrend, recoveryPlan,
  symptomEscalations, strategyOutcomes = [], fatigueEntry, fatiguePrediction,
  effectiveness, forecast, capacity, loadReport, personalProfile, recoveryBank, recoveryOutlook,
}: RecoveryHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Fatigue pattern insights — computed client-side, matching the source
  // FatigueInsightsCard's existing behavior (not an SSOT change in this pass).
  const fatigueHistory = useMemo(() => getFatigueHistory(), []);
  const recent7         = useMemo(() => getRecentFatigueHistory(7), []);
  const correlationReport = useMemo(() => computeCorrelations(fatigueHistory), [fatigueHistory]);
  const consecutiveImpact = useMemo(() => consecutiveSessionImpact(fatigueHistory, 3), [fatigueHistory]);

  if (!recoveryScore) return null;

  const pct   = Math.round(recoveryScore.score);
  const color = SCORE_COLOR[recoveryScore.category];
  const bar   = SCORE_BAR[recoveryScore.category];
  const chip  = SCORE_CHIP[recoveryScore.category];
  const negativeContributors = recoveryScore.contributors
    .filter(c => c.contribution < 0).sort((a, b) => a.contribution - b.contribution).slice(0, 2);
  const hasEscalating = symptomEscalations.some(e => e.status === "escalating");

  const hasCapacity = capacity !== null && (capacity.acuteCapacity || capacity.weeklyCapacity);
  const hasEffectiveness = effectiveness?.hasGranular && effectiveness.ranked.length > 0;
  const avgLoad = recent7.length > 0 ? recent7.reduce((s, e) => s + e.trainingLoad, 0) / recent7.length : 0;
  const loadLabel = avgLoad >= 4 ? "High" : avgLoad >= 2 ? "Moderate" : "Low";

  const hasDetails = !!(healthTrend || (recoveryPlan && recoveryPlan.urgency !== "none") ||
    recoveryDebt || burnoutRisk || fatigueEntry || hasEffectiveness || hasCapacity ||
    (forecast) || personalProfile || loadReport);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Recovery</h2>
          {hasEscalating && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger-bg text-danger">
              Symptoms escalating
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">Can I recover well today?</p>
      </div>

      {/* ── Summary (always visible) ──────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold tabular-nums ${color}`}>{pct}</span>
            <span className="text-sm text-ink-muted">/ 100</span>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${chip}`}>{recoveryScore.category}</span>
        </div>
        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>

        {negativeContributors.length > 0 && (
          <div className="space-y-1 mb-3">
            {negativeContributors.map(c => (
              <div key={c.factor} className="flex items-start gap-1.5">
                <span className="text-danger text-[11px] shrink-0 mt-0.5">↓</span>
                <span className="text-[11px] text-ink-secondary">{c.note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick-glance chips: trend + capacity */}
        <div className="flex flex-wrap items-center gap-2">
          {recoveryTrend && recoveryTrend.dataPoints >= 3 && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TREND_CHIP[recoveryTrend.status7d]}`}>
              7d: {TREND_LABEL[recoveryTrend.status7d]}
            </span>
          )}
          {hasCapacity && capacity && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${CAPACITY_BADGE[capacity.level]}`}>
              {capacity.level} capacity
            </span>
          )}
        </div>
      </div>

      {/* ── Expand toggle ──────────────────────────────────────────────── */}
      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px] focus-ring"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">
            {showDetails ? "Hide details" : "Full recovery breakdown"}
          </span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* ── Details ────────────────────────────────────────────────────── */}
      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {/* Trend detail (14d/28d) */}
          {recoveryTrend && recoveryTrend.dataPoints >= 3 && (
            <div>
              <SectionLabel>Recovery trend</SectionLabel>
              <div className="flex gap-2">
                {([
                  { label: "7d", status: recoveryTrend.status7d },
                  { label: "14d", status: recoveryTrend.status14d },
                  { label: "28d", status: recoveryTrend.status28d },
                ] as const).map(({ label, status }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-ink-muted font-medium w-5">{label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TREND_CHIP[status]}`}>{TREND_LABEL[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health signals */}
          {healthTrend && (healthTrend.watch.length > 0 || healthTrend.improving.length > 0) && (
            <>
              <Divider />
              <div>
                <SectionLabel>Health signals</SectionLabel>
                <div className="space-y-1.5">
                  {healthTrend.watch.map(label => (
                    <div key={label} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-1.5" />
                      <span className="text-[11px] text-ink-secondary leading-snug">{label}</span>
                    </div>
                  ))}
                  {healthTrend.improving.map(label => (
                    <div key={label} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 mt-1.5" />
                      <span className="text-[11px] text-ink-secondary leading-snug">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recovery plan */}
          {recoveryPlan && recoveryPlan.urgency !== "none" && recoveryPlan.recommendations.length > 0 && (
            <>
              <Divider />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Recovery plan</SectionLabel>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCY_CHIP[recoveryPlan.urgency]}`}>
                    {recoveryPlan.urgency.charAt(0).toUpperCase() + recoveryPlan.urgency.slice(1)} urgency
                  </span>
                </div>
                <p className="text-[11px] text-ink-secondary leading-relaxed mb-2">{recoveryPlan.rationale}</p>
                <div className="rounded-xl border border-border bg-surface-subtle p-3">
                  <ul className="space-y-1.5">
                    {recoveryPlan.recommendations.slice(0, 4).map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[11px] text-ink-muted shrink-0 mt-0.5">{i + 1}.</span>
                        <span className="text-[11px] text-ink-secondary leading-snug">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Capacity timescales */}
          {hasCapacity && capacity && (
            <>
              <Divider />
              <div>
                <SectionLabel>Recovery capacity</SectionLabel>
                {capacity.confidence === "early" ? (
                  <LockedInsight entryCount={capacity.dataPoints} />
                ) : (
                  <>
                    <div className="flex gap-4">
                      {capacity.acuteCapacity && (
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] text-ink-muted">Last 7 days</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${CAPACITY_BADGE[capacity.acuteCapacity.level]}`}>{capacity.acuteCapacity.level}</span>
                        </div>
                      )}
                      {capacity.weeklyCapacity && (
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] text-ink-muted">7–28 days</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${CAPACITY_BADGE[capacity.weeklyCapacity.level]}`}>{capacity.weeklyCapacity.level}</span>
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-ink-muted">Overall</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${CAPACITY_BADGE[capacity.level]}`}>{capacity.level}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-relaxed mt-2">{capacity.rationale}</p>
                  </>
                )}
              </div>
            </>
          )}

          {/* Debt + strain */}
          {(recoveryDebt || (burnoutRisk && burnoutRisk.level !== "low")) && (
            <>
              <Divider />
              <div>
                <SectionLabel>Recovery load</SectionLabel>
                <div className="flex gap-3">
                  {recoveryDebt && (
                    <div className="flex-1 bg-surface-subtle rounded-xl p-3">
                      <p className="text-[10px] text-ink-muted font-medium mb-1">Recovery Debt</p>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold text-ink tabular-nums">{recoveryDebt.debtScore}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${DEBT_CHIP[recoveryDebt.category]}`}>{recoveryDebt.category}</span>
                      </div>
                      <p className="text-[10px] text-ink-muted">
                        {recoveryDebt.trend === "accumulating" ? "↑ Rising" : recoveryDebt.trend === "reducing" ? "↓ Clearing" : "→ Stable"}
                      </p>
                    </div>
                  )}
                  {burnoutRisk && burnoutRisk.level !== "low" && (
                    <div className="flex-1 bg-surface-subtle rounded-xl p-3">
                      <p className="text-[10px] text-ink-muted font-medium mb-1">Strain Indicators</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-ink tabular-nums">{burnoutRisk.score}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${BURNOUT_CHIP[burnoutRisk.level]}`}>{burnoutRisk.level}</span>
                      </div>
                      {burnoutRisk.factors.slice(0, 2).map(f => (
                        <p key={f.name} className="text-[10px] text-ink-muted leading-tight truncate">{f.detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Fatigue zone */}
          {fatigueEntry && (
            <>
              <Divider />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Fatigue status</SectionLabel>
                  {fatigueEntry.maturityStage === "ready" && (
                    <span className={`text-[11px] font-semibold ${ZONE_COLOR[fatigueEntry.zone] ?? "text-ink"}`}>{ZONE_LABEL[fatigueEntry.zone] ?? fatigueEntry.zone}</span>
                  )}
                </div>
                {fatigueEntry.maturityStage !== "ready" ? (
                  <LockedInsight entryCount={fatigueEntry.historyDepth ?? 0} />
                ) : (
                  <>
                    <div className="w-full h-2 rounded-full bg-surface-hover mb-2">
                      <div className={`h-2 rounded-full transition-all ${ZONE_BAR[fatigueEntry.zone] ?? "bg-ink-faint"}`} style={{ width: `${fatigueEntry.score}%` }} />
                    </div>
                    <div className="space-y-1.5">
                      {([
                        { label: "Training Load", val: fatigueEntry.components.trainingLoad },
                        { label: "Recovery Bank", val: fatigueEntry.components.recoveryBank },
                        { label: "Sleep",         val: fatigueEntry.components.sleep },
                        { label: "Stress",        val: fatigueEntry.components.stress },
                        { label: "Symptoms",      val: fatigueEntry.components.symptoms },
                      ]).map(({ label, val }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-[10px] text-ink-muted w-28 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-surface-hover">
                            <div className={`h-1.5 rounded-full ${ZONE_BAR[fatigueEntry.zone] ?? "bg-ink-faint"}`} style={{ width: `${val}%` }} />
                          </div>
                          <span className="text-[10px] text-ink-muted w-8 text-right">{val}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Fatigue forecast + pattern correlations */}
          {fatigueHistory.length >= 3 && (
            <>
              <Divider />
              <div className="space-y-3">
                {fatiguePrediction?.hasEnoughData && fatiguePrediction.day3 && fatiguePrediction.day7 && (
                  <div>
                    <SectionLabel>Fatigue forecast</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="px-3 py-2 bg-canvas rounded-xl border border-border">
                        <div className="text-[10px] text-ink-muted mb-1">3-day risk</div>
                        <span className="text-[11px] font-semibold text-ink capitalize">{fatiguePrediction.day3.riskLevel.replace(/_/g, " ")}</span>
                      </div>
                      <div className="px-3 py-2 bg-canvas rounded-xl border border-border">
                        <div className="text-[10px] text-ink-muted mb-1">7-day risk</div>
                        <span className="text-[11px] font-semibold text-ink capitalize">{fatiguePrediction.day7.riskLevel.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    {fatiguePrediction.day3.riskLevel !== "low" && (
                      <p className="text-[11px] text-ink-secondary leading-relaxed mt-2">{fatiguePrediction.day3.guidance}</p>
                    )}
                  </div>
                )}
                {correlationReport.hasEnoughData && correlationReport.correlations[0] && (
                  <div>
                    <SectionLabel>What predicts your recovery</SectionLabel>
                    <p className="text-[12px] font-medium text-ink leading-snug">{correlationReport.correlations[0].insight}</p>
                  </div>
                )}
                {consecutiveImpact.sampleSize >= 2 && consecutiveImpact.delta < -5 && (
                  <div className="px-2.5 py-2 bg-caution-bg rounded-lg border border-caution-border">
                    <p className="text-[11px] text-caution-text leading-relaxed">
                      3 consecutive training sessions reduce your recovery score by{" "}
                      <span className="font-semibold">{Math.abs(consecutiveImpact.delta)} points</span> on average.
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-secondary">This week&apos;s training load</span>
                  <span className="text-[11px] font-semibold text-ink">{loadLabel}</span>
                </div>
              </div>
            </>
          )}

          {/* What works for you — effectiveness ranking */}
          {(hasEffectiveness || (effectiveness && effectiveness.strategyHints.some(s => s.verdict !== "uncertain")) || strategyOutcomes.length > 0) && (
            <>
              <Divider />
              <div>
                <SectionLabel>What works for you</SectionLabel>
                {hasEffectiveness && effectiveness ? (
                  <div className="space-y-2">
                    {effectiveness.ranked.map(m => {
                      const tierColor: Record<EffectivenessTier, string> = {
                        most_effective: "text-success", moderate: "text-ink-secondary", least_effective: "text-ink-muted",
                      };
                      return (
                        <div key={m.modality} className="flex items-center gap-3">
                          <span className={`text-sm font-mono w-4 text-center ${tierColor[m.tier]}`}>
                            {m.tier === "most_effective" ? "✓" : m.tier === "least_effective" ? "○" : "·"}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-ink">{m.label}</span>
                              <span className="text-[11px] text-ink-muted">{m.sampleSize} session{m.sampleSize !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[12px] text-ink-muted">Axis will learn which recovery actions improve your next-day readiness as you track sessions.</p>
                    {(strategyOutcomes.length > 0 ? strategyOutcomes.filter(o => o.verdict !== "uncertain") : []).map(o => (
                      <div key={o.strategy} className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-secondary">{strategyLabel(o.strategy)}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.verdict === "effective" ? "bg-success-bg text-success-text" : "bg-surface-hover text-ink-muted"}`}>
                          {o.verdict === "effective" ? "Helps" : "Unclear"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Fatigue forecast (7-day, from RecoveryOptimizationCard's forecast prop) */}
          {forecast && (
            <>
              <Divider />
              <div>
                <SectionLabel>Fatigue forecast · next 4 days</SectionLabel>
                <p className="text-[11px] text-ink-secondary leading-relaxed">
                  {forecast.daysUntilRisk === null && forecast.fatigueProbability >= 50
                    ? "Fatigue risk is present now"
                    : forecast.daysUntilRisk !== null
                      ? `Risk onset estimated within ${forecast.daysUntilRisk} day${forecast.daysUntilRisk !== 1 ? "s" : ""}`
                      : "No significant fatigue risk in the next 4 days"}
                </p>
                <p className="text-[12px] text-ink-secondary mt-1">{forecast.recommendation}</p>
              </div>
            </>
          )}

          {/* Personal recovery profile */}
          {personalProfile && recoveryBank && recoveryOutlook && (
            <>
              <Divider />
              <div className="space-y-3">
                <SectionLabel>Your Personal Recovery Profile</SectionLabel>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-ink-secondary">Resilience reserves</span>
                    <span className="text-[11px] font-semibold text-ink">{recoveryBank.balance}/100</span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${recoveryBank.trend === "building" ? "bg-success" : recoveryBank.trend === "depleting" ? "bg-caution" : "bg-brand"}`} style={{ width: `${recoveryBank.balance}%` }} />
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-relaxed mt-1.5">{recoveryBank.note}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">7-Day Outlook</span>
                    <span className="text-[10px] text-ink-muted">
                      {recoveryOutlook.overallTrend === "improving" ? "↑ Improving" : recoveryOutlook.overallTrend === "declining" ? "↓ Declining" : "→ Stable"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {recoveryOutlook.days.map(d => (
                      <div key={d.date} className="flex-1 text-center">
                        <div className={`rounded-lg py-1.5 mb-0.5 ${d.forecast === "high" ? "bg-success-bg" : d.forecast === "moderate" ? "bg-brand-bg-mid" : "bg-caution-bg"}`}>
                          <span className={`text-[11px] font-semibold ${d.forecast === "high" ? "text-success-text" : d.forecast === "moderate" ? "text-brand-dark" : "text-caution-text"}`}>{d.score}</span>
                        </div>
                        <span className="text-[9px] text-ink-muted">{d.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-ink-secondary mt-1.5 leading-relaxed">{recoveryOutlook.summaryNote}</p>
                </div>

                {personalProfile.optimalConditions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">What Supports Your Recovery</p>
                    {personalProfile.optimalConditions.map((c, i) => (
                      <div key={i} className="flex gap-2 text-[11px] text-ink-secondary leading-relaxed">
                        <span className="text-success shrink-0">·</span><span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}

                {personalProfile.recoveryBottleneck && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1">Main Recovery Lever</p>
                    <p className="text-[11px] text-ink-secondary leading-relaxed">{personalProfile.recoveryBottleneck}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Training load stats */}
          {loadReport && (loadReport.completedWorkouts > 0 || loadReport.trainingDensity > 0) && (
            <>
              <Divider />
              <div>
                <SectionLabel>Training load</SectionLabel>
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold ${
                    loadReport.recoveryStatus === "Recovered" ? "bg-success-bg text-success-text" :
                    loadReport.recoveryStatus === "Normal" ? "bg-surface-hover text-ink-secondary" :
                    "bg-caution-bg text-caution-text"
                  }`}>
                    {loadReport.recoveryStatus}
                  </span>
                  <span className="text-[11px] font-medium text-ink-secondary">
                    {loadReport.workloadTrend === "Increasing" ? "↑ Increasing" : loadReport.workloadTrend === "Decreasing" ? "↓ Decreasing" : "→ Stable"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 bg-surface-subtle rounded-xl">
                    <div className="text-[9px] text-ink-muted uppercase tracking-wider mb-0.5">This Week</div>
                    <div className="text-[13px] font-medium text-ink">{loadReport.completedWorkouts} session{loadReport.completedWorkouts !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="px-3 py-2 bg-surface-subtle rounded-xl">
                    <div className="text-[9px] text-ink-muted uppercase tracking-wider mb-0.5">Weekly Sets</div>
                    <div className="text-[13px] font-medium text-ink">{loadReport.weeklyVolume}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <p className="px-5 pb-4 pt-3 text-[10px] text-ink-faint leading-relaxed border-t border-surface-hover">
        Recovery scores update with each check-in and improve in accuracy over time.
      </p>
    </div>
  );
}
