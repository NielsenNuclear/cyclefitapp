"use client";

import type { ScheduleLearningProfile } from "@/lib/lifestyle/scheduleLearning";
import type { TrainingAvailabilityProfile } from "@/lib/lifestyle/scheduleIntelligence";

interface Props {
  learning:      ScheduleLearningProfile | undefined;
  availability:  TrainingAvailabilityProfile | undefined;
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RATE_COLOR = (r: number) =>
  r >= 70 ? "bg-[#0F6E56]"
  : r >= 45 ? "bg-[#1B4FA0]"
  : r >= 20 ? "bg-[#854F0B]"
  : "bg-[#C8C5BC]";

export function ScheduleInsightsCard({ learning, availability }: Props) {
  if ((!learning?.dataReady) && (!availability?.dataReady)) return null;

  const byDay = availability?.byDay ?? learning?.completionByDay ?? [];
  const bestDay  = learning?.bestDay   ?? availability?.bestDay  ?? null;
  const bestTime = learning?.bestTimeSlot ?? null;

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Schedule Insights</h3>
        {bestDay && (
          <span className="text-xs text-[#0F6E56] font-semibold">{bestDay.dayName} best</span>
        )}
      </div>

      {/* Day-of-week bars */}
      {byDay.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Completion by day</div>
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
                    className={`w-full rounded-sm transition-all ${sessions > 0 ? RATE_COLOR(rate) : "bg-[#EAE7DE]"} ${isToday ? "ring-1 ring-[#534AB7]/30" : ""}`}
                    style={{ height: `${height}px` }}
                  />
                  <span className={`text-[9px] ${isToday ? "text-[#5C5850]" : "text-[#C8C5BC]"}`}>{name}</span>
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
                className={`rounded-xl py-2.5 px-1 text-center ${isBest ? "bg-[#E1F5EE] border border-[#A8DFC8]" : "bg-[#F1EFE8]"}`}
              >
                <div className={`text-sm font-semibold ${isBest ? "text-[#0F6E56]" : "text-[#5C5850]"}`}>
                  {sessions > 0 ? `${rate}%` : "—"}
                </div>
                <div className="text-[9px] text-[#C8C5BC] mt-0.5 capitalize">{slot}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insight */}
      <p className="text-[11px] text-[#9B9690] leading-relaxed">
        {learning?.insight ?? availability?.insight ?? ""}
      </p>
    </div>
  );
}
