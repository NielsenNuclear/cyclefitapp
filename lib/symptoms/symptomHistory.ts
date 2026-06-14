// ─── lib/symptoms/symptomHistory.ts ──────────────────────────────────────────
// Local symptom history using localStorage only.
// Pure logic — no React, no side effects beyond localStorage.

export interface SymptomEntry {
  date:      string;         // YYYY-MM-DD
  symptomId: string;
  severity:  0 | 1 | 2 | 3;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_symptom_history";
const RETENTION_DAYS = 365;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function loadHistory(): SymptomEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SymptomEntry[];
  } catch {
    return [];
  }
}

function persistHistory(entries: SymptomEntry[]): void {
  if (!isClient()) return;
  try {
    const pruned = entries.filter(e => e.date >= cutoffDate(RETENTION_DAYS));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

function isValidSeverity(v: unknown): v is 0 | 1 | 2 | 3 {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Upserts a single symptom entry for a given date (replaces if same date + symptomId).
export function saveSymptomEntry(entry: SymptomEntry): void {
  if (!isValidSeverity(entry.severity)) return;
  const rest = loadHistory().filter(
    e => !(e.date === entry.date && e.symptomId === entry.symptomId)
  );
  persistHistory([entry, ...rest]);
}

// Replaces all symptom entries for a given date with the provided list.
// Filters out entries with invalid severity before persisting.
export function saveDailySymptoms(date: string, symptoms: SymptomEntry[]): void {
  const valid  = symptoms.filter(s => isValidSeverity(s.severity));
  const others = loadHistory().filter(e => e.date !== date);
  persistHistory([...valid, ...others]);
}

export function getSymptomHistory(): SymptomEntry[] {
  return loadHistory().sort((a, b) => b.date.localeCompare(a.date));
}

export function getSymptomsForDate(date: string): SymptomEntry[] {
  return loadHistory().filter(e => e.date === date);
}
