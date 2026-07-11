// ─── lib/errorRecovery/ErrorClassifier.ts ────────────────────────────────────
// Phase B — Classify a raw Error into a category and recovery strategy.
// All classification is deterministic: same error → same classification.

import type { ErrorCategory, RecoveryStrategyId, ClassifiedError } from "@/types/ErrorTypes";

// ─── Classification table ─────────────────────────────────────────────────────

interface ClassificationRule {
  test:       (error: Error) => boolean;
  category:   ErrorCategory;
  strategyId: RecoveryStrategyId;
  recoverable: boolean;
  userMessage: string;
}

const RULES: ClassificationRule[] = [
  // Storage errors — quota exceeded or parse failures
  {
    test: (e) => e.name === "QuotaExceededError" || e.message.includes("QuotaExceeded"),
    category:    "storage",
    strategyId:  "reload_local_state",
    recoverable: true,
    userMessage: "Storage is full. Some data may not have been saved.",
  },
  {
    test: (e) => e.message.includes("JSON") || e.message.includes("Unexpected token"),
    category:    "storage",
    strategyId:  "reload_local_state",
    recoverable: true,
    userMessage: "A data format issue was detected. Axis has reloaded your information.",
  },
  // Network errors
  {
    test: (e) =>
      e.name === "NetworkError" ||
      e.name === "AbortError" ||
      e.message.includes("fetch") ||
      e.message.includes("network"),
    category:    "network",
    strategyId:  "retry_component",
    recoverable: true,
    userMessage: "A connection issue occurred. Please check your network and try again.",
  },
  // Common null / undefined dereference — usually transient render state race
  {
    test: (e) =>
      e instanceof TypeError &&
      (e.message.includes("Cannot read prop") ||
        e.message.includes("null") ||
        e.message.includes("undefined")),
    category:    "rendering",
    strategyId:  "retry_component",
    recoverable: true,
    userMessage: "A display error occurred. Axis has recovered automatically.",
  },
  // Minified React internal errors
  {
    test: (e) => e.message.startsWith("Minified React error"),
    category:    "rendering",
    strategyId:  "retry_component",
    recoverable: true,
    userMessage: "A display error occurred. Axis has recovered automatically.",
  },
  // Range errors — usually an algorithm received an out-of-range value
  {
    test: (e) => e instanceof RangeError,
    category:    "transient",
    strategyId:  "recompute_derived",
    recoverable: true,
    userMessage: "Axis encountered a calculation error and has recalculated.",
  },
  // Explicit developer / programming errors
  {
    test: (e) => e.name === "AssertionError" || e.message.includes("assertion"),
    category:    "developer",
    strategyId:  "retry_component",
    recoverable: false,
    userMessage: "An unexpected error occurred. Your data is safe.",
  },
];

// ─── Default fallback ─────────────────────────────────────────────────────────

const DEFAULT: Omit<ClassificationRule, "test"> = {
  category:    "unexpected",
  strategyId:  "retry_component",
  recoverable: true,
  userMessage: "Something unexpected happened. Your data is safe.",
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function classifyError(error: Error): ClassifiedError {
  const rule = RULES.find(r => r.test(error)) ?? DEFAULT;
  return {
    original:    error,
    category:    rule.category,
    strategyId:  rule.strategyId,
    recoverable: rule.recoverable,
    userMessage: rule.userMessage,
    devNote:     `${error.name}: ${error.message}`,
  };
}
