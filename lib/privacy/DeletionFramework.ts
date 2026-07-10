// ─── lib/privacy/DeletionFramework.ts ────────────────────────────────────────
// Phase 72 — granular deletion of user data by category or complete wipe.
// Never deletes silently — every deletion is explicit and logged.

import { DATA_CATALOG, type DataCategory } from "./DataInventory";

function isClient(): boolean { return typeof window !== "undefined"; }

export interface DeletionResult {
  deletedKeys:   string[];
  skippedKeys:   string[];
  bytesFreed:    number;
  timestamp:     string;
}

function getKeySize(key: string): number {
  if (!isClient()) return 0;
  try {
    const raw = localStorage.getItem(key);
    return raw ? new TextEncoder().encode(raw).length : 0;
  } catch { return 0; }
}

function safeRemove(key: string): boolean {
  if (!isClient()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

// ── Delete by category ────────────────────────────────────────────────────────

export function deleteCategory(category: DataCategory): DeletionResult {
  const targets = DATA_CATALOG.filter(e => e.category === category);
  const deleted: string[] = [];
  const skipped: string[] = [];
  let bytesFreed = 0;

  for (const entry of targets) {
    const size = getKeySize(entry.key);
    if (safeRemove(entry.key)) {
      deleted.push(entry.key);
      bytesFreed += size;
    } else {
      skipped.push(entry.key);
    }
  }

  return { deletedKeys: deleted, skippedKeys: skipped, bytesFreed, timestamp: new Date().toISOString() };
}

// ── Delete specific key ───────────────────────────────────────────────────────

export function deleteKey(key: string): DeletionResult {
  const size = getKeySize(key);
  const ok   = safeRemove(key);
  return {
    deletedKeys: ok ? [key] : [],
    skippedKeys: ok ? [] : [key],
    bytesFreed:  ok ? size : 0,
    timestamp:   new Date().toISOString(),
  };
}

// ── Complete wipe ─────────────────────────────────────────────────────────────

export function deleteAllAxisData(): DeletionResult {
  const deleted: string[] = [];
  const skipped: string[] = [];
  let bytesFreed = 0;

  for (const entry of DATA_CATALOG) {
    const size = getKeySize(entry.key);
    if (safeRemove(entry.key)) {
      deleted.push(entry.key);
      bytesFreed += size;
    } else {
      skipped.push(entry.key);
    }
  }

  return { deletedKeys: deleted, skippedKeys: skipped, bytesFreed, timestamp: new Date().toISOString() };
}

// ── System-only wipe (keeps user data, clears dev/system logs) ────────────────

export function deleteSystemLogs(): DeletionResult {
  return deleteCategory("system");
}

// ── Human-readable summaries ──────────────────────────────────────────────────

export function describeCategories(): { category: DataCategory; label: string; keyCount: number }[] {
  const categories = new Map<DataCategory, number>();
  for (const e of DATA_CATALOG) {
    categories.set(e.category, (categories.get(e.category) ?? 0) + 1);
  }
  const LABELS: Record<DataCategory, string> = {
    training:        "Training History",
    recovery:        "Recovery Data",
    cycle:           "Cycle Information",
    nutrition:       "Nutrition Logs",
    recommendations: "Recommendations",
    intelligence:    "Intelligence & Learning",
    system:          "System & Developer Logs",
  };
  return [...categories.entries()].map(([category, keyCount]) => ({
    category, label: LABELS[category], keyCount,
  }));
}
