import type { LearnedPattern } from "@/lib/cycleLearning/types";
import { forecastSymptoms } from "./forecastSymptoms";
import { forecastReadiness } from "./forecastReadiness";

export type { ForecastEvent } from "./forecastSymptoms";
export type { DayForecast, ReadinessForecast } from "./forecastReadiness";

export interface CycleForecast {
  symptomEvents: ReturnType<typeof forecastSymptoms>;
  readinessDays: ReturnType<typeof forecastReadiness>;
}

/**
 * Top-level entry point for Phase 14C forecasting.
 * Returns an empty forecast when there are no qualifying patterns.
 */
export function computeCycleForecast(
  patterns:        LearnedPattern[],
  currentCycleDay: number,
  cycleLength:     number,
  lookaheadDays:   number = 7,
): CycleForecast {
  const symptomEvents = forecastSymptoms(patterns, currentCycleDay, cycleLength);
  const readinessDays = forecastReadiness(
    symptomEvents, currentCycleDay, cycleLength, lookaheadDays
  );
  return { symptomEvents, readinessDays };
}
