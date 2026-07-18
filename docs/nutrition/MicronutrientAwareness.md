# Micronutrient Awareness — Axis

**Date:** 2026-07-18
**Status:** Implemented. This document describes the shipped structured micronutrient system, not a proposal.
**Origin:** Nutrition Intelligence 2.0, per the product brief's explicit framing: *"This is where Axis could become unique... Educate → Inform → Support. Not diagnose."*

---

## 1. What existed before

`lib/nutrition/fuelTargets.ts` already tracked three boolean flags — `ironFocus`, `magnesiumFocus`, `electrolyteFocus` — set from a combination of cycle-phase baseline (Menstrual → iron, Luteal/Late Luteal → magnesium, Ovulatory/high-output → electrolytes) and today's logged symptoms (fatigue/low-energy → iron, headache → electrolytes, poor sleep/cramps → magnesium). `NutritionHubCard.tsx` rendered these as three plain chips with no further detail. Separately, `lib/recommendations/generateRecommendation.ts` attached a free-text `keyNutrients: string[]` label list per cycle phase (e.g. Follicular: "Zinc", "B vitamins", "Dietary fibre") — copy only, no structured data behind it.

Neither surface told a user *why* a nutrient mattered, what low intake was associated with, or where to get it. This document covers what replaced the first of those two (the flag system); the phase `keyNutrients` copy is untouched, pre-existing content, out of scope here.

## 2. What shipped: a structured catalog, not a redesign of the triggers

`lib/nutrition/micronutrientCatalog.ts` defines 7 nutrients — iron, magnesium, calcium, vitamin D, vitamin B12, folate, omega-3 fats — each as a `NutrientInsight`:

```ts
interface NutrientInsight {
  id:             MicronutrientId;
  name:           string;
  associatedWith: string[];   // educational only — see §3
  foodSources:    string[];
  blurb:          string;
}
```

This is deliberately a **static reference table**, parallel in spirit to `symptomNutritionMap.ts`'s existing `RULES` table — not a new triggering engine. The question of *which* nutrients to flag today is answered by `fuelTargets.ts`'s new `deriveMicroFocus(phase, ironFocus, magnesiumFocus)`, which is intentionally boring: it reuses the *existing* `ironFocus`/`magnesiumFocus` booleans (so the two representations — the old boolean flags and the new structured `microFocus: MicronutrientId[]` list — can never disagree, and a test asserts this), and adds one new phase association: Menstrual → omega-3, drawn directly from copy that already existed in `nutritionTargets.ts`'s `PHASE_NUTRITION_NOTES` ("Iron, hydration, and omega-3 fats take priority. Gentle anti-inflammatory focus today.") rather than inventing a new nutrient-phase correlation.

Calcium, vitamin D, B12, and folate are in the catalog — available for `getMicronutrientInsights()` to render if ever flagged — but nothing in the codebase currently triggers them automatically. There was no existing basis (an existing symptom mapping, an existing phase note) to ground an automatic trigger for these four the way there was for iron/magnesium/omega-3, and inventing one would have meant asserting a nutrient-phase or nutrient-symptom correlation not otherwise present anywhere in Axis's existing content. They're present in the catalog as a complete reference and a foundation for a future, deliberately-designed extension, not silently active today.

**Electrolytes** stay exactly as they were — a separate, untouched `electrolyteFocus` boolean, not folded into the 7-nutrient catalog. Electrolytes are a sodium/potassium/hydration composite, not a single RDA-bearing nutrient the way the other 7 are, and magnesium (one of electrolyte balance's real contributors) is already covered by its own catalog entry.

## 3. The language guardrail

Every `associatedWith` entry and every `blurb` is written to inform, not diagnose. The brief's own example is the exact shape every entry follows:

> Not: *"You have anemia."*
> Instead: *"Low iron intake can be associated with: fatigue, reduced exercise performance."*

Concretely, the catalog:
- States what **low intake of a nutrient** is generally associated with — never what the user's own health status is.
- Never uses clinical/diagnostic terms (deficiency, disease, disorder, "you have," "you are").
- Closes with sourced, actionable food suggestions, not a course of action framed as medical advice.

`NutritionHubCard.tsx`'s micronutrient section additionally closes with a fixed disclaimer line: *"Educational information, not a medical assessment. If symptoms persist, consider discussing with a healthcare professional."* — present regardless of which nutrients are shown, matching the brief's explicit instruction to point toward professional guidance rather than have Axis attempt to provide it.

A test (`lib/nutrition/__tests__/micronutrientCatalog.test.ts`) enforces this mechanically: it scans every catalog entry's `blurb` and `associatedWith` text for diagnostic-sounding phrases (`/you have/i`, `/diagnos/i`, `/disease/i`, `/disorder/i`, `/deficiency\b/i`) and fails if any appear. This doesn't replace editorial judgment on new entries, but it catches the most obvious regressions automatically.

## 4. Where this surfaces

`NutritionHubCard.tsx`'s Details section renders a "Nutrients to watch today" block whenever `fuelTargets.microFocus` is non-empty — name, blurb, and food sources per nutrient, positioned alongside (not replacing) the existing priority chips and symptom-based adjustments. It's additive: nothing about the card's existing sections changed to make room for it.

## 5. What this deliberately does not do

- **No intake tracking.** Axis has no food/gram logging anywhere in the app (`NutritionCheckinCard` is boolean-only: "hit my protein target today? yes/no"). This module cannot and does not claim to know a user's actual micronutrient intake — it surfaces *general* associations tied to cycle phase and logged symptoms, not a computed personal deficiency risk.
- **No RDA-based amount targets.** Unlike the calorie/macro side of Nutrition Intelligence 2.0 (`docs/nutrition/NutritionEngineArchitecture.md`), there's no "you need 18mg of iron today" number anywhere — that would imply a precision this system doesn't have the underlying data to support.
- **No new symptom-to-nutrient correlations invented.** As noted in §2, the four catalog entries without an automatic trigger stay dormant rather than being wired to a guessed-at trigger condition.
