// ─── lib/exercises/__tests__/warmupSets.test.ts ───────────────────────────────
// Workout Engine Sprint — Phase A.1. Progressive-loading warm-up sets.

import { describe, it, expect } from "vitest";
import { getWarmupTier, generateWarmupSets } from "../warmupSets";
import { allExercises } from "../exerciseLibrary";
import type { Exercise } from "../exerciseLibrary";

function findExercise(name: string): Exercise {
  const ex = allExercises.find(e => e.name === name);
  if (!ex) throw new Error(`Fixture exercise "${name}" not found in library — test fixture is stale`);
  return ex;
}

describe("getWarmupTier — real library exercises", () => {
  it("heavy barbell squat → heavy_compound", () => {
    expect(getWarmupTier(findExercise("Barbell Back Squat (High Bar)"))).toBe("heavy_compound");
  });

  it("bicep curl → isolation, despite a compound-looking movement pattern and 2 synergist secondary muscles", () => {
    const curl = findExercise("Dumbbell Bicep Curl (Seated)");
    expect(curl.movementPattern).toBe("Vertical Pull");          // looks compound on paper
    expect(curl.secondaryMuscles.length).toBeGreaterThanOrEqual(2); // would pass the muscle-count heuristic alone
    expect(getWarmupTier(curl)).toBe("isolation");                // name pattern overrides both
  });

  it("lateral raise → isolation", () => {
    expect(getWarmupTier(findExercise("Dumbbell Lateral Raise (Standing)"))).toBe("isolation");
  });

  it("tricep pushdown → isolation", () => {
    expect(getWarmupTier(findExercise("Cable Tricep Pushdown (Rope)"))).toBe("isolation");
  });

  it("bodyweight exercise → accessory (no loaded ramp to compute)", () => {
    expect(getWarmupTier(findExercise("Pull-Up (Bodyweight)"))).toBe("accessory");
  });

  it("Mobility-category exercise → accessory regardless of equipment", () => {
    expect(getWarmupTier(findExercise("Band Pull-Apart"))).toBe("accessory");
  });

  it("timed (Isometric) exercise → accessory", () => {
    expect(getWarmupTier(findExercise("Plank (Standard)"))).toBe("accessory");
  });
});

describe("generateWarmupSets", () => {
  it("returns an empty array with no reference weight — a genuinely new lift has no ramp to compute", () => {
    expect(generateWarmupSets(findExercise("Barbell Back Squat (High Bar)"), undefined)).toEqual([]);
    expect(generateWarmupSets(findExercise("Barbell Back Squat (High Bar)"), 0)).toEqual([]);
  });

  it("heavy compound: 3 ramp sets at 50/70/85%, rounded to the nearest 2.5kg plate", () => {
    const sets = generateWarmupSets(findExercise("Barbell Back Squat (High Bar)"), 100);
    expect(sets).toHaveLength(3);
    expect(sets.map(s => s.percent)).toEqual([50, 70, 85]);
    expect(sets.map(s => s.weight)).toEqual([50, 70, 85]);
    // Reps taper down as load climbs
    expect(parseInt(sets[0].reps, 10)).toBeGreaterThan(parseInt(sets[2].reps, 10));
  });

  it("medium compound: 2 ramp sets", () => {
    const sets = generateWarmupSets(findExercise("Dumbbell Incline Press"), 40);
    expect(sets.length).toBeLessThanOrEqual(2);
    expect(sets.length).toBeGreaterThan(0);
  });

  it("isolation: 1 set when working weight is light, 2 when heavy enough to warrant it", () => {
    const curl = findExercise("Dumbbell Bicep Curl (Seated)");
    const light = generateWarmupSets(curl, 10);
    const heavy = generateWarmupSets(curl, 30);
    expect(light).toHaveLength(1);
    expect(heavy).toHaveLength(2);
  });

  it("accessory/bodyweight exercises never generate warm-up sets, even with a reference weight", () => {
    expect(generateWarmupSets(findExercise("Pull-Up (Bodyweight)"), 20)).toEqual([]);
  });

  it("plate rounding never produces a fractional-kg weight", () => {
    const sets = generateWarmupSets(findExercise("Barbell Back Squat (High Bar)"), 73);
    for (const s of sets) {
      expect((s.weight * 10) % 25).toBe(0); // multiple of 2.5
    }
  });
});

describe("getWarmupTier — full-library sanity sweep", () => {
  it("every exercise classifies with no throw", () => {
    for (const ex of allExercises) {
      expect(() => getWarmupTier(ex)).not.toThrow();
    }
  });
});
