// ─── lib/resilience/ErrorClassifier.ts ───────────────────────────────────────
// Phase 69 — classifies errors so recovery strategies can be applied.

export type ErrorCategory =
  | "storage_corrupted"
  | "storage_quota"
  | "parse_error"
  | "missing_data"
  | "invalid_value"
  | "duplicate_id"
  | "type_mismatch"
  | "session_interrupted"
  | "unknown";

export type ErrorSeverity = "critical" | "high" | "moderate" | "low";

export interface ClassifiedError {
  category:   ErrorCategory;
  severity:   ErrorSeverity;
  message:    string;
  key?:       string;       // localStorage key involved
  raw?:       unknown;      // original error or value
  autoRepair: boolean;      // whether RecoveryManager should attempt automatic repair
}

export function classifyError(err: unknown, key?: string): ClassifiedError {
  if (err instanceof DOMException && err.name === "QuotaExceededError") {
    return { category: "storage_quota",    severity: "critical", message: "Local storage quota exceeded.", key, raw: err, autoRepair: true };
  }
  if (err instanceof SyntaxError || (err instanceof Error && err.message.includes("JSON"))) {
    return { category: "parse_error",      severity: "high",     message: "Corrupt JSON in storage.",     key, raw: err, autoRepair: true };
  }
  if (err instanceof Error) {
    return { category: "unknown",          severity: "moderate", message: err.message,                    key, raw: err, autoRepair: false };
  }
  return {   category: "unknown",          severity: "low",      message: String(err),                    key, raw: err, autoRepair: false };
}

export function classifyValue(
  value: unknown,
  key:   string,
): ClassifiedError | null {
  if (value === null || value === undefined) {
    return { category: "missing_data", severity: "moderate", message: `No value at key "${key}".`, key, raw: value, autoRepair: false };
  }
  if (typeof value === "number" && (isNaN(value) || !isFinite(value))) {
    return { category: "invalid_value", severity: "high", message: `Invalid number at "${key}": ${value}.`, key, raw: value, autoRepair: true };
  }
  return null;
}
