// ─── lib/performance/performanceDatabase.ts ──────────────────────────────────
// Phase 36A — Enriched per-session performance storage.
// Augments raw exercise log entries with training context so all downstream
// Phase 36 engines can correlate performance with readiness, cycle phase, etc.

import { getExercisePerformanceHistory, type ExercisePerformanceEntry } from "@/lib/progression/exercisePerformanceLog";

const STORAGE_KEY    = "axis_performance_history";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerformanceRecord extends ExercisePerformanceEntry {
  cyclePhase:     string;    // e.g. "Follicular", "Luteal", ""
  readinessScore: number;    // 0–100; 0 = unknown
  mesocyclePhase: string;    // "build" | "peak" | "deload" | ""
  estimated1RM:   number;    // Epley: weight × (1 + reps/30); 0 = bodyweight
}

export interface PerformanceDatabaseEntry {
  date:       string;
  exerciseName: string;
  record:     PerformanceRecord;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function epley1RM(weight: number, reps: number): number {
  if (weight === 0 || reps === 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function loadDatabase(): PerformanceDatabaseEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PerformanceDatabaseEntry[]) : [];
  } catch {
    return [];
  }
}

function persistDatabase(entries: PerformanceDatabaseEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const pruned = entries.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export interface PerformanceContext {
  cyclePhase?:     string;
  readinessScore?: number;
  mesocyclePhase?: string;
}

/**
 * Saves / upserts today's performance records with enriched context.
 * Call after workout completion when the context values are known.
 */
export function savePerformanceRecords(
  entries:  ExercisePerformanceEntry[],
  context:  PerformanceContext,
  date:     string,
): void {
  const db = loadDatabase().filter(
    e => !(e.date === date && entries.some(n => n.exerciseName === e.exerciseName)),
  );

  for (const entry of entries) {
    const record: PerformanceRecord = {
      ...entry,
      cyclePhase:     context.cyclePhase     ?? "",
      readinessScore: context.readinessScore ?? 0,
      mesocyclePhase: context.mesocyclePhase ?? "",
      estimated1RM:   epley1RM(entry.weight, entry.actualReps),
    };
    db.push({ date, exerciseName: entry.exerciseName, record });
  }

  persistDatabase(db);
}

/**
 * Returns all enriched performance records, newest first.
 * Falls back to deriving records from the raw workout log when the enriched
 * database is sparse (e.g. first run after Phase 36 is deployed).
 */
export function getPerformanceDatabase(): PerformanceRecord[] {
  const db = loadDatabase();

  if (db.length > 0) {
    return db
      .map(e => e.record)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // Cold-start: derive from raw workout log without enrichment
  return getExercisePerformanceHistory().map(entry => ({
    ...entry,
    cyclePhase:     "",
    readinessScore: 0,
    mesocyclePhase: "",
    estimated1RM:   epley1RM(entry.weight, entry.actualReps),
  }));
}

export function getPerformanceDatabaseForExercise(exerciseName: string): PerformanceRecord[] {
  return getPerformanceDatabase().filter(r => r.exerciseName === exerciseName);
}
