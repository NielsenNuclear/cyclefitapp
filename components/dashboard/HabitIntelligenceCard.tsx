"use client";

import type { AdherenceAnalytics }         from "@/lib/adherence/adherenceAnalytics";
import type { BehaviorPatterns }            from "@/lib/adherence/behaviorPatterns";
import type { AdherenceRisk }              from "@/lib/adherence/adherenceRisk";
import type { PersonalAdherenceProfile }   from "@/lib/adherence/personalAdherenceProfile";

interface Props {
  analytics:  AdherenceAnalytics | undefined;
  patterns:   BehaviorPatterns   | undefined;
  risk:       AdherenceRisk      | undefined;
  profile:    PersonalAdherenceProfile | undefined;
}

const RISK_COLOR: Record<string, string> = {
  low:      "text-success",
  moderate: "text-caution",
  high:     "text-danger",
};

const RISK_BG: Record<string, string> = {
  low:      "bg-emerald-500/15 border-emerald-500/30",
  moderate: "bg-amber-500/15 border-amber-500/30",
  high:     "bg-rose-500/15 border-rose-500/30",
};

const RISK_LABEL: Record<string, string> = {
  low:      "Low skip risk",
  moderate: "Moderate skip risk",
  high:     "High skip risk",
};

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    pct >= 75 ? "bg-emerald-500"
    : pct >= 50 ? "bg-amber-500"
    : "bg-rose-500";
  return (
    <div className="w-full h-2 rounded-full bg-black/8">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function HabitIntelligenceCard({ analytics, patterns, risk, profile }: Props) {
  if (!analytics || analytics.sampleSize < 3) return null;

  const streakLabel =
    analytics.streakHealth.currentStreak >= 7  ? `${analytics.streakHealth.currentStreak} days` :
    analytics.streakHealth.currentStreak >= 1  ? `${analytics.streakHealth.currentStreak} day`  :
    "No active streak";

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Habit Intelligence</h3>
        <span className="text-xs text-ink-muted">{analytics.sampleSize} sessions</span>
      </div>

      {/* Consistency score */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-ink-secondary">Consistency Score</span>
          <span className="text-ink font-medium">{analytics.consistencyScore}/100</span>
        </div>
        <ScoreBar value={analytics.consistencyScore} />
      </div>

      {/* Streak + 30-day rate */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-hover rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-ink">{streakLabel}</div>
          <div className="text-[10px] text-ink-secondary mt-0.5">Current streak</div>
        </div>
        <div className="bg-surface-hover rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-ink">
            {Math.round(analytics.completionRates.rate30d * 100)}%
          </div>
          <div className="text-[10px] text-ink-secondary mt-0.5">30-day rate</div>
        </div>
        <div className="bg-surface-hover rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-ink">
            {Math.round(analytics.resilience * 100)}%
          </div>
          <div className="text-[10px] text-ink-secondary mt-0.5">Resilience</div>
        </div>
      </div>

      {/* Skip risk */}
      {risk && (
        <div className={`border rounded-xl p-3 ${RISK_BG[risk.riskLevel]}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${RISK_COLOR[risk.riskLevel]}`}>
              {RISK_LABEL[risk.riskLevel]}
            </span>
            {risk.confidence >= 0.6 && (
              <span className="text-[10px] text-ink-faint ml-auto">
                {Math.round(risk.confidence * 100)}% confidence
              </span>
            )}
          </div>
          {risk.reasons.length > 0 && (
            <p className="text-[11px] text-ink-secondary leading-relaxed">
              {risk.reasons[0]}
            </p>
          )}
        </div>
      )}

      {/* Best / worst days */}
      {patterns && (patterns.bestWeekday || patterns.worstWeekday) && (
        <div className="grid grid-cols-2 gap-3">
          {patterns.bestWeekday && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-[10px] text-success mb-0.5">Best day</div>
              <div className="text-sm font-semibold text-ink">{patterns.bestWeekday.label}</div>
              <div className="text-[10px] text-ink-muted">
                {Math.round(patterns.bestWeekday.completionRate * 100)}% completion
              </div>
            </div>
          )}
          {patterns.worstWeekday && patterns.worstWeekday.completionRate < 0.65 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <div className="text-[10px] text-danger mb-0.5">Hardest day</div>
              <div className="text-sm font-semibold text-ink">{patterns.worstWeekday.label}</div>
              <div className="text-[10px] text-ink-muted">
                {Math.round(patterns.worstWeekday.completionRate * 100)}% completion
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coaching insights (shown once data is mature enough) */}
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

      {/* Early state nudge */}
      {analytics.dataMaturity === "early" && (
        <p className="text-[11px] text-ink-muted text-center">
          Personalised habit insights will appear after 14 sessions.
        </p>
      )}
    </div>
  );
}
