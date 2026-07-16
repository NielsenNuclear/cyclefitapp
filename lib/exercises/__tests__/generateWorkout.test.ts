// ─── lib/exercises/__tests__/generateWorkout.test.ts ─────────────────────────
// UX Stabilization Batch 5a/5c — regression coverage for the volume-combination
// fix (Issue #13 / Finding E4: four independent floor-at-1 passes compounding
// overlapping signals) and confidence-aware early-user damping (§7).

import { describe, it, expect } from "vitest";
import { generateWorkout, type WorkoutGenerationInput } from "../generateWorkout";
import type { PhaseData } from "@/types/recommendation";

function phase(overrides: Partial<PhaseData> = {}): PhaseData {
  return {
    name: "Follicular",
    cycleDay: 8,
    cycleLength: 28,
    dayInPhase: 3,
    energyTrend: "Rising",
    hormonalContext: "test",
    physiologicalNote: "test",
    daysUntilNextPhase: 5,
    hasCycleData: true,
    ...overrides,
  };
}

function baseInput(overrides: Partial<WorkoutGenerationInput> = {}): WorkoutGenerationInput {
  return {
    splitType: "full_body",
    dayIndex: 0,
    difficulty: "Intermediate",
    energyLevel: 2,
    trainingState: "fresh",
    phase: phase(),
    ...overrides,
  };
}

describe("generateWorkout — volume combination (Batch 5a)", () => {
  it("never prescribes fewer than 2 sets, even under maximally stacked reductions", () => {
    const workout = generateWorkout(baseInput({
      trainingState: "overreached",
      energyLevel: 0,
      coachingAdjustment: {
        action: "deload",
        volumeModifier: 0.6,
        intensityModifier: -2,
        complexityModifier: "decrease",
        rationale: "test",
      },
      adaptiveVolumeMultiplier: 0.70,           // lower bound of the documented [0.70, 1.15] range
      adherenceRiskScale: 0.70,                 // Phase 34F "high risk" value
      periodizationStatus: {
        phase: "deload",
        label: "Deload",
        description: "test",
        mesocycleWeek: 4,
        blockLengthWeeks: 4,
        phaseWeek: 1,
        phaseLength: 1,
        weeksUntilNextPhase: 1,
        nextPhase: "accumulation",
        nextPhaseLabel: "Accumulation",
        blockProgress: 1,
        setsOffset: -2,                          // largest documented deload offset
        rpeOffset: -2,
        forcedEarly: false,
      },
    }));

    for (const ex of workout.exercises) {
      expect(ex.sets).toBeGreaterThanOrEqual(2);
    }
  });

  it("does not multiply volumeModifier and adherenceRiskScale together (overlapping-signal double-count)", () => {
    // Both factors independently represent a ~30% reduction (0.70). If they
    // were multiplied (the old behavior), the combined ratio would be ~0.49
    // — worse than either signal alone claims the day warrants. Taking the
    // minimum (the fix) means the combined ratio should equal 0.70, not 0.49.
    const stackedOverlap = generateWorkout(baseInput({
      energyLevel: 4, // baseSets 4, so the ratio difference is visible above the MIN_SETS floor
      coachingAdjustment: {
        action: "reduce",
        volumeModifier: 0.70,
        intensityModifier: 0,
        complexityModifier: "maintain",
        rationale: "test",
      },
      adherenceRiskScale: 0.70,
    }));

    const singleFactor = generateWorkout(baseInput({
      energyLevel: 4,
      coachingAdjustment: {
        action: "reduce",
        volumeModifier: 0.70,
        intensityModifier: 0,
        complexityModifier: "maintain",
        rationale: "test",
      },
      // adherenceRiskScale defaults to 1.0 (no additional reduction)
    }));

    // If the two 0.70 factors were still multiplying, stackedOverlap's sets
    // would be measurably lower than singleFactor's. They should match.
    const mainExercises = (w: ReturnType<typeof generateWorkout>) =>
      w.exercises.filter(ex => ex.exercise.category !== "Mobility" && ex.exercise.category !== "Core");
    const stacked = mainExercises(stackedOverlap);
    const single  = mainExercises(singleFactor);
    expect(stacked.length).toBeGreaterThan(0);
    for (let i = 0; i < stacked.length; i++) {
      expect(stacked[i].sets).toBe(single[i].sets);
    }
  });

  it("full-confidence, no-reduction input produces the un-damped baseline set count", () => {
    const workout = generateWorkout(baseInput({ energyLevel: 3, trainingState: "fresh" }));
    const mainExercise = workout.exercises.find(
      ex => ex.exercise.category !== "Mobility" && ex.exercise.category !== "Core",
    );
    expect(mainExercise).toBeDefined();
    expect(mainExercise!.sets).toBe(3); // ENERGY_PRESETS[3].baseSets, no modifiers applied
  });
});

describe("generateWorkout — confidence-aware early-user damping (Batch 5c)", () => {
  it("dampens a progression-driven volume cut for low confidence", () => {
    const reduced: WorkoutGenerationInput = baseInput({
      energyLevel: 3,
      coachingAdjustment: {
        action: "reduce",
        volumeModifier: 0.6, // a 40% cut from progression/readiness
        intensityModifier: 0,
        complexityModifier: "maintain",
        rationale: "test",
      },
    });

    const undamped = generateWorkout(reduced);
    const damped   = generateWorkout({ ...reduced, confidenceVolumeDamping: 0.5 });

    const mainEx = (w: ReturnType<typeof generateWorkout>) =>
      w.exercises.find(ex => ex.exercise.category !== "Mobility" && ex.exercise.category !== "Core")!;

    // Damped (0.5 factor, Insufficient confidence) should cut LESS than
    // undamped (full magnitude) — i.e. damped sets >= undamped sets.
    expect(mainEx(damped).sets).toBeGreaterThanOrEqual(mainEx(undamped).sets);
  });

  it("does not damp adherenceRiskScale (same-day auto-regulation)", () => {
    // adherenceRiskScale represents today's real signals (Training Decision
    // Engine composite) and per RecommendationExplainability.md §7 must stay
    // fully responsive regardless of confidence level.
    const input = baseInput({
      energyLevel: 4,
      adherenceRiskScale: 0.70,
      confidenceVolumeDamping: 0.5, // Insufficient confidence
    });
    const dampedResult = generateWorkout(input);

    const noDamping = generateWorkout({ ...input, confidenceVolumeDamping: 1.0 });

    const mainEx = (w: ReturnType<typeof generateWorkout>) =>
      w.exercises.find(ex => ex.exercise.category !== "Mobility" && ex.exercise.category !== "Core")!;

    // adherenceRiskScale's effect should be identical whether or not
    // confidenceVolumeDamping is applied, since it's never damped.
    expect(mainEx(dampedResult).sets).toBe(mainEx(noDamping).sets);
  });
});
