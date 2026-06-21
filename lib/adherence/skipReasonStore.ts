// ─── lib/adherence/skipReasonStore.ts ────────────────────────────────────────
// Phase 34B — Skip reason storage and retrieval.
// Logged when the user explicitly picks a reason after marking a workout skipped.
// Stored separately from the adherence entry for querying purposes.

const STORAGE_KEY    = "axis_skip_reasons";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export const SKIP_REASONS = [
  "Too tired",
  "No time",
  "Work/study commitments",
  "Family obligations",
  "Travel",
  "Didn't feel recovered",
  "Pain/injury",
  "Lost motivation",
  "Forgot",
  "Equipment unavailable",
  "Period symptoms",
  "Other",
] as const;

export type SkipReason = (typeof SKIP_REASONS)[number];

export interface SkipReasonEntry {
  date:   string;       // YYYY-MM-DD
  reason: SkipReason;
}

export interface SkipReasonSummary {
  topReasons:   Array<{ reason: SkipReason; count: number; rate: number }>;
  totalSkips:   number;
  reasonedSkips: number; // skips that have a recorded reason
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadEntries(): SkipReasonEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SkipReasonEntry[]) : [];
  } catch {
    return [];
  }
}

function persistEntries(entries: SkipReasonEntry[]): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const pruned = entries.filter(e => e.date >= cutoffStr);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordSkipReason(date: string, reason: SkipReason): void {
  if (!isClient()) return;
  const entries = loadEntries();
  const idx = entries.findIndex(e => e.date === date);
  if (idx === -1) {
    entries.push({ date, reason });
  } else {
    entries[idx] = { date, reason };
  }
  persistEntries(entries);
}

export function getSkipReason(date: string): SkipReason | null {
  return loadEntries().find(e => e.date === date)?.reason ?? null;
}

export function getSkipReasonHistory(): SkipReasonEntry[] {
  return loadEntries().sort((a, b) => b.date.localeCompare(a.date));
}

export function buildSkipReasonSummary(entries: SkipReasonEntry[]): SkipReasonSummary {
  if (entries.length === 0) {
    return { topReasons: [], totalSkips: entries.length, reasonedSkips: 0 };
  }
  const counts = new Map<SkipReason, number>();
  for (const e of entries) {
    counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  }
  const topReasons = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count, rate: count / entries.length }));
  return {
    topReasons,
    totalSkips:    entries.length,
    reasonedSkips: entries.length,
  };
}
