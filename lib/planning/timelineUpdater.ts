// ─── lib/planning/timelineUpdater.ts ──────────────────────────────────────────
// Phase 38E — Adaptive timeline recalculation.
// Compares the original roadmap ETA with current velocity to detect drift.
// Pure function — no storage, no React.

import type { GoalRoadmap } from "./goalRoadmap";
import type { GoalVelocity } from "@/lib/performance/goalVelocity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimelineStatus = "ahead" | "on_track" | "slightly_behind" | "behind";

export interface TimelineUpdate {
  originalWeeks:  number;
  revisedWeeks:   number | null;   // null = no velocity data
  deltaWeeks:     number | null;   // positive = ahead, negative = behind
  status:         TimelineStatus;
  message:        string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function updateTimeline(roadmap: GoalRoadmap, velocity: GoalVelocity): TimelineUpdate {
  const original = roadmap.estimatedWeeks;

  if (!velocity || velocity.weeklyRatePercent <= 0 || velocity.etaWeeks === null) {
    return {
      originalWeeks: original,
      revisedWeeks:  null,
      deltaWeeks:    null,
      status:        "on_track",
      message:       "Not enough velocity data yet to revise the timeline.",
    };
  }

  const revised = velocity.etaWeeks;
  const delta   = original - revised;   // positive = finishing earlier than planned

  let status: TimelineStatus;
  if (delta > original * 0.15)       status = "ahead";
  else if (delta >= -(original * 0.1)) status = "on_track";
  else if (delta >= -(original * 0.25)) status = "slightly_behind";
  else                               status = "behind";

  const sign    = delta >= 0 ? "ahead by" : "behind by";
  const wkLabel = Math.abs(Math.round(delta)) === 1 ? "week" : "weeks";
  const message =
    status === "ahead"
      ? `You're ${sign} ${Math.abs(Math.round(delta))} ${wkLabel} — keep the momentum.`
      : status === "on_track"
        ? "You're on track with the original timeline."
        : status === "slightly_behind"
          ? `You're ${sign} ${Math.abs(Math.round(delta))} ${wkLabel}. A small consistency boost will get you back on schedule.`
          : `You're ${sign} ${Math.abs(Math.round(delta))} ${wkLabel}. Consider adjusting your goal or increasing training frequency.`;

  return { originalWeeks: original, revisedWeeks: revised, deltaWeeks: Math.round(delta), status, message };
}
