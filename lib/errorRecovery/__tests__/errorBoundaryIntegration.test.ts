// ─── lib/errorRecovery/__tests__/errorBoundaryIntegration.test.ts ────────────
// Phase B Verification — integration tests for the Error Recovery pipeline.
// Tests the end-to-end pipeline WITHOUT the React layer (boundary renders
// require a DOM environment not available in the Node test runner).
//
// Scenarios covered:
//   INT-01  Storage corruption → recovery without data loss
//   INT-02  Repeated failures → maxAttempts enforcement
//   INT-03  Interrupted session detection (workout in progress)
//   INT-04  Snapshot round-trip: capture → data loss → restore
//   INT-05  Telemetry hook fires for every error event
//   INT-06  Full pipeline (classify → record → log → mark complete)
//   INT-07  All 7 classification rules fire on matching inputs
//   INT-08  User messages never expose internal identifiers
//   INT-09  Pipeline performance budget (< 5ms per classify+record cycle)
//   INT-10  Concurrent errors accumulate independently in log

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { classifyError }        from "../ErrorClassifier";
import {
  recordError,
  markRecoveryComplete,
  shouldAutoRecover,
  getErrorLog,
  clearErrorLog,
  registerErrorTelemetryHook,
  classify,
}                                from "../RecoveryManager";
import {
  captureSessionSnapshot,
  saveSessionSnapshot,
  loadSessionSnapshot,
  restoreSessionSnapshot,
  detectInterruptedSession,
  clearSessionSnapshot,
}                                from "../SessionRecovery";
import type { ErrorLogEntry }    from "@/types/ErrorTypes";

// ─── localStorage stub ────────────────────────────────────────────────────────

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
  clearErrorLog();
  clearSessionSnapshot();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── INT-01: Storage corruption → classification + recovery without data loss ─

describe("INT-01: Storage corruption path", () => {
  it("classifies corrupt JSON as a storage error", () => {
    const err = new SyntaxError('Unexpected token < in JSON at position 0');
    const classified = classifyError(err);
    expect(classified.category).toBe("storage");
    expect(classified.strategyId).toBe("reload_local_state");
    expect(classified.recoverable).toBe(true);
  });

  it("classifies QuotaExceededError correctly", () => {
    const err = Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" });
    const classified = classifyError(err);
    expect(classified.category).toBe("storage");
    expect(classified.strategyId).toBe("reload_local_state");
  });

  it("records storage error without losing prior session data", () => {
    store.set("axis_onboarding", JSON.stringify({ name: "Taylor" }));

    const err = Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" });
    recordError(err, "StorageTest", 0);

    // Session data must still be readable after record
    expect(localStorageMock.getItem("axis_onboarding")).toBe(JSON.stringify({ name: "Taylor" }));
  });

  it("snapshot captured during record is persisted and loadable", () => {
    store.set("axis_onboarding", JSON.stringify({ name: "Taylor" }));
    const err = new SyntaxError("Unexpected token in JSON");
    recordError(err, "StorageTest", 0);

    const snap = loadSessionSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.keys["axis_onboarding"]).toBe(JSON.stringify({ name: "Taylor" }));
  });
});

// ─── INT-02: Repeated failures → maxAttempts enforcement ─────────────────────

describe("INT-02: maxAttempts enforcement", () => {
  it("allows retry_component up to 2 (maxAttempts=3, index 0..2)", () => {
    expect(shouldAutoRecover("retry_component", 0)).toBe(true);
    expect(shouldAutoRecover("retry_component", 1)).toBe(true);
    expect(shouldAutoRecover("retry_component", 2)).toBe(true);
  });

  it("blocks retry_component at retryCount=3 (maxAttempts reached)", () => {
    expect(shouldAutoRecover("retry_component", 3)).toBe(false);
  });

  it("blocks graceful_shutdown regardless of retryCount", () => {
    expect(shouldAutoRecover("graceful_shutdown", 0)).toBe(false);
    expect(shouldAutoRecover("graceful_shutdown", 1)).toBe(false);
  });

  it("repeated errors increment retryCount in the log", () => {
    const err = new TypeError("Cannot read props of null");
    recordError(err, "RepeatBoundary", 0);
    recordError(err, "RepeatBoundary", 1);
    recordError(err, "RepeatBoundary", 2);
    const log = getErrorLog().filter(e => e.componentLabel === "RepeatBoundary");
    expect(log).toHaveLength(3);
    expect(log[0].retryCount).toBe(0);
    expect(log[1].retryCount).toBe(1);
    expect(log[2].retryCount).toBe(2);
  });

  it("third failure is classified as non-auto-recoverable via strategy check", () => {
    const err = new TypeError("Cannot read props of null");
    recordError(err, "MaxBoundary", 2);
    const log = getErrorLog();
    const last = log[log.length - 1];
    // The strategy says maxAttempts=3; at retryCount=3 (next attempt) it blocks
    expect(shouldAutoRecover(last.strategyId, last.retryCount + 1)).toBe(false);
  });
});

// ─── INT-03: Interrupted session detection ────────────────────────────────────

describe("INT-03: Interrupted session detection", () => {
  it("returns false when no workout log exists", () => {
    expect(detectInterruptedSession()).toBe(false);
  });

  it("returns true when workout log has today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    store.set("axis_workout_log_v1", JSON.stringify([
      { date: today, exerciseName: "Back Squat", sets: [{ reps: 5, weight: 80 }] },
    ]));
    expect(detectInterruptedSession()).toBe(true);
  });

  it("returns false for historical-only workout entries", () => {
    store.set("axis_workout_log_v1", JSON.stringify([
      { date: "2024-01-10", exerciseName: "Back Squat" },
      { date: "2024-01-11", exerciseName: "RDL" },
    ]));
    expect(detectInterruptedSession()).toBe(false);
  });

  it("returns false for corrupt workout log (graceful)", () => {
    store.set("axis_workout_log_v1", "<<CORRUPT>>");
    expect(detectInterruptedSession()).toBe(false);
  });

  it("returns false for empty workout log array", () => {
    store.set("axis_workout_log_v1", JSON.stringify([]));
    expect(detectInterruptedSession()).toBe(false);
  });
});

// ─── INT-04: Snapshot round-trip ─────────────────────────────────────────────

describe("INT-04: Snapshot round-trip (capture → data loss → restore)", () => {
  it("restores all session-critical keys after simulated data loss", () => {
    const sessionData: Record<string, string> = {
      "axis_onboarding":          JSON.stringify({ name: "Jordan" }),
      "axis_checkin_v1":          JSON.stringify({ fatigue: 3 }),
      "axis_daily_symptoms_v1":   JSON.stringify(["cramps"]),
      "axis_history_v1":          JSON.stringify([{ id: "wkt-1" }]),
      "axis_readiness_history_v1": JSON.stringify([{ score: 72 }]),
      "axis_recovery_scores":     JSON.stringify([{ score: 65 }]),
      "axis_workout_log_v1":      JSON.stringify([{ date: "2024-06-01" }]),
    };
    for (const [k, v] of Object.entries(sessionData)) store.set(k, v);

    const snap = captureSessionSnapshot();
    expect(Object.keys(snap.keys)).toHaveLength(7);

    // Simulate data loss
    store.clear();
    expect(localStorageMock.getItem("axis_onboarding")).toBeNull();

    // Restore
    restoreSessionSnapshot(snap);

    for (const [k, v] of Object.entries(sessionData)) {
      expect(localStorageMock.getItem(k)).toBe(v);
    }
  });

  it("non-destructive restore: skips null values, does not corrupt existing data", () => {
    const snap = captureSessionSnapshot();  // all keys null (store is empty)
    store.set("axis_onboarding", JSON.stringify({ name: "Alex" }));
    restoreSessionSnapshot(snap);  // null values should not overwrite Alex
    expect(localStorageMock.getItem("axis_onboarding")).toBe(JSON.stringify({ name: "Alex" }));
  });

  it("snapshot has ISO-8601 capturedAt", () => {
    const snap = captureSessionSnapshot();
    expect(snap.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("saved snapshot survives store round-trip and loads correctly", () => {
    store.set("axis_onboarding", JSON.stringify({ name: "Sam" }));
    const snap = captureSessionSnapshot();
    saveSessionSnapshot(snap);

    const loaded = loadSessionSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded!.keys["axis_onboarding"]).toBe(JSON.stringify({ name: "Sam" }));
  });

  it("loadSessionSnapshot returns null when storage is empty", () => {
    expect(loadSessionSnapshot()).toBeNull();
  });
});

// ─── INT-05: Telemetry hook fires for every error ────────────────────────────

describe("INT-05: Telemetry hook", () => {
  afterEach(() => {
    // Always deregister after test to avoid leaking into other tests
    registerErrorTelemetryHook(null as never);
  });

  it("fires exactly once per recordError call", () => {
    const hook = vi.fn();
    registerErrorTelemetryHook(hook);
    recordError(new Error("hook test"), "TelemetryBoundary", 0);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it("hook receives an ErrorLogEntry with all required fields", () => {
    const hook = vi.fn();
    registerErrorTelemetryHook(hook);
    recordError(new TypeError("Cannot read foo"), "TelemetryBoundary", 0);

    const entry: ErrorLogEntry = hook.mock.calls[0][0];
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.category).toBeTruthy();
    expect(entry.strategyId).toBeTruthy();
    expect(typeof entry.recoverable).toBe("boolean");
    expect(entry.devMessage).toBeTruthy();
    expect(entry.userMessage).toBeTruthy();
    expect(entry.componentLabel).toBe("TelemetryBoundary");
  });

  it("fires for each error independently", () => {
    const hook = vi.fn();
    registerErrorTelemetryHook(hook);
    recordError(new Error("first"),  "C1", 0);
    recordError(new Error("second"), "C2", 0);
    recordError(new Error("third"),  "C3", 0);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  it("does not fire when no hook is registered", () => {
    // No hook registered — recordError should not throw
    expect(() => recordError(new Error("no hook"), "C1", 0)).not.toThrow();
  });
});

// ─── INT-06: Full pipeline (classify → record → log → mark complete) ─────────

describe("INT-06: Full error lifecycle pipeline", () => {
  it("complete cycle logs entry then marks it resolved", () => {
    const err = new TypeError("Cannot read props of null");
    const entry = recordError(err, "DashboardCard", 0);

    expect(entry.recoverySuccess).toBeUndefined();
    expect(entry.recoveryDurationMs).toBeUndefined();

    markRecoveryComplete("DashboardCard", true, 38);

    const log = getErrorLog();
    const resolved = log.find(e => e.id === entry.id);
    expect(resolved?.recoverySuccess).toBe(true);
    expect(resolved?.recoveryDurationMs).toBe(38);
  });

  it("failed recovery is also recorded faithfully", () => {
    recordError(new Error("render fail"), "WorkoutCard", 0);
    markRecoveryComplete("WorkoutCard", false, 5000);

    const log = getErrorLog();
    const last = log[log.length - 1];
    expect(last.recoverySuccess).toBe(false);
  });

  it("log survives multiple pipeline cycles", () => {
    for (let i = 0; i < 5; i++) {
      recordError(new Error(`err-${i}`), `Comp${i}`, 0);
    }
    expect(getErrorLog()).toHaveLength(5);
  });
});

// ─── INT-07: All 7 classification rules ──────────────────────────────────────

describe("INT-07: All classification rules fire", () => {
  it("Rule 1 — QuotaExceededError → storage / reload_local_state", () => {
    const c = classifyError(Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" }));
    expect(c.category).toBe("storage");
    expect(c.strategyId).toBe("reload_local_state");
  });

  it("Rule 2 — JSON parse error → storage / reload_local_state", () => {
    const c = classifyError(new SyntaxError("Unexpected token < in JSON at position 0"));
    expect(c.category).toBe("storage");
    expect(c.strategyId).toBe("reload_local_state");
  });

  it("Rule 3 — NetworkError → network / retry_component", () => {
    const err = Object.assign(new Error("fetch failed"), { name: "NetworkError" });
    const c = classifyError(err);
    expect(c.category).toBe("network");
    expect(c.strategyId).toBe("retry_component");
  });

  it("Rule 4 — TypeError null/undefined → rendering / retry_component", () => {
    const c = classifyError(new TypeError("Cannot read properties of null"));
    expect(c.category).toBe("rendering");
    expect(c.strategyId).toBe("retry_component");
    expect(c.recoverable).toBe(true);
  });

  it("Rule 5 — Minified React error → rendering / retry_component", () => {
    const c = classifyError(new Error("Minified React error #321; visit https://reactjs.org/docs/error-decoder.html"));
    expect(c.category).toBe("rendering");
    expect(c.strategyId).toBe("retry_component");
  });

  it("Rule 6 — RangeError → transient / recompute_derived", () => {
    const c = classifyError(new RangeError("Maximum call stack size exceeded"));
    expect(c.category).toBe("transient");
    expect(c.strategyId).toBe("recompute_derived");
  });

  it("Rule 7 — AssertionError → developer / retry_component (recoverable=false)", () => {
    const err = Object.assign(new Error("assertion failed"), { name: "AssertionError" });
    const c = classifyError(err);
    expect(c.category).toBe("developer");
    expect(c.recoverable).toBe(false);
  });

  it("Default — unknown error → unexpected / retry_component", () => {
    const c = classifyError(new Error("completely unknown error xyz"));
    expect(c.category).toBe("unexpected");
    expect(c.strategyId).toBe("retry_component");
    expect(c.recoverable).toBe(true);
  });
});

// ─── INT-08: User messages never expose internal identifiers ──────────────────

describe("INT-08: User message safety", () => {
  const sensitivePatterns = [
    /TypeError/i,
    /RangeError/i,
    /SyntaxError/i,
    /undefined/i,
    /null/,
    /localStorage/i,
    /axis_/i,
    /volumeScale/i,
    /readiness/i,
    /safetyResult/i,
    /stack/i,
    /\bat\s+\w+/,    // stack trace "at function" patterns
  ];

  const testErrors = [
    new TypeError("Cannot read properties of null (reading 'volumeScale')"),
    new RangeError("Invalid array length"),
    new SyntaxError("Unexpected token < in JSON at position 0"),
    new Error("localStorage.getItem is not a function"),
    Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" }),
    new Error("safetyResult was undefined"),
    new Error("completely unknown crash"),
  ];

  for (const err of testErrors) {
    it(`userMessage clean for: ${err.message.slice(0, 50)}`, () => {
      const classified = classifyError(err);
      for (const pattern of sensitivePatterns) {
        expect(classified.userMessage).not.toMatch(pattern);
      }
    });
  }
});

// ─── INT-09: Performance budget ───────────────────────────────────────────────

describe("INT-09: Pipeline performance budget", () => {
  it("classify+record cycle averages < 5ms over 50 iterations", () => {
    const err = new TypeError("Cannot read props of null");
    const N = 50;

    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      recordError(err, `PerfTest${i}`, 0);
    }
    const elapsed = Date.now() - t0;
    const avgMs = elapsed / N;

    // Budget: 5ms per cycle (well under user-perceivable threshold)
    expect(avgMs).toBeLessThan(5);
  });

  it("classify alone averages < 1ms over 100 iterations", () => {
    const err = new TypeError("Cannot read props of null");
    const N = 100;

    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      classifyError(err);
    }
    const elapsed = Date.now() - t0;
    const avgMs = elapsed / N;

    expect(avgMs).toBeLessThan(1);
  });

  it("snapshot capture averages < 2ms over 50 iterations", () => {
    store.set("axis_onboarding", JSON.stringify({ name: "Perf" }));
    const N = 50;

    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      captureSessionSnapshot();
    }
    const elapsed = Date.now() - t0;
    const avgMs = elapsed / N;

    expect(avgMs).toBeLessThan(2);
  });
});

// ─── INT-10: Concurrent errors accumulate independently ───────────────────────

describe("INT-10: Independent concurrent error accumulation", () => {
  it("errors from different components do not collide in the log", () => {
    // Each error maps to a distinct category via the classification rules
    recordError(new TypeError("Cannot read properties of null (reading 'score')"), "CardA", 0);
    recordError(new RangeError("Invalid array length"), "CardB", 0);
    recordError(new Error("completely unknown error xyz"), "CardC", 0);

    const log = getErrorLog();
    expect(log).toHaveLength(3);

    const byComponent = Object.fromEntries(log.map(e => [e.componentLabel!, e]));
    expect(byComponent["CardA"].category).toBe("rendering");
    expect(byComponent["CardB"].category).toBe("transient");
    expect(byComponent["CardC"].category).toBe("unexpected");
  });

  it("markRecoveryComplete updates only the target component", () => {
    recordError(new Error("a"), "Comp1", 0);
    recordError(new Error("b"), "Comp2", 0);
    markRecoveryComplete("Comp1", true, 12);

    const log = getErrorLog();
    const comp1 = log.find(e => e.componentLabel === "Comp1")!;
    const comp2 = log.find(e => e.componentLabel === "Comp2")!;

    expect(comp1.recoverySuccess).toBe(true);
    expect(comp2.recoverySuccess).toBeUndefined();
  });

  it("IDs are unique across concurrent entries", () => {
    for (let i = 0; i < 20; i++) {
      recordError(new Error(`err-${i}`), "UniqueTest", 0);
    }
    const log = getErrorLog();
    const ids = log.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
