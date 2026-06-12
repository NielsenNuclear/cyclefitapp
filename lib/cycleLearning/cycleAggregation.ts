import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { CycleSymptomEvent } from "./types";

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  );
}

/**
 * Converts a flat symptom history into cycle-relative events.
 * Only entries with severity > 0 are included.
 * Entries in the current (in-progress) cycle are excluded (cycleNumber 0).
 */
export function aggregateSymptomsByCycle(
  history:        SymptomEntry[],
  lastPeriodDate: string,
  cycleLength:    number,
): CycleSymptomEvent[] {
  if (!lastPeriodDate || cycleLength <= 0 || history.length === 0) return [];

  const events: CycleSymptomEvent[] = [];

  for (const entry of history) {
    if (entry.severity === 0) continue;

    const dayOffset = daysBetween(lastPeriodDate, entry.date);

    let cycleNumber: number;
    let cycleDay:    number;

    if (dayOffset >= 0) {
      // Entry is in the current (incomplete) cycle — skip
      continue;
    } else {
      const absOffset = -dayOffset;
      cycleNumber     = Math.ceil(absOffset / cycleLength);
      cycleDay        = cycleNumber * cycleLength - absOffset + 1;
    }

    // Guard against rounding edge cases producing out-of-range days
    if (cycleDay < 1 || cycleDay > cycleLength) continue;

    events.push({
      cycleNumber,
      cycleDay,
      symptomId: entry.symptomId,
      severity:  entry.severity as 1 | 2 | 3,
    });
  }

  return events;
}

/**
 * Returns how many full cycles are spanned by the history relative to
 * lastPeriodDate. Used as the denominator in frequency scoring.
 */
export function countCompletedCycles(
  history:        SymptomEntry[],
  lastPeriodDate: string,
  cycleLength:    number,
): number {
  if (!lastPeriodDate || cycleLength <= 0 || history.length === 0) return 0;

  const sorted   = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const earliest = sorted[0].date;
  const days     = daysBetween(earliest, lastPeriodDate);

  return Math.max(0, Math.floor(days / cycleLength));
}
