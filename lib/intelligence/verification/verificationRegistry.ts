// ─── lib/intelligence/verification/verificationRegistry.ts ────────────────────
// Phase 64 — Verification Registry
// Phase C  — Added state computation, idempotency query, expiration
// Persistent storage for VerificationRecords. No recommendation logic here.

import type { VerificationRecord, VerificationState } from "./verificationTypes";

const STORAGE_KEY    = "axis_verification_registry_v1";
const MAX_RECORDS    = 300;
const RETENTION_DAYS = 120;

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Load / save ───────────────────────────────────────────────────────────────

export function loadVerificationRegistry(): VerificationRecord[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as VerificationRecord[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cut = cutoff.toISOString().slice(0, 10);
    return all.filter(r => r.timestamp >= cut);
  } catch { return []; }
}

export function saveVerificationRegistry(records: VerificationRecord[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
  } catch {}
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function upsertVerificationRecord(record: VerificationRecord): void {
  const all = loadVerificationRegistry();
  const idx = all.findIndex(r => r.id === record.id);
  if (idx >= 0) { all[idx] = record; } else { all.push(record); }
  saveVerificationRegistry(all);
}

export function updateVerificationRecord(
  id:      string,
  updates: Partial<VerificationRecord>,
): void {
  const all = loadVerificationRegistry();
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    saveVerificationRegistry(all);
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getPendingVerifications(today: string): VerificationRecord[] {
  return loadVerificationRegistry().filter(
    r => !r.evaluated && r.evaluationDueDate <= today,
  );
}

export function getActiveVerifications(today: string): VerificationRecord[] {
  return loadVerificationRegistry().filter(
    r => !r.evaluated && r.evaluationDueDate > today,
  );
}

export function getCompletedVerifications(): VerificationRecord[] {
  return loadVerificationRegistry().filter(r => r.evaluated);
}

// ── Idempotency query (Phase C) ───────────────────────────────────────────────

/** Return the record created for a given calendar date, or null. Used to
 *  prevent duplicate registrations on re-render. */
export function getRecordForDate(date: string): VerificationRecord | null {
  return loadVerificationRegistry().find(r => r.timestamp === date) ?? null;
}

// ── Lifecycle state derivation (Phase C) ─────────────────────────────────────

const EXPIRY_GRACE_DAYS = 30;

function daysBetween(earlier: string, later: string): number {
  return Math.floor(
    (new Date(later + "T12:00:00Z").getTime() -
      new Date(earlier + "T12:00:00Z").getTime()) /
      86_400_000,
  );
}

/** Derive the current lifecycle state of a record without mutating it. */
export function computeVerificationState(
  record: VerificationRecord,
  today:  string,
): VerificationState {
  if (record.evaluated) {
    return record.verificationScore === "insufficient_data"
      ? "insufficient_data"
      : "verified";
  }
  const overdue = daysBetween(record.evaluationDueDate, today);
  if (overdue > EXPIRY_GRACE_DAYS) return "expired";
  if (record.evaluationDueDate <= today)  return "pending";
  return "waiting";
}

// ── Expiration sweep (Phase C) ────────────────────────────────────────────────

/** Mark records that are > EXPIRY_GRACE_DAYS past their due date as evaluated
 *  with score "insufficient_data" so they don't block the summary forever.
 *  Returns the number of records swept. */
export function expireOldRecords(today: string): number {
  const all = loadVerificationRegistry();
  let swept = 0;
  const updated = all.map(r => {
    if (!r.evaluated && daysBetween(r.evaluationDueDate, today) > EXPIRY_GRACE_DAYS) {
      swept++;
      return {
        ...r,
        evaluated:         true,
        verificationScore: "insufficient_data" as const,
        scoreRationale:    "Record expired without sufficient evidence.",
      };
    }
    return r;
  });
  if (swept > 0) saveVerificationRegistry(updated);
  return swept;
}
