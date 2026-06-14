// ─── lib/adaptive/physiologyMemory.ts ────────────────────────────────────────
// Persistent daily record of the user's physiological state.
// Pure functions — no React. Reads/writes axis_physiology_memory in localStorage.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhysiologyEntry {
  date:             string;                                         // YYYY-MM-DD
  cycleDay:         number | null;                                  // null when no period history
  phase:            string | null;                                  // e.g. "Follicular Phase"
  readiness:        number;                                         // 0–100
  energy:           number | null;                                  // 0–100 from contributors
  symptoms:         string[];                                       // symptomIds logged today
  workoutCompleted: boolean;
  workoutQuality:   number | null;                                  // sessionRPE 1–10 from feedback
  recoveryState:    "optimal" | "adequate" | "compromised" | null;
}

export interface CycleDayStat {
  cycleDay:       number;
  entryCount:     number;          // how many observations at this day
  meanReadiness:  number;
  meanEnergy:     number | null;
  completionRate: number;          // 0–1
}

export interface PhysiologyFingerprint {
  bestStrengthDays:  number[];                                   // cycle days, ≤3
  bestEnergyDays:    number[];                                   // cycle days, ≤3
  worstRecoveryDays: number[];                                   // cycle days, ≤3
  highestAdherenceDays: number[];                               // cycle days, ≤3
  mostCommonSymptoms: { symptomId: string; frequency: number }[]; // top 5, frequency = 0–1
  cycleDayStats:     CycleDayStat[];                            // full per-day breakdown
  entryCount:        number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_physiology_memory";
const MIN_ENTRIES    = 14;
const MIN_DAY_OBS   = 2;
const TOP_DAYS_COUNT = 3;
const RETENTION_DAYS = 365;

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadEntries(): PhysiologyEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PhysiologyEntry[];
  } catch {
    return [];
  }
}

function persistEntries(entries: PhysiologyEntry[]): void {
  if (!isClient()) return;
  const pruned = entries.filter(e => e.date >= cutoffDate(RETENTION_DAYS));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

// ─── Public API — storage ────────────────────────────────────────────────────

/**
 * Upserts today's physiological record.
 * Replaces any existing entry for the same date.
 */
export function recordPhysiologyEntry(entry: PhysiologyEntry): void {
  const existing = loadEntries().filter(e => e.date !== entry.date);
  persistEntries([entry, ...existing]);
}

/**
 * Returns all entries, newest-first.
 */
export function getPhysiologyHistory(): PhysiologyEntry[] {
  return loadEntries().sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Fingerprint helpers ──────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function topN<T>(
  items: T[],
  score: (item: T) => number,
  n: number,
): T[] {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, n);
}

function bottomN<T>(
  items: T[],
  score: (item: T) => number,
  n: number,
): T[] {
  return [...items].sort((a, b) => score(a) - score(b)).slice(0, n);
}

// ─── Public API — fingerprinting ──────────────────────────────────────────────

/**
 * Derives a personal physiology fingerprint from stored history.
 * Returns null when fewer than MIN_ENTRIES (14) observations exist —
 * avoids overstating patterns from sparse data.
 */
export function buildPhysiologyFingerprint(
  entries: PhysiologyEntry[],
): PhysiologyFingerprint | null {
  if (entries.length < MIN_ENTRIES) return null;

  // ── Per cycle-day grouping ──────────────────────────────────────────────────
  const dayGroups = new Map<number, PhysiologyEntry[]>();
  for (const e of entries) {
    if (e.cycleDay === null) continue;
    const group = dayGroups.get(e.cycleDay) ?? [];
    group.push(e);
    dayGroups.set(e.cycleDay, group);
  }

  const cycleDayStats: CycleDayStat[] = [];
  for (const [cycleDay, group] of dayGroups) {
    const readinessValues = group.map(e => e.readiness);
    const energyValues    = group.map(e => e.energy).filter((v): v is number => v !== null);
    const completed       = group.filter(e => e.workoutCompleted).length;

    cycleDayStats.push({
      cycleDay,
      entryCount:     group.length,
      meanReadiness:  mean(readinessValues),
      meanEnergy:     energyValues.length > 0 ? mean(energyValues) : null,
      completionRate: completed / group.length,
    });
  }

  const qualifiedDays = cycleDayStats.filter(d => d.entryCount >= MIN_DAY_OBS);

  // ── Best strength days: highest readiness × completion rate ────────────────
  const bestStrengthDays = topN(
    qualifiedDays,
    d => d.meanReadiness * d.completionRate,
    TOP_DAYS_COUNT,
  ).map(d => d.cycleDay);

  // ── Best energy days: highest mean energy (fall back to readiness) ─────────
  const daysWithEnergy = qualifiedDays.filter(d => d.meanEnergy !== null);
  const bestEnergyDays = topN(
    daysWithEnergy.length >= MIN_DAY_OBS ? daysWithEnergy : qualifiedDays,
    d => d.meanEnergy ?? d.meanReadiness,
    TOP_DAYS_COUNT,
  ).map(d => d.cycleDay);

  // ── Worst recovery days: lowest mean readiness ─────────────────────────────
  const worstRecoveryDays = bottomN(
    qualifiedDays,
    d => d.meanReadiness,
    TOP_DAYS_COUNT,
  ).map(d => d.cycleDay);

  // ── Highest adherence days: best workout completion rate ────────────────────
  const highestAdherenceDays = topN(
    qualifiedDays,
    d => d.completionRate,
    TOP_DAYS_COUNT,
  ).map(d => d.cycleDay);

  // ── Most common symptoms ────────────────────────────────────────────────────
  const symptomCounts = new Map<string, number>();
  for (const e of entries) {
    for (const id of e.symptoms) {
      symptomCounts.set(id, (symptomCounts.get(id) ?? 0) + 1);
    }
  }
  const totalEntries      = entries.length;
  const mostCommonSymptoms = [...symptomCounts.entries()]
    .map(([symptomId, count]) => ({
      symptomId,
      frequency: Math.round((count / totalEntries) * 100) / 100,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  return {
    bestStrengthDays,
    bestEnergyDays,
    worstRecoveryDays,
    highestAdherenceDays,
    mostCommonSymptoms,
    cycleDayStats,
    entryCount: entries.length,
  };
}
