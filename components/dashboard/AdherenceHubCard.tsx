"use client";

// ─── components/dashboard/AdherenceHubCard.tsx ────────────────────────────────
// Dashboard 3.0 — Batch 20, Phase 3. Merges AdherenceCard + AdherenceIntelligenceCard
// + HabitIntelligenceCard into one Summary → Details card. Unlike the original
// Dashboard 2.0 merges (which were mostly literal-duplicate deletions), these
// three are genuinely distinct engines with overlapping *display concepts* —
// two different consistency-score computations, three different skip-risk
// verdicts, two different "best day to train" answers. For each overlapping
// concept, the richer source wins and the others are dropped, not averaged:
//   - Consistency: AdherenceCard's 4-pillar composite (training/nutrition/
//     recovery/check-ins) beats HabitIntelligenceCard's single-number version.
//   - Streaks: AdherenceCard's 4-domain MultiDomainStreaks beats
//     HabitIntelligenceCard's single workout-only streakHealth.
//   - Skip risk: AdherenceIntelligenceCard's AdherenceRiskForecast (has
//     protective factors) beats AdherenceCard's AdherenceRiskReport and
//     HabitIntelligenceCard's AdherenceRisk.
//   - Best/worst day: HabitIntelligenceCard's BehaviorPatterns (best AND
//     worst, with completion rate) beats AdherenceIntelligenceCard's
//     AdherencePatternReport (best only, string label).
// AdherenceAnalytics' unique fields (sample size, 30-day rate, resilience,
// data-maturity nudge) have no duplicate anywhere and are kept as bonus
// content in Coaching Insights. AdherenceCard's life-event picker is an
// input, not a display, so it stays visible in the Summary, not the Details.
// See docs/ux/UXStabilizationAudit.md Batch 20.

import { useState } from "react";
import type { ConsistencyScore }          from "@/lib/adherence/consistency";
import type { MultiDomainStreaks }        from "@/lib/adherence/streaks";
import type { SuccessFormula }            from "@/lib/adherence/successFormula";
import type { MomentumScore }             from "@/lib/adherence/momentum";
import type { ActiveLifeEvent, LifeEventType } from "@/lib/adherence/lifeEvents";
import { LIFE_EVENT_TYPES, LIFE_EVENT_LABELS } from "@/lib/adherence/lifeEvents";
import type { MissedWorkoutAnalysis }     from "@/lib/adherence/missedWorkoutAnalysis";
import type { AdherenceRiskForecast }     from "@/lib/adherence/adherenceRiskForecast";
import type { WorkoutSizeRecommendation } from "@/lib/adherence/adaptiveWorkoutSizing";
import type { HabitStrengthScore }        from "@/lib/adherence/habitStrength";
import type { AdherenceAnalytics }        from "@/lib/adherence/adherenceAnalytics";
import type { BehaviorPatterns }          from "@/lib/adherence/behaviorPatterns";
import type { PersonalAdherenceProfile }  from "@/lib/adherence/personalAdherenceProfile";
import { color as tokenColor }            from "@/lib/design/tokens";
import { LockedInsight } from "@/components/ui/LockedInsight";
import { AxisIcon }      from "@/components/ui/Icon";

// ── Colour maps ──────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  consistent:   "text-success",
  building:     "text-info",
  inconsistent: "text-caution",
  at_risk:      "text-danger",
};
const TIER_LABEL: Record<string, string> = {
  consistent:   "Consistent",
  building:     "Building",
  inconsistent: "Inconsistent",
  at_risk:      "At Risk",
};
const MOMENTUM_ICON: Record<string, string> = {
  strong: "↑↑", improving: "↑", flat: "→", declining: "↓",
};
const MOMENTUM_COLOR: Record<string, string> = {
  strong: "text-success", improving: "text-info", flat: "text-ink-secondary", declining: "text-danger",
};
const RISK_COLOR: Record<string, string> = {
  low: "text-success", moderate: "text-caution", high: "text-danger",
};
const RISK_CHIP: Record<string, string> = {
  low: "bg-success-bg text-success-text", moderate: "bg-caution-bg text-caution-text", high: "bg-danger-bg text-danger",
};
const HABIT_COLORS: Record<string, string> = {
  nascent: "text-ink-muted", forming: "text-caution", established: "text-success",
  strong: "text-success-text", automatic: "text-brand",
};

const DURATION_OPTIONS = [3, 7, 14] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}
function Divider() { return <div className="border-t border-surface-hover my-4" />; }

function ScoreRing({ value }: { value: number }) {
  const ringColor =
    value >= 80 ? tokenColor.success
    : value >= 60 ? tokenColor.info
    : value >= 40 ? tokenColor.caution
    : tokenColor.danger;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={ringColor} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
        fill={tokenColor.ink} fontSize="14" fontWeight="700">{value}</text>
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface AdherenceHubCardProps {
  consistency:      ConsistencyScore | undefined;
  streaks:          MultiDomainStreaks | undefined;
  momentum:         MomentumScore | undefined;
  lifeEvent:        ActiveLifeEvent | null;
  onLifeEvent:      (type: LifeEventType, days: number) => void;
  onClearLifeEvent: () => void;
  riskForecast:     AdherenceRiskForecast | undefined;
  missedAnalysis:   MissedWorkoutAnalysis | undefined;
  workoutSize:      WorkoutSizeRecommendation | undefined;
  habitStrength:    HabitStrengthScore | undefined;
  formula:          SuccessFormula | undefined;
  profile:          PersonalAdherenceProfile | undefined;
  behaviorPatterns: BehaviorPatterns | undefined;
  analytics:        AdherenceAnalytics | undefined;
}

// ── Main ───────────────────────────────────────────────────────────────────

export function AdherenceHubCard({
  consistency, streaks, momentum, lifeEvent, onLifeEvent, onClearLifeEvent,
  riskForecast, missedAnalysis, workoutSize, habitStrength, formula, profile,
  behaviorPatterns, analytics,
}: AdherenceHubCardProps) {
  const [showDetails, setShowDetails]     = useState(false);
  const [showLifePicker, setShowLifePicker] = useState(false);
  const [selectedEvent, setSelectedEvent]   = useState<LifeEventType | null>(null);
  const [selectedDays, setSelectedDays]     = useState<number>(7);

  const hasAnalytics = !!(analytics && analytics.sampleSize >= 3);
  if (!consistency && !riskForecast?.dataReady && !habitStrength?.dataReady && !hasAnalytics) return null;

  const maturity  = consistency?.maturityStage;
  const tierColor = consistency ? TIER_COLOR[consistency.tier] : "";
  const tierLabel = consistency ? TIER_LABEL[consistency.tier] : "";

  function handleSubmitLife() {
    if (!selectedEvent) return;
    onLifeEvent(selectedEvent, selectedDays);
    setShowLifePicker(false);
    setSelectedEvent(null);
  }

  const hasStreaks = streaks && ([
    streaks.training, streaks.checkins, streaks.recovery, streaks.nutrition,
  ]).some(s => s.current > 0 || s.longest > 0);

  const hasCoaching = (profile?.readyForCoaching && profile.coachingInsights.length > 0)
    || (formula?.readyToPersonalise && formula.topConditions.length > 0)
    || habitStrength?.dataReady
    || hasAnalytics;

  const hasDetails = !!(
    (consistency && maturity === "ready" && hasStreaks) ||
    riskForecast?.dataReady || missedAnalysis?.dataReady || workoutSize ||
    (behaviorPatterns && (behaviorPatterns.bestWeekday || behaviorPatterns.worstWeekday)) ||
    hasCoaching
  );

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Consistency</h2>
          <button
            onClick={() => setShowLifePicker(v => !v)}
            className="text-[11px] text-ink-muted hover:text-ink border border-border rounded-full px-3 py-1 transition-colors min-h-[28px]"
          >
            Life happened
          </button>
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">Am I building the habit?</p>
      </div>

      {/* ── Summary (always visible) ──────────────────────────────────── */}
      <div className="px-5 py-4 space-y-3">
        {/* Life event picker */}
        {showLifePicker && (
          <div className="bg-surface-hover border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs text-ink-secondary">What&apos;s going on?</p>
            <div className="flex flex-wrap gap-2">
              {LIFE_EVENT_TYPES.map(t => (
                <button key={t} onClick={() => setSelectedEvent(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedEvent === t
                      ? "bg-brand-bg-mid border-brand-border text-brand-dark"
                      : "bg-surface-hover border-border text-ink-secondary hover:bg-border"
                  }`}>
                  {LIFE_EVENT_LABELS[t]}
                </button>
              ))}
            </div>
            {selectedEvent && (
              <>
                <p className="text-[11px] text-ink-secondary">For how long?</p>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map(d => (
                    <button key={d} onClick={() => setSelectedDays(d)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        selectedDays === d
                          ? "bg-brand-bg-mid border-brand-border text-brand-dark"
                          : "bg-surface-hover border-border text-ink-secondary hover:bg-border"
                      }`}>
                      {d} days
                    </button>
                  ))}
                </div>
                <button onClick={handleSubmitLife}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors">
                  Adjust my plan
                </button>
              </>
            )}
          </div>
        )}

        {/* Active life event banner */}
        {lifeEvent && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-start gap-3">
            <div className="flex-1">
              <div className="text-[10px] text-caution font-semibold uppercase tracking-widest mb-0.5">
                {LIFE_EVENT_LABELS[lifeEvent.type]} Mode
              </div>
              <p className="text-[11px] text-ink-secondary leading-relaxed">
                {lifeEvent.adjustments.expectationNote}
              </p>
              <div className="text-[10px] text-ink-faint mt-1">
                {lifeEvent.daysRemaining} day{lifeEvent.daysRemaining !== 1 ? "s" : ""} remaining
              </div>
            </div>
            <button onClick={onClearLifeEvent}
              className="text-ink-faint hover:text-ink-secondary text-lg leading-none">×</button>
          </div>
        )}

        {/* Score + tier + momentum */}
        {consistency ? (
          maturity === "ready" ? (
            <div className="flex items-center gap-4">
              <ScoreRing value={consistency.composite} />
              <div className="flex-1 space-y-1">
                <div className={`text-sm font-semibold ${tierColor}`}>{tierLabel}</div>
                {momentum && (
                  <div className={`text-xs font-medium ${MOMENTUM_COLOR[momentum.level]}`}>
                    Momentum: {momentum.level.charAt(0).toUpperCase() + momentum.level.slice(1)}&nbsp;
                    {MOMENTUM_ICON[momentum.level]}
                  </div>
                )}
                {riskForecast?.dataReady && (
                  <div className={`text-[11px] ${RISK_COLOR[riskForecast.risk]}`}>
                    Skip risk: {riskForecast.risk.charAt(0).toUpperCase() + riskForecast.risk.slice(1)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <LockedInsight entryCount={consistency.historyDepth} title="Building your consistency picture" />
          )
        ) : riskForecast?.dataReady ? (
          <div className={`text-[12px] font-semibold ${RISK_COLOR[riskForecast.risk]}`}>
            Skip risk today: {riskForecast.risk.charAt(0).toUpperCase() + riskForecast.risk.slice(1)}
          </div>
        ) : null}
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
            {showDetails ? "Hide details" : "Full consistency breakdown"}
          </span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* ── Details ────────────────────────────────────────────────────── */}
      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {/* Score & Streaks */}
          {consistency && maturity === "ready" && (
            <div>
              <SectionLabel>Score & streaks</SectionLabel>
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                {[
                  { label: "Training",  val: consistency.training  },
                  { label: "Nutrition", val: consistency.nutrition  },
                  { label: "Recovery",  val: consistency.recovery   },
                  { label: "Check-ins", val: consistency.checkins   },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-surface-subtle rounded-xl py-2 px-1">
                    <div className="text-sm font-semibold text-ink">{val}</div>
                    <div className="text-[9px] text-ink-muted mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {hasStreaks && (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: "Training streak",  d: streaks!.training  },
                    { label: "Check-in streak",  d: streaks!.checkins  },
                    { label: "Recovery streak",  d: streaks!.recovery  },
                    { label: "Nutrition streak", d: streaks!.nutrition },
                  ] as Array<{ label: string; d: { current: number; longest: number } }>)
                    .filter(s => s.d.current > 0 || s.d.longest > 0)
                    .slice(0, 4)
                    .map(({ label, d }) => (
                      <div key={label} className="bg-surface-subtle rounded-xl px-3 py-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-ink-muted">{label}</span>
                          <span className="text-[10px] text-ink-faint">best {d.longest}</span>
                        </div>
                        <div className="text-sm font-semibold text-ink mt-0.5">{d.current} days</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Risk & Sizing */}
          {(riskForecast?.dataReady || missedAnalysis?.dataReady || workoutSize || behaviorPatterns) && (
            <>
              {consistency && maturity === "ready" && <Divider />}
              <div className="space-y-2.5">
                <SectionLabel>Risk & sizing</SectionLabel>

                {riskForecast?.dataReady && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-muted">Skip risk today</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RISK_CHIP[riskForecast.risk]}`}>
                      {riskForecast.risk.charAt(0).toUpperCase() + riskForecast.risk.slice(1)}
                    </span>
                  </div>
                )}
                {riskForecast?.reasons && riskForecast.reasons.length > 0 && (
                  <div className="space-y-1">
                    {riskForecast.reasons.slice(0, 2).map((r, i) => (
                      <p key={i} className="text-[12px] text-danger">• {r}</p>
                    ))}
                  </div>
                )}
                {riskForecast?.protectiveFactors && riskForecast.protectiveFactors.length > 0 && (
                  <div className="space-y-1">
                    {riskForecast.protectiveFactors.slice(0, 2).map((p, i) => (
                      <p key={i} className="text-[12px] text-success">✓ {p}</p>
                    ))}
                  </div>
                )}

                {behaviorPatterns && (behaviorPatterns.bestWeekday || behaviorPatterns.worstWeekday) && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {behaviorPatterns.bestWeekday && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-[10px] text-success mb-0.5">Best day</div>
                        <div className="text-sm font-semibold text-ink">{behaviorPatterns.bestWeekday.label}</div>
                        <div className="text-[10px] text-ink-muted">
                          {Math.round(behaviorPatterns.bestWeekday.completionRate * 100)}% completion
                        </div>
                      </div>
                    )}
                    {behaviorPatterns.worstWeekday && behaviorPatterns.worstWeekday.completionRate < 0.65 && (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                        <div className="text-[10px] text-danger mb-0.5">Hardest day</div>
                        <div className="text-sm font-semibold text-ink">{behaviorPatterns.worstWeekday.label}</div>
                        <div className="text-[10px] text-ink-muted">
                          {Math.round(behaviorPatterns.worstWeekday.completionRate * 100)}% completion
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {workoutSize && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] text-ink-muted">Recommended duration</span>
                    <span className="text-[12px] font-medium text-ink">
                      {workoutSize.recommendedMinMin}–{workoutSize.recommendedMaxMin} min
                    </span>
                  </div>
                )}

                {missedAnalysis?.dataReady && missedAnalysis.readinessDiff !== undefined && (
                  <p className="text-[12px] text-ink-secondary">
                    You miss workouts when readiness is{" "}
                    <span className="text-danger font-medium">
                      {Math.abs(Math.round(missedAnalysis.readinessDiff))} pts lower
                    </span>{" "}
                    than usual.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Coaching Insights */}
          {hasCoaching && (
            <>
              <Divider />
              <div className="space-y-3">
                <SectionLabel>Coaching insights</SectionLabel>

                {habitStrength?.dataReady && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-muted">Habit strength</span>
                    <div className="text-right">
                      <span className={`text-[13px] font-semibold ${HABIT_COLORS[habitStrength.level]}`}>
                        {habitStrength.level.charAt(0).toUpperCase() + habitStrength.level.slice(1)}
                      </span>
                      <span className="text-[11px] text-ink-muted ml-1">({habitStrength.score}/100)</span>
                    </div>
                  </div>
                )}

                {hasAnalytics && analytics && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-surface-subtle rounded-xl p-2.5 text-center">
                      <div className="text-[13px] font-semibold text-ink">{analytics.sampleSize}</div>
                      <div className="text-[9px] text-ink-secondary mt-0.5">Sessions logged</div>
                    </div>
                    <div className="bg-surface-subtle rounded-xl p-2.5 text-center">
                      <div className="text-[13px] font-semibold text-ink">
                        {Math.round(analytics.completionRates.rate30d * 100)}%
                      </div>
                      <div className="text-[9px] text-ink-secondary mt-0.5">30-day rate</div>
                    </div>
                    <div className="bg-surface-subtle rounded-xl p-2.5 text-center">
                      <div className="text-[13px] font-semibold text-ink">
                        {Math.round(analytics.resilience * 100)}%
                      </div>
                      <div className="text-[9px] text-ink-secondary mt-0.5">Resilience</div>
                    </div>
                  </div>
                )}

                {formula?.readyToPersonalise && formula.topConditions.length > 0 && (
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 space-y-2">
                    <div className="text-[10px] text-brand font-semibold uppercase tracking-widest">
                      Your success formula
                    </div>
                    <div className="space-y-1">
                      {formula.topConditions.map(c => (
                        <div key={c.factor} className="flex items-center gap-2">
                          <span className="text-success text-xs">✓</span>
                          <span className="text-xs text-ink">{c.label}</span>
                          <span className="text-[10px] text-ink-faint ml-auto">
                            {Math.round(c.completionRateWhen * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-relaxed">{formula.insight}</p>
                  </div>
                )}

                {profile?.readyForCoaching && profile.coachingInsights.length > 0 && (
                  <div className="space-y-2">
                    {profile.coachingInsights.slice(0, 2).map((ins, i) => (
                      <div key={i} className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                        <div className="text-xs font-semibold text-brand-dark mb-0.5">{ins.headline}</div>
                        <p className="text-[11px] text-ink-secondary leading-relaxed">{ins.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {analytics?.dataMaturity === "early" && (
                  <p className="text-[11px] text-ink-muted text-center">
                    Personalised habit insights will appear after 14 sessions.
                  </p>
                )}

                {consistency && maturity === "ready" && (
                  <div className="text-[11px] text-ink-muted text-center pt-1">
                    {consistency.tier === "at_risk"
                      ? "Focus: show up at least twice this week, no matter the session length."
                      : consistency.tier === "inconsistent"
                      ? "Focus: build to 3 sessions this week and log your nutrition."
                      : consistency.tier === "building"
                      ? "Focus: maintain momentum and recover intentionally between sessions."
                      : "Focus: stay the course. Your consistency is your competitive advantage."}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
