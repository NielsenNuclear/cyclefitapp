// ─── lib/exercises/__tests__/loadingType.test.ts ──────────────────────────────
// Workout Engine Sprint — Phase A.2 (UX Stabilization Issue #14). Confirms
// deriveLoadingType()/getLoadingType() correctly classify real exercises from
// the library, including the weight-belt edge case that was the original
// motivation (a bodyweight-equipment-string default masking a weighted variant).

import { describe, it, expect } from "vitest";
import { deriveLoadingType, getLoadingType } from "../exerciseSubstitutions";
import { allExercises } from "../exerciseLibrary";
import type { Exercise } from "../exerciseLibrary";

function findExercise(name: string): Exercise {
  const ex = allExercises.find(e => e.name === name);
  if (!ex) throw new Error(`Fixture exercise "${name}" not found in library — test fixture is stale`);
  return ex;
}

describe("deriveLoadingType — real library exercises", () => {
  it("plain bodyweight equipment → bodyweight", () => {
    expect(deriveLoadingType(findExercise("Ab Wheel Rollout (Kneeling)"))).toBe("bodyweight");
  });

  it("plain Pull-Up Bar (no weight belt) → bodyweight", () => {
    expect(deriveLoadingType(findExercise("Pull-Up (Bodyweight)"))).toBe("bodyweight");
  });

  it("Pull-Up Bar, Weight Belt → weighted (the original edge case: equipment string contains no barbell/dumbbell/etc keyword, must not fall through to bodyweight)", () => {
    expect(deriveLoadingType(findExercise("Weighted Pull-Up"))).toBe("weighted");
  });

  it("Parallel Bars, Weight Belt → weighted (same edge case, different equipment prefix)", () => {
    expect(deriveLoadingType(findExercise("Weighted Dips"))).toBe("weighted");
  });

  it("barbell equipment → weighted", () => {
    expect(deriveLoadingType(findExercise("Barbell Bent-Over Row"))).toBe("weighted");
  });

  it("Isometric movement pattern → timed, regardless of equipment", () => {
    expect(deriveLoadingType(findExercise("Plank (Standard)"))).toBe("timed");
  });

  it("Carry movement pattern → distance", () => {
    expect(deriveLoadingType(findExercise("Farmers Carry (Heavy, Bilateral)"))).toBe("distance");
  });

  it("Mobility category takes precedence over resistance-band equipment (this library has no non-Mobility band exercise)", () => {
    expect(deriveLoadingType(findExercise("Band Pull-Apart"))).toBe("timed");
  });

  it("resistance band on a non-Mobility, non-Isometric exercise → repetitions (synthetic — no such exercise exists in the current library)", () => {
    const synthetic: Exercise = {
      name: "Synthetic Band Row",
      primaryMuscles: ["Latissimus Dorsi"],
      secondaryMuscles: [],
      movementPattern: "Horizontal Pull",
      difficulty: "Beginner",
      equipment: "Resistance Band",
      biomechanicalNote: "test",
      category: "Upper Pull",
    };
    expect(deriveLoadingType(synthetic)).toBe("repetitions");
  });

  it("assisted equipment → assisted", () => {
    const synthetic: Exercise = {
      name: "Assisted Pull-Up",
      primaryMuscles: ["Latissimus Dorsi"],
      secondaryMuscles: [],
      movementPattern: "Vertical Pull",
      difficulty: "Beginner",
      equipment: "Assisted Pull-Up Machine",
      biomechanicalNote: "test",
      category: "Upper Pull",
    };
    expect(deriveLoadingType(synthetic)).toBe("assisted");
  });
});

describe("getLoadingType — hand-authored override precedence", () => {
  it("uses exercise.loadingType when present, without deriving", () => {
    const overridden: Exercise = {
      ...findExercise("Barbell Bent-Over Row"),
      loadingType: "assisted", // deliberately wrong for the equipment, to prove precedence
    };
    expect(getLoadingType(overridden)).toBe("assisted");
  });

  it("falls back to derivation when no override is present", () => {
    const ex = findExercise("Ab Wheel Rollout (Kneeling)");
    expect(ex.loadingType).toBeUndefined();
    expect(getLoadingType(ex)).toBe(deriveLoadingType(ex));
  });
});

describe("deriveLoadingType — full-library sanity sweep", () => {
  it("every exercise in the library derives a defined LoadingType with no throw", () => {
    for (const ex of allExercises) {
      expect(() => deriveLoadingType(ex)).not.toThrow();
      const result = deriveLoadingType(ex);
      expect(["bodyweight", "weighted", "assisted", "timed", "distance", "repetitions"]).toContain(result);
    }
  });
});
