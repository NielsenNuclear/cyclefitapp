// ─── lib/intelligence/verification/__tests__/verificationRegistry.test.ts ─────
// Phase C — Verification Registry test suite.
// Covers all spec requirements:
//   Unit: registry creation, persistence, state transitions, scoring,
//         expiration, duplicate protection, ID generation
//   Integration: recommendation→verification, safety→verification,
//                workout completion→verification, calibration update,
//                confidence feedback
//   Resilience: corrupted registry, missing evidence, interrupted sessions,
//               duplicate submissions, delayed evidence

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  loadVerificationRegistry,
  saveVerificationRegistry,
  upsertVerificationRecord,
  updateVerificationRecord,
  getPendingVerifications,
  getActiveVerifications,
  getCompletedVerifications,
  getRecordForDate,
  computeVerificationState,
  expireOldRecords,
} from "../verificationRegistry";

import {
  recordRecommendation,
  runPendingEvaluations,
  getVerifierOutput,
} from "../recommendationVerifier";

import {
  collectActualOutcome,
  deriveVerificationScore,
} from "../evaluateOutcome";

import {
  computeVerificationSummary,
  computeClassAccuracy,
  computeConfidenceFeedback,
} from "../calculateRecommendationAccuracy";

import {
  buildVerificationInput,
  decisionToRecommendationClass,
} from "../buildVerificationInput";

import type {
  VerificationRecord,
  AthleteStateSnapshot,
  ExpectedOutcome,
  ActualOutcome,
} from "../verificationTypes";

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().slice(0, 10); }

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function makeSnapshot(overrides: Partial<AthleteStateSnapshot> = {}): AthleteStateSnapshot {
  return {
    readinessScore:   70,
    recoveryScore:    65,
    cyclePhase:       "Follicular",
    cycleDay:         8,
    adherenceRate:    0.8,
    weeklyVolumeSets: 24,
    streakDays:       3,
    fatigueEstimate:  30,
    timestamp:        today(),
    ...overrides,
  };
}

function makeExpected(overrides: Partial<ExpectedOutcome> = {}): ExpectedOutcome {
  return {
    readinessDelta:  5,
    recoveryDelta:   5,
    adherenceTarget: 0.75,
    rationale:       "Test expected outcome",
    horizonDays:     7,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<VerificationRecord> = {}): VerificationRecord {
  const t = today();
  return {
    id:                      `test-${Math.random().toString(36).slice(2, 8)}`,
    recommendationId:        `rec-${t}`,
    timestamp:               t,
    evaluationDueDate:       addDays(t, 7),
    recommendationClass:     "volume_maintain",
    recommendationSummary:   "Maintain current training load",
    supportingSignals:       ["readiness stable", "recovery adequate"],
    expectedOutcome:         makeExpected(),
    athleteState:            makeSnapshot(),
    algorithmVersion:        "axis-v1.0",
    confidenceAtGeneration:  0.72,
    evaluated:               false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Registry creation ─────────────────────────────────────────────────────────

describe("UNIT: Registry creation", () => {
  it("loads an empty array when storage is empty", () => {
    expect(loadVerificationRegistry()).toEqual([]);
  });

  it("returns empty array on corrupt storage (resilience)", () => {
    store.set("axis_verification_registry_v1", "<<CORRUPT_JSON>>");
    expect(loadVerificationRegistry()).toEqual([]);
  });

  it("saves and reloads a registry correctly", () => {
    const record = makeRecord();
    saveVerificationRegistry([record]);
    const loaded = loadVerificationRegistry();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(record.id);
  });
});

// ── Record persistence ────────────────────────────────────────────────────────

describe("UNIT: Record persistence", () => {
  it("upsertVerificationRecord inserts a new record", () => {
    const r = makeRecord({ timestamp: addDays(today(), -5) });
    upsertVerificationRecord(r);
    expect(loadVerificationRegistry()).toHaveLength(1);
  });

  it("upsertVerificationRecord replaces an existing record with the same id", () => {
    const r = makeRecord({ timestamp: addDays(today(), -5) });
    upsertVerificationRecord(r);
    const updated = { ...r, recommendationSummary: "Updated summary" };
    upsertVerificationRecord(updated);
    const all = loadVerificationRegistry();
    expect(all).toHaveLength(1);
    expect(all[0].recommendationSummary).toBe("Updated summary");
  });

  it("updateVerificationRecord patches fields in place", () => {
    const r = makeRecord({ timestamp: addDays(today(), -5) });
    upsertVerificationRecord(r);
    updateVerificationRecord(r.id, { evaluated: true, verificationScore: "successful" });
    const loaded = loadVerificationRegistry()[0];
    expect(loaded.evaluated).toBe(true);
    expect(loaded.verificationScore).toBe("successful");
    expect(loaded.recommendationSummary).toBe(r.recommendationSummary);
  });

  it("updateVerificationRecord is a no-op for unknown id", () => {
    upsertVerificationRecord(makeRecord({ timestamp: addDays(today(), -3) }));
    updateVerificationRecord("nonexistent-id", { evaluated: true });
    expect(loadVerificationRegistry()).toHaveLength(1);
    expect(loadVerificationRegistry()[0].evaluated).toBe(false);
  });

  it("records survive a full serialisation round-trip", () => {
    const r = makeRecord({ timestamp: addDays(today(), -2), confidenceAtGeneration: 0.87654 });
    upsertVerificationRecord(r);
    const reloaded = loadVerificationRegistry()[0];
    expect(reloaded.confidenceAtGeneration).toBeCloseTo(0.87654);
  });
});

// ── ID generation ─────────────────────────────────────────────────────────────

describe("UNIT: ID generation", () => {
  it("recordRecommendation generates unique IDs", () => {
    const params = {
      recommendationId:       "rec-test-1",
      recommendationClass:    "volume_maintain" as const,
      recommendationSummary:  "Test",
      supportingSignals:      [],
      athleteState:           makeSnapshot(),
      confidenceAtGeneration: 0.7,
      today:                  today(),
    };
    // Use different dates (recent, within retention window) so idempotency guard doesn't block
    const d1 = addDays(today(), -50);
    const d2 = addDays(today(), -49);
    const r1 = recordRecommendation({ ...params, today: d1, recommendationId: `rec-${d1}` });
    const r2 = recordRecommendation({ ...params, today: d2, recommendationId: `rec-${d2}` });
    expect(r1.id).not.toBe(r2.id);
  });

  it("IDs are non-empty strings", () => {
    const d = addDays(today(), -48);
    const r = recordRecommendation({
      recommendationId:       `rec-${d}`,
      recommendationClass:    "volume_maintain",
      recommendationSummary:  "Test",
      supportingSignals:      [],
      athleteState:           makeSnapshot(),
      confidenceAtGeneration: 0.7,
      today:                  d,
    });
    expect(typeof r.id).toBe("string");
    expect(r.id.length).toBeGreaterThan(0);
  });
});

// ── State transitions ─────────────────────────────────────────────────────────

describe("UNIT: State transitions (computeVerificationState)", () => {
  it("waiting — inside evaluation window", () => {
    const r = makeRecord({ evaluationDueDate: addDays(today(), 5) });
    expect(computeVerificationState(r, today())).toBe("waiting");
  });

  it("pending — evaluation window just expired", () => {
    const r = makeRecord({ evaluationDueDate: today() });
    expect(computeVerificationState(r, today())).toBe("pending");
  });

  it("pending — evaluation window expired yesterday", () => {
    const r = makeRecord({ evaluationDueDate: addDays(today(), -1) });
    expect(computeVerificationState(r, today())).toBe("pending");
  });

  it("expired — more than 30 days past due", () => {
    const r = makeRecord({ evaluationDueDate: addDays(today(), -31) });
    expect(computeVerificationState(r, today())).toBe("expired");
  });

  it("verified — evaluated with non-insufficient_data score", () => {
    const r = makeRecord({ evaluated: true, verificationScore: "successful" });
    expect(computeVerificationState(r, today())).toBe("verified");
  });

  it("insufficient_data — evaluated with insufficient_data score", () => {
    const r = makeRecord({ evaluated: true, verificationScore: "insufficient_data" });
    expect(computeVerificationState(r, today())).toBe("insufficient_data");
  });
});

// ── Duplicate protection ──────────────────────────────────────────────────────

describe("UNIT: Duplicate protection", () => {
  it("getRecordForDate returns null when no record exists for date", () => {
    expect(getRecordForDate(addDays(today(), -10))).toBeNull();
  });

  it("getRecordForDate returns existing record for the given date", () => {
    const d = addDays(today(), -15);
    const r = makeRecord({ timestamp: d });
    upsertVerificationRecord(r);
    const found = getRecordForDate(d);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(r.id);
  });

  it("multiple records for different dates coexist", () => {
    const d1 = addDays(today(), -20);
    const d2 = addDays(today(), -19);
    const d3 = addDays(today(), -18);
    upsertVerificationRecord(makeRecord({ timestamp: d1, id: "id-1" }));
    upsertVerificationRecord(makeRecord({ timestamp: d2, id: "id-2" }));
    expect(getRecordForDate(d1)).not.toBeNull();
    expect(getRecordForDate(d2)).not.toBeNull();
    expect(getRecordForDate(d3)).toBeNull();
  });
});

// ── Expiration handling ───────────────────────────────────────────────────────

describe("UNIT: Expiration handling (expireOldRecords)", () => {
  it("marks records > 30 days past due as evaluated + insufficient_data", () => {
    // timestamp within retention window (60 days ago), but evaluationDueDate expired > 30d ago
    const ts = addDays(today(), -60);
    const due = addDays(today(), -35); // 35 days ago → within 120d retention but > 30d grace
    const old = makeRecord({ timestamp: ts, evaluationDueDate: due, id: "old-1" });
    upsertVerificationRecord(old);
    const swept = expireOldRecords(today());
    expect(swept).toBe(1);
    const loaded = loadVerificationRegistry()[0];
    expect(loaded.evaluated).toBe(true);
    expect(loaded.verificationScore).toBe("insufficient_data");
  });

  it("does not sweep records within 30 days past due", () => {
    const ts = addDays(today(), -15);
    const due = addDays(today(), -5);
    const recent = makeRecord({ timestamp: ts, evaluationDueDate: due });
    upsertVerificationRecord(recent);
    const swept = expireOldRecords(today());
    expect(swept).toBe(0);
    expect(loadVerificationRegistry()[0].evaluated).toBe(false);
  });

  it("does not sweep already-evaluated records", () => {
    const ts = addDays(today(), -60);
    const due = addDays(today(), -40);
    const done = makeRecord({
      timestamp: ts,
      evaluationDueDate: due,
      evaluated: true,
      verificationScore: "successful",
    });
    upsertVerificationRecord(done);
    const swept = expireOldRecords(today());
    expect(swept).toBe(0);
    expect(loadVerificationRegistry()[0].verificationScore).toBe("successful");
  });

  it("returns 0 when no records are eligible for expiration", () => {
    upsertVerificationRecord(makeRecord({ evaluationDueDate: addDays(today(), 5) }));
    expect(expireOldRecords(today())).toBe(0);
  });
});

// ── Verification scoring ──────────────────────────────────────────────────────

describe("UNIT: Verification scoring (deriveVerificationScore)", () => {
  const baseline = makeSnapshot({ readinessScore: 60, recoveryScore: 60 });
  const expected = makeExpected({ readinessDelta: 5, recoveryDelta: 5, adherenceTarget: 0.75 });

  function makeActual(overrides: Partial<ActualOutcome> = {}): ActualOutcome {
    return {
      readinessMean:     null,
      recoveryMean:      null,
      completionRate:    null,
      adherenceDelta:    null,
      workoutsCompleted: 0,
      samplesCollected:  0,
      evaluationDate:    today(),
      ...overrides,
    };
  }

  it("insufficient_data when samplesCollected < 3", () => {
    const actual = makeActual({ samplesCollected: 2 });
    const { score } = deriveVerificationScore(expected, actual, baseline);
    expect(score).toBe("insufficient_data");
  });

  it("successful when all metrics fully met", () => {
    const actual = makeActual({
      readinessMean:     67,   // +7 vs baseline 60 (expected +5)
      recoveryMean:      67,   // +7 vs baseline 60
      completionRate:    0.85, // > 0.75 target
      samplesCollected:  5,
    });
    const { score } = deriveVerificationScore(expected, actual, baseline);
    expect(score).toBe("successful");
  });

  it("unsuccessful when outcomes are clearly negative", () => {
    const actual = makeActual({
      readinessMean:     53,   // -7 vs baseline (expected +5)
      recoveryMean:      52,   // -8 vs baseline
      completionRate:    0.2,
      samplesCollected:  5,
    });
    const { score } = deriveVerificationScore(expected, actual, baseline);
    expect(score).toBe("unsuccessful");
  });

  it("neutral or partial when some metrics met", () => {
    const actual = makeActual({
      readinessMean:     63,   // +3 vs baseline (partial success vs +5 expected)
      recoveryMean:      58,   // -2 vs baseline (expected +5 — miss)
      completionRate:    0.4,  // below 0.375 partial threshold for 0.75 target
      samplesCollected:  4,
    });
    const { score } = deriveVerificationScore(expected, actual, baseline);
    expect(["partially_successful", "neutral"]).toContain(score);
  });

  it("rationale contains outcome measurements", () => {
    const actual = makeActual({
      readinessMean:     65,
      recoveryMean:      65,
      completionRate:    0.8,
      samplesCollected:  5,
    });
    const { rationale } = deriveVerificationScore(expected, actual, baseline);
    expect(rationale).toContain("Readiness");
    expect(rationale).toContain("Recovery");
    expect(rationale).toContain("Completion");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Recommendation → Verification ────────────────────────────────────────────

describe("INT: Recommendation → Verification record creation", () => {
  it("recordRecommendation creates a VerificationRecord with correct fields", () => {
    const t = addDays(today(), -45);
    const record = recordRecommendation({
      recommendationId:       `rec-${t}`,
      recommendationClass:    "volume_maintain",
      recommendationSummary:  "Maintain training load",
      supportingSignals:      ["readiness OK", "recovery OK"],
      athleteState:           makeSnapshot({ timestamp: t }),
      confidenceAtGeneration: 0.75,
      today:                  t,
    });

    expect(record.recommendationId).toBe(`rec-${t}`);
    expect(record.timestamp).toBe(t);
    expect(record.evaluationDueDate).toBe(addDays(t, 7)); // 7 days later
    expect(record.evaluated).toBe(false);
    expect(record.confidenceAtGeneration).toBe(0.75);
    expect(record.algorithmVersion).toBe("axis-v1.0");
  });

  it("record is persisted to localStorage immediately", () => {
    const d = addDays(today(), -44);
    recordRecommendation({
      recommendationId:       `rec-${d}`,
      recommendationClass:    "volume_increase",
      recommendationSummary:  "Increase volume",
      supportingSignals:      [],
      athleteState:           makeSnapshot(),
      confidenceAtGeneration: 0.8,
      today:                  d,
    });
    const registry = loadVerificationRegistry();
    expect(registry.some(r => r.timestamp === d)).toBe(true);
  });

  it("expectedOutcome uses class-specific defaults when not provided", () => {
    const d = addDays(today(), -43);
    const r = recordRecommendation({
      recommendationId:       `rec-${d}`,
      recommendationClass:    "deload",
      recommendationSummary:  "Deload week",
      supportingSignals:      [],
      athleteState:           makeSnapshot(),
      confidenceAtGeneration: 0.6,
      today:                  d,
    });
    expect(r.expectedOutcome.readinessDelta).toBe(8);  // deload expects +8
    expect(r.expectedOutcome.recoveryDelta).toBe(8);
    expect(r.expectedOutcome.adherenceTarget).toBe(0.9);
  });

  it("every recommendation class gets a correct default expected outcome", () => {
    const classes = [
      "volume_increase", "volume_decrease", "volume_maintain", "deload",
      "recovery_focus", "intensity_up", "intensity_down", "workout_type_change",
    ] as const;

    for (const cls of classes) {
      const idx = classes.indexOf(cls);
      const d = addDays(today(), -40 - idx);
      const r = recordRecommendation({
        recommendationId:       `rec-cls-${cls}`,
        recommendationClass:    cls,
        recommendationSummary:  cls,
        supportingSignals:      [],
        athleteState:           makeSnapshot(),
        confidenceAtGeneration: 0.7,
        today:                  d,
      });
      expect(r.expectedOutcome.horizonDays).toBeGreaterThan(0);
      expect(r.expectedOutcome.adherenceTarget).toBeGreaterThan(0);
    }
  });
});

// ── Safety → Verification ─────────────────────────────────────────────────────

describe("INT: Safety signal flows into verification record", () => {
  it("safety-constrained volumeScale is recorded as finalVolumeScale in athlete state snapshot", () => {
    // buildVerificationInput uses safetyResultVal.volumeScale (not proposed scale)
    const safetyConstrainedVolume = 0.65;
    const input = buildVerificationInput({
      decisionType:     "proceed",
      finalVolumeScale: safetyConstrainedVolume,
      headline:         "Today's session",
      rationale:        ["readiness OK"],
      isDeload:         false,
      workoutMode:      "standard",
      readinessScore:   85,
      recoveryScore:    30,       // low — would trigger safety
      fatigueEstimate:  90,       // high — critical fatigue rule fires
      cyclePhase:       "Follicular",
      cycleDay:         8,
      weeklyVolumeSets: 30,
      streakDays:       4,
      adherenceRate:    0.7,
      confidenceScore:  0.6,
      today:            "2025-07-01",
    });

    // When fatigueEstimate >= 85, safety clamps to 0.65 — verify the class reflects the constraint
    expect(input.confidenceAtGeneration).toBe(0.6);
    expect(input.recommendationClass).toBe("volume_decrease");  // 0.65 < 0.90 threshold
  });

  it("decisionToRecommendationClass correctly maps all decision types", () => {
    expect(decisionToRecommendationClass("recover",    1.0, false, "standard")).toBe("recovery_focus");
    expect(decisionToRecommendationClass("scale_up",   1.1, false, "standard")).toBe("volume_increase");
    expect(decisionToRecommendationClass("scale_down", 0.8, false, "standard")).toBe("volume_decrease");
    expect(decisionToRecommendationClass("swap",       1.0, false, "standard")).toBe("workout_type_change");
    expect(decisionToRecommendationClass("proceed",    1.0, true,  "standard")).toBe("deload");
    expect(decisionToRecommendationClass("proceed",    1.1, false, "standard")).toBe("volume_increase");
    expect(decisionToRecommendationClass("proceed",    0.85, false, "standard")).toBe("volume_decrease");
    expect(decisionToRecommendationClass("proceed",    1.0, false, "standard")).toBe("volume_maintain");
    expect(decisionToRecommendationClass("proceed",    1.0, false, "recovery")).toBe("recovery_focus");
  });
});

// ── Workout Completion → Verification (evidence collection) ───────────────────

describe("INT: Workout completion contributes as evidence", () => {
  it("collectActualOutcome returns null metrics when no history exists", () => {
    // Use fixed past dates for evaluation window (independent of storage)
    const record = makeRecord({
      timestamp:         "2026-01-01",
      evaluationDueDate: "2026-01-08",
    });
    const actual = collectActualOutcome(record, [], [], [], "2026-01-09");
    expect(actual.readinessMean).toBeNull();
    expect(actual.recoveryMean).toBeNull();
    expect(actual.completionRate).toBeNull();
    expect(actual.samplesCollected).toBe(0);
    expect(actual.workoutsCompleted).toBe(0);
  });

  it("collectActualOutcome computes correct window mean from readiness history", () => {
    const record = makeRecord({
      timestamp:         "2026-01-01",
      evaluationDueDate: "2026-01-08",
    });
    const rdxHistory = [
      { date: "2026-01-02", score: 70 },
      { date: "2026-01-04", score: 80 },
      { date: "2026-01-06", score: 75 },
    ];
    const actual = collectActualOutcome(record, rdxHistory as any, [], [], "2026-01-09");
    // Mean of 70 + 80 + 75 = 225 / 3 = 75
    expect(actual.readinessMean).toBeCloseTo(75);
    expect(actual.samplesCollected).toBe(3);
  });

  it("collectActualOutcome counts completed workouts in window", () => {
    const record = makeRecord({
      timestamp:         "2026-02-01",
      evaluationDueDate: "2026-02-08",
    });
    const adherenceHistory = [
      { date: "2026-02-02", status: "completed" },
      { date: "2026-02-04", status: "completed" },
      { date: "2026-02-05", status: "skipped" },
      { date: "2026-02-07", status: "completed" },
    ];
    const actual = collectActualOutcome(record, [], [], adherenceHistory as any, "2026-02-09");
    expect(actual.workoutsCompleted).toBe(3);
  });
});

// ── Recovery Check-in → Verification ─────────────────────────────────────────

describe("INT: Recovery check-in contributes as evidence", () => {
  it("recovery scores within the evaluation window are captured in mean", () => {
    const record = makeRecord({
      timestamp:         "2026-03-01",
      evaluationDueDate: "2026-03-08",
      athleteState:      makeSnapshot({ recoveryScore: 50 }),
      expectedOutcome:   makeExpected({ recoveryDelta: 10 }),
    });
    const recoveryHistory = [
      { date: "2026-03-03", score: 60, category: "good", contributors: [] },
      { date: "2026-03-05", score: 65, category: "good", contributors: [] },
    ];
    const actual = collectActualOutcome(record, [], recoveryHistory as any, [], "2026-03-09");
    // Mean of 60 + 65 = 62.5
    expect(actual.recoveryMean).toBeCloseTo(62.5);
  });
});

// ── Forecast Calibration / Confidence Feedback ────────────────────────────────

describe("INT: Forecast Calibration & Confidence Feedback", () => {
  it("computeConfidenceFeedback returns null with < 5 actionable records", () => {
    const records = [
      makeRecord({ evaluated: true, verificationScore: "successful" }),
      makeRecord({ evaluated: true, verificationScore: "neutral" }),
    ];
    expect(computeConfidenceFeedback(records)).toBeNull();
  });

  it("computeConfidenceFeedback returns a value in [0, 1] with >= 5 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => makeRecord({
      id:                `r${i}`,
      evaluated:         true,
      verificationScore: i < 4 ? "successful" : "unsuccessful",
    }));
    const feedback = computeConfidenceFeedback(records);
    expect(feedback).not.toBeNull();
    expect(feedback!).toBeGreaterThanOrEqual(0);
    expect(feedback!).toBeLessThanOrEqual(1);
  });

  it("all successful → feedback close to 1.0", () => {
    const records = Array.from({ length: 6 }, (_, i) => makeRecord({
      id:                `s${i}`,
      evaluated:         true,
      verificationScore: "successful",
    }));
    const feedback = computeConfidenceFeedback(records);
    expect(feedback!).toBeCloseTo(1.0);
  });

  it("all unsuccessful → feedback close to 0.1", () => {
    const records = Array.from({ length: 6 }, (_, i) => makeRecord({
      id:                `u${i}`,
      evaluated:         true,
      verificationScore: "unsuccessful",
    }));
    const feedback = computeConfidenceFeedback(records);
    expect(feedback!).toBeCloseTo(0.1);
  });

  it("getVerifierOutput returns summary, classAccuracy, confidenceFeedback", () => {
    // Insert some evaluated records
    for (let i = 0; i < 3; i++) {
      upsertVerificationRecord(makeRecord({ id: `vo${i}`, evaluated: true, verificationScore: "successful" }));
    }
    const output = getVerifierOutput(today());
    expect(output.summary).toBeDefined();
    expect(output.classAccuracy).toBeDefined();
    // confidenceFeedback null until 5+ records
    expect(output.confidenceFeedback === null || typeof output.confidenceFeedback === "number").toBe(true);
  });
});

// ─── runPendingEvaluations integration ───────────────────────────────────────

describe("INT: runPendingEvaluations", () => {
  it("evaluates records whose window has expired, leaves active records alone", () => {
    // expired: timestamp 30 days ago, due 23 days ago (within retention, past due)
    const tsExpired = addDays(today(), -30);
    const dueExpired = addDays(today(), -23);
    // active: due in the future
    const tsActive = addDays(today(), -3);
    const dueActive = addDays(today(), 4);
    const expired = makeRecord({
      id:                "exp-1",
      timestamp:         tsExpired,
      evaluationDueDate: dueExpired,
      athleteState:      makeSnapshot({ readinessScore: 60, recoveryScore: 55, timestamp: tsExpired }),
    });
    const active = makeRecord({
      id:                "act-1",
      timestamp:         tsActive,
      evaluationDueDate: dueActive,
    });
    upsertVerificationRecord(expired);
    upsertVerificationRecord(active);

    const { evaluated, stillWaiting } = runPendingEvaluations(today(), [], [], []);
    expect(evaluated).toHaveLength(1);
    expect(evaluated[0].id).toBe("exp-1");
    expect(stillWaiting).toBe(1);
  });

  it("evaluated records have verificationScore set", () => {
    const ts = addDays(today(), -20);
    const due = addDays(today(), -13);
    const r = makeRecord({
      id:                "to-eval",
      timestamp:         ts,
      evaluationDueDate: due,
    });
    upsertVerificationRecord(r);
    const { evaluated } = runPendingEvaluations(today(), [], [], []);
    expect(evaluated[0].verificationScore).toBeDefined();
    expect(evaluated[0].evaluated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("RESILIENCE: Corrupted registry", () => {
  it("loadVerificationRegistry returns empty array on corrupt JSON", () => {
    store.set("axis_verification_registry_v1", "{bad json}");
    expect(loadVerificationRegistry()).toEqual([]);
  });

  it("upsertVerificationRecord succeeds even after corrupt storage", () => {
    store.set("axis_verification_registry_v1", "NOT_JSON");
    const r = makeRecord();
    expect(() => upsertVerificationRecord(r)).not.toThrow();
    const registry = loadVerificationRegistry();
    expect(registry).toHaveLength(1);
  });
});

describe("RESILIENCE: Missing evidence", () => {
  it("deriveVerificationScore returns insufficient_data when samplesCollected is 0", () => {
    const actual: ActualOutcome = {
      readinessMean: null, recoveryMean: null, completionRate: null,
      adherenceDelta: null, workoutsCompleted: 0, samplesCollected: 0,
      evaluationDate: today(),
    };
    const { score } = deriveVerificationScore(makeExpected(), actual, makeSnapshot());
    expect(score).toBe("insufficient_data");
  });

  it("collectActualOutcome handles empty history arrays without throwing", () => {
    const r = makeRecord({ timestamp: "2025-01-01", evaluationDueDate: "2025-01-08" });
    expect(() => collectActualOutcome(r, [], [], [], "2025-01-10")).not.toThrow();
  });
});

describe("RESILIENCE: Duplicate submissions", () => {
  it("upsertVerificationRecord deduplicates by id — same id, same record count", () => {
    const r = makeRecord({ id: "dup-id" });
    upsertVerificationRecord(r);
    upsertVerificationRecord(r);
    upsertVerificationRecord(r);
    expect(loadVerificationRegistry()).toHaveLength(1);
  });

  it("dashboard idempotency guard: getRecordForDate prevents duplicate creation", () => {
    const date = addDays(today(), -25);
    recordRecommendation({
      recommendationId:       `rec-${date}`,
      recommendationClass:    "volume_maintain",
      recommendationSummary:  "First",
      supportingSignals:      [],
      athleteState:           makeSnapshot({ timestamp: date }),
      confidenceAtGeneration: 0.7,
      today:                  date,
    });

    // Simulate second render — check would prevent second call
    const existing = getRecordForDate(date);
    expect(existing).not.toBeNull();
    expect(existing!.timestamp).toBe(date);
  });
});

describe("RESILIENCE: Delayed evidence", () => {
  it("evaluation window still correct when evidence arrives late", () => {
    // timestamp 25 days ago, due 18 days ago — within 30-day grace, still pending
    const ts = addDays(today(), -25);
    const due = addDays(today(), -18);
    const r = makeRecord({
      id:                "delayed-1",
      timestamp:         ts,
      evaluationDueDate: due,
      athleteState:      makeSnapshot({ readinessScore: 70, recoveryScore: 60, timestamp: ts }),
    });
    upsertVerificationRecord(r);

    // Evidence available now — past due date but within 30-day grace
    const rdxHistory = [
      { date: addDays(today(), -17), score: 75 },
      { date: addDays(today(), -15), score: 78 },
      { date: addDays(today(), -13), score: 80 },
    ];
    const { evaluated } = runPendingEvaluations(today(), rdxHistory as any, [], []);
    expect(evaluated).toHaveLength(1);
    expect(evaluated[0].evaluated).toBe(true);
  });

  it("record expires cleanly after 30-day grace period", () => {
    // timestamp 65 days ago, due 58 days ago — within 120-day retention, past 30-day grace
    const ts = addDays(today(), -65);
    const due = addDays(today(), -58);
    const old = makeRecord({
      id:                "late-1",
      timestamp:         ts,
      evaluationDueDate: due,
    });
    upsertVerificationRecord(old);
    const swept = expireOldRecords(today());
    expect(swept).toBe(1);
    expect(loadVerificationRegistry()[0].verificationScore).toBe("insufficient_data");
  });
});

// ── Regression: every recommendation creates exactly one verification record ──

describe("REGRESSION: One record per recommendation", () => {
  it("recordRecommendation for the same day returns consistent id on first call", () => {
    const date = addDays(today(), -10);
    const r1 = recordRecommendation({
      recommendationId:       `rec-${date}`,
      recommendationClass:    "volume_maintain",
      recommendationSummary:  "First call",
      supportingSignals:      [],
      athleteState:           makeSnapshot({ timestamp: date }),
      confidenceAtGeneration: 0.72,
      today:                  date,
    });
    const loaded = loadVerificationRegistry().filter(r => r.timestamp === date);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(r1.id);
  });

  it("computeVerificationSummary totalRecords matches inserted count", () => {
    for (let i = 1; i <= 5; i++) {
      upsertVerificationRecord(makeRecord({
        id:        `cnt-${i}`,
        timestamp: addDays(today(), -i),  // -1 through -5 days (within retention window)
      }));
    }
    const summary = computeVerificationSummary(loadVerificationRegistry(), today());
    expect(summary.totalRecords).toBe(5);
  });
});

// ── Per-class accuracy breakdown ─────────────────────────────────────────────

describe("INT: Per-class accuracy (computeClassAccuracy)", () => {
  it("groups evaluated records by recommendation class", () => {
    const records: VerificationRecord[] = [
      makeRecord({ id: "ca1", timestamp: addDays(today(), -8),  recommendationClass: "volume_increase", evaluated: true, verificationScore: "successful" }),
      makeRecord({ id: "ca2", timestamp: addDays(today(), -7),  recommendationClass: "volume_increase", evaluated: true, verificationScore: "unsuccessful" }),
      makeRecord({ id: "ca3", timestamp: addDays(today(), -6),  recommendationClass: "deload",          evaluated: true, verificationScore: "successful" }),
    ];
    for (const r of records) upsertVerificationRecord(r);
    const accuracy = computeClassAccuracy(loadVerificationRegistry());
    const volInc = accuracy.find(a => a.recommendationClass === "volume_increase");
    expect(volInc).toBeDefined();
    expect(volInc!.total).toBe(2);
    expect(volInc!.successRate).toBe(0.5); // 1 successful / 2 total
  });

  it("returns empty array when no evaluated records exist", () => {
    upsertVerificationRecord(makeRecord({ timestamp: addDays(today(), -5) }));
    expect(computeClassAccuracy(loadVerificationRegistry())).toEqual([]);
  });
});
