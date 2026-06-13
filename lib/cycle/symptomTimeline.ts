// ─── lib/cycle/symptomTimeline.ts ────────────────────────────────────────────
// Maps each logged symptom to the cycle days on which it typically appears.
// Feeds symptom cluster detection (18D) and the consolidated cycle card (18I).

import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { PeriodEntry } from "./cycleAccuracy";
import { SYMPTOM_CATALOG } from "@/lib/symptoms/symptomCatalog";
import { toCycleDay, getPeriodStartForDate } from "./cycleUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SymptomTimelineEntry {
  symptomId:   string;
  symptomName: string;
  cycleDays:   number[];  // all cycle days on which this symptom was logged
  peakDay:     number;    // median cycle day of occurrence
  frequency:   number;    // cycles where symptom appeared / total cycles (0–1, 2 dp)
}

export interface SymptomTimeline {
  entries:     SymptomTimelineEntry[];
  cycleCount:  number;
  lastUpdated: string;    // YYYY-MM-DD of most recent symptom entry
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds a timeline of symptom patterns across observed cycles.
 *
 * Only includes symptoms that appeared in ≥ 20% of observed cycles — anything
 * below that threshold is treated as noise rather than a real pattern.
 * Results are sorted by frequency (most consistent symptoms first).
 */
export function buildSymptomTimeline(
  symptomHistory: SymptomEntry[],
  periodHistory:  PeriodEntry[],
  cycleLength:    number,
): SymptomTimeline {
  if (periodHistory.length === 0 || symptomHistory.length === 0) {
    return { entries: [], cycleCount: 0, lastUpdated: "" };
  }

  const sortedPeriods = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const totalCycles   = Math.max(1, periodHistory.length - 1);

  const nameMap = new Map(SYMPTOM_CATALOG.map(s => [s.id, s.name]));

  // Accumulate per-symptom: cycle days + unique cycle identities
  const grouped = new Map<string, { cycleDays: number[]; cycleStarts: Set<string> }>();

  for (const entry of symptomHistory) {
    const cd          = toCycleDay(entry.date, sortedPeriods, cycleLength);
    const periodStart = getPeriodStartForDate(entry.date, sortedPeriods);
    if (cd === null || periodStart === null) continue;

    const bucket = grouped.get(entry.symptomId) ?? { cycleDays: [], cycleStarts: new Set() };
    bucket.cycleDays.push(cd);
    bucket.cycleStarts.add(periodStart);
    grouped.set(entry.symptomId, bucket);
  }

  const entries: SymptomTimelineEntry[] = [];

  for (const [symptomId, data] of grouped) {
    const frequency = Math.round((data.cycleStarts.size / totalCycles) * 100) / 100;
    if (frequency < 0.2) continue;

    entries.push({
      symptomId,
      symptomName: nameMap.get(symptomId) ?? symptomId,
      cycleDays:   data.cycleDays,
      peakDay:     median(data.cycleDays),
      frequency,
    });
  }

  entries.sort((a, b) => b.frequency - a.frequency);

  const lastUpdated = [...symptomHistory]
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? "";

  return { entries, cycleCount: totalCycles, lastUpdated };
}
