// ─── lib/intelligence/dataMaturity.ts ────────────────────────────────────────
// UX Stabilization Batch 3 — shared "not enough data yet" primitive.
//
// Several engines already compute their own ad hoc maturity signal
// (RecoveryCapacity.confidence, LifestyleBurnoutReport.dataMaturity, the
// Verification Registry's own "insufficient_data" state) but each card
// enforces — or ignores — it independently. This is the one shared gate every
// affected engine/card should call instead, so "not enough data" is judged
// the same way everywhere rather than as 6+ inconsistent one-off thresholds.

export type MaturityStage = "locked" | "building" | "ready";

/** 0–7 check-ins: per the UX stabilization brief's explicit threshold. */
export const DEFAULT_MATURITY_THRESHOLD = 7;

export function getMaturityStage(
  entryCount: number,
  threshold: number = DEFAULT_MATURITY_THRESHOLD,
): MaturityStage {
  if (entryCount <= 0) return "locked";
  if (entryCount < threshold) return "building";
  return "ready";
}

export function isMature(
  entryCount: number,
  threshold: number = DEFAULT_MATURITY_THRESHOLD,
): boolean {
  return getMaturityStage(entryCount, threshold) === "ready";
}

export function checkInsRemaining(
  entryCount: number,
  threshold: number = DEFAULT_MATURITY_THRESHOLD,
): number {
  return Math.max(0, threshold - entryCount);
}
