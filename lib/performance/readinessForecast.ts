// ─── lib/performance/readinessForecast.ts ────────────────────────────────────
// Projects readiness scores 7 days ahead from the current trajectory.
// Outputs directional estimates rather than exact values — confidence increases
// with more historical data. Pure function — all inputs passed in.

import type { DayForecast }  from "@/lib/forecasting/forecastReadiness";
import type { DebtTrend }    from "@/lib/recovery/recoveryTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadinessDayEstimate {
  daysFromNow: number;
  estimated:   number;        // rounded to nearest 5 for honesty about imprecision
  direction:   "up" | "stable" | "down";
}

export interface ReadinessForecastResult {
  days:        ReadinessDayEstimate[];   // 1–7 days ahead
  recoveryday: number | null;           // days from now until estimated score ≥ 70
  trendLabel:  string;                  // "Improving", "Stable", "Declining"
  confidence:  "low" | "moderate" | "high";
}

// ─── Readiness modifier from symptom day-forecast ─────────────────────────────

const DAY_FORECAST_MODIFIER: Record<string, number> = {
  push:     +5,
  maintain:  0,
  watch:    -5,
  recover: -10,
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Projects readiness 1–7 days ahead.
 *
 * Model:
 *   1. Start from currentScore.
 *   2. Apply daily slope (damped — each day weighs 80% of the previous).
 *   3. Apply symptom forecast modifier per day.
 *   4. Apply debt trajectory headwind/tailwind.
 *   5. Clamp to [20, 100] and round to nearest 5.
 *
 * @param currentScore  Today's readiness (0–100)
 * @param slope7d       Average daily readiness change over last 7 days
 * @param dayForecasts  Cycle-based symptom/readiness category per day
 * @param debtTrend     Recovery debt direction
 * @param dataPoints    How many history entries exist — drives confidence
 */
export function computeReadinessForecast(
  currentScore: number,
  slope7d:      number,
  dayForecasts: DayForecast[],
  debtTrend:    DebtTrend,
  dataPoints:   number,
): ReadinessForecastResult {
  const days: ReadinessDayEstimate[] = [];
  let running = currentScore;
  let dampFactor = 1.0;

  // Debt modifier per day: accumulating = -2, reducing = +1.5, stable = 0
  const debtDelta =
    debtTrend === "accumulating" ? -2 :
    debtTrend === "reducing"     ? +1.5 :
    0;

  let recoveryDay: number | null = null;

  for (let d = 1; d <= 7; d++) {
    // Apply slope (damped each day)
    running += slope7d * dampFactor;
    dampFactor *= 0.80;

    // Apply debt modifier
    running += debtDelta;

    // Apply symptom forecast modifier for this day
    const dayForecast = dayForecasts.find(f => f.daysFromNow === d);
    const symptomMod  = dayForecast ? (DAY_FORECAST_MODIFIER[dayForecast.readinessForecast] ?? 0) : 0;
    running += symptomMod;

    const estimated = Math.min(100, Math.max(20, Math.round(running / 5) * 5));

    // Track first day score crosses the "ready" threshold
    if (recoveryDay === null && estimated >= 70 && currentScore < 70) {
      recoveryDay = d;
    }

    const direction: ReadinessDayEstimate["direction"] =
      estimated > (days.at(-1)?.estimated ?? currentScore) + 2 ? "up" :
      estimated < (days.at(-1)?.estimated ?? currentScore) - 2 ? "down" :
      "stable";

    days.push({ daysFromNow: d, estimated, direction });
  }

  // Trend label from overall slope
  const trendLabel =
    slope7d > 1.5 ? "Improving" :
    slope7d < -1.5 ? "Declining" :
    "Stable";

  const confidence: ReadinessForecastResult["confidence"] =
    dataPoints >= 21 ? "high" :
    dataPoints >= 10 ? "moderate" :
    "low";

  return { days, recoveryday: recoveryDay, trendLabel, confidence };
}
