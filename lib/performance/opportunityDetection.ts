// ─── lib/performance/opportunityDetection.ts ─────────────────────────────────
// Identifies high-confidence performance opportunity windows: upcoming days
// where readiness is predicted high, symptoms low, and phase is favourable.
// Pure function — all inputs passed in.

import type { ReadinessForecastResult } from "./readinessForecast";
import type { DayForecast }             from "@/lib/forecasting/forecastReadiness";
import type { TrainingWindow }          from "@/lib/cycle/trainingWindows";
import type { DebtCategory }            from "@/lib/recovery/recoveryTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerformanceOpportunity {
  detected:         boolean;
  daysUntil:        number | null;  // null = active now; undefined when not detected
  windowLengthDays: number;
  confidence:       number;         // 0–100
  signals:          string[];
  recommendation:   string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectOpportunity(
  readinessForecast: ReadinessForecastResult,
  dayForecasts:      DayForecast[],
  phaseName:         string,
  debtCategory:      DebtCategory,
  primeWindow:       TrainingWindow | null,
  currentCycleDay:   number,
): PerformanceOpportunity {
  const signals: string[] = [];

  // No opportunity if debt is critical or recovery compromised
  if (debtCategory === "critical" || debtCategory === "high") {
    return {
      detected:         false,
      daysUntil:        null,
      windowLengthDays: 0,
      confidence:       0,
      signals:          [],
      recommendation:   "Focus on recovery before targeting high-output sessions.",
    };
  }

  // Find consecutive days with favourable forecasts
  const goodDays = readinessForecast.days.filter(d => {
    const dayForecast = dayForecasts.find(f => f.daysFromNow === d.daysFromNow);
    return d.estimated >= 70 && (!dayForecast || dayForecast.readinessForecast !== "recover");
  });

  if (goodDays.length === 0 && readinessForecast.trendLabel !== "Improving") {
    return {
      detected:         false,
      daysUntil:        null,
      windowLengthDays: 0,
      confidence:       0,
      signals:          [],
      recommendation:   "No clear performance window in the next 7 days — prioritise consistency.",
    };
  }

  // Phase factor: follicular/ovulatory = strong signal
  const highPhase = phaseName === "Follicular" || phaseName === "Ovulatory";
  if (highPhase) signals.push(`${phaseName} phase — hormonal support is high`);

  // Upward readiness trajectory
  if (readinessForecast.trendLabel === "Improving") signals.push("Readiness trending upward");

  // Prime window alignment
  let primeDaysUntil: number | null = null;
  if (primeWindow) {
    if (currentCycleDay >= primeWindow.startDay && currentCycleDay <= primeWindow.endDay) {
      signals.push("Currently in your prime training window");
      primeDaysUntil = 0;
    } else if (currentCycleDay < primeWindow.startDay) {
      primeDaysUntil = primeWindow.startDay - currentCycleDay;
      if (primeDaysUntil <= 5) signals.push(`Prime training window starts in ${primeDaysUntil} day${primeDaysUntil === 1 ? "" : "s"}`);
    }
  }

  // Symptom load: no major forecasted symptoms
  const noMajorSymptoms = !dayForecasts.some(f => f.daysFromNow <= 3 && f.readinessForecast === "recover");
  if (noMajorSymptoms) signals.push("Low symptom forecast over next 3 days");

  // Require at least 2 signals for a genuine opportunity
  if (signals.length < 2 && goodDays.length < 2) {
    return {
      detected:         false,
      daysUntil:        null,
      windowLengthDays: 0,
      confidence:       0,
      signals:          [],
      recommendation:   "Conditions are reasonable but not optimal for a peak effort window.",
    };
  }

  // Determine window start
  const firstGoodDay = goodDays[0];
  const daysUntil    = firstGoodDay ? (firstGoodDay.daysFromNow === 1 ? 0 : firstGoodDay.daysFromNow) : 0;
  const windowLength = goodDays.length;

  // Confidence: signals count + window length + phase + forecast confidence
  let confidence = 30
    + signals.length * 15
    + Math.min(windowLength * 8, 24)
    + (highPhase ? 10 : 0)
    + (readinessForecast.confidence === "high" ? 10 : readinessForecast.confidence === "moderate" ? 5 : 0);
  confidence = Math.min(95, Math.max(20, Math.round(confidence)));

  const recommendation =
    daysUntil === 0
      ? "Today looks like a strong performance day — schedule your hardest session."
      : `Schedule your hardest sessions starting in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`;

  return {
    detected:         true,
    daysUntil:        daysUntil === 0 ? null : daysUntil,
    windowLengthDays: windowLength,
    confidence,
    signals,
    recommendation,
  };
}
