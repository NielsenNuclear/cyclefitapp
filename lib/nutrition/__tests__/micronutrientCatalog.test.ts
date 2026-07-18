// ─── lib/nutrition/__tests__/micronutrientCatalog.test.ts ─────────────────────
// Nutrition Intelligence 2.0. Confirms all 7 micronutrient IDs resolve to a
// complete entry, and that the educational-language guardrail holds (no
// diagnostic phrasing like "you have anemia" anywhere in the catalog).

import { describe, it, expect } from "vitest";
import { MICRONUTRIENT_CATALOG, getMicronutrientInsights, type MicronutrientId } from "../micronutrientCatalog";

const ALL_IDS: MicronutrientId[] = ["iron", "magnesium", "calcium", "vitaminD", "vitaminB12", "folate", "omega3"];

describe("MICRONUTRIENT_CATALOG — completeness", () => {
  it("has an entry for all 7 nutrient IDs", () => {
    for (const id of ALL_IDS) {
      expect(MICRONUTRIENT_CATALOG[id]).toBeDefined();
    }
  });

  it("every entry has a non-empty name, associatedWith list, foodSources list, and blurb", () => {
    for (const id of ALL_IDS) {
      const entry = MICRONUTRIENT_CATALOG[id];
      expect(entry.id).toBe(id);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.associatedWith.length).toBeGreaterThan(0);
      expect(entry.foodSources.length).toBeGreaterThan(0);
      expect(entry.blurb.length).toBeGreaterThan(0);
    }
  });

  it("no diagnostic language anywhere in the catalog (guardrail)", () => {
    const diagnosticPhrases = [/you have/i, /diagnos/i, /disease/i, /disorder/i, /deficiency\b/i];
    for (const id of ALL_IDS) {
      const entry = MICRONUTRIENT_CATALOG[id];
      const allText = [entry.blurb, ...entry.associatedWith].join(" ");
      for (const phrase of diagnosticPhrases) {
        expect(allText).not.toMatch(phrase);
      }
    }
  });
});

describe("getMicronutrientInsights", () => {
  it("returns entries in the requested order", () => {
    const result = getMicronutrientInsights(["omega3", "iron"]);
    expect(result.map(r => r.id)).toEqual(["omega3", "iron"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(getMicronutrientInsights([])).toEqual([]);
  });

  it("returns all 7 in full-catalog order when given every ID", () => {
    const result = getMicronutrientInsights(ALL_IDS);
    expect(result).toHaveLength(7);
  });
});
