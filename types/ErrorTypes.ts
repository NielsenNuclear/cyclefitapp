// ─── types/ErrorTypes.ts ─────────────────────────────────────────────────────
// Phase B — Shared error and recovery type contracts.

// ─── Error categories ─────────────────────────────────────────────────────────

export type ErrorCategory =
  | "rendering"     // React render / lifecycle failure
  | "storage"       // localStorage read/write failure
  | "network"       // Fetch / API failure
  | "user_input"    // Validation / parse failure from user data
  | "transient"     // Likely to succeed on retry
  | "unexpected"    // Unknown root cause
  | "developer";    // Programming error (type, null deref, etc.)

// ─── Recovery strategies ──────────────────────────────────────────────────────

export type RecoveryStrategyId =
  | "retry_component"         // Reset the error boundary and re-render
  | "reload_local_state"      // Re-read from localStorage
  | "recompute_derived"       // Trigger re-computation of derived state
  | "restore_snapshot"        // Restore a pre-crash snapshot
  | "reset_ui"                // Reset non-critical UI state only
  | "fallback_recommendation" // Use a safe static recommendation
  | "graceful_shutdown";      // Cannot recover — guide user to reload

// ─── Classified error ─────────────────────────────────────────────────────────

export interface ClassifiedError {
  original:    Error;
  category:    ErrorCategory;
  strategyId:  RecoveryStrategyId;
  recoverable: boolean;
  userMessage: string;     // shown in fallback UI
  devNote:     string;     // shown in ErrorDetails (developer only)
}

// ─── Recovery strategy definition ────────────────────────────────────────────

export interface RecoveryStrategyDef {
  id:          RecoveryStrategyId;
  label:       string;
  description: string;
  autoExecute: boolean;    // run without user prompt
  maxAttempts: number;
}

// ─── Error log entry ─────────────────────────────────────────────────────────

export interface ErrorLogEntry {
  id:                string;
  timestamp:         string;         // ISO-8601
  componentLabel?:   string;
  category:          ErrorCategory;
  strategyId:        RecoveryStrategyId;
  recoverable:       boolean;
  recoverySuccess?:  boolean;
  recoveryDurationMs?: number;
  devMessage:        string;         // error.message — developer only
  userMessage:       string;
  retryCount:        number;
}

// ─── Session snapshot ────────────────────────────────────────────────────────

export interface SessionSnapshot {
  capturedAt:  string;             // ISO-8601
  keys:        Record<string, string | null>;  // localStorage key → raw value
}

// ─── Recovery context (passed to strategies) ─────────────────────────────────

export interface RecoveryContext {
  error:          ClassifiedError;
  componentLabel?: string;
  retryCount:     number;
  snapshot?:      SessionSnapshot;
}
