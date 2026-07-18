// ─── lib/nutrition/micronutrientCatalog.ts ────────────────────────────────────
// Nutrition Intelligence 2.0. Static reference data for structured
// micronutrient awareness — parallel in spirit to symptomNutritionMap.ts's
// RULES table, but covering 7 named nutrients with richer per-nutrient
// content (associated symptoms/benefits, food sources) rather than a
// single suggestion string.
//
// Language guardrail: every `associatedWith` entry is deliberately
// educational, never diagnostic. "Low iron intake can be associated with
// fatigue" is correct; "you have anemia" is not — this module makes no
// claim about a user's health status, only about what low intake of a
// nutrient is generally associated with. See docs/nutrition/
// MicronutrientAwareness.md for the full rationale.
//
// Electrolytes are deliberately NOT one of the 7 — fuelTargets.ts's
// existing electrolyteFocus boolean stays separate, since electrolytes are
// a sodium/potassium/hydration composite, not a single RDA-bearing
// nutrient, and magnesium (one of its historical drivers) is already
// covered here.

export type MicronutrientId =
  | "iron" | "magnesium" | "calcium" | "vitaminD" | "vitaminB12" | "folate" | "omega3";

export interface NutrientInsight {
  id:             MicronutrientId;
  name:           string;
  associatedWith: string[];   // educational only — never diagnostic
  foodSources:    string[];
  blurb:          string;
}

export const MICRONUTRIENT_CATALOG: Record<MicronutrientId, NutrientInsight> = {
  iron: {
    id: "iron",
    name: "Iron",
    associatedWith: ["fatigue", "reduced exercise capacity", "low energy"],
    foodSources: ["red meat", "lentils", "spinach", "fortified cereals"],
    blurb: "Low iron intake can be associated with fatigue and reduced exercise capacity. Pairing iron-rich foods with vitamin C can help absorption.",
  },
  magnesium: {
    id: "magnesium",
    name: "Magnesium",
    associatedWith: ["muscle cramps", "recovery quality", "sleep quality"],
    foodSources: ["dark chocolate", "nuts", "seeds", "leafy greens", "oily fish"],
    blurb: "Low magnesium intake can be associated with muscle cramps and disrupted sleep. Many training-focused diets fall short of typical guidance here.",
  },
  calcium: {
    id: "calcium",
    name: "Calcium",
    associatedWith: ["bone health", "muscle function"],
    foodSources: ["dairy", "fortified plant milks", "tofu", "leafy greens", "almonds"],
    blurb: "Calcium supports bone density and muscle contraction — particularly relevant for consistent load-bearing training over time.",
  },
  vitaminD: {
    id: "vitaminD",
    name: "Vitamin D",
    associatedWith: ["immune support", "bone health"],
    foodSources: ["fatty fish", "egg yolks", "fortified foods", "sunlight exposure"],
    blurb: "Vitamin D supports immune function and calcium absorption. Intake alone often isn't enough — sunlight exposure matters too.",
  },
  vitaminB12: {
    id: "vitaminB12",
    name: "Vitamin B12",
    associatedWith: ["energy production", "red blood cell formation"],
    foodSources: ["meat", "fish", "eggs", "dairy", "fortified nutritional yeast"],
    blurb: "B12 supports energy metabolism and red blood cell formation. Plant-forward diets in particular may benefit from a fortified source.",
  },
  folate: {
    id: "folate",
    name: "Folate",
    associatedWith: ["cell growth", "blood health"],
    foodSources: ["leafy greens", "legumes", "citrus fruits", "fortified grains"],
    blurb: "Folate supports cell growth and healthy blood formation, working alongside B12 and iron.",
  },
  omega3: {
    id: "omega3",
    name: "Omega-3 fats",
    associatedWith: ["recovery quality", "joint comfort", "inflammatory balance"],
    foodSources: ["oily fish (salmon, mackerel, sardines)", "walnuts", "flaxseed", "chia seeds"],
    blurb: "Omega-3 fats are associated with recovery quality and a balanced inflammatory response to training load.",
  },
};

export function getMicronutrientInsights(ids: MicronutrientId[]): NutrientInsight[] {
  return ids.map(id => MICRONUTRIENT_CATALOG[id]).filter(Boolean);
}
