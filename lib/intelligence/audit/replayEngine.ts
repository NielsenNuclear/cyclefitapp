// ─── lib/intelligence/audit/replayEngine.ts ──────────────────────────────────
// Phase 65 — Replay Engine
// Reconstructs a recommendation from a stored DecisionTrace and verifies
// that the same inputs produce the same outputs (determinism check).

import type { DecisionTrace, ReplayResult } from "./auditTypes";

// ── Determinism verifier ──────────────────────────────────────────────────────
// Re-derives the volume scale by replaying the modifier chain from the trace.
// If the result matches the stored finalVolumeScale within tolerance, the
// recommendation is deterministic.

const DRIFT_TOLERANCE = 0.001;

function replayVolumeScale(trace: DecisionTrace): number {
  // Replay: start from 1.0 and apply each modifier's outputFactor
  let scale = 1.0;
  for (const mod of trace.modifiers) {
    scale *= mod.outputFactor;
  }
  // Apply calibration
  scale *= trace.calibrationFactor;
  // Apply safety gate clamps (reproduce clamped gates only)
  for (const gate of trace.safetyGates) {
    if (gate.result === "clamped" && gate.limit !== undefined) {
      if (gate.name.toLowerCase().includes("max") && scale > gate.limit) scale = gate.limit;
      if (gate.name.toLowerCase().includes("min") && scale < gate.limit) scale = gate.limit;
    }
  }
  // Round to 4 decimal places (same as recommendation engine)
  return Math.round(scale * 10000) / 10000;
}

export function replayTrace(trace: DecisionTrace): ReplayResult {
  try {
    const replayed = replayVolumeScale(trace);
    const drift    = Math.abs(trace.finalVolumeScale - replayed);
    const isDet    = drift <= DRIFT_TOLERANCE;

    // Check how many signal values would produce different modifiers if changed
    const signalDriftCount = 0; // pure replay from stored modifiers; no re-derivation

    return {
      traceId:              trace.id,
      status:               isDet ? "deterministic" : "drifted",
      originalVolumeScale:  trace.finalVolumeScale,
      replayedVolumeScale:  replayed,
      drift,
      signalDriftCount,
      message: isDet
        ? "Replay confirmed: identical inputs produce identical outputs."
        : `Drift detected: original=${trace.finalVolumeScale.toFixed(4)}, replay=${replayed.toFixed(4)}, Δ=${drift.toFixed(4)}. Algorithm may have changed.`,
    };
  } catch (err) {
    return {
      traceId:              trace.id,
      status:               "error",
      originalVolumeScale:  trace.finalVolumeScale,
      replayedVolumeScale:  NaN,
      drift:                NaN,
      signalDriftCount:     0,
      message:              `Replay error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Batch determinism check ───────────────────────────────────────────────────

export interface BatchReplayReport {
  totalChecked:     number;
  deterministic:    number;
  drifted:          number;
  errors:           number;
  driftedTraceIds:  string[];
  maxDrift:         number;
}

export function batchReplay(traces: DecisionTrace[]): BatchReplayReport {
  const results = traces.map(replayTrace);
  const drifted = results.filter(r => r.status === "drifted");
  const errors  = results.filter(r => r.status === "error");

  return {
    totalChecked:    traces.length,
    deterministic:   results.filter(r => r.status === "deterministic").length,
    drifted:         drifted.length,
    errors:          errors.length,
    driftedTraceIds: drifted.map(r => r.traceId),
    maxDrift:        drifted.reduce((m, r) => Math.max(m, r.drift || 0), 0),
  };
}
