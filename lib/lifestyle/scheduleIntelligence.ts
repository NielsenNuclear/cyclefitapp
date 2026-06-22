// ─── lib/lifestyle/scheduleIntelligence.ts ────────────────────────────────────
// Phase 39A — Schedule Intelligence.
// Learns which days of the week the user reliably trains by analysing
// the adherence history. Pure function — no storage.

import type { AdherenceEntry } from "@/lib/adherence/adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayAvailabilityStatus = "high" | "moderate" | "low" | "insufficient_data";

export interface DayAvailability {
  weekday:        number;                // 0 = Sunday … 6 = Saturday
  dayName:        string;
  completionRate: number;                // 0–100
  sessionCount:   number;
  status:         DayAvailabilityStatus;
}

export interface TrainingAvailabilityProfile {
  byDay:                DayAvailability[];
  bestDay:              DayAvailability | null;
  worstDay:             DayAvailability | null;
  highAvailabilityDays: number[];        // weekday numbers with status "high"
  lowAvailabilityDays:  number[];        // weekday numbers with status "low"
  todayStatus:          DayAvailabilityStatus;
  insight:              string;
  dataReady:            boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function statusFromRate(rate: number, count: number): DayAvailabilityStatus {
  if (count < 3) return "insufficient_data";
  if (rate >= 70) return "high";
  if (rate >= 45) return "moderate";
  return "low";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildTrainingAvailabilityProfile(
  adherenceHistory: AdherenceEntry[],
): TrainingAvailabilityProfile {
  const empty: TrainingAvailabilityProfile = {
    byDay:                [],
    bestDay:              null,
    worstDay:             null,
    highAvailabilityDays: [],
    lowAvailabilityDays:  [],
    todayStatus:          "insufficient_data",
    insight:              "Log 3+ sessions to see your schedule patterns.",
    dataReady:            false,
  };

  if (!adherenceHistory || adherenceHistory.length < 5) return empty;

  // Build per-weekday completion rates
  const buckets: Array<{ completed: number; total: number }> = Array.from({ length: 7 }, () => ({
    completed: 0,
    total:     0,
  }));

  for (const entry of adherenceHistory) {
    const wd = entry.weekday;
    if (wd < 0 || wd > 6) continue;
    buckets[wd].total++;
    if (entry.status === "completed" || entry.status === "partially_completed") {
      buckets[wd].completed++;
    }
  }

  const byDay: DayAvailability[] = buckets.map((b, wd) => {
    const rate   = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
    const status = statusFromRate(rate, b.total);
    return { weekday: wd, dayName: DAY_NAMES[wd], completionRate: rate, sessionCount: b.total, status };
  });

  const qualified = byDay.filter(d => d.status !== "insufficient_data");
  if (qualified.length === 0) return { ...empty, byDay };

  const best  = qualified.reduce((mx, d) => d.completionRate > mx.completionRate ? d : mx, qualified[0]);
  const worst = qualified.reduce((mn, d) => d.completionRate < mn.completionRate ? d : mn, qualified[0]);

  const high = byDay.filter(d => d.status === "high").map(d => d.weekday);
  const low  = byDay.filter(d => d.status === "low").map(d => d.weekday);

  const todayWd      = new Date().getDay();
  const todayStatus  = byDay[todayWd]?.status ?? "insufficient_data";

  const insight =
    high.length > 0
      ? `You train most reliably on ${high.map(w => DAY_NAMES[w]).join(", ")}. Axis schedules demanding sessions on these days.`
      : `Not enough data yet to detect your best training days — keep logging sessions.`;

  return {
    byDay,
    bestDay:              best,
    worstDay:             worst,
    highAvailabilityDays: high,
    lowAvailabilityDays:  low,
    todayStatus,
    insight,
    dataReady:            qualified.length >= 3,
  };
}
