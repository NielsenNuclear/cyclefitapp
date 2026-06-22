// ─── lib/lifestyle/lifeStressCalendar.ts ──────────────────────────────────────
// Phase 39D — Life Stress Calendar.
// Stores future-scheduled life events so Axis can anticipate disruptions
// before they happen and pre-emptively adjust expectations.
// Distinct from Phase 35's active life events (which are "happening now").

import type { WorkoutMode } from "./workoutModes";

const STORAGE_KEY    = "axis_stress_calendar";
const RETENTION_DAYS = 365;

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export type LifeStressCategory =
  | "exam"
  | "work_deadline"
  | "work_travel"
  | "family_event"
  | "moving_house"
  | "holiday"
  | "illness"
  | "other";

export const LIFE_STRESS_LABELS: Record<LifeStressCategory, string> = {
  exam:          "Exam / Test",
  work_deadline: "Work Deadline",
  work_travel:   "Work Travel",
  family_event:  "Family Event",
  moving_house:  "Moving House",
  holiday:       "Holiday",
  illness:       "Illness",
  other:         "Other",
};

export interface LifeStressAdjustments {
  volumeScale:              number;       // 0.4–1.0
  expectedFatigueIncrease:  number;       // 0–30 (points added to fatigue score)
  trainingMode:             WorkoutMode;
}

export interface ScheduledLifeEvent {
  id:          string;
  category:    LifeStressCategory;
  label:       string;               // user-facing title
  startDate:   string;               // YYYY-MM-DD
  endDate:     string;               // YYYY-MM-DD
  adjustments: LifeStressAdjustments;
}

// Runtime-computed (not stored)
export interface ScheduledLifeEventWithContext extends ScheduledLifeEvent {
  daysUntil:  number;   // negative = already started
  isActive:   boolean;
  isPast:     boolean;
}

// ─── Preset adjustments by category ──────────────────────────────────────────

const CATEGORY_ADJUSTMENTS: Record<LifeStressCategory, LifeStressAdjustments> = {
  exam:          { volumeScale: 0.5, expectedFatigueIncrease: 15, trainingMode: "minimum_effective" },
  work_deadline: { volumeScale: 0.6, expectedFatigueIncrease: 12, trainingMode: "condensed"         },
  work_travel:   { volumeScale: 0.7, expectedFatigueIncrease: 10, trainingMode: "condensed"         },
  family_event:  { volumeScale: 0.7, expectedFatigueIncrease: 8,  trainingMode: "condensed"         },
  moving_house:  { volumeScale: 0.5, expectedFatigueIncrease: 20, trainingMode: "minimum_effective" },
  holiday:       { volumeScale: 0.6, expectedFatigueIncrease: 5,  trainingMode: "condensed"         },
  illness:       { volumeScale: 0.4, expectedFatigueIncrease: 25, trainingMode: "recovery"          },
  other:         { volumeScale: 0.7, expectedFatigueIncrease: 10, trainingMode: "condensed"         },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadEvents(): ScheduledLifeEvent[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: ScheduledLifeEvent[] = JSON.parse(raw);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const threshold = cutoff.toISOString().slice(0, 10);
    return all.filter(e => e.endDate >= threshold);
  } catch { return []; }
}

function saveEvents(events: ScheduledLifeEvent[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function withContext(event: ScheduledLifeEvent, today: string): ScheduledLifeEventWithContext {
  const daysUntil = daysBetween(today, event.startDate);
  const isActive  = today >= event.startDate && today <= event.endDate;
  const isPast    = today > event.endDate;
  return { ...event, daysUntil, isActive, isPast };
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function scheduleLifeEvent(
  category:  LifeStressCategory,
  startDate: string,
  endDate:   string,
  label?:    string,
): void {
  const events = loadEvents();
  const id     = `${category}_${startDate}_${Date.now()}`;
  events.push({
    id,
    category,
    label:       label ?? LIFE_STRESS_LABELS[category],
    startDate,
    endDate,
    adjustments: CATEGORY_ADJUSTMENTS[category],
  });
  saveEvents(events);
}

export function removeScheduledEvent(id: string): void {
  saveEvents(loadEvents().filter(e => e.id !== id));
}

export function getScheduledEvents(today: string): ScheduledLifeEventWithContext[] {
  return loadEvents()
    .map(e => withContext(e, today))
    .filter(e => !e.isPast)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getUpcomingEvents(today: string, daysAhead = 14): ScheduledLifeEventWithContext[] {
  return getScheduledEvents(today).filter(e => e.daysUntil <= daysAhead);
}

export function getCurrentActiveScheduledEvent(today: string): ScheduledLifeEventWithContext | null {
  return getScheduledEvents(today).find(e => e.isActive) ?? null;
}
