"use client";

import type { ScheduledLifeEventWithContext } from "@/lib/lifestyle/lifeStressCalendar";
import { LIFE_STRESS_LABELS }                 from "@/lib/lifestyle/lifeStressCalendar";
import type { WorkoutMode }                   from "@/lib/lifestyle/workoutModes";
import { WORKOUT_MODE_CONFIGS }               from "@/lib/lifestyle/workoutModes";

interface Props {
  events: ScheduledLifeEventWithContext[] | undefined;
}

const MODE_COLOR: Record<WorkoutMode, string> = {
  full:               "text-success",
  condensed:          "text-info",
  minimum_effective:  "text-caution",
  recovery:           "text-danger",
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
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Upcoming Life Events</h3>
        <span className="text-[10px] text-ink-faint">{events.length} scheduled</span>
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
              className={`rounded-xl p-3 space-y-1.5 border ${event.isActive ? "bg-caution-bg border-caution-border" : "bg-surface-hover border-border"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">{event.label}</span>
                <span className={`text-[10px] ${event.isActive ? "text-caution" : "text-ink-muted"}`}>
                  {label}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-ink-faint">{event.startDate} → {event.endDate}</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-ink-faint">Axis adjusts to</span>
                <span className={`text-[10px] font-semibold ${modeColor}`}>{modeCfg.label}</span>
                <span className="text-[10px] text-ink-faint">· {Math.round(event.adjustments.volumeScale * 100)}% volume</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-ink-muted text-center">
        Axis has pre-adjusted your training plan around these events.
      </p>
    </div>
  );
}
