// ─── lib/intelligence/safety/__tests__/safetyEngine.test.ts ──────────────────
// Phase A.1 — Verification tests for the Safety Engine.
// Run: npm test
//
// Proves:
//  1. Each built-in rule is deterministic (same inputs → same outputs every call)
//  2. Each rule fires at the correct threshold and clamps correctly
//  3. Each rule passes cleanly when inputs are within safe limits
//  4. evaluateSafety applies rules in priority order and chains volume correctly
//  5. explainSafetyEvaluation returns appropriate user messages
//  6. buildSafetyContext maps pipeline data correctly
//  7. applySafetyGovernance completes well under 15ms

import { describe, it, expect } from "vitest";
import { BUILT_IN_RULES }          from "../SafetyRule";
import { evaluateSafety }           from "../SafetyEvaluator";
import { explainSafetyEvaluation }  from "../SafetyExplainer";
import { applySafetyGovernance }    from "../SafetyEngine";
import { buildSafetyContext }        from "../buildSafetyContext";
import type { SafetyContext }        from "../SafetyRule";

// ── Fixture: a safe baseline context ─────────────────────────────────────────

function safeCtx(overrides: Partial<SafetyContext> = {}): SafetyContext {
  return {
    proposedVolumeScale:  1.0,
    currentVolumeScale:   1.0,
    readinessScore:       75,
    recoveryScore:        70,
    fatigueEstimate:      40,
    streakDays:           3,
    weeklyVolumeSets:     20,
    prevWeekVolumeSets:   20,
    hasSymptoms:          false,
    confidenceScore:      0.80,
    isDeload:             false,
    lowRecoveryDays:      0,
    proposedIntensity:    "Moderate",
    currentIntensity:     "Moderate",
    ...overrides,
  };
}

// ── Rule: max-weekly-volume-increase ─────────────────────────────────────────

describe("max-weekly-volume-increase rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "max-weekly-volume-increase")!;

  it("passes when prevWeekVolumeSets is 0 (cold start)", () => {
    const result = rule.evaluate(safeCtx({ prevWeekVolumeSets: 0 }));
    expect(result.outcome).toBe("pass");
  });

  it("passes when increase is exactly 10%", () => {
    const result = rule.evaluate(safeCtx({ weeklyVolumeSets: 22, prevWeekVolumeSets: 20 }));
    expect(result.outcome).toBe("pass");
  });

  it("clamps when weekly volume increases more than 10%", () => {
    const result = rule.evaluate(safeCtx({ weeklyVolumeSets: 25, prevWeekVolumeSets: 20, proposedVolumeScale: 1.2 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBeDefined();
    expect(result.constrainedTo!).toBeLessThan(1.2);
  });

  it("is deterministic — same inputs produce identical outputs", () => {
    const ctx = safeCtx({ weeklyVolumeSets: 30, prevWeekVolumeSets: 20, proposedVolumeScale: 1.3 });
    const a = rule.evaluate(ctx);
    const b = rule.evaluate(ctx);
    expect(a).toEqual(b);
  });
});

// ── Rule: critical-fatigue-override ──────────────────────────────────────────

describe("critical-fatigue-override rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "critical-fatigue-override")!;

  it("passes when fatigue is below 85", () => {
    const result = rule.evaluate(safeCtx({ fatigueEstimate: 84 }));
    expect(result.outcome).toBe("pass");
  });

  it("clamps volume to 0.65 when fatigue >= 85 and volume > 0.65", () => {
    const result = rule.evaluate(safeCtx({ fatigueEstimate: 85, proposedVolumeScale: 1.0 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(0.65);
  });

  it("passes when fatigue >= 85 but volume already at or below cap", () => {
    const result = rule.evaluate(safeCtx({ fatigueEstimate: 90, proposedVolumeScale: 0.65 }));
    expect(result.outcome).toBe("pass");
  });

  it("never increases volume", () => {
    const ctx = safeCtx({ fatigueEstimate: 90, proposedVolumeScale: 0.5 });
    const result = rule.evaluate(ctx);
    // volume was already below cap — should pass, not push volume up
    expect(result.outcome).toBe("pass");
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ fatigueEstimate: 92, proposedVolumeScale: 1.1 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: recovery-debt ───────────────────────────────────────────────────────

describe("recovery-debt rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "recovery-debt")!;

  it("passes when lowRecoveryDays < 3", () => {
    expect(rule.evaluate(safeCtx({ lowRecoveryDays: 2 })).outcome).toBe("pass");
  });

  it("clamps when 3+ consecutive low recovery days", () => {
    const result = rule.evaluate(safeCtx({ lowRecoveryDays: 3, proposedVolumeScale: 1.0 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(0.70);
  });

  it("includes day count in user message", () => {
    const result = rule.evaluate(safeCtx({ lowRecoveryDays: 5, proposedVolumeScale: 1.0 }));
    expect(result.userMessage).toContain("5");
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ lowRecoveryDays: 4, proposedVolumeScale: 1.0 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: readiness-minimum ───────────────────────────────────────────────────

describe("readiness-minimum rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "readiness-minimum")!;

  it("passes when readiness is above threshold", () => {
    expect(rule.evaluate(safeCtx({ readinessScore: 30 })).outcome).toBe("pass");
  });

  it("passes when readiness low but volume already conservative", () => {
    expect(rule.evaluate(safeCtx({ readinessScore: 20, proposedVolumeScale: 0.75 })).outcome).toBe("pass");
  });

  it("clamps when readiness < 30 and volume > 0.75", () => {
    const result = rule.evaluate(safeCtx({ readinessScore: 29, proposedVolumeScale: 0.90 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(0.75);
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ readinessScore: 20, proposedVolumeScale: 1.0 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: hard-session-streak ─────────────────────────────────────────────────

describe("hard-session-streak rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "hard-session-streak")!;

  it("passes with 5 streak days", () => {
    expect(rule.evaluate(safeCtx({ streakDays: 5 })).outcome).toBe("pass");
  });

  it("clamps at 6+ consecutive days with high volume", () => {
    const result = rule.evaluate(safeCtx({ streakDays: 6, proposedVolumeScale: 1.0 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(0.85);
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ streakDays: 8, proposedVolumeScale: 1.0 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: symptom-override ────────────────────────────────────────────────────

describe("symptom-override rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "symptom-override")!;

  it("passes when no symptoms", () => {
    expect(rule.evaluate(safeCtx({ hasSymptoms: false, proposedVolumeScale: 1.0 })).outcome).toBe("pass");
  });

  it("passes when symptoms present but volume already below cap", () => {
    expect(rule.evaluate(safeCtx({ hasSymptoms: true, proposedVolumeScale: 0.80 })).outcome).toBe("pass");
  });

  it("clamps to 0.80 when symptoms active and volume > 0.80", () => {
    const result = rule.evaluate(safeCtx({ hasSymptoms: true, proposedVolumeScale: 1.0 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(0.80);
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ hasSymptoms: true, proposedVolumeScale: 1.0 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: low-confidence-conservative ────────────────────────────────────────

describe("low-confidence-conservative rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "low-confidence-conservative")!;

  it("passes when confidence is above 0.25", () => {
    expect(rule.evaluate(safeCtx({ confidenceScore: 0.25 })).outcome).toBe("pass");
  });

  it("passes when confidence low but volume not above 1.05", () => {
    expect(rule.evaluate(safeCtx({ confidenceScore: 0.20, proposedVolumeScale: 1.05 })).outcome).toBe("pass");
  });

  it("clamps to 1.05 when confidence < 0.25 and volume > 1.05", () => {
    const result = rule.evaluate(safeCtx({ confidenceScore: 0.24, proposedVolumeScale: 1.10 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(1.05);
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ confidenceScore: 0.20, proposedVolumeScale: 1.20 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: deload-volume-guard ─────────────────────────────────────────────────

describe("deload-volume-guard rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "deload-volume-guard")!;

  it("passes when not a deload period", () => {
    expect(rule.evaluate(safeCtx({ isDeload: false, proposedVolumeScale: 1.0 })).outcome).toBe("pass");
  });

  it("passes when deload and volume is already ≤ 0.75", () => {
    expect(rule.evaluate(safeCtx({ isDeload: true, proposedVolumeScale: 0.75 })).outcome).toBe("pass");
  });

  it("clamps to 0.75 during deload if volume exceeds it", () => {
    const result = rule.evaluate(safeCtx({ isDeload: true, proposedVolumeScale: 0.90 }));
    expect(result.outcome).toBe("clamped");
    expect(result.constrainedTo).toBe(0.75);
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ isDeload: true, proposedVolumeScale: 1.0 });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── Rule: intensity-step-check ────────────────────────────────────────────────

describe("intensity-step-check rule", () => {
  const rule = BUILT_IN_RULES.find(r => r.id === "intensity-step-check")!;

  it("passes for equal intensities", () => {
    const result = rule.evaluate(safeCtx({ currentIntensity: "Moderate", proposedIntensity: "Moderate" }));
    expect(result.outcome).toBe("pass");
  });

  it("passes for one-step jump", () => {
    const result = rule.evaluate(safeCtx({ currentIntensity: "Low", proposedIntensity: "Light to Moderate" }));
    expect(result.outcome).toBe("pass");
  });

  it("is informational-only (outcome=pass) even for large jumps", () => {
    const result = rule.evaluate(safeCtx({ currentIntensity: "Low", proposedIntensity: "High" }));
    expect(result.outcome).toBe("pass");  // informational — never blocks
    expect(result.priority).toBe("informational");
  });

  it("is deterministic", () => {
    const ctx = safeCtx({ currentIntensity: "Low", proposedIntensity: "High" });
    expect(rule.evaluate(ctx)).toEqual(rule.evaluate(ctx));
  });
});

// ── evaluateSafety: integration ───────────────────────────────────────────────

describe("evaluateSafety", () => {
  it("returns original volume when no rules trigger", () => {
    const result = evaluateSafety(safeCtx());
    expect(result.wasConstrained).toBe(false);
    expect(result.constrainedVolumeScale).toBe(1.0);
    expect(result.criticalActivations.length).toBe(0);
    expect(result.highActivations.length).toBe(0);
  });

  it("applies the most restrictive constraint when multiple rules fire", () => {
    // Both critical-fatigue (cap 0.65) and symptom-override (cap 0.80) should fire
    // Critical priority runs first → final should be 0.65
    const ctx = safeCtx({ fatigueEstimate: 90, hasSymptoms: true, proposedVolumeScale: 1.0 });
    const result = evaluateSafety(ctx);
    expect(result.wasConstrained).toBe(true);
    expect(result.constrainedVolumeScale).toBeLessThanOrEqual(0.65);
  });

  it("collects user messages only from non-passing rules", () => {
    const ctx = safeCtx({ fatigueEstimate: 90, proposedVolumeScale: 1.0 });
    const result = evaluateSafety(ctx);
    expect(result.userMessages.length).toBeGreaterThan(0);
    expect(result.userMessages.every(m => typeof m === "string")).toBe(true);
  });

  it("never increases volume beyond what was proposed", () => {
    const ctx = safeCtx({ proposedVolumeScale: 0.50 });
    const result = evaluateSafety(ctx);
    expect(result.constrainedVolumeScale).toBeLessThanOrEqual(0.50);
  });

  it("is deterministic — same inputs produce identical evaluations", () => {
    const ctx = safeCtx({ fatigueEstimate: 88, hasSymptoms: true, isDeload: true, proposedVolumeScale: 1.0 });
    const a = evaluateSafety(ctx);
    const b = evaluateSafety(ctx);
    // Remove id/timestamp from audit (tested via evaluator internals, not returned)
    expect(a.constrainedVolumeScale).toBe(b.constrainedVolumeScale);
    expect(a.wasConstrained).toBe(b.wasConstrained);
    expect(a.userMessages).toEqual(b.userMessages);
  });
});

// ── explainSafetyEvaluation ───────────────────────────────────────────────────

describe("explainSafetyEvaluation", () => {
  it("returns hasConstraints=false when nothing triggered", () => {
    const evaluation = evaluateSafety(safeCtx());
    const explanation = explainSafetyEvaluation(evaluation);
    expect(explanation.hasConstraints).toBe(false);
    expect(explanation.headline).toBeNull();
    expect(explanation.messages).toHaveLength(0);
  });

  it("returns hasConstraints=true and headline when critical rule fires", () => {
    const evaluation = evaluateSafety(safeCtx({ fatigueEstimate: 90, proposedVolumeScale: 1.0 }));
    const explanation = explainSafetyEvaluation(evaluation);
    expect(explanation.hasConstraints).toBe(true);
    expect(typeof explanation.headline).toBe("string");
    expect(explanation.messages.length).toBeGreaterThan(0);
  });

  it("uses 'adjusted for safety' headline when critical rules fire", () => {
    const evaluation = evaluateSafety(safeCtx({ fatigueEstimate: 90, proposedVolumeScale: 1.0 }));
    const explanation = explainSafetyEvaluation(evaluation);
    expect(explanation.headline).toContain("safety");
  });
});

// ── buildSafetyContext ────────────────────────────────────────────────────────

describe("buildSafetyContext", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("maps all scalar fields directly", () => {
    const ctx = buildSafetyContext({
      proposedVolumeScale:  0.85,
      currentVolumeScale:   1.0,
      readinessScore:       70,
      recoveryScore:        65,
      fatigueEstimate:      45,
      hasSymptoms:          true,
      isDeload:             false,
      confidenceScore:      0.72,
      weeklyVolumeSets:     24,
      prevWeekVolumeSets:   22,
      workoutHistory:       [],
      recoveryScores:       [],
      trainingDecisionType: "proceed",
    });
    expect(ctx.proposedVolumeScale).toBe(0.85);
    expect(ctx.readinessScore).toBe(70);
    expect(ctx.hasSymptoms).toBe(true);
    expect(ctx.confidenceScore).toBe(0.72);
  });

  it("computes streakDays = 0 from empty history", () => {
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: [], recoveryScores: [],
      trainingDecisionType: "proceed",
    });
    expect(ctx.streakDays).toBe(0);
  });

  it("computes streakDays from consecutive completed history", () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const history = [
      { id: today, status: "completed" },
      { id: yesterday.toISOString().slice(0, 10), status: "completed" },
      { id: twoDaysAgo.toISOString().slice(0, 10), status: "completed" },
    ];
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: history, recoveryScores: [],
      trainingDecisionType: "proceed",
    });
    expect(ctx.streakDays).toBe(3);
  });

  it("streak breaks on a non-completed day", () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const history = [
      { id: today, status: "completed" },
      { id: yesterday.toISOString().slice(0, 10), status: "skipped" },  // break
      { id: twoDaysAgo.toISOString().slice(0, 10), status: "completed" },
    ];
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: history, recoveryScores: [],
      trainingDecisionType: "proceed",
    });
    expect(ctx.streakDays).toBe(1);
  });

  it("computes lowRecoveryDays = 0 from empty recovery scores", () => {
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: [], recoveryScores: [],
      trainingDecisionType: "proceed",
    });
    expect(ctx.lowRecoveryDays).toBe(0);
  });

  it("counts consecutive low recovery days (< 40)", () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const scores = [
      { date: today, score: 35 },
      { date: yesterday.toISOString().slice(0, 10), score: 28 },
      { date: twoDaysAgo.toISOString().slice(0, 10), score: 55 },  // above threshold — stops count
    ];
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: [], recoveryScores: scores,
      trainingDecisionType: "proceed",
    });
    expect(ctx.lowRecoveryDays).toBe(2);
  });

  it("maps trainingDecisionType 'recover' to 'Low' intensity", () => {
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: [], recoveryScores: [],
      trainingDecisionType: "recover",
    });
    expect(ctx.proposedIntensity).toBe("Low");
  });

  it("maps trainingDecisionType 'scale_up' to 'Moderate to High' intensity", () => {
    const ctx = buildSafetyContext({
      proposedVolumeScale: 1.0, currentVolumeScale: 1.0,
      readinessScore: 70, recoveryScore: 65, fatigueEstimate: 40,
      hasSymptoms: false, isDeload: false, confidenceScore: 0.8,
      weeklyVolumeSets: 20, prevWeekVolumeSets: 20,
      workoutHistory: [], recoveryScores: [],
      trainingDecisionType: "scale_up",
    });
    expect(ctx.proposedIntensity).toBe("Moderate to High");
  });
});

// ── Performance: applySafetyGovernance < 15ms ────────────────────────────────

describe("applySafetyGovernance performance", () => {
  it("completes in under 15ms on average across 100 calls", () => {
    const ctx = safeCtx({ fatigueEstimate: 88, hasSymptoms: true, proposedVolumeScale: 1.1 });
    const RUNS = 100;
    const start = performance.now();
    for (let i = 0; i < RUNS; i++) {
      applySafetyGovernance(ctx);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / RUNS;
    // Log for visibility
    console.log(`[perf] applySafetyGovernance avg: ${avgMs.toFixed(3)}ms over ${RUNS} calls`);
    expect(avgMs).toBeLessThan(15);
  });
});

// ── Determinism: full pipeline ────────────────────────────────────────────────

describe("applySafetyGovernance determinism", () => {
  it("produces identical output for identical inputs on repeated calls", () => {
    const ctx = safeCtx({
      fatigueEstimate:   90,
      hasSymptoms:       true,
      isDeload:          true,
      proposedVolumeScale: 1.0,
      lowRecoveryDays:   3,
      streakDays:        7,
    });

    const results = Array.from({ length: 5 }, () => applySafetyGovernance(ctx));

    for (let i = 1; i < results.length; i++) {
      expect(results[i].volumeScale).toBe(results[0].volumeScale);
      expect(results[i].explanation.hasConstraints).toBe(results[0].explanation.hasConstraints);
      expect(results[i].evaluation.constrainedVolumeScale).toBe(results[0].evaluation.constrainedVolumeScale);
    }
  });
});
