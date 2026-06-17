// ─── lib/recovery/fatigueHistory.ts ───────────────────────────────────────────
// Raw daily fatigue input store — captures the signals that go INTO the
// recovery score so they can be correlated against outcomes (30C).
// Distinct from axis_recovery_scores which stores computed outputs.

const STORAGE_KEY    = "axis_fatigue_history";
const RETENTION_DAYS = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SleepQuality = "excellent" | "good" | "variable" | "poor";

export interface FatigueEntry {
  date:           string;   // YYYY-MM-DD — one entry per calendar day
  sleepQuality:   SleepQuality;
  sleepScore:     number;   // numeric proxy: excellent=4, good=3, variable=2, poor=1
  stressLevel:    number;   // 1–10
  energyLevel:    number;   // 0–4 (from readiness check-in)
  trainingLoad:   number;   // weekly volume from TrainingLoadReport (set count proxy)
  symptomCount:   number;   // number of symptoms logged today
  symptomSeverity: number;  // mean severity of symptoms (0–3), 0 if none
  recoveryScore?: number;   // filled in after recovery score is computed
  readinessScore?: number;  // filled in from readiness calculation if available
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ─── Internal I/O ─────────────────────────────────────────────────────────────

function load(): FatigueEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: FatigueEntry[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function pruneOld(entries: FatigueEntry[]): FatigueEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

// ─── Sleep quality numeric mapping ────────────────────────────────────────────

export function sleepQualityToScore(q: SleepQuality): number {
  return { excellent: 4, good: 3, variable: 2, poor: 1 }[q] ?? 2;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upserts today's fatigue entry. Calling again on the same date overwrites,
 * so partial updates are safe (pass the full merged object each time).
 */
export function saveFatigueEntry(entry: FatigueEntry): void {
  const existing = pruneOld(load());
  const idx = existing.findIndex(e => e.date === entry.date);
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.unshift(entry);
  }
  persist(existing);
}

/**
 * Patches a single field on today's entry without requiring all fields.
 * Creates a default entry if none exists for today.
 */
export function patchFatigueEntry(
  date:  string,
  patch: Partial<Omit<FatigueEntry, "date">>,
): void {
  const existing = pruneOld(load());
  const idx = existing.findIndex(e => e.date === date);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...patch };
    persist(existing);
  } else {
    // Create a default entry and apply the patch
    const defaults: FatigueEntry = {
      date,
      sleepQuality:    "variable",
      sleepScore:      2,
      stressLevel:     5,
      energyLevel:     2,
      trainingLoad:    0,
      symptomCount:    0,
      symptomSeverity: 0,
    };
    existing.unshift({ ...defaults, ...patch });
    persist(existing);
  }
}

/** All entries newest first. */
export function getFatigueHistory(): FatigueEntry[] {
  return pruneOld(load()).sort((a, b) => b.date.localeCompare(a.date));
}

/** Entries within the last N days, newest first. */
export function getRecentFatigueHistory(days: number): FatigueEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return getFatigueHistory().filter(e => e.date >= cutoffStr);
}

/** Today's entry, or null if not yet recorded. */
export function getTodayFatigueEntry(): FatigueEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return getFatigueHistory().find(e => e.date === today) ?? null;
}

/** Total number of stored entries. */
export function getFatigueEntryCount(): number {
  return pruneOld(load()).length;
}
