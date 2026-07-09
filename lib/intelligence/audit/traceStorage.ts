// ─── lib/intelligence/audit/traceStorage.ts ──────────────────────────────────
// Phase 65 — Trace Storage
// Persistent storage for DecisionTraces.

import type { DecisionTrace } from "./auditTypes";

const STORAGE_KEY    = "axis_decision_traces_v1";
const MAX_TRACES     = 200;
const RETENTION_DAYS = 60;

function isClient(): boolean { return typeof window !== "undefined"; }

function cutoffDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  return d.toISOString().slice(0, 10);
}

export function loadTraces(): DecisionTrace[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as DecisionTrace[];
    const cut = cutoffDate();
    return all.filter(t => t.timestamp.slice(0, 10) >= cut);
  } catch { return []; }
}

export function saveTrace(trace: DecisionTrace): void {
  if (!isClient()) return;
  try {
    const all = loadTraces();
    const idx = all.findIndex(t => t.id === trace.id);
    if (idx >= 0) { all[idx] = trace; } else { all.push(trace); }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(-MAX_TRACES)));
  } catch {}
}

export function getTrace(id: string): DecisionTrace | null {
  return loadTraces().find(t => t.id === id) ?? null;
}

export function clearOldTraces(): void {
  const all = loadTraces(); // already pruned by date in loadTraces
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(-MAX_TRACES)));
  } catch {}
}

// ── Filter helpers ────────────────────────────────────────────────────────────

export interface TraceFilter {
  from?:               string;   // YYYY-MM-DD
  to?:                 string;
  recommendationClass?: string;
  minConfidence?:      number;
  maxConfidence?:      number;
  gateBlocked?:        boolean;  // only traces where a gate blocked
  algorithmVersion?:   string;
}

export function filterTraces(filter: TraceFilter): DecisionTrace[] {
  return loadTraces().filter(t => {
    const date = t.timestamp.slice(0, 10);
    if (filter.from && date < filter.from) return false;
    if (filter.to   && date > filter.to)   return false;
    if (filter.recommendationClass && t.recommendationClass !== filter.recommendationClass) return false;
    if (filter.minConfidence !== undefined && t.finalConfidence < filter.minConfidence) return false;
    if (filter.maxConfidence !== undefined && t.finalConfidence > filter.maxConfidence) return false;
    if (filter.gateBlocked && !t.safetyGates.some(g => g.result === "blocked" || g.result === "clamped")) return false;
    if (filter.algorithmVersion && t.algorithmVersion !== filter.algorithmVersion) return false;
    return true;
  });
}

export function exportTrace(id: string): string | null {
  const trace = getTrace(id);
  if (!trace) return null;
  return JSON.stringify(trace, null, 2);
}
