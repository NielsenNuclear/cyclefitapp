"use client";

import type { ScheduleLearningProfile } from "@/lib/lifestyle/scheduleLearning";
import type { TrainingAvailabilityProfile } from "@/lib/lifestyle/scheduleIntelligence";

interface Props {
  learning:      ScheduleLearningProfile | undefined;
  availability:  TrainingAvailabilityProfile | undefined;
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RATE_COLOR = (r: number) =>
  r >= 70 ? "bg-success"
  : r >= 45 ? "bg-info"
  : r >= 20 ? "bg-caution"
  : "bg-ink-faint";

export function ScheduleInsightsCard({ learning, availability }: Props) {
  if ((!learning?.dataReady) && (!availability?.dataReady)) return null;

  const byDay = availability?.byDay ?? learning?.completionByDay ?? [];
  const bestDay  = learning?.bestDay   ?? availability?.bestDay  ?? null;
  const bestTime = learning?.bestTimeSlot ?? null;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Schedule Insights</h3>
        {bestDay && (
          <span className="text-xs text-success font-semibold">{bestDay.dayName} best</span>
        )}
      </div>

      {/* Day-of-week bars */}
      {byDay.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-ink-faint uppercase tracking-widest">Completion by day</div>
          <div className="flex gap-1.5 items-end h-14">
            {DAY_SHORT.map((name, wd) => {
              const dayData = byDay.find(d => d.weekday === wd);
              const rate    = (dayData as { completionRate?: number })?.completionRate ?? 0;
              const sessions = (dayData as { sessions?: number; sessionCount?: number })?.sessions
                ?? (dayData as { sessionCount?: number })?.sessionCount
                ?? 0;
              const height  = sessions > 0 ? Math.max(8, Math.round((rate / 100) * 48)) : 4;
              const isToday = wd === new Date().getDay();
              return (
                <div key={wd} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full rounded-sm transition-all ${sessions > 0 ? RATE_COLOR(rate) : "bg-border"} ${isToday ? "ring-1 ring-brand/30" : ""}`}
                    style={{ height: `${height}px` }}
                  />
                  <span className={`text-[9px] ${isToday ? "text-ink-secondary" : "text-ink-faint"}`}>{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best training time */}
      {learning?.dataReady && (
        <div className="grid grid-cols-3 gap-2">
          {(["morning", "afternoon", "evening"] as const).map(slot => {
            const data = learning.completionByTime.find(t => t.slot === slot);
            const rate = data?.completionRate ?? 0;
            const sessions = data?.sessions ?? 0;
            const isBest = slot === bestTime;
            return (
              <div
                key={slot}
                className={`rounded-xl py-2.5 px-1 text-center ${isBest ? "bg-success-bg border border-success-border" : "bg-surface-hover"}`}
              >
                <div className={`text-sm font-semibold ${isBest ? "text-success" : "text-ink-secondary"}`}>
                  {sessions > 0 ? `${rate}%` : "—"}
                </div>
                <div className="text-[9px] text-ink-faint mt-0.5 capitalize">{slot}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insight */}
      <p className="text-[11px] text-ink-muted leading-relaxed">
        {learning?.insight ?? availability?.insight ?? ""}
      </p>
    </div>
  );
}
