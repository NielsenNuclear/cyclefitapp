// ─── lib/accuracy/uncertaintyDetection.ts ────────────────────────────────────
// 41E — Uncertainty Detection
// When recommendation confidence is low, Axis becomes conservative rather
// than maintaining (possibly wrong) high-intensity suggestions.

import type { RecommendationConfidence } from "./recommendationConfidence";

const STORAGE_KEY    = "axis_uncertainty_v1";
const EXPIRY_DAYS    = 7;

function isClient(): boolean { return typeof window !== "undefined"; }

export function saveUncertaintySignal(signal: UncertaintySignal): void {
  if (!isClient()) return;
  try {
    const data = { signal, savedAt: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function loadUncertaintySignal(): UncertaintySignal | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { signal: UncertaintySignal; savedAt: string };
    const savedDate = new Date(data.savedAt + "T12:00:00");
    const cutoff    = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);
    if (savedDate < cutoff) { localStorage.removeItem(STORAGE_KEY); return null; }
    return data.signal;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UncertaintySignal {
  conservativeMode:  boolean;
  reason:            string;
  volumeModifier:    number;    // 1.0 = normal, 0.85 = conservative
  intensityModifier: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectUncertainty(
  confidence: RecommendationConfidence,
): UncertaintySignal {
  switch (confidence.level) {
    case "high":
      return {
        conservativeMode:  false,
        reason:            "High confidence — proceed as recommended.",
        volumeModifier:    1.0,
        intensityModifier: 1.0,
      };
    case "moderate":
      return {
        conservativeMode:  false,
        reason:            "Moderate confidence — standard plan with slight caution.",
        volumeModifier:    0.95,
        intensityModifier: 1.0,
      };
    default:
      return {
        conservativeMode:  true,
        reason:            "Low confidence in prediction — maintaining conservative approach until more data is available.",
        volumeModifier:    0.85,
        intensityModifier: 0.90,
      };
  }
}
