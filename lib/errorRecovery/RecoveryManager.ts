// ─── lib/errorRecovery/RecoveryManager.ts ────────────────────────────────────
// Phase B — Orchestrates error classification, strategy selection, logging,
// and telemetry hook exposure.
// Independent of React — can be tested without a browser environment.

import { classifyError }           from "./ErrorClassifier";
import { getStrategy }              from "./RecoveryRegistry";
import { captureSessionSnapshot, saveSessionSnapshot } from "./SessionRecovery";
import type {
  ClassifiedError,
  ErrorLogEntry,
  RecoveryContext,
  RecoveryStrategyId,
} from "@/types/ErrorTypes";

// ─── Persistence ──────────────────────────────────────────────────────────────

const LOG_KEY     = "axis_error_recovery_log_v1";
const MAX_ENTRIES = 100;

function isClient(): boolean { return typeof window !== "undefined"; }

function loadLog(): ErrorLogEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as ErrorLogEntry[]) : [];
  } catch { return []; }
}

function saveLog(entries: ErrorLogEntry[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {}
}

// ─── Telemetry hook (Phase E integration point) ───────────────────────────────

type TelemetryHook = (entry: ErrorLogEntry) => void;
let telemetryHook: TelemetryHook | null = null;

/** Register a telemetry callback. Called by Phase E when it initialises. */
export function registerErrorTelemetryHook(hook: TelemetryHook): void {
  telemetryHook = hook;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Classify a raw Error and return structured classification. */
export function classify(error: Error): ClassifiedError {
  return classifyError(error);
}

/**
 * Determine how many times this error has been encountered during this
 * browser session (for max-attempt enforcement).
 */
export function getRetryCount(componentLabel: string): number {
  const log = loadLog();
  const today = new Date().toISOString().slice(0, 10);
  return log.filter(e => e.componentLabel === componentLabel && e.timestamp.startsWith(today)).length;
}

/**
 * Decide whether to attempt automatic recovery given the strategy definition
 * and how many times recovery has already been attempted.
 */
export function shouldAutoRecover(
  strategyId: RecoveryStrategyId,
  retryCount: number,
): boolean {
  const strategy = getStrategy(strategyId);
  if (!strategy) return false;
  return strategy.autoExecute && retryCount < strategy.maxAttempts;
}

/**
 * Log an error event, fire telemetry, and take a pre-recovery session snapshot.
 * Returns the log entry for use by the boundary.
 */
export function recordError(
  error: Error,
  componentLabel: string | undefined,
  retryCount: number,
): ErrorLogEntry {
  const classified = classify(error);

  // Capture a snapshot before recovery mutates any state
  const snapshot = captureSessionSnapshot();
  saveSessionSnapshot(snapshot);

  const entry: ErrorLogEntry = {
    id:            `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp:     new Date().toISOString(),
    componentLabel,
    category:      classified.category,
    strategyId:    classified.strategyId,
    recoverable:   classified.recoverable,
    devMessage:    classified.devNote,
    userMessage:   classified.userMessage,
    retryCount,
  };

  const log = loadLog();
  log.push(entry);
  saveLog(log);

  telemetryHook?.(entry);

  return entry;
}

/** Mark the most recent entry for a component as resolved. */
export function markRecoveryComplete(
  componentLabel: string | undefined,
  success: boolean,
  durationMs: number,
): void {
  const log = loadLog();
  const idx = log.findLastIndex(e => e.componentLabel === componentLabel);
  if (idx !== -1) {
    log[idx] = { ...log[idx], recoverySuccess: success, recoveryDurationMs: durationMs };
    saveLog(log);
  }
}

/** Return the full error log (developer tools use). */
export function getErrorLog(): ErrorLogEntry[] {
  return loadLog();
}

/** Clear the error log (for testing or manual reset). */
export function clearErrorLog(): void {
  if (!isClient()) return;
  try { localStorage.removeItem(LOG_KEY); } catch {}
}

/** Build a RecoveryContext for a boundary to pass to strategies. */
export function buildRecoveryContext(
  error: Error,
  componentLabel: string | undefined,
  retryCount: number,
): RecoveryContext {
  const classified = classify(error);
  const snapshot   = captureSessionSnapshot();
  return { error: classified, componentLabel, retryCount, snapshot };
}
