"use client";

// ─── components/dashboard/CycleHubCard.tsx ────────────────────────────────────
// Dashboard 2.0 — Layer 2. Merges 7 of 9 previously-separate cycle cards
// (CycleIntelligenceCard, OvulationEstimateCard, TrainingWindowCard,
// RecoveryWindowCard, CyclePatternsCard, UpcomingTrendsCard, PredictionCard)
// into one card, Summary → Details. PhaseCard and SymptomSummaryCard move to
// the Daily Status header (today-only info, not historical intelligence).
// See docs/ux/UXStabilizationAudit.md Batch 16.
//
// CycleIntelligenceCard's inline training-window/ovulation/symptom-pattern
// sections were confirmed strictly thinner than the four dedicated standalone
// cards (same underlying objects, fewer fields) — this card uses the richer
// standalone versions' content throughout, not the thin inline ones.

import { useState } from "react";
import type { CycleAccuracyReport }        from "@/lib/cycle/cycleAccuracy";
import type { PersonalPerformanceProfile } from "@/lib/cycle/performanceProfile";
import type { CycleHealthReport }          from "@/lib/cycle/cycleHealth";
import type { OvulationEstimate }          from "@/lib/cycle/ovulationEstimator";
import type { TrainingWindow }             from "@/lib/cycle/trainingWindows";
import type { RecoveryWindow }             from "@/lib/cycle/recoveryWindows";
import type { LearnedPattern }             from "@/lib/cycleLearning/types";
import type { CycleForecast }              from "@/lib/forecasting/forecastCycle";
import type { ReadinessForecast } from "@/lib/forecasting/forecastReadiness";
import { computeConfidenceScore }          from "@/lib/cycle/confidence";
import { SYMPTOM_BY_ID }                   from "@/lib/symptoms/symptomCatalog";
import { AxisIcon }                        from "@/components/ui/Icon";

// ── Shared bits ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}
function Divider() { return <div className="border-t border-surface-hover my-4" />; }
function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline mb-1.5">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <span className="text-[12px] font-semibold text-ink">{value}</span>
    </div>
  );
}

const CONF_BADGE: Record<"none" | "low" | "moderate" | "high", string> = {
  none: "bg-surface-subtle text-ink-muted", low: "bg-surface-subtle text-ink-secondary",
  moderate: "bg-caution-bg text-caution", high: "bg-success-bg text-success-text",
};
const CONF_LABEL: Record<"none" | "low" | "moderate" | "high", string> = {
  none: "No data", low: "Low confidence", moderate: "Moderate", high: "High confidence",
};
const WINDOW_CONF_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Low confidence", medium: "Medium confidence", high: "High confidence",
};
const SPAN_CONF_LABEL: Record<"low" | "moderate" | "high", string> = {
  low: "Low confidence", moderate: "Moderate confidence", high: "High confidence",
};
const BASIS_LABEL: Record<OvulationEstimate["basis"], string> = {
  physiological: "Based on cycle length", behavioral: "Based on readiness patterns", combined: "Physiological + readiness data",
};
const PATTERN_CONF_CHIP: Record<"low" | "medium" | "high", string> = {
  low: "bg-surface-subtle text-ink-muted", medium: "bg-brand-bg-mid text-brand-dark", high: "bg-success-bg text-success-text",
};
const PATTERN_CONF_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Early data", medium: "Consistent", high: "Established",
};
const FORECAST_META: Record<ReadinessForecast, { label: string; bar: string; text: string; dot: string; height: number }> = {
  push:     { label: "Push",     bar: "bg-success", text: "text-success-text", dot: "bg-success", height: 40 },
  maintain: { label: "Maintain", bar: "bg-brand",   text: "text-brand-text",   dot: "bg-brand",   height: 30 },
  watch:    { label: "Watch",    bar: "bg-caution", text: "text-caution-text", dot: "bg-caution", height: 20 },
  recover:  { label: "Recover",  bar: "bg-danger",  text: "text-danger-text",  dot: "bg-danger",  height: 12 },
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeText(daysFromNow: number): string {
  if (daysFromNow === 1) return "tomorrow";
  if (daysFromNow <= 7)  return `in ${daysFromNow} days`;
  return "next week";
}
function symptomPhrase(confidence: number, severity: number): string {
  if (confidence >= 0.75 && severity >= 2) return "commonly increases";
  if (confidence >= 0.65) return "tends to appear";
  if (confidence >= 0.5)  return "likely";
  return "may appear";
}

// ── Props ──────────────────────────────────────────────────────────────────

interface CycleHubCardProps {
  cycleAccuracy:      CycleAccuracyReport | null;
  performanceProfile: PersonalPerformanceProfile | null;
  cycleHealthReport:  CycleHealthReport | null;
  ovulationEstimate:  OvulationEstimate | null;
  trainingWindow:     TrainingWindow | null;
  recoveryWindow:     RecoveryWindow | null;
  patterns:           LearnedPattern[];
  forecast:           CycleForecast | null;
  todayDayOfWeek:      number;
  periodCount?:        number;
}

export function CycleHubCard({
  cycleAccuracy, performanceProfile, cycleHealthReport, ovulationEstimate,
  trainingWindow, recoveryWindow, patterns, forecast, todayDayOfWeek, periodCount = 0,
}: CycleHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!cycleAccuracy) {
    const remaining = Math.max(0, 2 - periodCount);
    return (
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
        <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
          <h2 className="text-[15px] font-semibold text-ink">Cycle Intelligence</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">How does my cycle affect training?</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3 rounded-xl bg-surface-hover border border-border px-4 py-3">
            <AxisIcon name="lock" size="sm" className="text-ink-faint mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {remaining > 0
                  ? `Available after ${remaining} more logged period${remaining === 1 ? "" : "s"}`
                  : "Building your cycle profile"}
              </p>
              <p className="text-[10px] text-ink-faint leading-relaxed">
                Axis needs at least two logged cycles to learn your personal patterns before showing this insight.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const confidence = computeConfidenceScore(cycleAccuracy.cycleCount);
  const topPatterns = patterns.slice(0, 5);
  const readinessForecasts = forecast?.readinessDays ?? [];
  const symptomEvents = forecast?.symptomEvents.slice(0, 4) ?? [];
  const firstActionDay = readinessForecasts.find(d => d.readinessForecast === "recover" || d.readinessForecast === "watch") ?? null;
  const showReadinessBullet = firstActionDay !== null &&
    firstActionDay.drivingSymptoms.some(id => !symptomEvents.find(e => e.symptomId === id));

  const hasDetails = !!(trainingWindow || recoveryWindow || topPatterns.length > 0 ||
    ovulationEstimate || readinessForecasts.length > 0 || symptomEvents.length > 0 ||
    cycleHealthReport?.hasObservations);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Cycle Intelligence</h2>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONF_BADGE[confidence.level]}`}>
            {CONF_LABEL[confidence.level]}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">How does my cycle affect training?</p>
      </div>

      <div className="px-5 py-4">
        <MetricRow label="Average length"      value={`${cycleAccuracy.averageLength} days`} />
        <MetricRow label="Variability"         value={`±${cycleAccuracy.variability} days`} />
        <MetricRow label="Cycles observed"     value={String(cycleAccuracy.cycleCount)} />
        {performanceProfile?.bestPhase && (
          <MetricRow label="Strongest phase" value={performanceProfile.bestPhase} />
        )}
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px]"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">
            {showDetails ? "Hide details" : "Full cycle breakdown"}
          </span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {(trainingWindow || recoveryWindow) && (
            <div>
              <SectionLabel>Training windows</SectionLabel>
              {trainingWindow && trainingWindow.confidence !== "low" && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-bold text-ink">Days {trainingWindow.startDay}–{trainingWindow.endDay}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trainingWindow.confidence === "high" ? "bg-success-bg text-success-text" : "bg-caution-bg text-caution"}`}>
                      {SPAN_CONF_LABEL[trainingWindow.confidence]}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-secondary">
                    Prime window — peak on cycle day {trainingWindow.peakDay} · avg readiness {trainingWindow.meanReadiness}/100
                  </p>
                </div>
              )}
              {recoveryWindow && recoveryWindow.confidence !== "low" && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-bold text-ink">Days {recoveryWindow.startDay}–{recoveryWindow.endDay}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${recoveryWindow.confidence === "high" ? "bg-success-bg text-success-text" : "bg-caution-bg text-caution"}`}>
                      {SPAN_CONF_LABEL[recoveryWindow.confidence]}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-secondary">
                    Recovery window — lowest point on cycle day {recoveryWindow.nadirDay} · avg readiness {recoveryWindow.meanReadiness}/100, plan lighter sessions here
                  </p>
                </div>
              )}
            </div>
          )}

          {topPatterns.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Symptom patterns</SectionLabel>
                <p className="text-[11px] text-ink-muted mb-1">You frequently experience:</p>
                {topPatterns.map(pattern => {
                  const symptom = SYMPTOM_BY_ID[pattern.symptomId];
                  return (
                    <div key={pattern.symptomId} className="flex items-start justify-between gap-3 py-2 border-b border-surface-hover last:border-0">
                      <span className="text-[12px] text-ink">
                        <span className="font-medium">{symptom?.name ?? pattern.symptomId}</span>
                        <span className="text-ink-muted"> around Day {Math.round(pattern.averageCycleDay)}</span>
                      </span>
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PATTERN_CONF_CHIP[pattern.confidence]}`}>
                        {PATTERN_CONF_LABEL[pattern.confidence]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {ovulationEstimate && (
            <>
              <Divider />
              <div>
                <SectionLabel>Estimated ovulation</SectionLabel>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] font-bold text-ink">Days {ovulationEstimate.window[0]}–{ovulationEstimate.window[2]}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ovulationEstimate.confidence === "high" ? "bg-success-bg text-success-text" : "bg-caution-bg text-caution"}`}>
                    {WINDOW_CONF_LABEL[ovulationEstimate.confidence]}
                  </span>
                </div>
                <p className="text-[12px] text-ink-secondary">Peak estimated on cycle day {ovulationEstimate.estimatedDay}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{BASIS_LABEL[ovulationEstimate.basis]}</p>
              </div>
            </>
          )}

          {(readinessForecasts.length > 0 || symptomEvents.length > 0) && (
            <>
              <Divider />
              <div>
                <SectionLabel>7-day forecast</SectionLabel>
                {readinessForecasts.length > 0 && (
                  <>
                    <div className="flex gap-1.5 mb-3" role="img" aria-label="7-day readiness forecast">
                      {readinessForecasts.map(f => {
                        const meta = FORECAST_META[f.readinessForecast];
                        const dow  = (todayDayOfWeek + f.daysFromNow) % 7;
                        const label = f.daysFromNow === 1 ? "Tmrw" : DAY_NAMES[dow];
                        return (
                          <div key={f.cycleDay} className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-full flex items-end justify-center" style={{ height: 40 }}>
                              <div className={`w-full rounded-t-lg ${meta.bar}`} style={{ height: meta.height }} aria-label={`${label}: ${meta.label}`} />
                            </div>
                            <span className="text-[9px] font-semibold text-ink-muted">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                      {(Object.keys(FORECAST_META) as ReadinessForecast[]).map(f => (
                        <div key={f} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${FORECAST_META[f].dot}`} />
                          <span className={`text-[9px] font-semibold ${FORECAST_META[f].text}`}>{FORECAST_META[f].label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  {symptomEvents.map(event => {
                    const symptom = SYMPTOM_BY_ID[event.symptomId];
                    return (
                      <div key={event.symptomId} className="flex items-start gap-2 py-1.5 border-b border-surface-hover last:border-0">
                        <span className="text-brand mt-0.5 flex-shrink-0">•</span>
                        <span className="text-[12px] text-ink leading-relaxed">
                          <span className="font-medium">{symptom?.name ?? event.symptomId}</span>{" "}
                          <span className="text-ink-secondary">{symptomPhrase(event.confidence, event.expectedSeverity)} {timeText(event.daysUntilStart)}</span>
                        </span>
                      </div>
                    );
                  })}
                  {showReadinessBullet && firstActionDay && (
                    <div className="flex items-start gap-2 py-1.5 border-b border-surface-hover last:border-0">
                      <span className="text-brand mt-0.5 flex-shrink-0">•</span>
                      <span className="text-[12px] text-ink-secondary leading-relaxed">
                        {firstActionDay.readinessForecast === "recover"
                          ? `Recovery demand tends to increase ${timeText(firstActionDay.daysFromNow)}`
                          : `Training intensity may need moderating ${timeText(firstActionDay.daysFromNow)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {cycleHealthReport?.hasObservations && (
            <>
              <Divider />
              <div>
                <SectionLabel>Cycle observations</SectionLabel>
                <ul className="space-y-2">
                  {cycleHealthReport.observations.map(obs => (
                    <li key={obs.id} className="flex items-start gap-2">
                      <span className="mt-[4px] w-1.5 h-1.5 rounded-full bg-ink-muted flex-shrink-0" />
                      <p className="text-[11px] text-ink-secondary leading-relaxed">{obs.observation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      <p className="px-5 pb-4 pt-3 text-[10px] text-ink-faint leading-relaxed border-t border-surface-hover">
        All cycle insights are behavioral estimates based on your logged data — not medical assessments.
      </p>
    </div>
  );
}
