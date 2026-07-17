"use client";

// ─── components/dashboard/TrainingPlanHubCard.tsx ─────────────────────────────
// Dashboard 2.0 — Layer 3. Merges WeeklyPlanCard, TrainingBlockCard,
// PeriodizedCalendarCard, and PeriodizationCard into one tabbed card — three
// timescales of the same planning system (this week / this block / next 4
// weeks), not three unrelated cards. PeriodizationCard's block-progress
// section was a confirmed duplicate of TrainingBlockCard's (same "Week X of
// Y" fact, two engines) — this uses PeriodizationCard's richer, phase-colored
// version and drops TrainingBlockCard's simpler one. PeriodizationCard's
// "What Axis Has Learned" insight is intentionally not rendered here — it
// belongs in the Layer 4 What Axis Learned Hub, not a 3rd copy in this card.
// See docs/ux/UXStabilizationAudit.md Batch 17.

import { useState } from "react";
import type { WeeklyPlan }            from "@/lib/planning/weeklyPlanner";
import type { TrainingBlock }         from "@/lib/planning/trainingBlocks";
import type { PeriodizedCalendar, WeekLabel } from "@/lib/planning/periodizedCalendar";
import type { PeriodizationStatus }   from "@/lib/periodization/periodizationState";
import type { CycleSynergySignal }    from "@/lib/periodization/cycleSynergy";
import type { AdaptiveDeloadDecision } from "@/lib/periodization/adaptiveDeload";
import type { AchievementForecast }   from "@/lib/periodization/achievementForecast";
import { PHASE_COLORS }               from "@/lib/periodization/goalProfiles";
import { color as tokenColor, statusColors } from "@/lib/design/tokens";

const INTENSITY_CONFIG: Record<WeeklyPlan["plannedIntensity"], { label: string; cls: string }> = {
  high: { label: "High intensity", cls: "bg-success-bg text-success-text" },
  moderate: { label: "Moderate intensity", cls: "bg-brand-bg-mid text-brand-dark" },
  low: { label: "Low intensity", cls: "bg-caution-bg text-caution" },
};
const LABEL_CONFIG: Record<WeekLabel, string> = {
  Foundation: "bg-surface-subtle text-ink-secondary", Build: "bg-brand-bg-mid text-brand-dark",
  Push: "bg-success-bg text-success-text", Deload: "bg-caution-bg text-caution", Recovery: "bg-danger-bg text-danger",
};
const TRAJECTORY_CONFIG = {
  ahead: { label: "Ahead", bg: statusColors.success.bg, text: statusColors.success.text },
  on_track: { label: "On Track", bg: statusColors.brand.bg, text: statusColors.brand.text },
  behind: { label: "Behind", bg: statusColors.caution.bg, text: statusColors.caution.text },
  stalled: { label: "Stalled", bg: statusColors.danger.bg, text: statusColors.danger.text },
};
const SYNERGY_CONFIG = {
  Optimal: { bg: statusColors.success.bg, text: statusColors.success.text },
  Favorable: { bg: statusColors.brand.bg, text: statusColors.brand.text },
  Neutral: { bg: tokenColor.surfaceSubtle, text: tokenColor.inkSecondary },
  Protect: { bg: statusColors.caution.bg, text: statusColors.caution.text },
};

function formatWeekStart(isoDate: string, offset: number): string {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Tab = "week" | "block" | "calendar";

interface TrainingPlanHubCardProps {
  weeklyPlan:      WeeklyPlan | null;
  trainingBlock:   TrainingBlock | null;
  calendar:        PeriodizedCalendar | null;
  periodization?:  { status: PeriodizationStatus; goalLabel: string; cycleSynergy?: CycleSynergySignal; deloadDecision?: AdaptiveDeloadDecision; forecast?: AchievementForecast };
}

export function TrainingPlanHubCard({ weeklyPlan, trainingBlock, calendar, periodization }: TrainingPlanHubCardProps) {
  const [tab, setTab] = useState<Tab>("week");

  if (!weeklyPlan && !trainingBlock && !calendar && !periodization) return null;

  const allTabs: { id: Tab; label: string; available: boolean }[] = [
    { id: "week", label: "This Week", available: !!weeklyPlan },
    { id: "block", label: "This Block", available: !!(trainingBlock || periodization) },
    { id: "calendar", label: "Next 4 Weeks", available: !!calendar },
  ];
  const tabs = allTabs.filter(t => t.available);

  const activeTab = tabs.find(t => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <h2 className="text-[15px] font-semibold text-ink">Training Plan</h2>
        <p className="text-[11px] text-ink-muted mt-0.5">What&apos;s my plan?</p>
      </div>

      {tabs.length > 1 && (
        <div className="flex px-5 pt-3 gap-1 border-b border-surface-hover">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-colors min-h-[36px] ${
                activeTab === t.id ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 py-4">
        {activeTab === "week" && weeklyPlan && (
          <div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${INTENSITY_CONFIG[weeklyPlan.plannedIntensity].cls}`}>
              {INTENSITY_CONFIG[weeklyPlan.plannedIntensity].label}
            </span>
            <div className="flex gap-3 mt-4 mb-4">
              <div className="flex-1 bg-surface-subtle rounded-xl p-3 text-center">
                <div className="text-[22px] font-bold text-ink leading-none">{weeklyPlan.targetSessions}</div>
                <div className="text-[10px] text-ink-muted mt-1">training days</div>
              </div>
              <div className="flex-1 bg-surface-subtle rounded-xl p-3 text-center">
                <div className="text-[22px] font-bold text-ink leading-none">{weeklyPlan.recoveryDays}</div>
                <div className="text-[10px] text-ink-muted mt-1">recovery days</div>
              </div>
              <div className="flex-1 bg-surface-subtle rounded-xl p-3 text-center">
                <div className="text-[22px] font-bold text-ink leading-none">~{weeklyPlan.targetVolume}</div>
                <div className="text-[10px] text-ink-muted mt-1">sets planned</div>
              </div>
            </div>
            <p className="text-[11px] text-ink-secondary leading-relaxed">{weeklyPlan.rationale}</p>
          </div>
        )}

        {activeTab === "block" && (trainingBlock || periodization) && (
          <div className="space-y-3">
            {periodization ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">{periodization.goalLabel}</span>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: PHASE_COLORS[periodization.status.phase] ?? tokenColor.inkMuted }}
                  >
                    {periodization.status.label}
                  </span>
                </div>

                {(periodization.deloadDecision?.triggerEarly || periodization.status.forcedEarly) && (
                  <div className="px-3 py-2 bg-caution-bg rounded-xl border border-caution-border">
                    <p className="text-[11px] font-semibold text-caution">Early Deload Triggered</p>
                    <p className="text-[11px] text-caution-text mt-0.5 leading-relaxed">
                      {periodization.deloadDecision?.reason ?? "Fatigue signals suggest taking a recovery week now."}
                    </p>
                  </div>
                )}
                {periodization.deloadDecision?.delay && !periodization.deloadDecision.triggerEarly && (
                  <div className="px-3 py-2 bg-success-bg rounded-xl border border-success-border">
                    <p className="text-[11px] font-semibold text-success">Deload Delayed</p>
                    <p className="text-[11px] text-success-text mt-0.5 leading-relaxed">{periodization.deloadDecision.reason}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-ink-secondary">
                      Week {periodization.status.mesocycleWeek} of {periodization.status.blockLengthWeeks}
                    </span>
                    <span className="text-[11px] text-ink-secondary">{Math.round(periodization.status.blockProgress * 100)}% complete</span>
                  </div>
                  <div className="relative h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(periodization.status.blockProgress * 100)}%`, backgroundColor: PHASE_COLORS[periodization.status.phase] ?? tokenColor.brand }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-ink-secondary leading-relaxed">{periodization.status.description}</p>

                {periodization.status.weeksUntilNextPhase > 0 && (
                  <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                    <span>Next:</span>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: PHASE_COLORS[periodization.status.nextPhase] ?? tokenColor.inkMuted }}
                    >
                      {periodization.status.nextPhaseLabel}
                    </span>
                    <span>in {periodization.status.weeksUntilNextPhase} week{periodization.status.weeksUntilNextPhase !== 1 ? "s" : ""}</span>
                  </div>
                )}

                {periodization.cycleSynergy && (
                  <div className="pt-2 border-t border-surface-hover">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Cycle Alignment</span>
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: SYNERGY_CONFIG[periodization.cycleSynergy.alignmentLabel].bg, color: SYNERGY_CONFIG[periodization.cycleSynergy.alignmentLabel].text }}
                      >
                        {periodization.cycleSynergy.alignmentLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-relaxed">{periodization.cycleSynergy.alignmentNote}</p>
                  </div>
                )}

                {periodization.forecast && (
                  <div className="pt-2 border-t border-surface-hover">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Goal Progress</span>
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: TRAJECTORY_CONFIG[periodization.forecast.trajectory].bg, color: TRAJECTORY_CONFIG[periodization.forecast.trajectory].text }}
                      >
                        {TRAJECTORY_CONFIG[periodization.forecast.trajectory].label}
                      </span>
                    </div>
                    <div className="relative h-2 bg-border rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${periodization.forecast.progressPercent}%` }} />
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-relaxed">{periodization.forecast.coachingNote}</p>
                  </div>
                )}
              </>
            ) : trainingBlock && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-bg-mid text-brand-dark">{trainingBlock.primaryGoal} Block</span>
                  <span className="text-[12px] font-semibold text-ink">Week {trainingBlock.currentWeek} of {trainingBlock.totalWeeks}</span>
                </div>
                <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.round((trainingBlock.currentWeek / trainingBlock.totalWeeks) * 100))}%` }} />
                </div>
                <p className="text-[11px] text-ink-secondary leading-relaxed">{trainingBlock.plannedProgression}</p>
              </>
            )}
          </div>
        )}

        {activeTab === "calendar" && calendar && (
          <div>
            {calendar.weeks.map(week => (
              <div key={week.weekOffset} className="py-3 border-b border-surface-hover last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-ink w-20 shrink-0">{formatWeekStart(week.weekStart, week.weekOffset)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LABEL_CONFIG[week.label]}`}>{week.label}</span>
                  </div>
                  <span className="text-[11px] text-ink-muted">{week.sessions} session{week.sessions !== 1 ? "s" : ""}</span>
                </div>
                {week.notes.length > 0 && week.weekOffset > 0 && (
                  <span className="text-[10px] text-caution leading-tight">{week.notes[0]}</span>
                )}
              </div>
            ))}
            <p className="text-[10px] text-ink-faint mt-3 leading-relaxed">
              Projected from your training block and current signals · Subject to change
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
