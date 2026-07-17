"use client";

// ─── components/dashboard/CoachingHubCard.tsx ─────────────────────────────────
// Dashboard 2.0 — Layer 3. Merges AdaptiveCoachCard (anchor — best-built shell
// in the cluster: dismissible, timescale-segmented daily/weekly/monthly),
// TrainingDecisionCard, CoachViewCard, and ProgressionCard — four previously-
// separate "what should I do today and why" cards. TrainingDecisionCard's raw
// Volume/Intensity/Complexity/Success percentages are converted to qualitative
// language throughout, per the brief's "avoid numerical contribution
// percentages" rule. See docs/ux/UXStabilizationAudit.md Batch 17.

import { useState } from "react";
import type { DailyGuidance }        from "@/lib/coaching/dailyGuidance";
import type { WeeklyReview }         from "@/lib/coaching/weeklyReview";
import type { MonthlyReview }        from "@/lib/coaching/monthlyReview";
import { recordCoachFeedback }       from "@/lib/coaching/coachFeedback";
import type { TrainingDecision }     from "@/lib/autoregulation/trainingDecisionEngine";
import type { OutcomePrediction }    from "@/lib/autoregulation/outcomePrediction";
import type { CoachView }            from "@/lib/coaching/coachView";
import type { ProgressionProfile, RecommendedAction } from "@/lib/progression/progressionProfile";
import type { CoachingAdjustment }   from "@/lib/progression/progressionRules";
import { color as tokenColor }       from "@/lib/design/tokens";

function Divider() { return <div className="h-px bg-surface-hover my-3" />; }

const TYPE_BG: Record<string, string> = {
  proceed: "bg-success-bg border-success-border", scale_up: "bg-info-bg border-info-border",
  scale_down: "bg-caution-bg border-caution-border", swap: "bg-brand-bg-mid border-brand-border",
  recover: "bg-neutral-bg border-neutral-border",
};
const TYPE_COLOR: Record<string, string> = {
  proceed: "text-success-text", scale_up: "text-info", scale_down: "text-caution-text",
  swap: "text-brand-dark", recover: "text-neutral-text",
};
const TYPE_LABEL: Record<string, string> = {
  proceed: "Full session", scale_up: "Enhanced session", scale_down: "Scaled session",
  swap: "Modified session", recover: "Recovery session",
};
const QUALITY_COLOR: Record<string, string> = { high: "text-success", medium: "text-caution", low: "text-danger" };
const COST_COLOR: Record<string, string> = { minimal: "text-success", low: "text-success", medium: "text-caution", high: "text-danger" };
const ACTION_STYLES: Record<RecommendedAction, { badge: string; bar: string; label: string }> = {
  progress: { badge: "bg-success-bg text-success-text border-success-border", bar: tokenColor.success, label: "Progress" },
  maintain: { badge: "bg-brand-bg-mid text-brand-dark border-brand-border", bar: tokenColor.brand, label: "Maintain" },
  reduce:   { badge: "bg-caution-bg text-caution-text border-caution-border", bar: tokenColor.caution, label: "Reduce" },
  deload:   { badge: "bg-neutral-bg text-neutral-text border-neutral-border", bar: tokenColor.neutral, label: "Deload" },
};

// Dashboard 2.0 — qualitative scale labels replace raw percentages.
function scaleLabel(scale: number, noun: string): string {
  if (scale >= 1.08) return `Increased ${noun}`;
  if (scale >= 1.02) return `Slightly increased ${noun}`;
  if (scale <= 0.70) return `Significantly reduced ${noun}`;
  if (scale <= 0.85) return `Reduced ${noun}`;
  if (scale <= 0.95) return `Slightly reduced ${noun}`;
  return `Standard ${noun}`;
}
function probabilityLabel(pct: number): string {
  if (pct >= 75) return "High likelihood";
  if (pct >= 50) return "Moderate likelihood";
  return "Lower likelihood";
}

interface CoachingHubCardProps {
  daily?:      DailyGuidance;
  weekly?:     WeeklyReview;
  monthly?:    MonthlyReview;
  decision?:   TrainingDecision;
  prediction?: OutcomePrediction;
  coachView?:  CoachView | null;
  progression?: { profile: ProgressionProfile | null; adjustment: CoachingAdjustment | null };
}

export function CoachingHubCard({ daily, weekly, monthly, decision, prediction, coachView, progression }: CoachingHubCardProps) {
  const [dailyDismissed, setDailyDismissed]     = useState(false);
  const [weeklyDismissed, setWeeklyDismissed]   = useState(false);
  const [monthlyDismissed, setMonthlyDismissed] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const showDaily   = daily   && !dailyDismissed;
  const showWeekly  = weekly?.isAvailable  && !weeklyDismissed;
  const showMonthly = monthly?.isAvailable && !monthlyDismissed;

  if (!showDaily && !showWeekly && !showMonthly && !decision) return null;

  const priority = daily?.priority ?? "normal";
  const headerColor: Record<string, string> = { critical: "text-danger", caution: "text-caution", positive: "text-success", normal: "text-ink-muted" };
  const hasMore = !!(coachView || progression?.profile);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <h2 className={`text-[15px] font-semibold ${headerColor[priority] === "text-ink-muted" ? "text-ink" : headerColor[priority]}`}>Coaching</h2>
        <p className="text-[11px] text-ink-muted mt-0.5">What should I do today, and why?</p>
      </div>

      {decision && (
        <div className={`mx-5 mt-4 border rounded-2xl p-4 space-y-3 ${TYPE_BG[decision.type] ?? "bg-surface-subtle border-border"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">Today&apos;s session</span>
            <span className={`text-[12px] font-semibold ${TYPE_COLOR[decision.type] ?? "text-ink"}`}>{TYPE_LABEL[decision.type] ?? decision.type}</span>
          </div>
          <p className={`text-[13px] font-medium leading-snug ${TYPE_COLOR[decision.type] ?? "text-ink"}`}>{decision.headline}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-black/5 rounded-xl py-2 px-1">
              <div className="text-[11px] font-semibold text-ink">{scaleLabel(decision.finalVolumeScale, "").trim() || "Standard"}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">Volume</div>
            </div>
            <div className="bg-black/5 rounded-xl py-2 px-1">
              <div className="text-[11px] font-semibold text-ink">{scaleLabel(decision.intensityMultiplier, "").trim() || "Standard"}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">Intensity</div>
            </div>
            <div className="bg-black/5 rounded-xl py-2 px-1">
              <div className="text-[11px] font-semibold text-ink">{scaleLabel(decision.complexityScale, "").trim() || "Standard"}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">Complexity</div>
            </div>
          </div>
          {decision.rationale.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-ink-muted font-semibold uppercase tracking-[0.10em]">Why this plan</div>
              {decision.rationale.slice(0, 3).map((r, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-black/20 mt-1.5 flex-shrink-0" />
                  <p className="text-[12px] text-ink-secondary leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          )}
          {prediction && (
            <div className="border-t border-black/8 pt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[12px] font-semibold text-ink">{probabilityLabel(prediction.successProbability)}</div>
                <div className="text-[10px] text-ink-muted">Success</div>
              </div>
              <div>
                <div className={`text-[12px] font-semibold ${QUALITY_COLOR[prediction.expectedQuality] ?? "text-ink"}`}>{prediction.expectedQuality.charAt(0).toUpperCase() + prediction.expectedQuality.slice(1)}</div>
                <div className="text-[10px] text-ink-muted">Quality</div>
              </div>
              <div>
                <div className={`text-[12px] font-semibold ${COST_COLOR[prediction.fatigueCost] ?? "text-ink"}`}>{prediction.fatigueCost.charAt(0).toUpperCase() + prediction.fatigueCost.slice(1)}</div>
                <div className="text-[10px] text-ink-muted">Fatigue cost</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-5 py-4">
        {showDaily && daily && (
          <div className="mb-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-semibold text-ink leading-snug">{daily.headline}</p>
              <button
                type="button"
                onClick={() => { recordCoachFeedback("daily_readiness", "dismissed"); setDailyDismissed(true); }}
                className="shrink-0 text-ink-faint hover:text-brand text-[14px] leading-none mt-0.5"
                aria-label="Dismiss"
              >×</button>
            </div>
            {daily.bullets.length > 0 && (
              <ul className="mt-3 space-y-2">
                {daily.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`text-[11px] mt-0.5 shrink-0 ${b.type === "warning" ? "text-danger" : b.type === "action" ? "text-brand" : "text-ink-secondary"}`}>{b.icon}</span>
                    <p className="text-[12px] text-ink-secondary leading-relaxed">{b.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {showWeekly && weekly && (
          <>
            {showDaily && <Divider />}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Week {weekly.weekNumber} Review</div>
                <button
                  type="button"
                  onClick={() => { recordCoachFeedback("weekly_win", "dismissed"); setWeeklyDismissed(true); }}
                  className="text-ink-faint hover:text-brand text-[14px] leading-none"
                  aria-label="Dismiss weekly review"
                >×</button>
              </div>
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-ink-muted">Sessions</span>
                  <span className="text-[11px] font-semibold text-brand">{weekly.sessionCount}/{weekly.targetSessions}</span>
                </div>
                <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, Math.round(weekly.completionRate * 100))}%` }} />
                </div>
              </div>
              {weekly.wins.map((w, i) => <p key={i} className="text-[11px] text-success-text leading-relaxed mb-0.5">✓ {w}</p>)}
              {weekly.misses.map((m, i) => <p key={i} className="text-[11px] text-caution-text leading-relaxed mb-0.5">→ {m}</p>)}
              <p className="text-[11px] text-ink-secondary leading-relaxed mt-1">
                <span className="font-semibold text-ink">Next week: </span>{weekly.nextWeekFocus}
              </p>
            </div>
          </>
        )}

        {showMonthly && monthly && (
          <>
            {(showDaily || showWeekly) && <Divider />}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Month {monthly.monthNumber} Summary</div>
                <button
                  type="button"
                  onClick={() => { recordCoachFeedback("monthly_grade", "dismissed"); setMonthlyDismissed(true); }}
                  className="text-ink-faint hover:text-brand text-[14px] leading-none"
                  aria-label="Dismiss monthly review"
                >×</button>
              </div>
              <p className="text-[12px] text-ink-secondary leading-relaxed mb-1">{monthly.topInsight}</p>
              <p className="text-[11px] text-ink-muted leading-relaxed">{monthly.gradeRationale}</p>
            </div>
          </>
        )}

        {!showDaily && !showWeekly && !showMonthly && !decision && (
          <p className="text-[12px] text-ink-muted">Log your first workout to activate the progression engine.</p>
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px]"
          aria-expanded={showMore}
        >
          <span className="text-[12px] font-semibold text-brand">{showMore ? "Hide more" : "More coaching detail"}</span>
        </button>
      )}

      {showMore && (
        <div className="px-5 py-4 border-t border-border space-y-4">
          {coachView && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand mb-2">What Axis recommends next</p>
              <p className="text-[13px] font-semibold text-ink leading-snug mb-2">{coachView.headline}</p>
              <ul className="space-y-1.5 mb-2">
                {coachView.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand text-[12px] shrink-0">•</span>
                    <span className="text-[12px] text-ink leading-relaxed">{action}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-ink-secondary leading-relaxed">{coachView.reasoning}</p>
            </div>
          )}
          {progression?.profile && (() => {
            const profile = progression.profile;
            return (
              <div className={coachView ? "pt-3 border-t border-surface-hover" : ""}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Adaptive Coaching Trend</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ACTION_STYLES[profile.recommendedAction].badge}`}>
                    {ACTION_STYLES[profile.recommendedAction].label}
                  </span>
                </div>
                <div className="space-y-2">
                  {([
                    { label: "Adherence", score: profile.adherenceScore },
                    { label: "Recovery", score: profile.recoveryScore },
                    { label: "Progression", score: profile.progressionScore },
                  ]).map(({ label, score }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-secondary">{label}</span>
                        <span className="text-[11px] font-semibold text-ink">{score}/100</span>
                      </div>
                      <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: ACTION_STYLES[profile.recommendedAction].bar }} />
                      </div>
                    </div>
                  ))}
                </div>
                {progression.adjustment && (
                  <p className="text-[11px] text-ink-secondary leading-relaxed mt-2 pt-2 border-t border-surface-hover">{progression.adjustment.rationale}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
