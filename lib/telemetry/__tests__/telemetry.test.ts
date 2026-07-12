// ─── lib/telemetry/__tests__/telemetry.test.ts ────────────────────────────────
// Phase E — Telemetry & Observability test suite
//
// Unit:        TelemetryBus (registry, emit, listeners, timedEmit)
// Typed:       ObservabilityEvents — all 8 typed helpers produce correct properties
// Timeline:    SessionTimeline — build, filter, session summary, latest session
// Integration: safety → telemetry, verification → telemetry,
//              confidence → telemetry, error → telemetry
// Resilience:  corrupt localStorage, large event volume, missing properties
// Regression:  deterministic ordering, no duplicate events

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── localStorage + window double-stub ───────────────────────────────────────
// isClient() in TelemetryCollector checks typeof window !== "undefined"

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { for (const k in store) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key:        (i: number) => Object.keys(store)[i] ?? null,
  };
}

function makeSessionStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { for (const k in store) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key:        (i: number) => Object.keys(store)[i] ?? null,
  };
}

const lsMock   = makeLocalStorageMock();
const ssMock   = makeSessionStorageMock();

vi.stubGlobal("localStorage",   lsMock);
vi.stubGlobal("sessionStorage", ssMock);
vi.stubGlobal("window", { localStorage: lsMock, sessionStorage: ssMock });

// ─── Imports (after stubs) ────────────────────────────────────────────────────

import {
  registerEventType,
  emit,
  timedEmit,
  addBusListener,
  removeBusListener,
  getRegisteredEventTypes,
  isRegisteredEvent,
  type EventTypeMetadata,
} from "../TelemetryBus";

import {
  track,
  getEvents,
  clearTelemetry,
} from "../TelemetryCollector";

import {
  trackSafetyEvaluation,
  trackVerificationRegistered,
  trackVerificationEvaluated,
  trackConfidenceCalculated,
  trackPipelineCompleted,
  trackErrorRecovery,
  trackStorageQuotaWarning,
  trackSessionRestored,
} from "../ObservabilityEvents";

import {
  buildSessionTimeline,
  getAllSessions,
  getSessionSummary,
  filterTimeline,
  getLatestSessionId,
} from "../SessionTimeline";

import type { SafetyResult }       from "@/lib/intelligence/safety/SafetyEngine";
import type { SafetyEvaluation }   from "@/lib/intelligence/safety/SafetyEvaluator";
import type { VerificationRecord } from "@/lib/intelligence/verification/verificationTypes";
import type { ConfidenceProfile }  from "@/lib/intelligence/confidence/ConfidenceTypes";
import type { ErrorLogEntry }      from "@/types/ErrorTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearAll() {
  lsMock.clear();
  ssMock.clear();
}

function makeSafetyResult(constrained = false): SafetyResult {
  const evaluation: SafetyEvaluation = {
    originalVolumeScale:    1.0,
    constrainedVolumeScale: constrained ? 0.7 : 1.0,
    wasConstrained:         constrained,
    results:                [],
    userMessages:           [],
    criticalActivations:    [],
    highActivations:        [],
  };
  return {
    volumeScale: evaluation.constrainedVolumeScale,
    evaluation,
    explanation: { summary: "", recommendations: [] } as any,
  };
}

function makeVerificationRecord(opts: {
  isEvaluated?: boolean;
  score?: number;
} = {}): VerificationRecord {
  return {
    id:                     "vr-test-1",
    recommendationId:       "rec-test-1",
    timestamp:              "2026-06-01",
    evaluationDueDate:      "2026-06-08",
    recommendationClass:    "volume_maintain",
    recommendationSummary:  "Test recommendation",
    supportingSignals:      [],
    expectedOutcome:        { metric: "performance", direction: "improve", timeframe: 7 } as any,
    athleteState:           {} as any,
    algorithmVersion:       "axis-v1.0",
    confidenceAtGeneration: 0.75,
    evaluated:              opts.isEvaluated ?? false,
    ...(opts.isEvaluated && opts.score !== undefined ? {
      verificationScore: opts.score,
      actualOutcome:     { samplesCollected: 3 } as any,
    } : {}),
  } as unknown as VerificationRecord;
}

function makeConfidenceProfile(level: string = "moderate"): ConfidenceProfile {
  return {
    level:           level as any,
    compositeScore:  0.62,
    maturityStage:   "learning" as any,
    generatedAt:     new Date().toISOString(),
    dimensions:      {
      calibration:   { score: 0.6, available: true,  weight: 0.25 },
      verification:  { score: 0.5, available: true,  weight: 0.20 },
      dataCompleteness: { score: 0.7, available: true, weight: 0.20 },
      personalizationMaturity: { score: 0.4, available: true, weight: 0.15 },
      predictionStability:     { score: 0.5, available: false, weight: 0.10 },
      historicalContext:       { score: 0.8, available: true, weight: 0.10 },
    } as any,
  } as unknown as ConfidenceProfile;
}

function makeErrorEntry(): ErrorLogEntry {
  return {
    id:            "err-1",
    timestamp:     new Date().toISOString(),
    componentLabel: "WorkoutCard",
    category:      "rendering",
    strategyId:    "reset_ui",
    recoverable:   true,
    recoverySuccess: true,
    devMessage:    "Test error",
    userMessage:   "Something went wrong",
    retryCount:    0,
  } as unknown as ErrorLogEntry;
}

// ─── 1. TelemetryBus ─────────────────────────────────────────────────────────

describe("TelemetryBus", () => {
  beforeEach(() => clearAll());

  describe("registry", () => {
    it("registers a new event type and retrieves it", () => {
      registerEventType("test_bus_event_1", {
        category: "system",
        description: "Unit test event",
        schema: ["field1"],
      });
      expect(isRegisteredEvent("test_bus_event_1")).toBe(true);
    });

    it("returns false for unknown event types", () => {
      expect(isRegisteredEvent("nonexistent_event_xyz")).toBe(false);
    });

    it("getRegisteredEventTypes returns a copy, not the internal map", () => {
      const map1 = getRegisteredEventTypes();
      const map2 = getRegisteredEventTypes();
      expect(map1).not.toBe(map2);
    });

    it("re-registering overwrites previous metadata", () => {
      registerEventType("test_overwrite_event", {
        category: "system",
        description: "First version",
      });
      registerEventType("test_overwrite_event", {
        category: "health",
        description: "Second version",
      });
      const meta = getRegisteredEventTypes().get("test_overwrite_event");
      expect(meta?.description).toBe("Second version");
      expect(meta?.category).toBe("health");
    });
  });

  describe("emit", () => {
    it("persists event via TelemetryCollector", () => {
      emit("safety_evaluated", {
        wasConstrained: false,
        originalScale:  1.0,
        constrainedScale: 1.0,
        criticalCount:  0,
        highCount:      0,
        durationMs:     5,
      });
      const events = getEvents({ name: "safety_evaluated" });
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].name).toBe("safety_evaluated");
    });

    it("stores properties correctly", () => {
      emit("pipeline_completed", {
        totalDurationMs: 123,
        safetyConstrained: false,
        confidenceLevel: "moderate",
        verificationState: "evaluated",
      });
      const events = getEvents({ name: "pipeline_completed" });
      expect(events[0].properties.totalDurationMs).toBe(123);
      expect(events[0].properties.confidenceLevel).toBe("moderate");
    });

    it("assigns category from CATEGORY_MAP", () => {
      emit("safety_evaluated", { wasConstrained: false });
      const events = getEvents({ name: "safety_evaluated" });
      expect(events[0].category).toBe("system");
    });

    it("health category events get correct category", () => {
      emit("error_recovery_triggered", {
        category: "render_error",
        strategyId: "fallback_ui",
        recoverable: true,
        retryCount: 0,
        componentLabel: "Test",
      });
      const events = getEvents({ name: "error_recovery_triggered" });
      expect(events[0].category).toBe("health");
    });
  });

  describe("listeners", () => {
    it("fires listener when event is emitted", () => {
      const listener = vi.fn();
      addBusListener(listener);
      emit("confidence_calculated", {
        level: "moderate",
        compositeScore: 0.6,
        maturityStage: "developing",
        calibrationAvailable: true,
        verificationAvailable: true,
        durationMs: 3,
      });
      removeBusListener(listener);
      expect(listener).toHaveBeenCalled();
    });

    it("removeBusListener stops future calls", () => {
      const listener = vi.fn();
      addBusListener(listener);
      removeBusListener(listener);
      emit("session_restored", { restoredKeys: "" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("listener exceptions are swallowed — bus continues", () => {
      const broken = vi.fn().mockImplementation(() => { throw new Error("listener crash"); });
      addBusListener(broken);
      expect(() => emit("pipeline_completed", {
        totalDurationMs: 10,
        safetyConstrained: false,
        confidenceLevel: "moderate",
        verificationState: "pending",
      })).not.toThrow();
      removeBusListener(broken);
    });

    it("multiple listeners all fire", () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      addBusListener(l1);
      addBusListener(l2);
      emit("storage_quota_warning", { storageKey: "test", currentSize: 100 });
      removeBusListener(l1);
      removeBusListener(l2);
      expect(l1).toHaveBeenCalled();
      expect(l2).toHaveBeenCalled();
    });
  });

  describe("timedEmit", () => {
    it("returns the wrapped function result", () => {
      const result = timedEmit("verification_evaluated", {
        verificationScore: 4,
        samplesCollected: 2,
        recommendationClass: "workout_intensity",
      }, () => 42);
      expect(result).toBe(42);
    });

    it("emits event with durationMs property", () => {
      timedEmit("verification_evaluated", {
        verificationScore: 3,
        samplesCollected: 1,
        recommendationClass: "recovery",
      }, () => {});
      const events = getEvents({ name: "verification_evaluated" });
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(typeof events[0].properties.durationMs).toBe("number");
    });

    it("records non-negative duration", () => {
      timedEmit("safety_evaluated", { wasConstrained: false }, () => {});
      const events = getEvents({ name: "safety_evaluated" });
      expect(Number(events[0].properties.durationMs)).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── 2. ObservabilityEvents typed helpers ────────────────────────────────────

describe("ObservabilityEvents", () => {
  beforeEach(() => clearAll());

  it("trackSafetyEvaluation — unconstrained", () => {
    trackSafetyEvaluation(makeSafetyResult(false), 8);
    const ev = getEvents({ name: "safety_evaluated" })[0];
    expect(ev.properties.wasConstrained).toBe(false);
    expect(ev.properties.durationMs).toBe(8);
    expect(ev.properties.criticalCount).toBe(0);
  });

  it("trackSafetyEvaluation — constrained", () => {
    trackSafetyEvaluation(makeSafetyResult(true), 12);
    const ev = getEvents({ name: "safety_evaluated" })[0];
    expect(ev.properties.wasConstrained).toBe(true);
    expect(ev.properties.constrainedScale).toBe(0.7);
  });

  it("trackVerificationRegistered — new record", () => {
    trackVerificationRegistered(makeVerificationRecord(), true, 5);
    const ev = getEvents({ name: "verification_registered" })[0];
    expect(ev.properties.isNew).toBe(true);
    expect(ev.properties.recommendationClass).toBe("volume_maintain");
    expect(ev.properties.confidenceAtGeneration).toBe(0.75);
  });

  it("trackVerificationRegistered — reused record", () => {
    trackVerificationRegistered(makeVerificationRecord(), false, 2);
    const ev = getEvents({ name: "verification_registered" })[0];
    expect(ev.properties.isNew).toBe(false);
  });

  it("trackVerificationRegistered — null record is a no-op", () => {
    const before = getEvents({ name: "verification_registered" }).length;
    trackVerificationRegistered(null, true, 1);
    const after = getEvents({ name: "verification_registered" }).length;
    expect(after).toBe(before);
  });

  it("trackVerificationEvaluated — emits score", () => {
    const record = makeVerificationRecord({ isEvaluated: true, score: 5 });
    trackVerificationEvaluated(record);
    const ev = getEvents({ name: "verification_evaluated" })[0];
    expect(ev.properties.verificationScore).toBe(5);
    expect(ev.properties.samplesCollected).toBe(3);
  });

  it("trackVerificationEvaluated — unevaluated record is a no-op", () => {
    const before = getEvents({ name: "verification_evaluated" }).length;
    trackVerificationEvaluated(makeVerificationRecord());
    const after = getEvents({ name: "verification_evaluated" }).length;
    expect(after).toBe(before);
  });

  it("trackConfidenceCalculated — correct level and score", () => {
    trackConfidenceCalculated(makeConfidenceProfile("moderate"), 6);
    const ev = getEvents({ name: "confidence_calculated" })[0];
    expect(ev.properties.level).toBe("moderate");
    expect(ev.properties.compositeScore).toBeCloseTo(0.62, 2);
    expect(ev.properties.durationMs).toBe(6);
  });

  it("trackConfidenceCalculated — calibration availability is recorded", () => {
    trackConfidenceCalculated(makeConfidenceProfile("high"), 4);
    const ev = getEvents({ name: "confidence_calculated" })[0];
    expect(ev.properties.calibrationAvailable).toBe(true);
    expect(ev.properties.verificationAvailable).toBe(true);
  });

  it("trackPipelineCompleted — all fields present", () => {
    trackPipelineCompleted({
      totalDurationMs:    250,
      safetyConstrained:  true,
      confidenceLevel:    "high",
      verificationState:  "pending",
    });
    const ev = getEvents({ name: "pipeline_completed" })[0];
    expect(ev.properties.totalDurationMs).toBe(250);
    expect(ev.properties.safetyConstrained).toBe(true);
    expect(ev.properties.confidenceLevel).toBe("high");
    expect(ev.properties.verificationState).toBe("pending");
  });

  it("trackErrorRecovery — maps ErrorLogEntry fields", () => {
    trackErrorRecovery(makeErrorEntry());
    const ev = getEvents({ name: "error_recovery_triggered" })[0];
    expect(ev.properties.category).toBe("rendering");
    expect(ev.properties.strategyId).toBe("reset_ui");
    expect(ev.properties.recoverable).toBe(true);
    expect(ev.properties.componentLabel).toBe("WorkoutCard");
  });

  it("trackStorageQuotaWarning — stores key and size", () => {
    trackStorageQuotaWarning("axis_history_v1", 4800000);
    const ev = getEvents({ name: "storage_quota_warning" })[0];
    expect(ev.properties.storageKey).toBe("axis_history_v1");
    expect(ev.properties.currentSize).toBe(4800000);
  });

  it("trackSessionRestored — joins keys as comma string", () => {
    trackSessionRestored(["key_a", "key_b", "key_c"]);
    const ev = getEvents({ name: "session_restored" })[0];
    expect(ev.properties.restoredKeys).toBe("key_a,key_b,key_c");
  });

  it("all observability events are categorised correctly", () => {
    clearAll();
    trackSafetyEvaluation(makeSafetyResult(), 1);
    trackVerificationRegistered(makeVerificationRecord(), true, 1);
    trackConfidenceCalculated(makeConfidenceProfile(), 1);
    trackPipelineCompleted({ totalDurationMs: 10, safetyConstrained: false, confidenceLevel: "low", verificationState: "none" });
    trackErrorRecovery(makeErrorEntry());
    trackStorageQuotaWarning("key", 100);
    trackSessionRestored(["k"]);

    const systemEvents = getEvents({ category: "system" });
    const healthEvents  = getEvents({ category: "health" });
    expect(systemEvents.length).toBeGreaterThanOrEqual(4);
    expect(healthEvents.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── 3. SessionTimeline ───────────────────────────────────────────────────────

describe("SessionTimeline", () => {
  beforeEach(() => clearAll());

  it("buildSessionTimeline returns empty array for unknown session", () => {
    const timeline = buildSessionTimeline("sess-nonexistent");
    expect(timeline).toEqual([]);
  });

  it("buildSessionTimeline returns events sorted oldest→newest", () => {
    trackSafetyEvaluation(makeSafetyResult(), 5);
    trackConfidenceCalculated(makeConfidenceProfile(), 3);
    trackPipelineCompleted({ totalDurationMs: 50, safetyConstrained: false, confidenceLevel: "moderate", verificationState: "pending" });

    const sessionId = getLatestSessionId()!;
    const timeline  = buildSessionTimeline(sessionId);
    expect(timeline.length).toBeGreaterThanOrEqual(3);

    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].timestamp >= timeline[i - 1].timestamp).toBe(true);
    }
  });

  it("each TimelineEntry has required fields", () => {
    trackSafetyEvaluation(makeSafetyResult(), 7);
    const sessionId = getLatestSessionId()!;
    const timeline  = buildSessionTimeline(sessionId);
    const entry     = timeline.find(e => e.name === "safety_evaluated")!;
    expect(entry).toBeTruthy();
    expect(typeof entry.eventId).toBe("string");
    expect(typeof entry.summary).toBe("string");
    expect(entry.summary.length).toBeGreaterThan(0);
    expect(entry.category).toBe("system");
    expect(typeof entry.properties).toBe("object");
  });

  it("safety_evaluated summary describes constraint status", () => {
    trackSafetyEvaluation(makeSafetyResult(true), 5);
    const sessionId = getLatestSessionId()!;
    const timeline  = buildSessionTimeline(sessionId);
    const entry     = timeline.find(e => e.name === "safety_evaluated")!;
    expect(entry.summary).toContain("clamped");
  });

  it("confidence_calculated summary includes level", () => {
    trackConfidenceCalculated(makeConfidenceProfile("high"), 4);
    const sessionId = getLatestSessionId()!;
    const timeline  = buildSessionTimeline(sessionId);
    const entry     = timeline.find(e => e.name === "confidence_calculated")!;
    expect(entry.summary).toContain("high");
  });

  it("entries with durationMs in properties expose it on the entry", () => {
    // safety_evaluated passes durationMs as a property → it should appear on the entry
    trackSafetyEvaluation(makeSafetyResult(), 200);
    const sessionId = getLatestSessionId()!;
    const timeline  = buildSessionTimeline(sessionId);
    const entry     = timeline.find(e => e.name === "safety_evaluated")!;
    expect(entry.durationMs).toBe(200);
  });

  it("getAllSessions returns unique session IDs", () => {
    trackSafetyEvaluation(makeSafetyResult(), 1);
    const sessions = getAllSessions();
    const unique   = new Set(sessions);
    expect(unique.size).toBe(sessions.length);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });

  it("getSessionSummary returns null for unknown session", () => {
    expect(getSessionSummary("sess-ghost")).toBeNull();
  });

  it("getSessionSummary counts system events correctly", () => {
    trackSafetyEvaluation(makeSafetyResult(), 1);
    trackConfidenceCalculated(makeConfidenceProfile(), 1);
    trackPipelineCompleted({ totalDurationMs: 30, safetyConstrained: false, confidenceLevel: "moderate", verificationState: "pending" });

    const sessionId = getLatestSessionId()!;
    const summary   = getSessionSummary(sessionId)!;
    expect(summary.systemEvents).toBeGreaterThanOrEqual(3);
    expect(summary.eventCount).toBeGreaterThanOrEqual(3);
  });

  it("getSessionSummary counts health events correctly", () => {
    trackErrorRecovery(makeErrorEntry());
    trackStorageQuotaWarning("key", 100);
    const sessionId = getLatestSessionId()!;
    const summary   = getSessionSummary(sessionId)!;
    expect(summary.errorEvents).toBeGreaterThanOrEqual(2);
  });

  it("getSessionSummary counts safety constraints correctly", () => {
    trackSafetyEvaluation(makeSafetyResult(true),  1);
    trackSafetyEvaluation(makeSafetyResult(false), 1);
    const sessionId = getLatestSessionId()!;
    const summary   = getSessionSummary(sessionId)!;
    expect(summary.safetyConstraints).toBeGreaterThanOrEqual(1);
  });

  it("getSessionSummary extracts confidence levels", () => {
    trackConfidenceCalculated(makeConfidenceProfile("high"), 1);
    trackConfidenceCalculated(makeConfidenceProfile("low"),  1);
    const sessionId = getLatestSessionId()!;
    const summary   = getSessionSummary(sessionId)!;
    expect(summary.confidenceLevels).toContain("high");
    expect(summary.confidenceLevels).toContain("low");
  });

  it("getLatestSessionId returns null when no events exist", () => {
    clearAll();
    expect(getLatestSessionId()).toBeNull();
  });

  it("getLatestSessionId returns the most recent session after emitting", () => {
    trackSafetyEvaluation(makeSafetyResult(), 1);
    const id = getLatestSessionId();
    expect(typeof id).toBe("string");
    expect(id!.startsWith("sess-")).toBe(true);
  });

  describe("filterTimeline", () => {
    it("filter by category keeps only matching entries", () => {
      trackSafetyEvaluation(makeSafetyResult(), 1);
      trackErrorRecovery(makeErrorEntry());
      const sessionId = getLatestSessionId()!;
      const timeline  = buildSessionTimeline(sessionId);
      const filtered  = filterTimeline(timeline, { category: "system" });
      expect(filtered.every(e => e.category === "system")).toBe(true);
    });

    it("filter by name keeps only matching entries", () => {
      trackSafetyEvaluation(makeSafetyResult(), 1);
      trackConfidenceCalculated(makeConfidenceProfile(), 1);
      const sessionId = getLatestSessionId()!;
      const timeline  = buildSessionTimeline(sessionId);
      const filtered  = filterTimeline(timeline, { name: "safety_evaluated" });
      expect(filtered.every(e => e.name === "safety_evaluated")).toBe(true);
    });

    it("filter by since excludes older entries", () => {
      trackSafetyEvaluation(makeSafetyResult(), 1);
      const sessionId = getLatestSessionId()!;
      const timeline  = buildSessionTimeline(sessionId);
      // Filter since far future — nothing passes
      const filtered  = filterTimeline(timeline, { since: "2099-01-01T00:00:00.000Z" });
      expect(filtered.length).toBe(0);
    });

    it("empty opts returns full timeline", () => {
      trackSafetyEvaluation(makeSafetyResult(), 1);
      trackConfidenceCalculated(makeConfidenceProfile(), 1);
      const sessionId = getLatestSessionId()!;
      const timeline  = buildSessionTimeline(sessionId);
      const filtered  = filterTimeline(timeline, {});
      expect(filtered.length).toBe(timeline.length);
    });
  });
});

// ─── 4. Integration — pipeline traces ────────────────────────────────────────

describe("Integration: full pipeline trace", () => {
  beforeEach(() => clearAll());

  it("emits all 4 governance events in sequence", () => {
    trackSafetyEvaluation(makeSafetyResult(false), 10);
    trackVerificationRegistered(makeVerificationRecord(), true, 4);
    trackConfidenceCalculated(makeConfidenceProfile("moderate"), 6);
    trackPipelineCompleted({ totalDurationMs: 25, safetyConstrained: false, confidenceLevel: "moderate", verificationState: "pending" });

    const sessionId = getLatestSessionId()!;
    const timeline  = buildSessionTimeline(sessionId);

    const names = timeline.map(e => e.name);
    expect(names).toContain("safety_evaluated");
    expect(names).toContain("verification_registered");
    expect(names).toContain("confidence_calculated");
    expect(names).toContain("pipeline_completed");
  });

  it("safety constraint propagates correctly to pipeline event", () => {
    trackSafetyEvaluation(makeSafetyResult(true), 10);
    trackConfidenceCalculated(makeConfidenceProfile("low"), 4);
    trackPipelineCompleted({ totalDurationMs: 20, safetyConstrained: true, confidenceLevel: "low", verificationState: "none" });

    const ev = getEvents({ name: "pipeline_completed" })[0];
    expect(ev.properties.safetyConstrained).toBe(true);
  });

  it("error recovery event integrates alongside pipeline events", () => {
    trackSafetyEvaluation(makeSafetyResult(), 5);
    trackErrorRecovery(makeErrorEntry());
    trackPipelineCompleted({ totalDurationMs: 30, safetyConstrained: false, confidenceLevel: "moderate", verificationState: "pending" });

    const sessionId = getLatestSessionId()!;
    const summary   = getSessionSummary(sessionId)!;
    expect(summary.systemEvents).toBeGreaterThanOrEqual(2);
    expect(summary.errorEvents).toBeGreaterThanOrEqual(1);
  });
});

// ─── 5. Resilience ───────────────────────────────────────────────────────────

describe("Resilience", () => {
  it("emitting when localStorage is broken does not throw", () => {
    const brokenLs = {
      getItem:    () => null,
      setItem:    () => { throw new Error("QuotaExceededError"); },
      removeItem: () => {},
      clear:      () => {},
      get length() { return 0; },
      key:        () => null,
    };
    // Temporarily swap storage
    vi.stubGlobal("localStorage", brokenLs);
    vi.stubGlobal("window", { localStorage: brokenLs, sessionStorage: ssMock });
    expect(() => {
      trackSafetyEvaluation(makeSafetyResult(), 5);
    }).not.toThrow();
    // Restore
    vi.stubGlobal("localStorage", lsMock);
    vi.stubGlobal("window", { localStorage: lsMock, sessionStorage: ssMock });
  });

  it("corrupt localStorage data is handled gracefully", () => {
    lsMock.setItem("axis_telemetry_events_v1", "INVALID_JSON{{{{");
    expect(() => getEvents()).not.toThrow();
    expect(getEvents()).toEqual([]);
  });

  it("large event volume is capped at MAX_EVENTS (1000)", () => {
    clearAll();
    for (let i = 0; i < 1010; i++) {
      track("page_viewed", { page: `page-${i}` });
    }
    const events = getEvents();
    expect(events.length).toBeLessThanOrEqual(1000);
  });

  it("filterTimeline on empty timeline returns empty array", () => {
    expect(filterTimeline([], { category: "system" })).toEqual([]);
  });

  it("buildSessionTimeline handles empty event store", () => {
    clearAll();
    expect(buildSessionTimeline("any-session")).toEqual([]);
  });
});

// ─── 6. Regression ───────────────────────────────────────────────────────────

describe("Regression", () => {
  beforeEach(() => clearAll());

  it("identical emits produce distinct events (no dedup)", () => {
    trackSafetyEvaluation(makeSafetyResult(false), 5);
    trackSafetyEvaluation(makeSafetyResult(false), 5);
    const events = getEvents({ name: "safety_evaluated" });
    expect(events.length).toBeGreaterThanOrEqual(2);
    // Each has a unique id
    const ids = events.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("session timeline ordering is stable across multiple calls", () => {
    trackSafetyEvaluation(makeSafetyResult(), 1);
    trackConfidenceCalculated(makeConfidenceProfile(), 1);
    const sessionId = getLatestSessionId()!;
    const t1 = buildSessionTimeline(sessionId).map(e => e.eventId);
    const t2 = buildSessionTimeline(sessionId).map(e => e.eventId);
    expect(t1).toEqual(t2);
  });

  it("trackPipelineCompleted rounds durations to integer", () => {
    trackPipelineCompleted({ totalDurationMs: 123.7, safetyConstrained: false, confidenceLevel: "moderate", verificationState: "pending" });
    const ev = getEvents({ name: "pipeline_completed" })[0];
    expect(Number.isInteger(ev.properties.totalDurationMs)).toBe(true);
  });

  it("trackSafetyEvaluation rounds scale values to 2dp", () => {
    const result = makeSafetyResult(true);
    result.evaluation.originalVolumeScale    = 1.123456;
    result.evaluation.constrainedVolumeScale = 0.700001;
    trackSafetyEvaluation(result, 5);
    const ev = getEvents({ name: "safety_evaluated" })[0];
    expect(String(ev.properties.originalScale).length).toBeLessThanOrEqual(5);
    expect(String(ev.properties.constrainedScale).length).toBeLessThanOrEqual(5);
  });

  it("confidence compositeScore is rounded to 3dp", () => {
    const profile = makeConfidenceProfile("moderate");
    profile.compositeScore = 0.623456789;
    trackConfidenceCalculated(profile, 2);
    const ev = getEvents({ name: "confidence_calculated" })[0];
    const score = Number(ev.properties.compositeScore);
    expect(score).toBeCloseTo(0.623, 3);
    // Not 9 decimal places
    expect(String(score).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
  });
});
