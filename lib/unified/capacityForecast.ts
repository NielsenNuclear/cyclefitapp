// ─── lib/unified/capacityForecast.ts ─────────────────────────────────────────
// 44F — Performance Capacity Forecast
// Projects capacity for the next 3 and 7 days using trend + cycle phase signals.

import type { CapacityScore }    from "./capacityScore";
import { getCapacityHistory }    from "./capacityScore";
import type { MomentumScore }    from "./momentumScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecastDay {
  daysAhead: number;
  date:      string;
  projected: number;    // 0–100 projected capacity
  note:      string;
}

export interface CapacityForecast {
  day3:      ForecastDay;
  day7:      ForecastDay;
  direction: "improving" | "stable" | "declining";
  dataReady: boolean;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeCapacityForecast(
  current:  CapacityScore,
  momentum: MomentumScore,
): CapacityForecast {
  const EMPTY: CapacityForecast = {
    day3: { daysAhead: 3, date: "", projected: 0, note: "" },
    day7: { daysAhead: 7, date: "", projected: 0, note: "" },
    direction: "stable",
    dataReady: false,
  };

  if (!momentum.dataReady) return EMPTY;

  const dailyDrift   = momentum.delta / 7;
  const base         = current.score;

  const proj3 = Math.round(Math.min(95, Math.max(20, base + dailyDrift * 3)));
  const proj7 = Math.round(Math.min(95, Math.max(20, base + dailyDrift * 7)));

  function futureDate(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  const note3 = proj3 > base + 5  ? "Capacity trending upward." : proj3 < base - 5 ? "Recovery recommended." : "Stable capacity expected.";
  const note7 = proj7 > base + 8  ? "Good week ahead." : proj7 < base - 8 ? "Prioritise recovery this week." : "Consistent performance expected.";

  const direction: CapacityForecast["direction"] =
    momentum.delta > 4 ? "improving" : momentum.delta < -4 ? "declining" : "stable";

  return {
    day3:      { daysAhead: 3, date: futureDate(3), projected: proj3, note: note3 },
    day7:      { daysAhead: 7, date: futureDate(7), projected: proj7, note: note7 },
    direction,
    dataReady: true,
  };
}
