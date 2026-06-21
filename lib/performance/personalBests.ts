// ─── lib/performance/personalBests.ts ────────────────────────────────────────
// Phase 36E — Personal record (PR) tracking by timeframe.
// Tracks lifetime / year / 90-day / current-month PRs per exercise.

import { getPerformanceDatabase } from "./performanceDatabase";
import { epley1RM } from "./strengthEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PRTimeframe = "lifetime" | "year" | "90d" | "30d";

export interface PersonalBest {
  exerciseName:  string;
  weight:        number;
  reps:          number;
  estimated1RM:  number;
  date:          string;
  timeframe:     PRTimeframe;
}

export interface PersonalBestSet {
  exerciseName:  string;
  lifetime:      PersonalBest | null;
  year:          PersonalBest | null;
  ninetyDay:     PersonalBest | null;
  thirtyDay:     PersonalBest | null;
  newPRToday?:   PRTimeframe[];
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_personal_bests";
const RETENTION_DAYS = 3650; // keep PRs for 10 years

function isClient(): boolean {
  return typeof window !== "undefined";
}

interface StoredPR {
  exerciseName: string;
  timeframe:    PRTimeframe;
  weight:       number;
  reps:         number;
  estimated1RM: number;
  date:         string;
}

function loadPRs(): StoredPR[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPR[]) : [];
  } catch {
    return [];
  }
}

function persistPRs(prs: StoredPR[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  // Only prune non-lifetime PRs — lifetime PRs are kept forever
  const pruned = prs.filter(p => p.timeframe === "lifetime" || p.date >= cutoff.toISOString().slice(0, 10));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cutoffFor(timeframe: PRTimeframe, today: string): string {
  const d = new Date(today);
  switch (timeframe) {
    case "lifetime": return "2000-01-01";
    case "year":     d.setFullYear(d.getFullYear() - 1); break;
    case "90d":      d.setDate(d.getDate() - 90);        break;
    case "30d":      d.setDate(d.getDate() - 30);        break;
  }
  return d.toISOString().slice(0, 10);
}

function bestIn(
  exerciseName: string,
  records: ReturnType<typeof getPerformanceDatabase>,
  since: string,
): { weight: number; reps: number; estimated1RM: number; date: string } | null {
  const filtered = records.filter(r => r.exerciseName === exerciseName && r.date >= since && r.weight > 0);
  if (filtered.length === 0) return null;
  return filtered.reduce((best, r) => {
    const e = epley1RM(r.weight, r.actualReps);
    const bE = epley1RM(best.weight, best.reps);
    return e > bE ? { weight: r.weight, reps: r.actualReps, estimated1RM: e, date: r.date } : best;
  }, { weight: filtered[0].weight, reps: filtered[0].actualReps, estimated1RM: epley1RM(filtered[0].weight, filtered[0].actualReps), date: filtered[0].date });
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function getPersonalBests(exerciseName: string, today: string): PersonalBestSet {
  const db = getPerformanceDatabase();

  const timeframes: PRTimeframe[] = ["lifetime", "year", "90d", "30d"];
  const results: Record<PRTimeframe, PersonalBest | null> = {
    lifetime: null, year: null, "90d": null, "30d": null,
  };

  for (const tf of timeframes) {
    const since = cutoffFor(tf, today);
    const best  = bestIn(exerciseName, db, since);
    if (best) {
      results[tf] = { exerciseName, timeframe: tf, ...best };
    }
  }

  return {
    exerciseName,
    lifetime:  results["lifetime"],
    year:      results["year"],
    ninetyDay: results["90d"],
    thirtyDay: results["30d"],
  };
}

/**
 * Call after a workout session to detect and persist new PRs.
 * Returns which timeframes were beaten (for celebratory UI).
 */
export function recordAndDetectPRs(
  exerciseName: string,
  weight: number,
  reps:   number,
  date:   string,
): PRTimeframe[] {
  if (weight === 0) return []; // bodyweight exercises skip PR tracking

  const current1RM = epley1RM(weight, reps);
  const stored     = loadPRs();
  const beaten:    PRTimeframe[] = [];

  const timeframes: PRTimeframe[] = ["lifetime", "year", "90d", "30d"];

  for (const tf of timeframes) {
    const existing = stored.find(p => p.exerciseName === exerciseName && p.timeframe === tf);

    if (!existing || current1RM > existing.estimated1RM) {
      beaten.push(tf);

      // Upsert this timeframe PR
      const idx = stored.findIndex(p => p.exerciseName === exerciseName && p.timeframe === tf);
      const newPR: StoredPR = { exerciseName, timeframe: tf, weight, reps, estimated1RM: current1RM, date };
      if (idx >= 0) stored[idx] = newPR;
      else          stored.push(newPR);
    }
  }

  if (beaten.length > 0) persistPRs(stored);
  return beaten;
}

export function getAllPersonalBests(today: string): PersonalBestSet[] {
  const db    = getPerformanceDatabase();
  const names = [...new Set(db.filter(r => r.weight > 0).map(r => r.exerciseName))];
  return names.map(n => getPersonalBests(n, today));
}
