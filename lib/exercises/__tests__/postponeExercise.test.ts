// ─── lib/exercises/__tests__/postponeExercise.test.ts ─────────────────────────
// Workout Engine Sprint — Phase B.7. Exercise postponement reorder logic.

import { describe, it, expect } from "vitest";
import { canPostpone, postponeArray, postponeRecord } from "../postponeExercise";

describe("canPostpone", () => {
  it("true when a next exercise exists to postpone past", () => {
    expect(canPostpone(0, 4)).toBe(true);
    expect(canPostpone(2, 4)).toBe(true);
  });

  it("false for the last exercise — nothing to postpone past", () => {
    expect(canPostpone(3, 4)).toBe(false);
  });

  it("false for an out-of-range or negative index", () => {
    expect(canPostpone(-1, 4)).toBe(false);
    expect(canPostpone(4, 4)).toBe(false);
  });
});

describe("postponeArray", () => {
  it("A B C D postponing B → A C B D — moves past the next exercise only, not to the end", () => {
    expect(postponeArray(["A", "B", "C", "D"], 1)).toEqual(["A", "C", "B", "D"]);
  });

  it("postponing the first exercise", () => {
    expect(postponeArray(["A", "B", "C"], 0)).toEqual(["B", "A", "C"]);
  });

  it("postponing the second-to-last exercise", () => {
    expect(postponeArray(["A", "B", "C", "D"], 2)).toEqual(["A", "B", "D", "C"]);
  });

  it("is a no-op when postponing the last exercise", () => {
    const arr = ["A", "B", "C"];
    expect(postponeArray(arr, 2)).toEqual(arr);
  });

  it("is a no-op for an out-of-range index", () => {
    const arr = ["A", "B"];
    expect(postponeArray(arr, 5)).toEqual(arr);
    expect(postponeArray(arr, -1)).toEqual(arr);
  });
});

describe("postponeRecord — the real risk (docs/ux/UXStabilizationAudit.md §15)", () => {
  it("a partially logged set stays attached to its exercise after the reorder", () => {
    // Exercise B (index 1) has 1 of 3 sets already logged.
    const actuals: Record<number, { completed: boolean }[]> = {
      0: [{ completed: true }, { completed: true }, { completed: true }],   // A — fully done
      1: [{ completed: true }, { completed: false }, { completed: false }], // B — 1 of 3 logged
      2: [{ completed: false }, { completed: false }, { completed: false }], // C — untouched
      3: [{ completed: false }, { completed: false }, { completed: false }], // D — untouched
    };

    const reordered = postponeRecord(actuals, 1, 4);

    // Exercises reorder to A C B D, so index 1 (was C) now holds C's untouched
    // sets, and index 2 (was B) now holds B's partially-logged sets.
    expect(reordered[0]).toEqual(actuals[0]);              // A unaffected
    expect(reordered[1]).toEqual(actuals[2]);               // now C's (untouched) sets
    expect(reordered[2]).toEqual(actuals[1]);               // now B's (1-of-3-logged) sets — did NOT get lost or reset
    expect(reordered[2][0].completed).toBe(true);            // B's logged set survived the move
    expect(reordered[3]).toEqual(actuals[3]);               // D unaffected
  });

  it("is a no-op when there's no next exercise to postpone past", () => {
    const actuals = { 0: ["a"], 1: ["b"] };
    expect(postponeRecord(actuals, 1, 2)).toEqual(actuals);
  });

  it("original record is not mutated", () => {
    const actuals = { 0: ["a"], 1: ["b"], 2: ["c"] };
    const snapshot = JSON.stringify(actuals);
    postponeRecord(actuals, 0, 3);
    expect(JSON.stringify(actuals)).toBe(snapshot);
  });
});
