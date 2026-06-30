"use client";

import type { ScheduledLifeEventWithContext } from "@/lib/lifestyle/lifeStressCalendar";
import { LIFE_STRESS_LABELS }                 from "@/lib/lifestyle/lifeStressCalendar";
import type { WorkoutMode }                   from "@/lib/lifestyle/workoutModes";
import { WORKOUT_MODE_CONFIGS }               from "@/lib/lifestyle/workoutModes";

interface Props {
  events: ScheduledLifeEventWithContext[] | undefined;
}

const MODE_COLOR: Record<WorkoutMode, string> = {
  full:               "text-[#0F6E56]",
  condensed:          "text-[#1B4FA0]",
  minimum_effective:  "text-[#854F0B]",
  recovery:           "text-[#C0392B]",
};

function daysLabel(daysUntil: number, isActive: boolean): string {
  if (isActive)        return "Active now";
  if (daysUntil === 0) return "Starts tomorrow";
  if (daysUntil === 1) return "In 1 day";
  return `In ${daysUntil} days`;
}

export function UpcomingLifeEventsCard({ events }: Props) {
  if (!events || events.length === 0) return null;

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Upcoming Life Events</h3>
        <span className="text-[10px] text-[#C8C5BC]">{events.length} scheduled</span>
      </div>

      <div className="space-y-3">
        {events.slice(0, 4).map(event => {
          const mode      = event.adjustments.trainingMode;
          const modeColor = MODE_COLOR[mode];
          const modeCfg   = WORKOUT_MODE_CONFIGS[mode];
          const label     = daysLabel(event.daysUntil, event.isActive);

          return (
            <div
              key={event.id}
              className={`rounded-xl p-3 space-y-1.5 border ${event.isActive ? "bg-[#FAEEDA] border-[#E4C88A]" : "bg-[#F1EFE8] border-[#EAE7DE]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1C1B18]">{event.label}</span>
                <span className={`text-[10px] ${event.isActive ? "text-[#854F0B]" : "text-[#9B9690]"}`}>
                  {label}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[#C8C5BC]">{event.startDate} → {event.endDate}</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-[#C8C5BC]">Axis adjusts to</span>
                <span className={`text-[10px] font-semibold ${modeColor}`}>{modeCfg.label}</span>
                <span className="text-[10px] text-[#C8C5BC]">· {Math.round(event.adjustments.volumeScale * 100)}% volume</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[#9B9690] text-center">
        Axis has pre-adjusted your training plan around these events.
      </p>
    </div>
  );
}
