// ─── lib/errorRecovery/__tests__/errorRecovery.test.ts ───────────────────────
// Phase B — Verification tests for the Error Recovery framework.
// Run: npm test

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { classifyError }              from "../ErrorClassifier";
import { BUILT_IN_STRATEGIES, getStrategy } from "../RecoveryStrategies";
import {
  registerStrategy,
  deregisterStrategy,
  getStrategy as registryGet,
  getAllStrategies,
}                                     from "../RecoveryRegistry";
import {
  classify,
  recordError,
  markRecoveryComplete,
  shouldAutoRecover,
  getErrorLog,
  clearErrorLog,
  registerErrorTelemetryHook,
}                                     from "../RecoveryManager";
import {
  captureSessionSnapshot,
  restoreSessionSnapshot,
  detectInterruptedSession,
  clearSessionSnapshot,
}                                     from "../SessionRecovery";
import type { RecoveryStrategyDef }   from "@/types/ErrorTypes";

// ─── localStorage stub ────────────────────────────────────────────────────────
// Node.js doesn't have localStorage; vitest doesn't provide it by default.
// Provide a minimal in-memory stub so persistence tests can run.

const store = new Map<string, string>();
const localStorageMock = {
  getItem:    (k: string) => store.get(k) ?? null,
  setItem:    (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear:      () => store.clear(),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", { localStorage: localStorageMock });
  vi.stubGlobal("performance", { now: () => Date.now() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── ErrorClassifier ───────────────────────────────────────────────────────────

describe("ErrorClassifier", () => {
  it("classifies QuotaExceededError as storage", () => {
    const err = Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" });
    const c = classifyError(err);
    expect(c.category).toBe("storage");
    expect(c.recoverable).toBe(true);
  });

  it("classifies JSON parse error as storage", () => {
    const err = new Error("Unexpected token in JSON");
    const c = classifyError(err);
    expect(c.category).toBe("storage");
  });

  it("classifies null dereference TypeError as rendering", () => {
    const err = new TypeError("Cannot read properties of null");
    const c = classifyError(err);
    expect(c.category).toBe("rendering");
    expect(c.strategyId).toBe("retry_component");
    expect(c.recoverable).toBe(true);
  });

  it("classifies RangeError as transient", () => {
    const err = new RangeError("Maximum call stack size exceeded");
    const c = classifyError(err);
    expect(c.category).toBe("transient");
    expect(c.strategyId).toBe("recompute_derived");
  });

  it("classifies unknown errors as unexpected with retry strategy", () => {
    const err = new Error("some completely unknown thing happened");
    const c = classifyError(err);
    expect(c.category).toBe("unexpected");
    expect(c.strategyId).toBe("retry_component");
    expect(c.recoverable).toBe(true);
  });

  it("populates devNote with error name and message", () => {
    const err = new TypeError("Cannot read foo of undefined");
    const c = classifyError(err);
    expect(c.devNote).toContain("TypeError");
    expect(c.devNote).toContain("Cannot read foo");
  });

  it("user message never contains stack trace or component names", () => {
    const err = new TypeError("Cannot read props of null (reading 'volumeScale')");
    const c = classifyError(err);
    expect(c.userMessage).not.toContain("volumeScale");
    expect(c.userMessage).not.toContain("TypeError");
    expect(c.userMessage).not.toContain("null");
  });

  it("is deterministic — same error always classifies identically", () => {
    const err = new TypeError("Cannot read properties of undefined");
    const a = classifyError(err);
    const b = classifyError(err);
    expect(a.category).toBe(b.category);
    expect(a.strategyId).toBe(b.strategyId);
    expect(a.recoverable).toBe(b.recoverable);
  });
});

// ── RecoveryStrategies ────────────────────────────────────────────────────────

describe("RecoveryStrategies", () => {
  it("defines all 7 built-in strategy ids", () => {
    const ids = BUILT_IN_STRATEGIES.map(s => s.id);
    expect(ids).toContain("retry_component");
    expect(ids).toContain("reload_local_state");
    expect(ids).toContain("recompute_derived");
    expect(ids).toContain("restore_snapshot");
    expect(ids).toContain("reset_ui");
    expect(ids).toContain("fallback_recommendation");
    expect(ids).toContain("graceful_shutdown");
  });

  it("graceful_shutdown has autoExecute=false", () => {
    const shutdown = BUILT_IN_STRATEGIES.find(s => s.id === "graceful_shutdown")!;
    expect(shutdown.autoExecute).toBe(false);
  });

  it("retry_component has maxAttempts=3", () => {
    const retry = BUILT_IN_STRATEGIES.find(s => s.id === "retry_component")!;
    expect(retry.maxAttempts).toBe(3);
  });

  it("getStrategy returns the correct definition", () => {
    const s = getStrategy("retry_component");
    expect(s?.id).toBe("retry_component");
  });

  it("getStrategy returns undefined for unknown id", () => {
    expect(getStrategy("unknown_strategy" as never)).toBeUndefined();
  });
});

// ── RecoveryRegistry ──────────────────────────────────────────────────────────

describe("RecoveryRegistry", () => {
  it("all built-in strategies are pre-registered", () => {
    const all = getAllStrategies();
    const ids = all.map(s => s.id);
    expect(ids).toContain("retry_component");
    expect(ids).toContain("graceful_shutdown");
  });

  it("allows registering a new strategy", () => {
    const custom: RecoveryStrategyDef = {
      id:          "reset_ui",  // override existing
      label:       "Custom Reset",
      description: "Custom override",
      autoExecute: true,
      maxAttempts: 5,
    };
    registerStrategy(custom);
    expect(registryGet("reset_ui")?.maxAttempts).toBe(5);
    // Reset back to built-in for other tests
    const original = BUILT_IN_STRATEGIES.find(s => s.id === "reset_ui")!;
    registerStrategy(original);
  });

  it("does not allow deregistering built-in strategies", () => {
    deregisterStrategy("retry_component");
    expect(registryGet("retry_component")).toBeDefined();
  });
});

// ── RecoveryManager ───────────────────────────────────────────────────────────

describe("RecoveryManager.classify", () => {
  it("returns a ClassifiedError with all required fields", () => {
    const result = classify(new TypeError("Cannot read props of null"));
    expect(result.category).toBeDefined();
    expect(result.strategyId).toBeDefined();
    expect(result.recoverable).toBeDefined();
    expect(result.userMessage).toBeDefined();
    expect(result.devNote).toBeDefined();
  });
});

describe("RecoveryManager.shouldAutoRecover", () => {
  it("returns true for retry_component when under maxAttempts", () => {
    expect(shouldAutoRecover("retry_component", 0)).toBe(true);
    expect(shouldAutoRecover("retry_component", 2)).toBe(true);
  });

  it("returns false when retryCount >= maxAttempts", () => {
    expect(shouldAutoRecover("retry_component", 3)).toBe(false);
  });

  it("returns false for graceful_shutdown (autoExecute=false)", () => {
    expect(shouldAutoRecover("graceful_shutdown", 0)).toBe(false);
  });
});

describe("RecoveryManager.recordError", () => {
  beforeEach(() => clearErrorLog());

  it("creates a log entry with all required fields", () => {
    const err = new TypeError("Cannot read null");
    const entry = recordError(err, "TestComponent", 0);
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.componentLabel).toBe("TestComponent");
    expect(entry.category).toBeDefined();
    expect(entry.strategyId).toBeDefined();
    expect(entry.recoverable).toBeDefined();
    expect(entry.devMessage).toContain("TypeError");
    expect(entry.userMessage).toBeTruthy();
    expect(entry.retryCount).toBe(0);
  });

  it("persists the entry to the log", () => {
    recordError(new Error("test"), "C1", 0);
    const log = getErrorLog();
    expect(log.length).toBe(1);
  });

  it("accumulates multiple entries", () => {
    recordError(new Error("a"), "C1", 0);
    recordError(new Error("b"), "C1", 1);
    expect(getErrorLog().length).toBe(2);
  });

  it("fires the telemetry hook when registered", () => {
    const hook = vi.fn();
    registerErrorTelemetryHook(hook);
    recordError(new Error("hook test"), "C2", 0);
    expect(hook).toHaveBeenCalledOnce();
    // Deregister so other tests aren't affected
    registerErrorTelemetryHook(null as never);
  });
});

describe("RecoveryManager.markRecoveryComplete", () => {
  beforeEach(() => clearErrorLog());

  it("updates the most recent entry with recovery outcome", () => {
    recordError(new Error("test"), "TestComp", 0);
    markRecoveryComplete("TestComp", true, 42);
    const log = getErrorLog();
    const last = log[log.length - 1];
    expect(last.recoverySuccess).toBe(true);
    expect(last.recoveryDurationMs).toBe(42);
  });
});

// ── SessionRecovery ───────────────────────────────────────────────────────────

describe("SessionRecovery", () => {
  beforeEach(() => {
    clearSessionSnapshot();
  });

  it("captureSessionSnapshot returns an object with capturedAt and keys", () => {
    const snap = captureSessionSnapshot();
    expect(typeof snap.capturedAt).toBe("string");
    expect(typeof snap.keys).toBe("object");
  });

  it("snapshot keys include session-critical localStorage entries", () => {
    store.set("axis_onboarding", JSON.stringify({ name: "test" }));
    const snap = captureSessionSnapshot();
    expect(snap.keys["axis_onboarding"]).toBe(JSON.stringify({ name: "test" }));
  });

  it("restoreSessionSnapshot writes non-null values back", () => {
    store.set("axis_onboarding", JSON.stringify({ x: 1 }));
    const snap = captureSessionSnapshot();
    store.delete("axis_onboarding");  // simulate data loss
    expect(localStorageMock.getItem("axis_onboarding")).toBeNull();
    restoreSessionSnapshot(snap);
    expect(localStorageMock.getItem("axis_onboarding")).toBe(JSON.stringify({ x: 1 }));
  });

  it("detectInterruptedSession returns false with empty storage", () => {
    expect(detectInterruptedSession()).toBe(false);
  });

  it("detectInterruptedSession returns true when a today workout log entry exists", () => {
    const today = new Date().toISOString().slice(0, 10);
    store.set("axis_workout_log_v1", JSON.stringify([{ date: today, exerciseName: "Squat" }]));
    expect(detectInterruptedSession()).toBe(true);
  });

  it("detectInterruptedSession returns false for entries from other days", () => {
    store.set("axis_workout_log_v1", JSON.stringify([{ date: "2020-01-01", exerciseName: "Squat" }]));
    expect(detectInterruptedSession()).toBe(false);
  });
});
