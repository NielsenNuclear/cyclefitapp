// ─── lib/intelligence/verification/verificationRegistry.ts ────────────────────
// Phase 64 — Verification Registry
// Persistent storage for VerificationRecords. No recommendation logic here.

import type { VerificationRecord } from "./verificationTypes";

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
