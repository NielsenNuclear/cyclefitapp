// ─── lib/lifestyle/scheduleLearning.ts ────────────────────────────────────────
// Phase 39G — Schedule Learning.
// Tracks workout completion by day of week and time of day so Axis can
// recommend training slots the user actually follows through on.
// Pure function — no storage.

import type { AdherenceEntry } from "@/lib/adherence/adherenceTracker";
import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeSlot = "morning" | "afternoon" | "evening" | "unknown";

export interface CompletionByDay {
  weekday:        number;
  dayName:        string;
  completionRate: number;
  sessions:       number;
}

export interface CompletionByTime {
  slot:           TimeSlot;
  completionRate: number;
  sessions:       number;
}

export interface ScheduleLearningProfile {
  completionByDay:  CompletionByDay[];
  completionByTime: CompletionByTime[];
  bestDay:          CompletionByDay | null;
  worstDay:         CompletionByDay | null;
  bestTimeSlot:     TimeSlot | null;
  morningAdherence: number;     // 0–100
  eveningAdherence: number;     // 0–100
  insight:          string;
  dataReady:        boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function timeSlot(isoTimestamp: string): TimeSlot {
  try {
    const hour = new Date(isoTimestamp).getHours();
    if (hour >= 5  && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 23) return "evening";
    return "unknown";
  } catch { return "unknown"; }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildScheduleLearningProfile(
  adherenceHistory: AdherenceEntry[],
  workoutHistory:   WorkoutHistoryEntry[],
): ScheduleLearningProfile {
  const empty: ScheduleLearningProfile = {
    completionByDay:  [],
    completionByTime: [],
    bestDay:          null,
    worstDay:         null,
    bestTimeSlot:     null,
    morningAdherence: 0,
    eveningAdherence: 0,
    insight:          "Log more sessions to discover your optimal training schedule.",
    dataReady:        false,
  };

  if (adherenceHistory.length < 7) return empty;

  // ── By day ────────────────────────────────────────────────────────────────
  const dayBuckets: Array<{ done: number; total: number }> = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  for (const e of adherenceHistory) {
    const wd = e.weekday;
    if (wd < 0 || wd > 6) continue;
    dayBuckets[wd].total++;
    if (e.status === "completed" || e.status === "partially_completed") dayBuckets[wd].done++;
  }
  const completionByDay: CompletionByDay[] = dayBuckets.map((b, wd) => ({
    weekday:        wd,
    dayName:        DAY_NAMES[wd],
    completionRate: b.total > 0 ? Math.round((b.done / b.total) * 100) : 0,
    sessions:       b.total,
  }));

  // ── By time slot ──────────────────────────────────────────────────────────
  const timeBuckets: Record<TimeSlot, { done: number; total: number }> = {
    morning:   { done: 0, total: 0 },
    afternoon: { done: 0, total: 0 },
    evening:   { done: 0, total: 0 },
    unknown:   { done: 0, total: 0 },
  };

  // Use `savedAt` from workout history as the proxy for "when they trained"
  const historyById = new Map(workoutHistory.map(h => [h.id, h]));
  for (const entry of adherenceHistory) {
    const hist = historyById.get(entry.date);
    if (!hist) continue;
    const slot = timeSlot(hist.savedAt);
    timeBuckets[slot].total++;
    if (entry.status === "completed" || entry.status === "partially_completed") {
      timeBuckets[slot].done++;
    }
  }

  const completionByTime: CompletionByTime[] = (["morning", "afternoon", "evening"] as TimeSlot[]).map(slot => ({
    slot,
    completionRate: timeBuckets[slot].total > 0
      ? Math.round((timeBuckets[slot].done / timeBuckets[slot].total) * 100)
      : 0,
    sessions: timeBuckets[slot].total,
  }));

  // ── Best / worst ──────────────────────────────────────────────────────────
  const qualDays = completionByDay.filter(d => d.sessions >= 3);
  const bestDay  = qualDays.length > 0
    ? qualDays.reduce((mx, d) => d.completionRate > mx.completionRate ? d : mx, qualDays[0])
    : null;
  const worstDay = qualDays.length > 0
    ? qualDays.reduce((mn, d) => d.completionRate < mn.completionRate ? d : mn, qualDays[0])
    : null;

  const qualTimes   = completionByTime.filter(t => t.sessions >= 3);
  const bestTimeSlot = qualTimes.length > 0
    ? qualTimes.reduce((mx, t) => t.completionRate > mx.completionRate ? t : mx, qualTimes[0]).slot
    : null;

  const morningAdherence = completionByTime.find(t => t.slot === "morning")?.completionRate ?? 0;
  const eveningAdherence = completionByTime.find(t => t.slot === "evening")?.completionRate ?? 0;

  const dataReady = qualDays.length >= 3 || qualTimes.length >= 2;

  const insight = bestDay && bestTimeSlot
    ? `You complete ${bestDay.completionRate}% of ${bestDay.dayName} sessions and train best in the ${bestTimeSlot}.`
    : bestDay
      ? `${bestDay.dayName} is your most consistent training day (${bestDay.completionRate}% completion).`
      : "Keep logging sessions to discover your most effective training slots.";

  return {
    completionByDay, completionByTime, bestDay, worstDay, bestTimeSlot,
    morningAdherence, eveningAdherence, insight, dataReady,
  };
}
