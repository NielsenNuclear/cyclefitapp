// ─── lib/cycle/ovulationEstimator.ts ─────────────────────────────────────────
// Estimates ovulation from behavioral signals (readiness, performance).
// Not a medical tool. Probability only — never diagnostic.

import type { PeriodEntry } from "./cycleAccuracy";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OvulationEstimate {
  estimatedDay: number;               // cycle day of estimated ovulation
  window:       [number, number, number]; // [day-1, day, day+1]
  confidence:   "low" | "medium" | "high";
  basis:        "physiological" | "behavioral" | "combined";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / msPerDay,
  );
}

// Maps a calendar date to a cycle day (1-indexed) using the nearest preceding
// period start. Returns null when no prior period is found.
function toCycleDay(
  date:          string,
  sortedPeriods: PeriodEntry[],
  cycleLength:   number,
): number | null {
  const periodStart = [...sortedPeriods].filter(p => p.startDate <= date).pop();
  if (!periodStart) return null;
  const days       = daysBetween(periodStart.startDate, date);
  const dayInCycle = (days % cycleLength) + 1;
  return dayInCycle;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Estimates the most likely ovulation day for this user.
 *
 * Algorithm:
 *   1. Physiological prior — ovulation ≈ cycleLength − 14 (LH surge approximation),
 *      clamped to [cycleLength/2, cycleLength − 10].
 *   2. Behavioral refinement — within prior ± 4 days, finds the cycle day with the
 *      highest mean readiness score across all observed cycles.
 *      Requires ≥ 3 cycle days with data AND ≥ 2 cycles contributing data.
 *   3. Confidence — reflects number of cycles that contributed behavioral data.
 *
 * "Libido" is not in the symptom catalog; readiness score is the primary proxy
 * signal (both are driven by the estrogen/testosterone peak around ovulation).
 */
export function estimateOvulation(
  periodHistory:    PeriodEntry[],
  readinessHistory: ReadinessHistoryEntry[],
  cycleLength:      number,
): OvulationEstimate {
  // ── Physiological prior ──────────────────────────────────────────────────────
  const priorDay = Math.max(
    Math.round(cycleLength / 2),
    Math.min(Math.round(cycleLength - 14), cycleLength - 10),
  );

  if (periodHistory.length === 0) {
    return {
      estimatedDay: priorDay,
      window:       [Math.max(1, priorDay - 1), priorDay, Math.min(cycleLength, priorDay + 1)],
      confidence:   "low",
      basis:        "physiological",
    };
  }

  const sortedPeriods = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const windowMin     = priorDay - 4;
  const windowMax     = priorDay + 4;

  // ── Map readiness to cycle days within window ────────────────────────────────
  const dayScores = new Map<number, number[]>();
  for (const entry of readinessHistory) {
    const cd = toCycleDay(entry.date, sortedPeriods, cycleLength);
    if (cd === null || cd < windowMin || cd > windowMax) continue;
    const bucket = dayScores.get(cd) ?? [];
    bucket.push(entry.score);
    dayScores.set(cd, bucket);
  }

  // Count distinct cycles that contributed readiness data in the window
  const cyclesWithData = new Set<string>();
  for (const entry of readinessHistory) {
    const periodStart = [...sortedPeriods].filter(p => p.startDate <= entry.date).pop();
    if (!periodStart) continue;
    const cd = toCycleDay(entry.date, sortedPeriods, cycleLength);
    if (cd !== null && cd >= windowMin && cd <= windowMax) {
      cyclesWithData.add(periodStart.startDate);
    }
  }
  const cycleCount = cyclesWithData.size;

  // ── Behavioral peak detection ─────────────────────────────────────────────────
  const hasBehavioralSignal = dayScores.size >= 3 && cycleCount >= 2;

  let behavioralPeak = priorDay;
  if (hasBehavioralSignal) {
    let peakMean = -Infinity;
    for (const [day, scores] of dayScores) {
      const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
      if (mean > peakMean) {
        peakMean     = mean;
        behavioralPeak = day;
      }
    }
  }

  const estimatedDay = hasBehavioralSignal ? behavioralPeak : priorDay;
  const basis: OvulationEstimate["basis"]  = !hasBehavioralSignal
    ? "physiological"
    : estimatedDay === priorDay
      ? "combined"
      : "behavioral";

  const confidence: OvulationEstimate["confidence"] =
    cycleCount >= 5 ? "high" :
    cycleCount >= 2 ? "medium" :
    "low";

  const clamped = Math.max(1, Math.min(estimatedDay, cycleLength - 1));

  return {
    estimatedDay: clamped,
    window:       [Math.max(1, clamped - 1), clamped, Math.min(cycleLength, clamped + 1)],
    confidence,
    basis,
  };
}
