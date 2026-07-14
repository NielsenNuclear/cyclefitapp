# UX Stabilization Audit — Axis / CycleFit

**Date:** 2026-07-14
**Method:** Direct code reading and tracing across the workout, adherence, cycle, recovery, and nutrition subsystems. Every finding below is grounded in an actual current code path — traced from the UI component back to its data source, not inferred from behavior alone. This document is read-only output: **no production code was modified** while producing it.

**Scope discipline:** This is a stabilization pass, not a redesign. Every recommended fix below is scoped to preserve Adaptive Intelligence, the Safety Engine, the Verification Registry, the Confidence Engine, and Telemetry exactly as they are. Where a fix touches recommendation logic, it's called out explicitly as a bug fix (a wrong default), never a formula change.

**A cross-cutting theme emerged across issues #3, #4, and #12** that's worth stating up front because it shapes several "Recommended fix" sections: the codebase already has the *right concepts* for representing "not enough data yet" in several places (`RecoveryCapacity.confidence`, `LifestyleBurnoutReport.dataMaturity`, the Verification Registry's own `"insufficient_data"` state), but they are inconsistently *enforced*. Some engines compute a maturity signal and the UI ignores it (`RecoveryCapacityCard`, `BurnoutPreventionCard`); some scoring functions don't compute one at all and default zero-data inputs to a real (bad) score (`consistency.ts`, `trainingQuality.ts`). The unifying fix is a single shared data-maturity utility that every affected card checks the same way, rather than 6+ independent, inconsistent ad hoc thresholds.

---

## 1. Exercise Rest Timer Accuracy

**User impact:** During rest between sets, the on-screen countdown doesn't match real elapsed time — it visibly lags behind, especially if the phone screen is briefly locked, the browser tab loses focus, or the device is under any load. A user resting for a prescribed 90 seconds may end up resting 100–140+ seconds without knowing it, undermining the app's own prescribed rest-interval guidance.

**Current behavior:** Both rest-timer implementations tick down once per second using `setTimeout`, rescheduled from within its own callback:

```ts
useEffect(() => {
  if (remaining <= 0) { onDismiss(); return; }
  const id = setTimeout(() => setRemaining(r => r - 1), 1000);
  return () => clearTimeout(id);
}, [remaining, onDismiss]);
```

**Root cause:** This pattern measures *ticks*, not *time*. Two independent, compounding problems:
1. **No timestamp anchor.** Each tick just schedules "1000ms from whenever this callback happens to fire," not "1000ms from the timer's actual start." Any single delayed tick (a GC pause, a slow re-render, React batching) permanently pushes back every subsequent tick — drift accumulates and never self-corrects.
2. **Background/inactive-tab throttling.** Browsers (especially mobile Safari/Chrome) throttle `setTimeout`/`setInterval` to as infrequently as once per minute when a tab is backgrounded or the screen is locked — exactly the scenario of "phone screen off between sets." The countdown effectively freezes, then jumps when the tab regains focus.

**Files involved:**
- `components/workout/RestScreen.tsx` (lines 26–34) — **live**, mounted from `WorkoutCard.tsx`, this is what users actually see.
- `components/workout/RestTimerOverlay.tsx` (lines 10–17) — **dead code**, zero import references outside itself (confirmed via repo-wide grep); only mentioned in a comment inside `RestScreen.tsx`. Has the identical bug but no live users are affected by it today.

**Recommended fix:** Replace the tick-counting model with a timestamp-anchored one, exactly as specified: compute a `targetEndTime = Date.now() + totalSeconds * 1000` once when the timer starts (store in a `ref`, not state, so it survives re-renders unchanged), and on every render/tick compute `remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000))`. A `setInterval` (or `requestAnimationFrame` for smoother ring animation) can still drive re-renders every ~250–1000ms, but it only *triggers a recompute*, it never *is* the clock — so even if a tick is late or throttled, the next tick self-corrects to the true remaining time instead of drifting further. Apply this to `RestScreen.tsx` (live) and decide `RestTimerOverlay.tsx`'s fate (fix for consistency/future reuse, or delete as confirmed dead code — recommend delete, per the same "re-check the orphan, then remove" discipline used elsewhere in this codebase's design-system work).

**Risk level:** **Low.** Isolated to 1 live component (2 if `RestTimerOverlay` is fixed rather than deleted), pure client-side timing logic, no interaction with Adaptive Intelligence/Safety Engine/recommendation data. Regression surface is fully visible in manual QA (start a rest timer, background the tab, compare elapsed real time to displayed time).

---

## 2. Restore Warmup and Cooldown Sections

**User impact:** Users get no warmup guidance before the main lifts and no cooldown guidance after — despite the app clearly having built, working logic to generate both. The workout structure users need (warmup → main → cooldown) silently narrows to just "main," with no indication anything is missing.

**Current behavior:** `generateWorkout()` **already computes** both blocks and attaches them to the returned object:

```ts
// lib/exercises/generateWorkout.ts
const warmupFull = generateWarmup({ ... });
const warmupBlock: WarmupBlock = warmupFull;
...
const recoveryBlock = generateRecoveryFinisher({ ... });
...
return { ..., warmupBlock, recoveryBlock, ... };
```

But no UI component ever reads `workout.warmupBlock` or `workout.recoveryBlock` — a repo-wide grep for either identifier inside `components/` returns zero matches. `WorkoutCard.tsx` destructures only `workout.exercises` into local state, and `GuidedExerciseFlowProps` doesn't even have a slot for a warmup or cooldown block in its interface.

**Root cause:** A data/UI disconnect, not a missing feature. `lib/movement/generateWarmup.ts` and `lib/movement/recoveryFinishers.ts` are fully-built engines (mobility items, activation drills, phase/symptom-aware selection) whose output is computed and returned every single time a workout is generated — then thrown away. This is exactly the shape of "the feature previously existed and got disconnected," matching how the request frames it as a restoration, not new work.

**Files involved:**
- `lib/exercises/generateWorkout.ts` (lines 22–23, 95–97, 518–530, 570–572) — computes and returns the data, unchanged.
- `lib/movement/generateWarmup.ts`, `lib/movement/recoveryFinishers.ts` — the underlying engines, unchanged.
- `components/dashboard/WorkoutCard.tsx` (lines 8, 86) — needs to read `workout.warmupBlock`/`workout.recoveryBlock` and pass them through.
- `components/workout/GuidedExerciseFlow.tsx` (props interface, lines 56–67) — needs new optional props/render slots.
- `components/workout/WorkoutHeroView.tsx` (idle-state preview, not yet checked in detail — needs a similar pass to surface "N warmup moves, N cooldown moves" in the pre-workout summary).

**Recommended fix:** Wire the already-computed `warmupBlock`/`recoveryBlock` through to the UI as two new phases in the guided flow: a warmup screen before `currentIdx === 0`, and a cooldown screen after `allDone` and before the finish button, using the existing `WorkoutExercise`-adjacent card patterns for visual consistency. No changes to `generateWorkout.ts`'s computation logic — this is purely additive UI wiring around data that already exists, per the "no redesign, connect what's built" framing.

**Risk level:** **Medium.** Not because the data is risky (it's already computed and tested implicitly by every workout generation), but because it changes the guided-flow's step count and navigation (adding 2 new "steps" before/after the main lifts) — this touches `currentIdx`/`isFirst`/`isLast` logic in `GuidedExerciseFlow.tsx` that several other things key off of (progress dots, primary CTA logic). Needs careful state-machine extension, not just a new render branch.

---

## 3. Incorrect Early User Feedback

**User impact:** Brand-new users — sometimes on their very first day — see explicit negative judgments ("At Risk" tier badges in danger red, "Poor" training-quality tiers, "Session completion has dropped significantly") before they've done anything the app could reasonably judge. This is actively counterproductive for a fitness app trying to build a new habit.

**Current behavior — three independent confirmed instances of the same defect:**

1. **`computeConsistencyScore()`** (`lib/adherence/consistency.ts`, lines 75–118): of its 4 weighted sub-scores, only `training` has a "no data yet" fallback (defaults to neutral `50`). `nutrition`, `recovery`, and `checkins` all mathematically resolve to `0` when their respective history arrays are empty (zero nutrition check-ins ÷ 30-day window = `0`, etc.) — there's no "insufficient data" branch for them at all. For a genuinely brand-new user: `composite = 50×0.40 + 0×0.20 + 0×0.20 + 0×0.20 = 20`, and `toTier(20)` returns `"at_risk"` — the single worst of 4 tiers, rendered in `AdherenceCard.tsx` as a danger-red "At Risk" badge.
2. **`computeTrainingQuality()`** (`lib/performance/trainingQuality.ts`, lines 51–66): when `recent.length === 0` (no logged workouts in the lookback window), it explicitly returns `{ score: 0, tier: "Poor", breakdown: { completionRate: 0, volumeAccuracy: 0, rpeAccuracy: 0, consistencyScore: 0 }, insight: "No workout data yet..." }`. The `insight` text is correctly worded, but `PerformanceHubCard.tsx` renders the `tier` badge ("Poor") and all four `0%` breakdown tiles unconditionally whenever the `quality` object is truthy — which it always is, even in the zero-data branch, since the function never returns `null`.
3. **`computeLifestyleBurnout()`** (`lib/lifestyle/burnoutDetection.ts`, lines 71–146): for a user with `recentAdherenceRate: 0` (nothing to complete yet, not a decline), `adherencePenalty = clamp(100 - 0, 0, 100) × 0.35 = 35`, and the `< 40` branch fires the signal *"Session completion has **dropped significantly** in the last 2 weeks"* — factually false framing for a user who's never had a session to drop from. The function does compute a `dataMaturity: "early" | "sufficient"` field (`historyDepth >= 14 ? "sufficient" : "early"`), but `BurnoutPreventionCard.tsx` never reads it — the alarming signal text renders regardless of maturity.

**Root cause:** Each of these three scoring functions treats "no data" as "zero score" (a real, bad measurement) rather than as its own distinct state ("nothing to measure yet"). Where a maturity/confidence field does exist (`dataMaturity` above), it isn't wired into the presentation layer, so computing it had no actual effect on what the user sees.

**Files involved:** `lib/adherence/consistency.ts`, `lib/performance/trainingQuality.ts`, `lib/lifestyle/burnoutDetection.ts`, and their respective cards `components/dashboard/AdherenceCard.tsx`, `components/dashboard/PerformanceHubCard.tsx`, `components/dashboard/BurnoutPreventionCard.tsx`.

**Recommended fix:** Introduce a single shared data-maturity utility (see Issue #12's recommended fix — this is the same underlying mechanism) and apply it in two places per affected metric: (a) at the *computation* layer, don't let a zero-data input resolve to a real numeric score at all — return an explicit "insufficient data" result shape instead of `{score: 0, tier: "Poor"}`; (b) at the *presentation* layer, every card checks maturity before rendering a tier badge/percentage, falling back to the locked/building state from Issue #12. Concretely: 0–7 days of history → "Building your baseline" language, no tier judgment shown at all, consistent with the exact threshold the request specifies.

**Risk level:** **Medium.** Touches 3 scoring functions' return shapes (adding an explicit insufficient-data variant is an additive, non-breaking type change if done as a discriminated union) and 3 cards' render logic. No change to the actual scoring *math* for users who do have sufficient data — only the zero/near-zero-data path changes.

---

## 4. Cycle Data and Early Assumptions

**User impact:** A user who explicitly declines to share cycle data during onboarding ("Skip cycle data") is silently told they're on **"Menstrual · Day 1"** of their cycle — a specific, fabricated physiological claim about a real user, generated from data that was never provided. This then cascades into phase-specific energy-trend and training-tone language ("Low" energy, menstruation-specific rationale) that has no basis.

**Current behavior:** Traced end to end:
1. `components/onboarding/Steps6to10.tsx` (line 220): selecting "Skip cycle data" calls `onChange({ lastPeriodDate: "" })`.
2. `lib/cycle/calculatePhase.ts`'s `getCycleDay()` (lines 33–55): `if (!lastPeriodDate) return 1;` — an empty string silently resolves to cycle day 1.
3. `getPhaseWindows()` (lines 18–30): day 1 always falls inside the `Menstrual` window (`startDay: 1, endDay: 5`) for any cycle length.
4. Every phase-dependent UI (`PhaseCard.tsx`, training recommendations, energy-trend copy) then renders as if the user is confirmed to be on menstrual day 1.

**Root cause:** `getCycleDay`'s "safe default" of day 1 was written as a crash-guard (better than `NaN` or a negative index), not as a considered "we don't know" state — but day 1 isn't neutral, it's the single most specific, most content-triggering value in the entire cycle. The `PhaseName` type (`types/recommendation.ts`, lines 3–8) is a closed union of 5 real phases with no "unknown"/"not tracked" variant, so there was never a type-safe way to represent "we don't know" even if the intent had been there.

**Files involved:** `lib/cycle/calculatePhase.ts`, `types/recommendation.ts` (`PhaseName`, `PhaseData`), `components/onboarding/Steps6to10.tsx`, `components/dashboard/PhaseCard.tsx`, and any component consuming `recommendation.phase` downstream (`app/dashboard/page.tsx` passes `recommendation.phase` to numerous cards).

**Recommended fix:** Do **not** extend the closed `PhaseName` union (that would ripple into every `switch`/`Record<PhaseName, …>` across the codebase, including the design-system-migrated `PHASE_CONFIG` map in `PhaseCard.tsx` — high blast radius for a data-correctness fix). Instead, add a separate boolean signal — e.g. `hasCycleData: boolean` alongside `PhaseData`, computed once at the same call site that currently defaults to day 1 — and have the handful of phase-*display* components check it before rendering phase-specific copy, falling back to a neutral "Cycle tracking not set up" card state instead of a fabricated phase. `calculatePhase.ts`'s internal math is otherwise untouched; this only changes what happens when `lastPeriodDate` is empty, which today produces a wrong answer, not a working one.

**Risk level:** **Medium.** The fix itself is small and additive (one new flag, checked at render time in a handful of phase-display components), but it touches a widely-consumed data shape (`PhaseData`) that many dashboard cards read `recommendation.phase` from — needs a careful pass to confirm every consumer either checks the new flag or is unaffected because it doesn't render phase-specific judgment language.

---

## 5. Rest Timer User Control

**User impact:** Users who train with their own rest-timing method (a separate stopwatch app, a coach's cueing, simply not wanting a forced pause) have no way to turn off the rest-timer screen — it's unconditionally shown after every set.

**Current behavior:** `WorkoutCard.tsx` shows `RestScreen` unconditionally whenever `restTimer` state is set (triggered from `GuidedExerciseFlow`'s `onRestStart` callback, itself fired by `ExerciseFocusCard`/`SetRow`'s per-set completion). There is no settings flag anywhere in the codebase gating this — confirmed via repo-wide search for a rest-timer preference (none found). `app/settings/page.tsx` has no such toggle; this is genuinely unbuilt, not disconnected.

**Root cause:** N/A — this is a net-new feature request, not a bug. Flagging so the implementation plan below doesn't misclassify it as a restoration.

**Files involved:** `app/settings/page.tsx` (add a new `Section`, following the existing `Section title="Training environment"` pattern), a new preference key (e.g. `axis_rest_timer_enabled` in `localStorage`, mirroring the existing `axis_training_env` pattern), `components/dashboard/WorkoutCard.tsx` (read the preference, skip setting `restTimer` state / skip rendering `RestScreen` when off), `components/workout/GuidedExerciseFlow.tsx` (when the timer is off, `onRestStart` should still fire for any telemetry/logging purposes but not trigger a forced screen — exercises continue immediately, per the request).

**Risk level:** **Low.** Additive preference + a conditional around already-existing render logic. No interaction with recommendation/intelligence logic — rest timing is presentation-layer pacing, not a training input.

---

## 6. Flexible Workout Completion

**User impact:** Users must log every individual set (weight, reps, RPE) for an exercise before the app considers it "done" and lets them advance — there's no lightweight way to say "I did this, trust me" for users using their own tracking method or just wanting a faster flow.

**Current behavior:** `GuidedExerciseFlow.tsx` (lines 88–93): an exercise only enters `completedIndices` (which gates the "Next Exercise"/"Finish Workout" primary action) when `s.length > 0 && s.every(s => s.completed)` — every single `SetRecord` in the array must individually be marked `completed`. There is no alternate "mark whole exercise complete" path anywhere in the flow.

**Root cause:** N/A — this is a net-new flexibility request, not a bug. The detailed per-set logging is working as designed; it's simply the *only* path today.

**Files involved:** `components/workout/GuidedExerciseFlow.tsx` (the `completedIndices` gate needs a second way to become "done" per exercise), `components/workout/ExerciseFocusCard.tsx` (needs a new lightweight "Mark Complete" checkbox/button alongside the existing detailed set-logging UI), `components/workout/types.ts` (`SetRecord` may need a way to represent "bulk-completed, N sets, no per-set detail" — or simply mark all N sets `completed: true` with `actualReps`/`weight` copied from the target/last-known values, which is a smaller change and keeps `SetRecord`'s shape stable for every downstream consumer like `exerciseHistory.ts`).

**Recommended fix:** Add a "Mark Complete" affordance per the example in the request (`☐ Bench Press · 3 sets completed · [Mark Complete]`) that, when tapped, fills `actuals[idx]` with `ex.sets` entries all marked `completed: true` using the prescribed targets as the logged values (rather than requiring the user to re-enter them) — this makes the exercise satisfy the *existing* `completedIndices` check with no changes needed to `GuidedExerciseFlow`'s gating logic at all, only to how `actuals` gets populated. Preserves detailed logging as the default/first-class path for users who want it.

**Risk level:** **Low-Medium.** If implemented as "bulk-fill actuals with target values" (recommended), the gating logic and every downstream consumer of `SetRecord`/`actuals` needs zero changes — risk is contained to one new UI control and its bulk-fill handler. Needs a decision on what values to log for lift-history/progression purposes (targets vs. a distinct "unlogged-complete" marker) since `lib/progression/exerciseHistory.ts` consumes this data for progression suggestions — logging fabricated-but-plausible values there is a real (if small) product decision, not just a styling one.

---

## 7. Remove Nonfunctional Done Button

**User impact:** After finishing a workout, the completion summary screen's "Done" button does nothing when tapped — no visible change, no navigation. Users are stuck on the completion screen with no clear way to leave except an unrelated navigation tap (e.g. a nav-bar icon).

**Current behavior:** Confirmed exactly as reported. `components/dashboard/WorkoutCard.tsx` (lines 328–339):

```tsx
<WorkoutCompletionView
  ...
  onDone={() => {
    // Nothing to do — the parent dashboard handles post-completion state
    // via onMarkComplete/onMarkPartial which were already called in handleFinish
  }}
/>
```

The button itself (`components/workout/WorkoutCompletionView.tsx`, lines 112–119) does correctly call its `onDone` prop on click — it's not "wired to nothing" at the component level, the *parent* wires it to an intentionally-empty callback.

**Root cause:** The comment reveals the original reasoning: workout completion is already persisted (`handleFinish` calls `onMarkComplete`/`onMarkPartial` before `mode` even becomes `"done"`), so there was "nothing to do" from a *data* perspective. But the button was never given a *UI* action — `mode` state (`WorkoutCard.tsx` line 95) never transitions back to `"idle"` from anywhere, so tapping the only button on the screen does not return the user to a normal dashboard view.

**Files involved:** `components/dashboard/WorkoutCard.tsx` (lines 95, 265, 328–339 — `mode` state and the `onDone` wiring).

**Recommended fix:** Wire `onDone` to `() => setMode("idle")` (or equivalent — resetting to the dashboard's normal view). This is a one-line fix; the data-persistence side (the actual reason the original author left it empty) is correctly already handled elsewhere and needs no change.

**Risk level:** **Low.** One-line change, purely a UI state transition, zero interaction with data/intelligence logic — the data was already correctly saved before this screen even renders.

---

## 8. First-Time User Workout Completion Label

**User impact:** Directly caused by Issue #3's root cause #2 — a first-time user who has never trained sees a "Poor" training-quality tier and four `0%` stat tiles (Completion, Volume, RPE Quality, Consistency) the very first time they open Performance Hub, before it has ever had a chance to measure anything.

**Current behavior:** See Issue #3, root cause #2 (`lib/performance/trainingQuality.ts`, lines 59–66 / `components/dashboard/PerformanceHubCard.tsx`, lines 93–118) — this is the same underlying bug, called out separately here because the request frames it as its own visible symptom worth fixing explicitly (the exact first-open experience), not because it's a different code path.

**Root cause:** Same as Issue #3 (`computeTrainingQuality()`'s zero-data branch returns a real, bad-looking score object instead of a distinct "no history yet" result; the card doesn't check for it).

**Files involved:** `lib/performance/trainingQuality.ts`, `components/dashboard/PerformanceHubCard.tsx`.

**Recommended fix:** Same mechanism as Issue #3 — when `sessionsAnalysed === 0`, the card should show a positive first-use state ("First workout completed" after session 1, or "Complete your first workout to see training quality" before it) rather than the `Poor`/`0%` tiles. Reuses Issue #3's fix; listing separately here only to make explicit that fixing #3 resolves this symptom too, so the implementation plan doesn't duplicate the work.

**Risk level:** **Low** (given Issue #3's fix already covers the underlying function — this issue's remaining work is purely the specific first-open card copy/state, once the shared mechanism exists).

---

## 9. Add Exercise During Session

**User impact:** Users cannot add an exercise mid-session — if they want to do one more movement beyond what was generated, there's no in-app way to log it as part of the current workout.

**Current behavior:** Confirmed via repo-wide search: zero references to "Add Exercise" or equivalent functionality anywhere in `components/` or `lib/`. `GuidedExerciseFlow.tsx` operates over a fixed `exercises: WorkoutExercise[]` array passed in from `WorkoutCard.tsx`'s local state (`useState<WorkoutExercise[]>(workout.exercises)`), which is only ever mutated by the existing exercise-swap feature (`onSwap`/`handleSwap`), never appended to.

**Root cause:** N/A — net-new feature, not a bug or disconnected restoration.

**Files involved:** `components/dashboard/WorkoutCard.tsx` (`exercises` state — already a mutable array via `setExercises`, so appending is structurally straightforward), `components/workout/GuidedExerciseFlow.tsx` (needs an "Add Exercise" entry point, likely alongside the existing swap UI), a new exercise-picker UI (`components/onboarding/EquipmentStep.tsx`'s or `app/exercises/page.tsx`'s existing exercise-library browsing patterns are the natural reusable building block — `ExerciseLibraryCard.tsx` already exists for this exact purpose elsewhere in the app).

**Recommended fix:** Add an "Add Exercise" action (e.g. a button below the progress dots or as a footer action in `GuidedExerciseFlow`) that opens a picker reusing `app/exercises/page.tsx`'s existing filtered exercise list, and on selection, appends a new `WorkoutExercise` (constructed with sensible defaults — 3 sets, a reps range appropriate to the exercise's movement pattern, matching how `generateWorkout.ts` already constructs entries) to `WorkoutCard.tsx`'s `exercises` state. The new exercise logs identically to a generated one (same `SetRow`/`actuals` shape) — no special-casing needed downstream in history/progression tracking.

**Risk level:** **Medium.** Net-new UI flow (a picker) plus state mutation mid-session. Low risk to existing logic (append-only, doesn't touch generated exercises), but needs its own UI design pass (picker layout, empty/search states) beyond a pure bug fix — flagging so it isn't scoped as a 1-line change.

---

## 10. Nutrition Goal Celebration

**User impact:** Completing nutrition goals (protein, hydration, veggies) via the daily check-in currently ends in silence — no acknowledgment, positive reinforcement, or sense of accomplishment, even though the app already tracks exactly this moment.

**Current behavior:** `components/dashboard/NutritionCheckinCard.tsx` already computes and fires a completion callback with the full result (`onComplete?.(checkin)` where `checkin` includes `hitProtein`/`hitHydration`/`hitVeggies` booleans) — but nothing downstream reacts to an "all goals hit" case specifically; it's treated identically to any other check-in submission.

**Root cause:** N/A — net-new positive-reinforcement feature, not a bug.

**Files involved:** `components/dashboard/NutritionCheckinCard.tsx` (the `onComplete` call site, and/or wherever it's mounted in `app/dashboard/page.tsx`), `components/ui/Toast.tsx` (`ToastProvider`/`useToast`, already built and already has production call sites as of DS-2 — the natural, lowest-effort mechanism for "lightweight celebration" without inventing new UI).

**Recommended fix:** When the submitted checkin has `hitProtein && hitHydration && hitVeggies` all true, fire a success-variant toast ("Nutrition goal achieved! 🎯" or similar copy per the request's tone guidance — avoid excessive gamification, no confetti/animation library needed) via the existing `useToast()` hook. This reuses infrastructure that already exists and already has a settings-page precedent, rather than building a new celebration primitive.

**Risk level:** **Low.** Purely additive, one new conditional check at an existing call site, reuses an already-built, already-verified UI primitive (`Toast`). Zero interaction with nutrition-calculation logic itself.

---

## 11. Scientific Bias Reference Update

**User impact:** The app cites a single, dated (2003) source to make a broad claim about menstrual-cycle effects on strength performance — even though the surrounding copy is otherwise appropriately hedged ("for most women," "individual experience varies widely"), the citation itself is now over 20 years old and doesn't reflect the more nuanced, individual-variability-focused literature that's emerged since.

**Current behavior:** `lib/recommendations/generateRecommendation.ts` (line 310):

```
rationale: "Current evidence does not support impaired maximal strength output during
menstruation for most women (Janse de Jonge, 2003). The primary limiters are
prostaglandin-mediated inflammation, iron loss, and individual symptom burden —
not hormonal state per se. Training performance is highly individual."
```

**Root cause:** N/A — a content/citation currency issue, not a code defect.

**Files involved:** `lib/recommendations/generateRecommendation.ts` (line 310, and any other call sites reusing this exact rationale string — worth a grep before editing to confirm this is the only occurrence).

**Recommended fix:** This document deliberately does **not** propose specific replacement literature or exact new wording — per this project's own binding citation-integrity standard (`CLAUDE.md` §2.1: "Never invent references, authors, titles, journals, years, volumes, pages, or DOIs... A blank field is always better than a fabricated one"), selecting and verifying a real, current replacement citation requires actual literature access and DOI verification (`scripts/verify_refs.py`), which is out of scope for a code-reading audit. Recommend routing this specific item through the existing research pipeline (`research/03-resistance-training/`, `research/CITATION_STANDARDS.md`) rather than having an engineering pass invent a citation. The language pattern itself (individualized, non-deterministic, hedged) is sound and should be preserved — only the specific citation and any claims it uniquely supports need review.

**Risk level:** **Low** (mechanically — swapping a string once new evidence is verified), but **process-gated**: must go through the citation verification pipeline this repo already has standards for, not be resolved as a normal code change.

---

## 12. Intelligence Data Gating

**User impact:** Advanced intelligence surfaces (Fatigue Status, Recovery Intelligence, Recovery Capacity, Recovery Status, Personal Recovery Profile) render real-looking scores, tiers, and judgments before there's remotely enough data to support them — undermining trust in the *entire* intelligence system the moment a new user notices the numbers don't reflect reality yet.

**Current behavior — inconsistent gating across the recovery-card family, confirmed file by file:**
- **`RecoveryCapacityCard.tsx`** (lines 29–68): shows a "Low capacity" badge (caution-orange) *simultaneously* with an "Early data" chip — the real judgment and the caveat render with equal visual weight, and critically, the "Low capacity" *label* is shown even when `capacity.confidence === "early"` (i.e., `dataPoints < 7`, per `lib/adaptive/recoveryCapacity.ts` lines 129–132). A user with zero logged recovery feedback sees "Low capacity" as if it were a real finding.
- **`BurnoutPreventionCard.tsx`**: consumes `LifestyleBurnoutReport` but never reads its own `dataMaturity` field (confirmed via grep — zero references) — the alarming signal copy (see Issue #3) renders regardless of how much history actually exists.
- **`PersonalRecoveryCard.tsx`** (line 183): **already does this correctly in at least one place** — `{profile.confidence !== "early" && (...)}` — a real example of the right pattern living in the same file family as the wrong one.
- **`RecoveryIntelligenceCard.tsx`**: has *some* gating (`if (trend.dataPoints < 3) return null;` and similar per-section checks), inconsistently applied per sub-section rather than as one coherent maturity gate for the whole card.
- **`RecoveryStatusCard.tsx`**: gates cleanly on `report === null` ("Building your training load profile…"), but whether the underlying `TrainingLoadReport` computation itself produces a real (if data-thin) `recoveryStatus` judgment after just 1–2 days wasn't traced in this pass — flag for the implementation phase to verify before assuming this card is fully clean.

**Root cause:** The underlying engines already compute the right signal in most cases (`confidence: "early"|"growing"|"established"` on `RecoveryCapacity`; `dataMaturity: "early"|"sufficient"` on `LifestyleBurnoutReport`; the Verification Registry's own formal `"insufficient_data"` `VerificationState`/`VerificationScore` — this exact concept already exists as first-class architecture). What's missing is a **single, consistently-applied UI gate**: each card was built independently and each author made their own (correct, incorrect, or partial) judgment call about whether and how to respect the maturity signal that was available to them.

**Files involved:** `components/dashboard/RecoveryCapacityCard.tsx`, `components/dashboard/BurnoutPreventionCard.tsx`, `components/dashboard/RecoveryIntelligenceCard.tsx`, `components/dashboard/RecoveryStatusCard.tsx`, `components/dashboard/PersonalRecoveryCard.tsx` (as the reference-correct example), plus the underlying `lib/adaptive/recoveryCapacity.ts`, `lib/lifestyle/burnoutDetection.ts`, and `lib/intelligence/verification/verificationTypes.ts` (as the existing formal vocabulary to standardize on).

**Recommended fix:** Build one shared utility — e.g. `lib/intelligence/dataMaturity.ts` — exporting a single function/type that every affected card calls the same way: something like `getMaturityStage(daysOfHistory, entryCount): "locked" | "building" | "ready"`, with the exact thresholds the request specifies (0–7 days → locked). Pair it with a shared presentational component (e.g. `components/ui/LockedInsight.tsx`) rendering the requested 🔒 + "Available after N more check-ins" pattern, so every card gets the same visual treatment rather than each inventing its own. Critically, per the request's explicit requirement ("This should integrate with Confidence Engine, Verification Registry, user history... Do not simply hide UI. The underlying data model should understand maturity"): the fix should thread maturity through the *data layer* (each engine's return type gets an explicit, typed maturity field if it doesn't have one already — 3 of 5 already do) and have cards render the `LockedInsight` state *instead of* computing/showing a score at all when immature, not just visually overlay a lock icon on top of an already-rendered (and already potentially-alarming) judgment.

**Risk level:** **Medium-High.** This is the largest-blast-radius item in the audit — it touches 5 cards' render logic and up to 3 underlying engines' return types, and needs a genuinely shared primitive to avoid becoming 5 more inconsistent one-off implementations. Recommend building the shared utility + component first (low risk, additive, zero existing call sites), then adopting it into each card one at a time (medium risk per-card, isolated, easy to verify individually) — mirroring exactly the "build the primitive, adopt it separately" discipline already established in this codebase's design-system migration work.

---

## Implementation Approach

### Batch 1 — Workout Correctness
**Scope:** Issue #1 (rest timer accuracy), Issue #2 (warmup/cooldown restoration), Issue #7 (Done button fix).

**Files changed:** `components/workout/RestScreen.tsx`, `components/workout/RestTimerOverlay.tsx` (fix or delete), `lib/exercises/generateWorkout.ts` (no logic change, confirm output shape only), `components/dashboard/WorkoutCard.tsx`, `components/workout/GuidedExerciseFlow.tsx`, `components/workout/WorkoutHeroView.tsx`.

**Risks:** Timer fix is low-risk and isolated. Warmup/cooldown restoration is the batch's real risk — it changes the guided-flow state machine (step count, first/last logic) and needs careful handling so existing progress-dot/CTA logic doesn't break for workouts generated before this change (should be backward-compatible since `warmupBlock`/`recoveryBlock` are already optional fields). The Done-button fix is trivially low-risk.

**Tests required:** Manual timing verification (start a rest timer, background the tab for 30s+, compare displayed vs. actual remaining time). Full guided-flow walkthrough with warmup → main → cooldown → completion, confirming progress indication is accurate at every step. Confirm "Done" returns to a normal dashboard view without a page reload.

**Visual QA plan:** Desktop + mobile viewport for the rest timer (including a real screen-lock test on a physical device, not just simulated backgrounding), full workout walkthrough screenshots at each new phase (warmup/main/cooldown), before/after screenshot of the completion screen confirming Done now navigates.

---

### Batch 2 — Workout Flexibility
**Scope:** Issue #5 (rest timer preference), Issue #6 (flexible completion), Issue #9 (add exercise mid-session).

**Files changed:** `app/settings/page.tsx` (new section + toggle), `components/dashboard/WorkoutCard.tsx`, `components/workout/GuidedExerciseFlow.tsx`, `components/workout/ExerciseFocusCard.tsx`, a new exercise-picker component (reusing `app/exercises/page.tsx`/`ExerciseLibraryCard.tsx` patterns).

**Risks:** The rest-timer toggle and flexible-completion features are additive and low-risk if implemented as recommended (bulk-fill `actuals` rather than a new data shape). Add-exercise is this batch's highest-risk item — new UI flow, mid-session state mutation — should be built and tested in isolation before combining with the other two in the same release.

**Tests required:** Settings toggle persists across sessions and correctly suppresses `RestScreen`. "Mark Complete" produces `SetRecord`s that flow correctly into `lib/progression/exerciseHistory.ts` and don't corrupt progression-tracking assumptions (verify with an existing progression test scenario if one exists, e.g. `lib/testing/scenarios.ts`). Added mid-session exercises log identically to generated ones in workout history.

**Visual QA plan:** Settings page with toggle in both states. Full workout using only "Mark Complete" (no per-set logging) end to end. Add-exercise picker on both desktop and mobile, confirming it doesn't disrupt the existing swap-exercise UI.

---

### Batch 3 — Data Maturity and User Trust
**Scope:** Issue #3 (early negative feedback), Issue #4 (cycle data assumptions), Issue #8 (first-use completion label — resolved as a side effect of #3), Issue #12 (recovery/intelligence gating).

**Files changed:** New: `lib/intelligence/dataMaturity.ts`, `components/ui/LockedInsight.tsx`. Modified: `lib/adherence/consistency.ts`, `lib/performance/trainingQuality.ts`, `lib/lifestyle/burnoutDetection.ts`, `lib/cycle/calculatePhase.ts`, `types/recommendation.ts` (additive `hasCycleData` flag), `components/dashboard/AdherenceCard.tsx`, `components/dashboard/PerformanceHubCard.tsx`, `components/dashboard/BurnoutPreventionCard.tsx`, `components/dashboard/RecoveryCapacityCard.tsx`, `components/dashboard/RecoveryIntelligenceCard.tsx`, `components/dashboard/RecoveryStatusCard.tsx`, `components/dashboard/PhaseCard.tsx`.

**Risks:** The largest batch by file count and the one most likely to reveal additional inconsistencies once the shared utility exists (other cards may turn out to need the same treatment once it's easy to apply). Sequencing matters: build `dataMaturity.ts` + `LockedInsight.tsx` first as an isolated, zero-call-site primitive (low risk, verify independently), then adopt into each engine/card as a series of small, individually-revertible changes — not one combined change touching all 7+ files at once.

**Tests required:** For each affected engine, a specific "zero data" and "just-under-threshold" test case confirming it returns the maturity-gated shape rather than a real score (extends existing test suites in each `lib/` area if present, e.g. `lib/intelligence/confidence/__tests__/`, `lib/intelligence/verification/__tests__/`). For `calculatePhase.ts`: a specific test for empty `lastPeriodDate` confirming `hasCycleData: false` and no phase-specific data fabricated.

**Visual QA plan:** A true zero-data account (fresh onboarding, no check-ins, no workouts logged) walked through every affected card, confirming each shows the locked/building state, not a score. A partial-data account (3–4 days in) confirming the transition at the documented thresholds. A cycle-skip account confirming `PhaseCard` shows a neutral "not tracked" state, not a fabricated Menstrual/Day 1.

---

### Batch 4 — Nutrition Celebration and Content Updates
**Scope:** Issue #10 (nutrition goal celebration), Issue #11 (citation update — pending research-pipeline resolution, not an engineering task).

**Files changed:** `components/dashboard/NutritionCheckinCard.tsx` (or its mount point in `app/dashboard/page.tsx`), reusing `components/ui/Toast.tsx`. `lib/recommendations/generateRecommendation.ts` line 310 (once a verified replacement citation is available from the research pipeline — this file change should not land until that's true).

**Risks:** Nutrition celebration is low-risk and fully additive. The citation update carries no code risk but is gated on a non-engineering dependency (literature verification) — should not block the rest of this batch or be forced onto an arbitrary timeline.

**Tests required:** Nutrition checkin with all 3 goals hit fires exactly one toast, doesn't fire for partial completion. No test needed for the citation swap beyond confirming the string still renders correctly wherever it's used.

**Visual QA plan:** Trigger the celebration toast on both desktop and mobile, confirm it doesn't stack awkwardly with other toasts (e.g. the settings-page toast pattern from DS-2) if fired in quick succession.

---

## Constraints Honored

Per the brief: no core recommendation-formula changes are proposed anywhere in this audit except where explicitly identified as a wrong *default* (empty `lastPeriodDate` → day 1; zero-data → real score) rather than a change to how a *populated* input is scored. No changes to Dashboard 2.0 information architecture, the design system, or any existing intelligence feature's removal are proposed. Adaptive Intelligence, Safety Engine, Verification Registry, Confidence Engine, and Telemetry are all read from, never modified, in every recommended fix above.
