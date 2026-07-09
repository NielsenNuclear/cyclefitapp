// ─── lib/resilience/FallbackEngine.ts ────────────────────────────────────────
// Phase 69 — returns safe defaults when primary data sources are unavailable.

export interface FallbackReadinessSignals {
  readinessScore:   number;
  recoveryScore:    number;
  fatigueEstimate:  number;
  adherenceRate:    number;
  weeklyVolume:     number;
  streakDays:       number;
  isEstimated:      true;
  estimationReason: string;
}

export type FallbackSource =
  | "historical_baseline"
  | "conservative_default"
  | "last_known_value"
  | "general_population";

export interface FallbackResult<T> {
  value:    T;
  source:   FallbackSource;
  reason:   string;
  isActual: false;
}

// ── Fallback number ───────────────────────────────────────────────────────────

export function fallbackNumber(
  candidates: (number | null | undefined)[],
  conservativeDefault: number,
  reason: string,
): FallbackResult<number> {
  for (const c of candidates) {
    if (c !== null && c !== undefined && isFinite(c) && !isNaN(c)) {
      return { value: c, source: "last_known_value", reason: `Using last valid value (${c}).`, isActual: false };
    }
  }
  return { value: conservativeDefault, source: "conservative_default", reason, isActual: false };
}

// ── Readiness fallback ────────────────────────────────────────────────────────

export function getFallbackReadinessSignals(
  historicalMean?: number,
): FallbackReadinessSignals {
  const baseline = historicalMean ?? 65;
  return {
    readinessScore:   baseline,
    recoveryScore:    Math.max(50, baseline - 5),
    fatigueEstimate:  Math.max(0, Math.min(100, 100 - baseline)),
    adherenceRate:    0.70,
    weeklyVolume:     10,
    streakDays:       3,
    isEstimated:      true,
    estimationReason: historicalMean
      ? `Readiness data unavailable — using your historical mean of ${historicalMean}.`
      : "Readiness data unavailable — using conservative population defaults.",
  };
}

// ── Volume scale fallback ─────────────────────────────────────────────────────

export function getFallbackVolumeScale(): FallbackResult<number> {
  return {
    value: 0.85,
    source: "conservative_default",
    reason: "Volume computation failed — applying 85% conservative default.",
    isActual: false,
  };
}

// ── Confidence score fallback ─────────────────────────────────────────────────

export function getFallbackConfidenceScore(): FallbackResult<number> {
  return {
    value: 0.30,
    source: "conservative_default",
    reason: "Confidence data unavailable — defaulting to Limited confidence.",
    isActual: false,
  };
}
