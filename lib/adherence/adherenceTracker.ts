// ─── lib/adherence/adherenceTracker.ts ───────────────────────────────────────
// Phase 34A — Adherence Tracker.
// One entry per calendar day. Upserted on every dashboard load so the status
// always reflects the most recent known state (pending → completed / skipped).

import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";

const STORAGE_KEY    = "axis_adherence_history";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdherenceEntry {
  date:           string;                 // YYYY-MM-DD
  status:         WorkoutCompletionStatus;
  weekday:        number;                 // 0 = Sunday … 6 = Saturday
  cyclePhase:     string;                 // e.g. "Follicular" | "" if unknown
  trainingBlock:  string;                 // e.g. "accumulation" | "" if unknown
  energyLevel:    number;                 // 0–4
  readinessScore: number;                 // 0–100
  skipReason?:    string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadHistory(): AdherenceEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdherenceEntry[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: AdherenceEntry[]): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const pruned = entries.filter(e => e.date >= cutoffStr);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordDailyAdherence(entry: AdherenceEntry): void {
  if (!isClient()) return;
  const entries = loadHistory();
  const idx = entries.findIndex(e => e.date === entry.date);
  if (idx === -1) {
    entries.push(entry);
  } else {
    entries[idx] = entry;
  }
  persistHistory(entries);
}

export function getAdherenceHistory(): AdherenceEntry[] {
  return loadHistory().sort((a, b) => b.date.localeCompare(a.date));
}

export function getAdherenceForDate(date: string): AdherenceEntry | null {
  return loadHistory().find(e => e.date === date) ?? null;
}

export function updateSkipReason(date: string, reason: string): void {
  if (!isClient()) return;
  const entries = loadHistory();
  const idx = entries.findIndex(e => e.date === date);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], skipReason: reason };
    persistHistory(entries);
  }
}
