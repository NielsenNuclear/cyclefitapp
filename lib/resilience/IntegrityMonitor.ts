// ─── lib/resilience/IntegrityMonitor.ts ──────────────────────────────────────
// Phase 69 — validates all known Axis localStorage keys and reports health.

import { classifyError, classifyValue, type ClassifiedError } from "./ErrorClassifier";

// All localStorage keys owned by Axis — add new ones here as phases expand.
export const AXIS_KEYS = [
  "axis_verification_registry_v1",
  "axis_decision_traces_v1",
  "axis_regression_snapshots_v1",
  "axis_confidence_registry_v1",
  "axis_safety_audit_v1",
  "axis_session_recovery_v1",
] as const;

export type AxisKey = typeof AXIS_KEYS[number];

export interface KeyHealthReport {
  key:        string;
  present:    boolean;
  parseOk:    boolean;
  errors:     ClassifiedError[];
  byteSize:   number;
}

export interface StorageHealthReport {
  generatedAt:     string;
  keys:            KeyHealthReport[];
  totalKeys:       number;
  healthyKeys:     number;
  problemKeys:     number;
  integrityScore:  number;      // 0–1
  totalBytes:      number;
  errors:          ClassifiedError[];
}

function isClient(): boolean { return typeof window !== "undefined"; }

function safeRead(key: string): { raw: string | null; ok: boolean; err?: ClassifiedError } {
  if (!isClient()) return { raw: null, ok: false };
  try {
    return { raw: localStorage.getItem(key), ok: true };
  } catch (e) {
    return { raw: null, ok: false, err: classifyError(e, key) };
  }
}

function safeParse(raw: string, key: string): { value: unknown; ok: boolean; err?: ClassifiedError } {
  try {
    return { value: JSON.parse(raw), ok: true };
  } catch (e) {
    return { value: null, ok: false, err: classifyError(e, key) };
  }
}

function checkReport(key: string): KeyHealthReport {
  const errors: ClassifiedError[] = [];
  const { raw, ok: readOk, err: readErr } = safeRead(key);

  if (readErr) errors.push(readErr);

  const present = raw !== null;
  let parseOk = true;
  const byteSize = raw ? new TextEncoder().encode(raw).length : 0;

  if (present && readOk) {
    const { ok: pOk, err: pErr } = safeParse(raw, key);
    if (!pOk && pErr) { errors.push(pErr); parseOk = false; }
  }

  return { key, present, parseOk: present ? parseOk : true, errors, byteSize };
}

export function runIntegrityCheck(): StorageHealthReport {
  const keys = AXIS_KEYS.map(checkReport);
  const totalKeys   = keys.length;
  const healthyKeys = keys.filter(k => k.errors.length === 0).length;
  const problemKeys = totalKeys - healthyKeys;
  const totalBytes  = keys.reduce((s, k) => s + k.byteSize, 0);
  const allErrors   = keys.flatMap(k => k.errors);

  return {
    generatedAt:    new Date().toISOString(),
    keys,
    totalKeys,
    healthyKeys,
    problemKeys,
    integrityScore: totalKeys > 0 ? healthyKeys / totalKeys : 1,
    totalBytes,
    errors:         allErrors,
  };
}

export function repairKey(key: string): boolean {
  if (!isClient()) return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;   // nothing to repair
    JSON.parse(raw);         // if parse succeeds, nothing to do
    return true;
  } catch {
    try {
      localStorage.removeItem(key);
      return true;           // removed corrupted entry — app will reinitialize
    } catch {
      return false;
    }
  }
}
