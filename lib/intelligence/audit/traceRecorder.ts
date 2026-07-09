// ─── lib/intelligence/audit/traceRecorder.ts ─────────────────────────────────
// Phase 65 — Trace Recorder
// Builder-style API for capturing a decision trace during recommendation
// generation. Call beginTrace(), record signals/modifiers/gates, then
// finalizeTrace() to persist the completed trace.
//
// This is instrumentation only — it does not affect any recommendation output.

import type {
  DecisionTrace,
  SignalRecord,
  ModifierRecord,
  SafetyGateRecord,
} from "./auditTypes";
import { saveTrace } from "./traceStorage";

const ALGORITHM_VERSION = "axis-v1.0";
const CONFIG_VERSION    = "axis-config-v1";

// ── In-progress trace builder ─────────────────────────────────────────────────

interface TraceBuilder {
  id:          string;
  timestamp:   string;
  signals:     SignalRecord[];
  modifiers:   ModifierRecord[];
  safetyGates: SafetyGateRecord[];
  uncertainty: number;
  calibration: number;
}

// Module-level single active builder (one recommendation at a time).
let _active: TraceBuilder | null = null;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Begin recording a new decision trace. Call before recommendation starts. */
export function beginTrace(): string {
  const id = uid();
  _active = {
    id,
    timestamp:   new Date().toISOString(),
    signals:     [],
    modifiers:   [],
    safetyGates: [],
    uncertainty: 0,
    calibration: 1.0,
  };
  return id;
}

/** Record an input signal (readiness, recovery, cycle phase, etc.). */
export function recordSignal(
  name:        string,
  value:       number | string | boolean,
  source:      string,
  unit?:       string,
  description?: string,
): void {
  if (!_active) return;
  _active.signals.push({ name, value, source, unit, description });
}

/** Record a modifier applied to the recommendation. */
export function recordModifier(
  name:         string,
  inputValue:   number,
  outputFactor: number,
  description?: string,
): void {
  if (!_active) return;
  _active.modifiers.push({ name, inputValue, outputFactor, description });
}

/** Record a safety gate check result. */
export function recordSafetyGate(
  name:        string,
  result:      SafetyGateRecord["result"],
  reason:      string,
  inputValue?: number,
  limit?:      number,
): void {
  if (!_active) return;
  _active.safetyGates.push({ name, result, reason, inputValue, limit });
}

/** Set the uncertainty and calibration factor for this trace. */
export function recordUncertainty(uncertaintyScore: number, calibrationFactor: number): void {
  if (!_active) return;
  _active.uncertainty = uncertaintyScore;
  _active.calibration = calibrationFactor;
}

/** Finalize and persist the trace. Returns the completed DecisionTrace. */
export function finalizeTrace(output: {
  finalVolumeScale:      number;
  finalIntensity:        string;
  recommendationClass:   string;
  recommendationSummary: string;
  finalConfidence:       number;
}): DecisionTrace | null {
  if (!_active) return null;

  const trace: DecisionTrace = {
    id:                    _active.id,
    timestamp:             _active.timestamp,
    signals:               [..._active.signals],
    modifiers:             [..._active.modifiers],
    safetyGates:           [..._active.safetyGates],
    uncertaintyScore:      _active.uncertainty,
    calibrationFactor:     _active.calibration,
    finalVolumeScale:      output.finalVolumeScale,
    finalIntensity:        output.finalIntensity,
    recommendationClass:   output.recommendationClass,
    recommendationSummary: output.recommendationSummary,
    finalConfidence:       output.finalConfidence,
    algorithmVersion:      ALGORITHM_VERSION,
    configVersion:         CONFIG_VERSION,
  };

  _active = null;
  saveTrace(trace);
  return trace;
}

/** Discard the current in-progress trace without persisting. */
export function abortTrace(): void {
  _active = null;
}
