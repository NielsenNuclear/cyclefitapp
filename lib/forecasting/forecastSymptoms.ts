import type { LearnedPattern } from "@/lib/cycleLearning/types";

export interface ForecastEvent {
  symptomId:         string;
  predictedStartDay: number;  // cycle day (1-indexed)
  predictedEndDay:   number;  // cycle day (1-indexed)
  daysUntilStart:    number;  // days from today until window opens
  confidence:        number;  // 0–1, derived from consistencyScore
  expectedSeverity:  number;  // 1–3 mean severity
}

// Window radius around averageCycleDay used to form the forecast band
const WINDOW_RADIUS = 2;

/**
 * Produces upcoming symptom forecast windows from learned patterns.
 * Only patterns with confidence >= "medium" are used.
 * Only events whose window is at least partially in the future are returned.
 */
export function forecastSymptoms(
  patterns:        LearnedPattern[],
  currentCycleDay: number,
  cycleLength:     number,
): ForecastEvent[] {
  if (patterns.length === 0 || currentCycleDay <= 0 || cycleLength <= 0) return [];

  const events: ForecastEvent[] = [];

  for (const pattern of patterns) {
    if (pattern.confidence === "low") continue;

    const centre   = Math.round(pattern.averageCycleDay);
    const startDay = Math.max(1, centre - WINDOW_RADIUS);
    const endDay   = Math.min(cycleLength, centre + WINDOW_RADIUS);

    // Skip if the window has already fully passed
    if (endDay <= currentCycleDay) continue;
    // Skip if window starts beyond the cycle
    if (startDay > cycleLength)   continue;

    // Clamp start to at least tomorrow so we never forecast "today"
    const effectiveStart = Math.max(startDay, currentCycleDay + 1);

    events.push({
      symptomId:         pattern.symptomId,
      predictedStartDay: effectiveStart,
      predictedEndDay:   endDay,
      daysUntilStart:    effectiveStart - currentCycleDay,
      confidence:        pattern.consistencyScore / 100,
      expectedSeverity:  pattern.averageSeverity,
    });
  }

  return events.sort((a, b) => a.predictedStartDay - b.predictedStartDay);
}
