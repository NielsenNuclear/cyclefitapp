// ─── lib/lifestyle/timeBudget.ts ──────────────────────────────────────────────
// Phase 39B — Time Budget Engine.
// Computes the realistic training time available today based on life context,
// travel mode, schedule patterns, and energy availability.
// Pure function — no storage.

import type { ActiveLifeEvent }           from "@/lib/adherence/lifeEvents";
import type { EnergyAvailabilityLevel }   from "./energyAvailability";
import type { DayAvailability }            from "./scheduleIntelligence";
import type { TravelModeState }            from "./travelMode";
import type { ScheduledLifeEventWithContext } from "./lifeStressCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeBudgetMinutes = 15 | 30 | 45 | 60 | 90;

export type TimeBudgetSource =
  | "illness"
  | "jet_lag"
  | "life_event"
  | "scheduled_event"
  | "travel"
  | "low_energy"
  | "low_availability_day"
  | "schedule_pattern"
  | "default";

export interface DailyTimeBudget {
  minutes: TimeBudgetMinutes;
  source:  TimeBudgetSource;
  reason:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snap(minutes: number): TimeBudgetMinutes {
  if (minutes <= 20) return 15;
  if (minutes <= 37) return 30;
  if (minutes <= 52) return 45;
  if (minutes <= 75) return 60;
  return 90;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeDailyTimeBudget(
  activeLifeEvent:       ActiveLifeEvent | null,
  travelMode:            TravelModeState,
  todayAvailability:     DayAvailability | null,
  energyAvailability:    EnergyAvailabilityLevel,
  currentScheduledEvent: ScheduledLifeEventWithContext | null,
): DailyTimeBudget {
  // ── Hard overrides (illness / jet lag top priority) ─────────────────────
  if (activeLifeEvent?.type === "illness") {
    return { minutes: 15, source: "illness", reason: "Illness detected — rest and very light movement only." };
  }
  if (travelMode.context === "jet_lag") {
    return { minutes: 15, source: "jet_lag", reason: "Jet lag mode — short movement session to support circadian reset." };
  }

  // ── Scheduled event override ─────────────────────────────────────────────
  if (currentScheduledEvent) {
    const targetMinutes = currentScheduledEvent.adjustments.volumeScale <= 0.5 ? 15
      : currentScheduledEvent.adjustments.volumeScale <= 0.65 ? 30
      : 45;
    return {
      minutes: snap(targetMinutes),
      source:  "scheduled_event",
      reason:  `${currentScheduledEvent.label} — Axis has reduced your session to fit your schedule.`,
    };
  }

  // ── Active life event (non-illness) ─────────────────────────────────────
  if (activeLifeEvent) {
    const scale   = activeLifeEvent.adjustments.volumeScale;
    const target  = scale <= 0.55 ? 15 : scale <= 0.7 ? 30 : 45;
    return {
      minutes: snap(target),
      source:  "life_event",
      reason:  `Life event (${activeLifeEvent.type.replace("_", " ")}) — session adapted accordingly.`,
    };
  }

  // ── Travel mode ──────────────────────────────────────────────────────────
  if (travelMode.isActive) {
    return { minutes: 30, source: "travel", reason: "Travel mode — condensed session to fit hotel/limited gym." };
  }

  // ── Energy availability ──────────────────────────────────────────────────
  if (energyAvailability === "low") {
    return { minutes: 15, source: "low_energy", reason: "Low energy availability today — minimum effective dose recommended." };
  }
  if (energyAvailability === "moderate") {
    const baseMinutes = todayAvailability?.status === "low" ? 30 : 45;
    return {
      minutes: snap(baseMinutes),
      source:  "low_energy",
      reason:  "Moderate energy — a condensed session fits today better than a full one.",
    };
  }

  // ── Schedule pattern ─────────────────────────────────────────────────────
  if (todayAvailability?.status === "low") {
    return {
      minutes: 30,
      source:  "low_availability_day",
      reason:  `${todayAvailability.dayName} tends to be a low-adherence day — a shorter session will work better.`,
    };
  }

  // ── Default (full session) ───────────────────────────────────────────────
  return { minutes: 60, source: "default", reason: "Full session — your schedule looks clear today." };
}
