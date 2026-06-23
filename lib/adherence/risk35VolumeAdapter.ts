// ─── lib/adherence/risk35VolumeAdapter.ts ────────────────────────────────────
// 55A — Phase 35 Risk → Volume Scale Adapter
// Persists Phase 35's multi-dimensional adherence risk level so it can gate
// the next session's volume. Phase 35 runs AFTER the workout pipeline, so
// the level computed today is applied as the starting gate tomorrow.
// Phase 34's riskToVolumeScale() is replaced by this richer signal once data
// is available.

import type { AdherenceRiskLevel } from "./riskDetection";

const STORAGE_KEY  = "axis_adherence_risk35_v1";
const EXPIRY_DAYS  = 3;

function isClient(): boolean { return typeof window !== "undefined"; }

// Phase 35 risk is a stricter gate than Phase 34 (0.80 vs Phase 34's 0.85 for high)
export function risk35ToVolumeScale(level: AdherenceRiskLevel): number {
  switch (level) {
    case "high":   return 0.80;
    case "medium": return 0.92;
    default:       return 1.00;
  }
}

export function saveRisk35Level(level: AdherenceRiskLevel): void {
  if (!isClient()) return;
  try {
    const data = { level, savedAt: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function loadRisk35Level(): AdherenceRiskLevel | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { level: AdherenceRiskLevel; savedAt: string };
    const savedDate = new Date(data.savedAt + "T12:00:00");
    const cutoff    = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);
    if (savedDate < cutoff) { localStorage.removeItem(STORAGE_KEY); return null; }
    return data.level;
  } catch { return null; }
}
