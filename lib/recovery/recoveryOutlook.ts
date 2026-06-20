// ─── lib/recovery/recoveryOutlook.ts ─────────────────────────────────────────
// Phase 33H — 7-day recovery outlook.
// Projects likely recovery quality for the next 7 calendar days using:
//   - current recovery debt and trajectory
//   - burnout risk level
//   - recovery trend slope
//   - cycle phase forecast (days in follicular/luteal ahead)
// Pure function — all inputs passed in; no localStorage reads.

import type { RecoveryDebt }  from "./recoveryDebt";
import type { BurnoutRisk }   from "./burnoutRisk";
import type { RecoveryTrend } from "./recoveryTrend";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayForecast = "high" | "moderate" | "low";

export interface RecoveryOutlookDay {
  date:      string;        // YYYY-MM-DD
  label:     string;        // "Mon", "Tue", …
  forecast:  DayForecast;
  score:     number;        // estimated 0–100
  reasoning: string;
}

export interface RecoveryOutlook {
  days:         RecoveryOutlookDay[];
  overallTrend: "improving" | "stable" | "declining";
  peakDay:      string;     // date of highest forecast score
  cautionDays:  string[];   // dates where forecast === "low"
  summaryNote:  string;
}

// ─── Cycle phase impact ───────────────────────────────────────────────────────

// Maps day-of-cycle → delta applied to recovery forecast
// Follicular/Ovulatory: positive; Luteal/Menstrual: negative
function cycleRecoveryDelta(cycleDay: number, cycleLength: number): number {
  if (cycleLength <= 0) return 0;
  const pct = cycleDay / cycleLength;
  if (pct <= 0.07)  return -4;  // menstrual
  if (pct <= 0.45)  return +5;  // follicular
  if (pct <= 0.55)  return +4;  // ovulatory
  if (pct <= 0.80)  return 0;   // early luteal
  return -5;                     // late luteal
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates a 7-day recovery outlook.
 *
 * Day 0 = today. Score is projected by modelling debt drift (accumulates if
 * trend is "accumulating", decays if "reducing"), burnout level, and cycle
 * phase on each projected day.
 */
export function computeRecoveryOutlook(
  debt:        RecoveryDebt,
  burnout:     BurnoutRisk,
  trend:       RecoveryTrend,
  cycleDay:    number,
  cycleLength: number,
  today:       string,
): RecoveryOutlook {
  const days: RecoveryOutlookDay[] = [];

  // Burnout level → base hit
  const burnoutDelta =
    burnout.level === "severe"   ? -20 :
    burnout.level === "high"     ? -12 :
    burnout.level === "moderate" ? -5  :
    burnout.level === "low"      ? +3  : 0;

  // Debt trajectory drift per day
  const debtDrift =
    debt.trend === "accumulating" ? -4  :
    debt.trend === "reducing"     ? +3  :
    -1;  // stable — slight natural fatigue accumulation

  // Seed score from current recovery position
  let runningScore =
    debt.category === "critical" ? 30 :
    debt.category === "high"     ? 40 :
    debt.category === "elevated" ? 50 :
    debt.category === "moderate" ? 60 :
    75;  // low debt

  // Apply 7-day readiness trend as a slope signal
  const slopeMod = Math.max(-3, Math.min(3, trend.slope7d));

  const todayDate = new Date(today);

  for (let i = 0; i < 7; i++) {
    const projDate = new Date(todayDate);
    projDate.setDate(todayDate.getDate() + i);
    const dateStr = projDate.toISOString().slice(0, 10);

    const projCycleDay = cycleLength > 0
      ? ((cycleDay + i - 1) % cycleLength) + 1
      : cycleDay;

    const cycleDelta = cycleRecoveryDelta(projCycleDay, cycleLength);
    runningScore = Math.min(100, Math.max(0, runningScore + debtDrift + burnoutDelta * 0.15 + slopeMod * 0.3 + cycleDelta * 0.5));

    const score    = Math.round(runningScore);
    const forecast: DayForecast =
      score >= 65 ? "high" :
      score >= 45 ? "moderate" :
      "low";

    const reasoning =
      forecast === "high"     ? "Recovery conditions look favourable." :
      forecast === "moderate" ? "Mixed signals — manageable with consistent habits." :
      "Recovery may be challenged. Protect sleep and reduce load.";

    days.push({
      date:  dateStr,
      label: dayLabel(projDate),
      forecast,
      score,
      reasoning,
    });
  }

  const peakDay = days.reduce((best, d) => d.score > best.score ? d : best, days[0]);
  const cautionDays = days.filter(d => d.forecast === "low").map(d => d.date);

  const avgScore = days.reduce((s, d) => s + d.score, 0) / days.length;
  const firstScore = days[0].score;
  const lastScore  = days[days.length - 1].score;

  const overallTrend: RecoveryOutlook["overallTrend"] =
    lastScore > firstScore + 5 ? "improving"  :
    lastScore < firstScore - 5 ? "declining"  :
    "stable";

  const summaryNote =
    avgScore >= 65 ? "Recovery outlook is positive across the next 7 days." :
    avgScore >= 45 ? "Mixed recovery conditions ahead — consistency with sleep and nutrition will protect your capacity." :
    "Recovery looks challenging over the next week. Prioritise rest and monitor symptoms closely.";

  return { days, overallTrend, peakDay: peakDay.date, cautionDays, summaryNote };
}
