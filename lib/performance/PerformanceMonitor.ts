// ─── lib/performance/PerformanceMonitor.ts ───────────────────────────────────
// Phase 71 — instruments named operations and tracks timing history.

import type { BudgetCategory } from "./PerformanceBudget";
import { evaluateBudget } from "./PerformanceBudget";

const STORAGE_KEY  = "axis_perf_log_v1";
const MAX_ENTRIES  = 500;
const MAX_AGE_MS   = 7 * 24 * 60 * 60 * 1000;   // 7 days

function isClient(): boolean { return typeof window !== "undefined"; }
function now():     number   { return isClient() ? performance.now() : Date.now(); }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PerfEntry {
  id:         string;
  category:   BudgetCategory | string;
  label:      string;
  durationMs: number;
  timestamp:  string;
  budgetStatus?: "target" | "warning" | "critical";
}

export interface PerfStats {
  category:   string;
  count:      number;
  mean:       number;
  p50:        number;
  p90:        number;
  p99:        number;
  max:        number;
  violations: number;   // critical budget violations
}

// ── Active timers ─────────────────────────────────────────────────────────────

const _active = new Map<string, number>();

export function startTimer(id: string): void {
  _active.set(id, now());
}

export function endTimer(
  id:       string,
  category: BudgetCategory | string,
  label:    string,
): PerfEntry | null {
  const start = _active.get(id);
  if (start === undefined) return null;
  _active.delete(id);

  const durationMs = now() - start;
  const budgetStatus = isBudgetCategory(category)
    ? evaluateBudget(category as BudgetCategory, durationMs)
    : undefined;

  const entry: PerfEntry = {
    id:         `perf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    category,
    label,
    durationMs,
    timestamp:  new Date().toISOString(),
    budgetStatus,
  };

  appendEntry(entry);
  return entry;
}

function isBudgetCategory(s: string): boolean {
  return ["dashboard_render","recommendation_compute","body_viewer_fps",
          "workout_log_interaction","storage_read","storage_write",
          "analytics_generation","integrity_check"].includes(s);
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

export function measureSync<T>(
  category: BudgetCategory | string,
  label:    string,
  fn:       () => T,
): T {
  const timerId = `${category}-${Date.now()}`;
  startTimer(timerId);
  const result = fn();
  endTimer(timerId, category, label);
  return result;
}

export async function measureAsync<T>(
  category: BudgetCategory | string,
  label:    string,
  fn:       () => Promise<T>,
): Promise<T> {
  const timerId = `${category}-${Date.now()}`;
  startTimer(timerId);
  const result = await fn();
  endTimer(timerId, category, label);
  return result;
}

// ── Storage ───────────────────────────────────────────────────────────────────

function loadEntries(): PerfEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function appendEntry(entry: PerfEntry): void {
  if (!isClient()) return;
  const cutoff = Date.now() - MAX_AGE_MS;
  const entries = loadEntries()
    .filter(e => new Date(e.timestamp).getTime() > cutoff)
    .slice(-(MAX_ENTRIES - 1));
  entries.push(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function getPerfLog(): PerfEntry[] {
  return loadEntries();
}

export function clearPerfLog(): void {
  if (isClient()) localStorage.removeItem(STORAGE_KEY);
}

// ── Statistics ─────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

export function computePerfStats(): PerfStats[] {
  const entries = loadEntries();
  const byCategory = new Map<string, number[]>();

  for (const e of entries) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e.durationMs);
    byCategory.set(e.category, list);
  }

  const stats: PerfStats[] = [];
  for (const [category, durations] of byCategory) {
    const sorted = [...durations].sort((a, b) => a - b);
    const violations = entries.filter(
      e => e.category === category && e.budgetStatus === "critical"
    ).length;

    stats.push({
      category,
      count:      sorted.length,
      mean:       sorted.reduce((s, v) => s + v, 0) / sorted.length,
      p50:        percentile(sorted, 50),
      p90:        percentile(sorted, 90),
      p99:        percentile(sorted, 99),
      max:        sorted[sorted.length - 1] ?? 0,
      violations,
    });
  }

  return stats.sort((a, b) => b.p90 - a.p90);
}
