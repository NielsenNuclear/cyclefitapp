"use client";

import { useState }                  from "react";
import type { DailyGuidance }        from "@/lib/coaching/dailyGuidance";
import type { WeeklyReview }         from "@/lib/coaching/weeklyReview";
import type { MonthlyReview }        from "@/lib/coaching/monthlyReview";
import { recordCoachFeedback }       from "@/lib/coaching/coachFeedback";

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-surface-hover my-3" />;
}

function PriorityBand({ priority }: { priority: DailyGuidance["priority"] }) {
  const styles: Record<string, string> = {
    critical: "bg-danger-bg border-l-4 border-danger",
    caution:  "bg-caution-bg border-l-4 border-caution",
    positive: "bg-success-bg border-l-4 border-success",
    normal:   "bg-brand-bg-mid border-l-4 border-brand",
  };
  return (
    <div className={`rounded-r-xl px-3 py-2 mb-3 ${styles[priority] ?? styles.normal}`} />
  );
}

function GradeChip({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-success-bg text-success-text",
    B: "bg-brand-bg-mid text-brand-dark",
    C: "bg-caution-bg text-caution-text",
    D: "bg-danger-bg text-danger",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-bold ${styles[grade] ?? styles.C}`}>
      {grade}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdaptiveCoachCardProps {
  daily?:   DailyGuidance;
  weekly?:  WeeklyReview;
  monthly?: MonthlyReview;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function AdaptiveCoachCard({ daily, weekly, monthly }: AdaptiveCoachCardProps) {
  const [dailyDismissed,   setDailyDismissed]   = useState(false);
  const [weeklyDismissed,  setWeeklyDismissed]  = useState(false);
  const [monthlyDismissed, setMonthlyDismissed] = useState(false);

  const showDaily   = daily   && !dailyDismissed;
  const showWeekly  = weekly?.isAvailable  && !weeklyDismissed;
  const showMonthly = monthly?.isAvailable && !monthlyDismissed;

  if (!showDaily && !showWeekly && !showMonthly) return null;

  const priority = daily?.priority ?? "normal";
  const headerColor: Record<string, string> = {
    critical: "text-danger",
    caution:  "text-caution",
    positive: "text-success",
    normal:   "text-ink-muted",
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${headerColor[priority]}`}>
          Adaptive Coach
        </div>
      </div>

      {/* ── Daily guidance ── */}
      {showDaily && daily && (
        <div className="mb-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-ink leading-snug">
              {daily.headline}
            </p>
            <button
              type="button"
              onClick={() => {
                recordCoachFeedback("daily_readiness", "dismissed");
                setDailyDismissed(true);
              }}
              className="shrink-0 text-ink-faint hover:text-brand text-[14px] leading-none mt-0.5"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          {daily.bullets.length > 0 && (
            <ul className="mt-3 space-y-2">
              {daily.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`text-[11px] mt-0.5 shrink-0 ${
                    b.type === "warning" ? "text-danger" :
                    b.type === "action"  ? "text-brand" :
                    "text-ink-secondary"
                  }`}>
                    {b.icon}
                  </span>
                  <p className="text-[12px] text-ink-secondary leading-relaxed">{b.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Weekly review ── */}
      {showWeekly && weekly && showDaily && <Divider />}
      {showWeekly && weekly && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
              Week {weekly.weekNumber} Review
            </div>
            <button
              type="button"
              onClick={() => {
                recordCoachFeedback("weekly_win", "dismissed");
                setWeeklyDismissed(true);
              }}
              className="text-ink-faint hover:text-brand text-[14px] leading-none"
              aria-label="Dismiss weekly review"
            >
              ×
            </button>
          </div>

          {/* Completion bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-ink-muted">Sessions</span>
              <span className="text-[11px] font-semibold text-brand">
                {weekly.sessionCount}/{weekly.targetSessions}
              </span>
            </div>
            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: `${Math.min(100, Math.round(weekly.completionRate * 100))}%` }}
              />
            </div>
          </div>

          {weekly.wins.length > 0 && (
            <div className="mb-2">
              {weekly.wins.map((w, i) => (
                <p key={i} className="text-[11px] text-success-text leading-relaxed mb-0.5">
                  ✓ {w}
                </p>
              ))}
            </div>
          )}
          {weekly.misses.length > 0 && (
            <div className="mb-2">
              {weekly.misses.map((m, i) => (
                <p key={i} className="text-[11px] text-caution-text leading-relaxed mb-0.5">
                  → {m}
                </p>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-secondary leading-relaxed">
            <span className="font-semibold text-ink">Next week: </span>
            {weekly.nextWeekFocus}
          </p>
        </div>
      )}

      {/* ── Monthly review ── */}
      {showMonthly && monthly && (showDaily || showWeekly) && <Divider />}
      {showMonthly && monthly && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
              Month {monthly.monthNumber} Summary
            </div>
            <div className="flex items-center gap-2">
              <GradeChip grade={monthly.grade} />
              <button
                type="button"
                onClick={() => {
                  recordCoachFeedback("monthly_grade", "dismissed");
                  setMonthlyDismissed(true);
                }}
                className="text-ink-faint hover:text-brand text-[14px] leading-none"
                aria-label="Dismiss monthly review"
              >
                ×
              </button>
            </div>
          </div>

          <p className="text-[12px] text-ink-secondary leading-relaxed mb-1">
            {monthly.topInsight}
          </p>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            {monthly.gradeRationale}
          </p>
          {monthly.momentum !== "steady" && (
            <p className={`text-[11px] font-medium mt-1 ${
              monthly.momentum === "building" ? "text-success-text" : "text-danger"
            }`}>
              Momentum: {monthly.momentum === "building" ? "↑ Building" : "↓ Fading"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
