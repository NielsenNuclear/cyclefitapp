// ─── lib/recovery/recoveryResponse.ts ────────────────────────────────────────
// Tracks specific recovery modalities and their before/after readiness impact.
// Provides more granular data than recoveryLearning.ts which tracks broad
// strategy categories. Storage key: axis_recovery_response_log. Retention: 180d.

const STORAGE_KEY    = "axis_recovery_response_log";
const RETENTION_DAYS = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryModality =
  | "sleep"          // extra sleep / early bedtime
  | "mobility"       // dynamic mobility / foam rolling
  | "stretching"     // static stretching / yoga
  | "breathwork"     // guided breathing / meditation
  | "walking"        // low-intensity active recovery
  | "complete_rest"; // full rest day

const MODALITY_LABELS: Record<RecoveryModality, string> = {
  sleep:         "Extra sleep",
  mobility:      "Mobility",
  stretching:    "Stretching",
  breathwork:    "Breathwork",
  walking:       "Walking",
  complete_rest: "Complete rest",
};

export function modalityLabel(m: RecoveryModality): string {
  return MODALITY_LABELS[m] ?? m;
}

export interface RecoveryResponseEntry {
  id:              string;         // `YYYY-MM-DD_modality` — idempotent key
  date:            string;
  modality:        RecoveryModality;
  readinessBefore: number;         // readiness score on the day of action
  readinessAfter?: number;         // scored the next morning
  scoredDate?:     string;
  scored:          boolean;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoffDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  return d.toISOString().slice(0, 10);
}

function loadLog(): RecoveryResponseEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecoveryResponseEntry[]) : [];
  } catch {
    return [];
  }
}

function persistLog(entries: RecoveryResponseEntry[]): void {
  if (!isClient()) return;
  const cutoff = cutoffDate();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.filter(e => e.date >= cutoff)),
    );
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Records that a recovery modality was used on a given date.
 * Idempotent — same date + modality is a no-op.
 */
export function logRecoveryResponse(
  modality:        RecoveryModality,
  readinessBefore: number,
  date?:           string,
): void {
  const d   = date ?? new Date().toISOString().slice(0, 10);
  const id  = `${d}_${modality}`;
  const log = loadLog();
  if (log.some(e => e.id === id)) return;
  persistLog([...log, { id, date: d, modality, readinessBefore, scored: false }]);
}

/**
 * Scores all of yesterday's response entries with today's readiness.
 * Call this once per morning alongside scoreRecoveryStrategies.
 */
export function scoreRecoveryResponses(
  date:            string,   // yesterday's YYYY-MM-DD
  readinessAfter:  number,
  scoredDate:      string,   // today's YYYY-MM-DD
): void {
  const log     = loadLog();
  const updated = log.map(e => {
    if (e.date !== date || e.scored) return e;
    return { ...e, scored: true, readinessAfter, scoredDate };
  });
  persistLog(updated);
}

export function getRecoveryResponses(): RecoveryResponseEntry[] {
  return loadLog();
}
