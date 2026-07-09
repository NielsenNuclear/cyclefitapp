// ─── lib/intelligence/audit/auditTypes.ts ────────────────────────────────────
// Phase 65 — Decision Traceability & Audit Engine
// Types for full audit trails of every recommendation decision.

// ── Signal capture ────────────────────────────────────────────────────────────

export interface SignalRecord {
  name:         string;
  value:        number | string | boolean;
  unit?:        string;
  source:       string;   // which subsystem produced this signal
  description?: string;
}

// ── Modifier record ───────────────────────────────────────────────────────────

export interface ModifierRecord {
  name:         string;
  inputValue:   number;
  outputFactor: number;   // multiplicative modifier applied
  description?: string;
}

// ── Safety gate ───────────────────────────────────────────────────────────────

export type SafetyGateResult = "passed" | "blocked" | "clamped";

export interface SafetyGateRecord {
  name:        string;
  result:      SafetyGateResult;
  inputValue?: number;
  limit?:      number;
  reason:      string;
}

// ── Full decision trace ───────────────────────────────────────────────────────

export interface DecisionTrace {
  id:                 string;
  timestamp:          string;    // ISO 8601

  // Input layer
  signals:            SignalRecord[];

  // Computation layer
  modifiers:          ModifierRecord[];

  // Safety layer
  safetyGates:        SafetyGateRecord[];

  // Uncertainty and calibration
  uncertaintyScore:   number;    // 0–1; 0 = high certainty
  calibrationFactor:  number;    // 1.0 = fully calibrated

  // Output
  finalVolumeScale:   number;
  finalIntensity:     string;
  recommendationClass: string;
  recommendationSummary: string;
  finalConfidence:    number;    // 0–1

  // Metadata
  algorithmVersion:   string;
  configVersion:      string;
}

// ── Replay result ─────────────────────────────────────────────────────────────

export type ReplayStatus = "deterministic" | "drifted" | "error";

export interface ReplayResult {
  traceId:          string;
  status:           ReplayStatus;
  originalVolumeScale:  number;
  replayedVolumeScale:  number;
  drift:            number;     // |original - replayed|
  signalDriftCount: number;     // how many signals changed
  message:          string;
}
