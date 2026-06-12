import type { ForecastEvent } from "./forecastSymptoms";

export type ReadinessForecast = "push" | "maintain" | "watch" | "recover";

export interface DayForecast {
  cycleDay:          number;
  daysFromNow:       number;
  readinessForecast: ReadinessForecast;
  drivingSymptoms:   string[];
}

// Score = Σ(severity × confidence) for all events overlapping a given day.
// Thresholds map that score to a readiness category.
function mapScoreToForecast(score: number): ReadinessForecast {
  if (score >= 5) return "recover";
  if (score >= 3) return "watch";
  if (score >= 1) return "maintain";
  return "push";
}

/**
 * Produces a per-day readiness outlook for the next `lookaheadDays` within
 * the current cycle. Days beyond cycleLength are excluded.
 */
export function forecastReadiness(
  events:          ForecastEvent[],
  currentCycleDay: number,
  cycleLength:     number,
  lookaheadDays:   number = 7,
): DayForecast[] {
  const result: DayForecast[] = [];

  for (let i = 1; i <= lookaheadDays; i++) {
    const cycleDay = currentCycleDay + i;
    if (cycleDay > cycleLength) break; // don't forecast beyond current cycle

    const overlapping = events.filter(
      e => e.predictedStartDay <= cycleDay && e.predictedEndDay >= cycleDay
    );

    const score = overlapping.reduce(
      (sum, e) => sum + e.expectedSeverity * e.confidence,
      0
    );

    result.push({
      cycleDay,
      daysFromNow:       i,
      readinessForecast: mapScoreToForecast(score),
      drivingSymptoms:   overlapping.map(e => e.symptomId),
    });
  }

  return result;
}
