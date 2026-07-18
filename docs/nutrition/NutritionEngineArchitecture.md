# Nutrition Engine Architecture — Axis

**Date:** 2026-07-18
**Status:** Implemented. This document describes the shipped Nutrition Intelligence 2.0 architecture, not a proposal.
**Origin:** Product brief — replacing the flat default-profile nutrition baseline with a personalized BMR/TDEE-based one, per Axis's stated philosophy: "use simple, high-confidence information immediately, then layer personalization as more data is collected."

---

## 1. Before: a flat lookup table, not a personalized estimate

Prior to this initiative, every numeric nutrition target (calories, protein, carbs, fats) came from a lookup table keyed only by a categorical `FuelingLevel` ("recovery" / "maintenance" / "performance" / "high_output"), itself derived from readiness score, cycle phase, and today's workout. Body size was never an input — `lib/nutrition/nutritionTargets.ts` and `lib/nutrition/fuelTargets.ts` both stated the calibration assumption directly in their file headers: *"Targets are calibrated for an active adult (55–75 kg). They are directional guidance, not clinical prescriptions."*

Concretely, calories came from a 4-entry table (`BASE_CALORIES`, 1800–2700 kcal by fueling level) plus a flat goal-based offset (-200 to +250 kcal), and protein came from a similarly flat 4-entry table (75–140g by fueling level) plus a flat +10g boost for strength/hypertrophy goals. A 45kg user and a 90kg user with identical readiness, cycle phase, and goals received identical targets.

This was a reasonable v1 — the app had no body-metric data to work with, since onboarding never asked for it — but it meant the nutrition surface was the one part of Axis that didn't reflect "who you are" at all, even at the coarsest level, until enough compliance-check-in history accumulated for the *learned* personalization layer (§4 below) to kick in.

## 2. After: BMR → TDEE → goal-adjusted targets

```
Onboarding step 12 (age, height, weight, activity level, optional sex/diet)
        ↓
lib/nutrition/tdee.ts
   computeBMR()         — Mifflin-St Jeor
   computeTDEE()         — × activity multiplier
   applyGoalAdjustment()  — × goal percentage
        ↓
lib/nutrition/fuelTargets.ts   — computeFuelTargets(..., bodyMetrics?, trainingStyles?)
lib/nutrition/nutritionTargets.ts — computeNutritionTargets(..., bodyMetrics?, trainingStyles?)
        ↓
lib/nutrition/nutritionPeriodization.ts — unchanged, reads final numbers only
        ↓
components/dashboard/NutritionHubCard.tsx
```

Both `computeFuelTargets()` and `computeNutritionTargets()` take an **optional** `bodyMetrics` parameter (`BodyMetrics`, from `lib/nutrition/tdee.ts`). When present, calories and protein are computed from the user's actual body; when absent, both functions fall back to byte-for-byte the same flat-table behavior as before this initiative. This is not a migration with a cutover date — both paths coexist permanently. `NutritionTargets.isPersonalized: boolean` tells every downstream consumer (currently just `NutritionHubCard.tsx`) which path produced a given result.

### 2.1 BMR (Mifflin-St Jeor)

```
BMR = 10 × weightKg + 6.25 × heightCm − 5 × age + sexConstant
```

`sexConstant` is +5 for `sex: "male"`, −161 for `sex: "female"` or when `sex` is unset/`"prefer_not_to_say"`. See §3 ("Sex Assumption") for why the field is optional and what unset defaults to.

### 2.2 Activity multiplier → TDEE

```ts
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};
TDEE = BMR × ACTIVITY_MULTIPLIERS[activityLevel]
```

Standard Harris-Benedict-derived activity multiplier bands. An unrecognized `activityLevel` string falls back to the `moderate` multiplier rather than throwing — the same defensive pattern used throughout the onboarding/goal-mapping code (see §5).

### 2.3 Goal adjustment — percentage, not flat kcal

```ts
const GOAL_TDEE_OFFSET_PCT = {
  fat_loss: -0.10, general_fitness: 0, hypertrophy: +0.12, strength: +0.05, athletic_performance: +0.07,
};
calories = max(1200, round(TDEE × (1 + GOAL_TDEE_OFFSET_PCT[goalType])))
```

This is a deliberate departure from the legacy flat-kcal offsets (-200 to +250), which stay in place unchanged for the *legacy* fallback path only. A flat offset is not physiologically consistent across body sizes once the base is a real TDEE (roughly 1400–3200 kcal depending on the person, versus the legacy path's narrow ~1800–2700 kcal band): -200 kcal is trivial against a 3000 kcal TDEE and drastic against a 1500 kcal one. The percentages above were chosen to land close to the legacy offsets' *magnitude* at the legacy system's own ~2100 kcal maintenance midpoint, so the personalized path doesn't feel like a discontinuous jump in aggressiveness for a typical user — it's a different mechanism producing a similar-feeling result at the center of the distribution, and a more consistent one at the edges.

The 1200 kcal floor matches `nutritionPeriodization.ts`'s own pre-existing floor for its downstream calorie adjustments, kept consistent rather than introducing a second safety threshold.

### 2.4 Protein — g/kg bodyweight, still day-responsive

```
baseRange = trainingEmphasisProteinRangeKg(trainingStyles)   // 1.6-2.2 g/kg, narrowed by style
  endurance-leaning (running/cycling/swimming) → 1.6-2.0 g/kg
  strength-leaning (strength/crossfit)          → 1.8-2.2 g/kg
  mixed or unrecognized                          → full 1.6-2.2 g/kg
+ 0.15 g/kg boost to both bounds for strength/hypertrophy goals

grams = baseRange × weightKg
target = min + (max - min) × FUELING_LEVEL_POSITION[fuelingLevel]
  recovery → 0 (low end) · maintenance → 1/3 · performance → 2/3 · high_output → 1 (high end)
```

This preserves the day-to-day responsiveness the legacy flat `BASE_PROTEIN` table had (a recovery day always targeted less protein than a high-output day) while grounding the *range itself* in the user's actual bodyweight instead of an assumed 55–75kg. `computeFuelTargets()`'s displayed `proteinRange` is a ±12g band centered on this target — narrow enough that `nutritionTargets.ts`'s existing "take the midpoint of proteinRange" logic still produces the correct day-adjusted number, without that call site needing to know whether it's looking at a personalized or legacy range.

`trainingStyles` values (`"strength"`, `"crossfit"`, `"running"`, `"cycling"`, `"swimming"`, `"hiit"`, `"yoga"`, `"pilates"`, `"sport"`, `"other"`) come directly from onboarding step 3's `STYLES` options (`components/onboarding/Steps1to5.tsx`) — a loosely-coupled string vocabulary, the same pattern already accepted for goals (§5).

### 2.5 Carbs — unchanged phase-driven logic, personalized budget

Carbs are still `CARB_PCT[carbPriority] × calories`, exactly the same phase-driven percentage table as before (`high` 0.55 / `moderate` 0.45 / `low` 0.35 of the remaining-after-protein budget). Only the `calories` value feeding this calculation changed — the percentage logic itself is untouched, per the product brief's explicit instruction to keep phase/training-load/goal responsiveness for carbs rather than deriving them from bodyweight too.

### 2.6 Fat — g/kg floor, reconciling with the calorie-remainder calculation

The brief specified two things that are in mild tension: "carbs = remaining calories after protein + fat" and "keep the existing carb-% logic." The shipped reconciliation: carb-% still governs the *first-pass* calorie split, exactly as before; fat is then computed as the remainder (`calories − proteinKcal − carbKcal`) and clamped against a 0.8g/kg floor *afterward*, as a physiological safety check rather than a change to the primary computation order.

```
fatFloorGrams = 0.8 × weightKg
if fats < fatFloorGrams:
  deficitKcal = (fatFloorGrams − fats) × 9
  carbs = max(50, carbs − round(deficitKcal / 4))     // 50g floor prevents a pathological near-zero-carb result
  recompute fats from the new carb value
```

The 0.8–1.2 g/kg range reflects the standard rationale for a fat floor: hormone production, satiety, and fat-soluble vitamin (A/D/E/K) absorption all suffer below roughly 0.8g/kg. This clamp only ever *raises* fat relative to the naive remainder calculation — it never lowers it below what carb-% + protein would have produced anyway.

## 3. Sex assumption

Mifflin-St Jeor requires a sex-based constant. The product owner's explicit decision (over the alternative of silently hardcoding the female constant, given this is a menstrual-cycle-tracking app whose userbase assumption already leans female elsewhere) was to **add an optional `sex` field to onboarding step 12** — `"female" | "male" | "prefer_not_to_say"` — so users whose physiology doesn't match the app's default assumption still get an accurate BMR, without making the question mandatory for users who'd rather not answer it. Leaving it unset, or selecting "prefer not to say," defaults to the female constant. The constant itself lives as a single named, documented export (`MIFFLIN_ST_JEOR_CONSTANT` in `lib/nutrition/tdee.ts`) rather than a magic number, so this decision has one greppable point of change if it needs revisiting.

## 4. What this does *not* change

- **The learned compliance/outcome layer** (`nutritionCheckin.ts`, `nutritionLearning.ts`, `nutritionPatterns.ts`, `personalNutritionProfile.ts`) is completely untouched. It answers a different question ("does protein compliance correlate with your next-day readiness?") than the BMR/TDEE work does ("what's a reasonable starting calorie/macro estimate for your body"). Both layers now feed the same `NutritionHubCard`, but neither was redesigned to accommodate the other.
- **`nutritionPeriodization.ts`** needed zero changes — it only reads the final `calories`/`protein`/`carbs`/`fats` numbers off `NutritionTargets`, agnostic to how they were derived.
- **The second, independent, purely-qualitative nutrition engine** (`buildNutrition()` in `lib/recommendations/generateRecommendation.ts`, keyed only by cycle phase + sessions/week, producing free-text copy like "35–40ml per kg bodyweight" that was never actually computed from a real weight field) is known, pre-existing, documented tech debt — flagged in `NutritionHubCard.tsx`'s own header comment before this initiative started. It is explicitly out of scope here, same as it was out of scope for Dashboard 2.0. A future pass could retire it now that a real weight field exists, but that's a separate decision with its own blast radius.
- **The Adaptive Intelligence / Recommendation Engine's cycle-based logic** was not touched anywhere in this initiative, per the product brief's explicit constraint.

## 5. Loose-coupling conventions this work follows

Two string vocabularies in this codebase are intentionally *not* shared types, bridged only by mapping functions rather than a single source enum:

- **Goals**: `OnboardingData.goals: string[]` (free-text values chosen in onboarding step 1) vs. `GoalType` (`lib/exercises/goalBasedSelection.ts`) — bridged by `mapOnboardingGoalToGoalType()`.
- **Activity level**: `PhysiologyStep.tsx`'s `ACTIVITY_OPTIONS` values vs. `tdee.ts`'s `ACTIVITY_MULTIPLIERS` keys — same convention, deliberately not unified into a shared exported type. `tdee.ts` defends against drift with a `?? DEFAULT_ACTIVITY_MULTIPLIER` fallback rather than a compile-time guarantee.
- **Training styles**: `Steps1to5.tsx`'s `STYLES` values vs. `tdee.ts`'s `ENDURANCE_STYLES`/`STRENGTH_STYLES` sets — same pattern again.

This is a conscious choice already established in the codebase before this initiative (goals/GoalType predates Nutrition Intelligence 2.0), not something introduced here — noted so a future contributor doesn't "fix" the duplication into a tighter coupling that the rest of the codebase doesn't share.

## 6. Existing users — no forced migration

Users who onboarded before this shipped have no `age`/`heightCm`/`weightKg`/`activityLevel` on their stored `OnboardingData`. `hasBodyMetrics()` (`lib/nutrition/tdee.ts`) is a type guard checking `typeof field === "number"` on all four required fields — `undefined` after `JSON.parse` naturally distinguishes "legacy user, field never existed" from "new user, hasn't reached step 12 yet," with no separate migration flag. Legacy users keep the flat-table behavior silently (`isPersonalized: false`), see a small nudge in `NutritionHubCard.tsx` linking to `/profile`, and can backfill body metrics there on their own schedule — the profile page's `isProfileValid()` gate deliberately does not require these fields, so backfilling never blocks unrelated profile edits.
