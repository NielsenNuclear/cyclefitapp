// ─── lib/adherence/missedWorkoutAnalysis.ts ──────────────────────────────────
// 46B — Missed Workout Analysis
// Profiles the ENVIRONMENTAL CONDITIONS present when workouts are skipped vs
// completed. Separates actual environmental causes from random noise.
// Reuses AdherenceEntry (has readiness + energy + phase + skip reason).

import type { AdherenceEntry } from "./adherenceTracker";

const MIN_MISSES = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MissConditions {
  avgReadiness:          number;
  avgEnergyLevel:        number;
  mostCommonCyclePhase:  string | null;
  mostCommonSkipReason:  string | null;
  mostCommonWeekday:     string | null;
  sampleSize:            number;
}

export interface CompareConditions {
  avgReadiness:    number;
  avgEnergyLevel:  number;
  sampleSize:      number;
}

export interface MissedWorkoutAnalysis {
  missConditions:      MissConditions | null;
  hitConditions:       CompareConditions | null;
  readinessDiff:       number;    // miss avg − hit avg (negative = miss readiness is lower)
  energyDiff:          number;
  topRiskConditions:   string[];  // human-readable conditions that predict misses
  topProtective:       string[];  // conditions that predict completion
  dataReady:           boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mostFrequent<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Main export ──────────────────────────────────────────────────────────────

export function analyzeMissedWorkouts(
  adherenceHistory: AdherenceEntry[],
): MissedWorkoutAnalysis {
  const EMPTY: MissedWorkoutAnalysis = {
    missConditions: null, hitConditions: null,
    readinessDiff: 0, energyDiff: 0,
    topRiskConditions: [], topProtective: [], dataReady: false,
  };

  const misses = adherenceHistory.filter(e => e.status === "skipped");
  const hits   = adherenceHistory.filter(
    e => e.status === "completed" || e.status === "partially_completed",
  );

  if (misses.length < MIN_MISSES) return EMPTY;

  const avg = (arr: number[]): number =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const missReadiness = avg(misses.map(e => e.readinessScore));
  const hitReadiness  = avg(hits.map(e => e.readinessScore));
  const missEnergy    = avg(misses.map(e => e.energyLevel));
  const hitEnergy     = avg(hits.map(e => e.energyLevel));

  const missConditions: MissConditions = {
    avgReadiness:         missReadiness,
    avgEnergyLevel:       missEnergy,
    mostCommonCyclePhase: mostFrequent(misses.map(e => e.cyclePhase).filter(Boolean)),
    mostCommonSkipReason: mostFrequent(misses.map(e => e.skipReason).filter((r): r is string => Boolean(r))),
    mostCommonWeekday:    (() => {
      const wd = mostFrequent(misses.map(e => e.weekday));
      return wd !== null ? WEEKDAY_LABELS[wd] : null;
    })(),
    sampleSize: misses.length,
  };

  const hitConditions: CompareConditions = {
    avgReadiness:   hitReadiness,
    avgEnergyLevel: hitEnergy,
    sampleSize:     hits.length,
  };

  const readinessDiff = missReadiness - hitReadiness;
  const energyDiff    = missEnergy - hitEnergy;

  // Build human-readable risk conditions
  const topRiskConditions: string[] = [];
  if (readinessDiff < -10) {
    topRiskConditions.push(`Readiness below ${Math.round(hitReadiness * 0.75)} (avg miss: ${missReadiness})`);
  }
  if (energyDiff < -0.8) {
    topRiskConditions.push(`Energy at or below ${Math.round(missEnergy)}/4`);
  }
  if (missConditions.mostCommonCyclePhase) {
    topRiskConditions.push(`${missConditions.mostCommonCyclePhase} phase`);
  }
  if (missConditions.mostCommonSkipReason) {
    topRiskConditions.push(`"${missConditions.mostCommonSkipReason}" reported`);
  }
  if (missConditions.mostCommonWeekday) {
    topRiskConditions.push(`${missConditions.mostCommonWeekday}s (highest skip day)`);
  }

  const topProtective: string[] = [];
  if (hitReadiness >= 70) topProtective.push(`Readiness ≥ ${hitReadiness} avg on completed days`);
  if (hitEnergy >= 2)     topProtective.push(`Energy ≥ ${hitEnergy}/4 on completed days`);

  return {
    missConditions, hitConditions,
    readinessDiff, energyDiff,
    topRiskConditions, topProtective, dataReady: true,
  };
}
