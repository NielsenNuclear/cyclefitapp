// ─── lib/intelligence/confidence/ConfidenceRegistry.ts ───────────────────────
// Phase 67 — persists daily confidence snapshots for timeline display.

import type { ConfidenceSnapshot, ConfidenceLevel, MaturityStage } from "./ConfidenceTypes";

const STORAGE_KEY  = "axis_confidence_registry_v1";
const MAX_SNAPSHOTS = 90;  // ~3 months

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): ConfidenceSnapshot[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(snaps: ConfidenceSnapshot[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps.slice(-MAX_SNAPSHOTS)));
  } catch {}
}

export function recordConfidenceSnapshot(
  level:          ConfidenceLevel,
  compositeScore: number,
  maturityStage:  MaturityStage,
  date:           string = new Date().toISOString().slice(0, 10),
): void {
  const snaps = load();
  const idx = snaps.findIndex(s => s.date === date);
  const snap: ConfidenceSnapshot = { date, level, compositeScore, maturityStage };
  if (idx >= 0) snaps[idx] = snap; else snaps.push(snap);
  save(snaps);
}

export function getConfidenceTimeline(): ConfidenceSnapshot[] {
  return load();
}

export function getLatestConfidenceSnapshot(): ConfidenceSnapshot | null {
  const snaps = load();
  return snaps.length > 0 ? snaps[snaps.length - 1] : null;
}

export function clearConfidenceHistory(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}
