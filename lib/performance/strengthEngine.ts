// ─── lib/performance/strengthEngine.ts ───────────────────────────────────────
// Phase 36C — Estimated 1RM tracking using the Epley formula.
// weight × (1 + reps / 30)

import { getPerformanceDatabase, getPerformanceDatabaseForExercise } from "./performanceDatabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StrengthDataPoint {
  date:         string;
  weight:       number;
  reps:         number;
  estimated1RM: number;
}

export interface StrengthProfile {
  exerciseName: string;
  current1RM:   number;   // most recent estimated 1RM
  peak1RM:      number;   // all-time best
  trend30d:     number;   // % change over last 30 days; 0 = no data
  trend90d:     number;   // % change over last 90 days; 0 = no data
  sessionCount: number;
  history:      StrengthDataPoint[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function epley1RM(weight: number, reps: number): number {
  if (weight === 0 || reps === 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function trendPercent(recent: number, baseline: number): number {
  if (baseline === 0) return 0;
  return Math.round(((recent - baseline) / baseline) * 1000) / 10;
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function getStrengthProfile(exerciseName: string): StrengthProfile | null {
  const records = getPerformanceDatabaseForExercise(exerciseName)
    .filter(r => r.weight > 0 && r.actualReps > 0);

  if (records.length === 0) return null;

  const history: StrengthDataPoint[] = records.map(r => ({
    date:         r.date,
    weight:       r.weight,
    reps:         r.actualReps,
    estimated1RM: r.estimated1RM > 0 ? r.estimated1RM : epley1RM(r.weight, r.actualReps),
  }));

  const current1RM = history[0].estimated1RM;
  const peak1RM    = Math.max(...history.map(h => h.estimated1RM));

  const today  = new Date();
  const d30    = new Date(today); d30.setDate(today.getDate() - 30);
  const d90    = new Date(today); d90.setDate(today.getDate() - 90);
  const d30str = d30.toISOString().slice(0, 10);
  const d90str = d90.toISOString().slice(0, 10);

  const base30 = history.find(h => h.date <= d30str);
  const base90 = history.find(h => h.date <= d90str);

  return {
    exerciseName,
    current1RM,
    peak1RM,
    trend30d:     base30 ? trendPercent(current1RM, base30.estimated1RM) : 0,
    trend90d:     base90 ? trendPercent(current1RM, base90.estimated1RM) : 0,
    sessionCount: history.length,
    history:      history.slice(0, 30),
  };
}

export function getAllStrengthProfiles(): StrengthProfile[] {
  const all   = getPerformanceDatabase();
  const names = [...new Set(all.filter(r => r.weight > 0).map(r => r.exerciseName))];
  return names
    .map(n => getStrengthProfile(n))
    .filter((p): p is StrengthProfile => p !== null);
}
