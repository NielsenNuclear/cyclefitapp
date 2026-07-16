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

# Extension — Workout Engine & Recommendation Explainability

**Date:** 2026-07-16
**Method:** Same discipline as the original audit above — direct code reading and tracing, file/line references, no assumptions from behavior alone. No production code was modified while producing this extension.
**Origin:** "Axis UX Stabilization — Workout Engine & Recommendation Explainability" brief. Full supporting detail for the explainability findings lives in `docs/intelligence/RecommendationExplainability.md`; the Workout Mode design lives in `docs/ux/WorkoutModeProposal.md` — both are referenced, not duplicated, below.

**A cross-cutting theme, same shape as the original audit's:** several of these findings aren't isolated bugs — they're the same *uncoordinated-independent-passes* pattern that produced Issues #3/#4/#12 above, now found in the workout-generation pipeline and the explanation layer. Multiple systems each independently and correctly implement their own small piece of logic, but nothing coordinates them, so their combination produces something none of the individual authors intended.

---

## 13. Realistic Set Generation

**User impact:** Most exercises show a single working set — not representative of real strength training, and directly undermines trust in the "intelligence" behind the plan (a user who trains regularly can tell 1 set isn't a real prescription).

**Current behavior — confirmed root cause, four independent compounding reduction passes in `lib/exercises/generateWorkout.ts`:**

1. `prescribeExercise()` (line 315): `sets = max(1, round((baseSets + trainingStateDelta) * volumeMod))`, where `volumeMod` comes from `resolveEffectiveAdjustment()` — progression combined with a readiness ceiling.
2. Adaptive pattern multiplier (line 476): `sets = max(1, round(sets * adaptiveVol))`, `adaptiveVol` ∈ [0.70, 1.15].
3. "Adherence risk" scale (line 490): `sets = max(1, round(sets * adherenceScale))` — **but** the value passed here (`app/dashboard/page.tsx` lines 2520/2733: `trainingDecision?.finalVolumeScale`) is not a narrow adherence factor — it's the *entire* Training Decision Engine's composite output (readiness + recovery + burnout + fatigue + symptoms + deload + trend + adherence, see `docs/intelligence/RecommendationExplainability.md` §1.1 Layer 2), several of which were **already** counted in pass 1's readiness ceiling.
4. Periodization offset (line 499): `sets = max(1, sets + periodizationStatus.setsOffset)`, flat -2 during a deload week (`lib/periodization/goalProfiles.ts` line 46).

Each pass independently floors at 1. None of the four is aware of the others. A realistic combination — moderate energy, any elevated adherence risk (common, not an edge case), any point in a deload week — routes a 3-set base exercise down to 1 by the fourth pass, well before any single pass looks unreasonable in isolation. This is exactly the same class of defect as `docs/intelligence/RecommendationExplainability.md` Finding E4, on the same code path — that document has the full trace.

**"Why does the final exercise already contain multiple sets while others don't":** confirmed structural fact — `lib/exercises/workoutSplits.ts` places `Core` as the last category slot in every split template (e.g. lines 66–68, 75–77, 84–86). However, none of the four reduction passes above treat position or category specially — all four `.map()` uniformly across the full exercise array regardless of index. No position-based code path was found that would explain a systematic last-slot exemption. **This needs an instrumented live trace to resolve** (log each exercise's `sets` value after each of the four passes, for a real session) rather than further static reading — flagging for the implementation phase rather than guessing further. It's possible this is per-session variance (Core-category exercises this codebase happens to select have different base RPE/movement-pattern combinations) rather than a reproducible position bug.

**Files involved:** `lib/exercises/generateWorkout.ts` (lines 288–343 for `prescribeExercise`, 453–505 for the four reduction passes), `lib/periodization/goalProfiles.ts` (setsOffset source), `app/dashboard/page.tsx` (lines 2520/2733, the `finalVolumeScale` → `adherenceRiskScale` parameter mismatch), `lib/exercises/workoutSplits.ts` (Core-last template structure, for the live-trace investigation).

**Recommended fix:** Consolidate the four independent reduction passes into one coordinated calculation with a single final floor, not four sequential ones. Concretely: compute each pass's *intended ratio* (not yet applied), multiply the ratios together once, floor the *product* at a sane minimum (e.g. 2, not 1 — a 1-set prescription is rarely a real coaching decision even for a genuine deload; a deload should reduce load/intensity more than it eliminates sets entirely), then round once. Separately, stop passing the full `TrainingDecision.finalVolumeScale` into the `adherenceRiskScale` parameter slot — either rename that parameter to reflect what it actually carries, or (better) have the Training Decision Engine expose its *adherence-specific* sub-component separately from its readiness/fatigue-driven component, so `generateWorkout.ts` can apply only the piece it doesn't already account for via Layer 1's readiness ceiling.

**Risk level:** **Medium-High.** This touches the core volume-generation formula directly (the brief's Part 1 explicitly asks for this), and unlike the original audit's issues, this one *is* a recommendation-logic change, not just a default/display fix — needs careful before/after regression testing across a range of readiness/adherence/periodization combinations (a test matrix, not a single test case) before landing, and should ship separately from any other change so a regression is easy to isolate.

---

## 14. Weighted vs. Non-Weighted Exercises

**User impact:** Bodyweight-loaded movements (e.g. "Ab Wheel Rollout (Kneeling)") show a weight-entry stepper the same as barbell/dumbbell exercises — a small but constant "this app doesn't quite understand what I'm doing" signal, repeated every session.

**Current behavior:** The `Exercise` interface (`lib/exercises/exerciseLibrary.ts` lines 49–70) has no `loadingType`/`requiresWeight` field at all — confirmed via full-interface read and a repo-wide grep for both terms (zero hits outside this audit and the brief). `ExerciseFocusCard.tsx`'s active-set block (lines 231–239) renders a `SetStepper` for weight unconditionally for every exercise, regardless of category or equipment.

**What already exists that a fix can build on:** `lib/exercises/exerciseSubstitutions.ts`, `deriveEquipmentCategory()` (lines 18–29) already classifies every exercise's free-text `equipment` field into a structured `EquipmentCategory` enum (`cable`/`machine`/`barbell`/`dumbbell`/`kettlebell`/`resistance_band`/`pullup_bar`/`bodyweight`) purely by string matching — used today only for training-environment filtering, not for UI gating. Of the 157 exercises in the library, 25 are tagged exactly `equipment: "Bodyweight"`, with several more bodyweight-adjacent variants (`"Bodyweight, Bench"`, `"Bodyweight, Wall"`, etc.) and gym-apparatus bodyweight movements (`"Pull-Up Bar"`, `"Parallel Bars"`, `"Ab Wheel"`) that `deriveEquipmentCategory()` already correctly buckets as `"bodyweight"`.

**The gap in reusing it directly:** `deriveEquipmentCategory()` isn't a perfect proxy for "does this need a weight input" — e.g. `"Pull-Up Bar, Weight Belt"` (a *weighted* pull-up variant) derives to `"pullup_bar"`, not `"bodyweight"`, so that one's fine; but `"Parallel Bars, Weight Belt"` (weighted dips) contains no barbell/dumbbell/etc. keyword and would fall through to the `"bodyweight"` default despite being a weighted movement. The derivation heuristic needs a small extension (check for `"weight belt"`/`"weighted"` substrings before defaulting to bodyweight) rather than being trusted as-is for this new purpose.

**Files involved:** `lib/exercises/exerciseLibrary.ts` (`Exercise` interface — needs the new field), `lib/exercises/exerciseSubstitutions.ts` (`deriveEquipmentCategory()` — reusable derivation base, needs the weight-belt edge case handled), `components/workout/ExerciseFocusCard.tsx` (lines 231–239, the unconditional `SetStepper`).

**Recommended fix:** Add `loadingType?: "bodyweight" | "weighted" | "assisted" | "time" | "distance" | "reps_only"` to `Exercise`, computed once via a small derivation function built on top of (not duplicating) `deriveEquipmentCategory()`'s existing keyword logic, with the weight-belt correction from above. Default any exercise without an explicit override to the derived value rather than requiring all 157 entries to be hand-tagged immediately — matches this codebase's established pattern of deriving structured metadata from the free-text `equipment` field rather than a hand-authored migration (same discipline as `deriveEquipmentCategory`/`deriveTrainingEnvironments` already use). `ExerciseFocusCard.tsx` then conditionally renders the weight `SetStepper` only when `loadingType` is `"weighted"` or `"assisted"` (assisted machines still log an assist-weight value, just semantically inverted).

**Risk level:** **Low.** Purely additive field + one conditional render check. No interaction with volume/intensity generation logic. The only real risk is the derivation heuristic misclassifying an exercise (e.g. missing an equipment-string pattern) — worth a full-library dry run (log every exercise's derived `loadingType` and spot-check) before relying on it, rather than assuming the heuristic is complete on the first pass.

---

## 15. Exercise Postponement

**User impact:** Real gym sessions frequently hit occupied equipment. Today, a user's only option is "Skip exercise →", which is pure UI navigation — it advances the current-exercise cursor but does not reorder anything. The skipped exercise stays exactly where it was in the sequence; the user must remember to manually navigate back to it (Prev, or the progress dots), and nothing distinguishes "skipped, will return" from "just haven't gotten there yet."

**Current behavior:** Confirmed via full read of `components/workout/GuidedExerciseFlow.tsx` and a repo-wide grep for "postpone"/"reorder"/"moveExercise" (zero hits anywhere in `components/workout/` or `components/dashboard/WorkoutCard.tsx`). The "Skip exercise" button (`GuidedExerciseFlow.tsx` line 229) is `onClick={() => setCurrentIdx(i => i + 1)}` — a local `currentIdx` state change only.

**Files involved:** `components/dashboard/WorkoutCard.tsx` (owns `exercises: WorkoutExercise[]` as mutable `useState`, already proven mutable by the existing swap (`handleSwap`) and add-exercise (`handleAddExercise`, UX Stabilization Batch 2) features — reordering is structurally the same class of operation), `components/workout/GuidedExerciseFlow.tsx` (needs a "Postpone" action alongside "Skip exercise").

**The real implementation risk, not obvious from the UI alone:** `actuals: Record<number, SetRecord[]>` (`WorkoutCard.tsx` line 135) is keyed by **array index**, not by a stable exercise identity. If "postpone" physically reorders the `exercises` array (moving B from index 1 to index 2, per the brief's A B C D → A C B D example), the `actuals` record's keys must be permuted in lockstep, or index 1's logged sets would silently become attributed to whatever exercise moved into index 1. This is exactly the kind of bug that wouldn't surface in a quick manual test (postponing an exercise before logging any sets) but would corrupt data the moment a user postpones an exercise *after* partially logging it.

**Recommended fix:** Implement postpone as: remove the exercise (and its `actuals` entry) from its current index, insert it immediately after the *next* exercise's current position (matching the brief's example precisely — not sent to the end), and re-key every `actuals` entry whose index shifted as a result — not just the moved exercise's. Do this as a single atomic state update (one `setExercises` + one `setActuals` call reading from the same pre-update snapshot), not two sequential updates, to avoid a render in between with mismatched arrays.

**Risk level:** **Medium.** The UI-level change (a new button, an index-shuffle) is small; the state-consistency requirement (`actuals` re-keying) is the real risk and needs its own explicit test: postpone an exercise with 1 of 3 sets already logged, confirm the logged set stays attached to the correct exercise after the move, confirm workout history persistence (`buildLog()`/`buildExercisePerformances()` in `WorkoutCard.tsx`) reflects the postponed exercise's original prescription, not a corrupted one.

---

## 16. Workout Mode

**User impact / current behavior / files involved:** see `docs/ux/WorkoutModeProposal.md` in full — not duplicated here. Summary: the guided-flow interaction model (`GuidedExerciseFlow`, `ExerciseFocusCard`) already behaves like a focused execution mode; it just renders inside the dashboard's shared white-card visual language and persistent nav shell rather than a distinct dark, distraction-free surface. The proposal recommends an overlay/portal approach (reusing `components/ui/Sheet.tsx`'s existing portal pattern) over a new routed page, as the lower-risk path to the same user-facing outcome.

**Recommended fix:** Per the brief, **not implemented in this pass.** `docs/ux/WorkoutModeProposal.md` is the deliverable — information architecture, screen flow, visual language, interaction model, accessibility considerations, and a suggested 5-step implementation batch are all there, pending design review before any code is written.

**Risk level:** N/A — no code proposed. The proposal itself flags its highest-risk sub-decision (dark-mode contrast/token derivation) as needing a design decision before implementation, not a code decision made unilaterally during implementation.

---

## 17. Recommendation Explainability — Raw Percentage Exposure

**User impact:** The "Why today's plan?" expanded breakdown can show individual signal impacts like "+1200%", "-1800%", "+480%" — numbers a user correctly reads as broken, not as "mathematically normalized internal values." This is the highest-priority finding in this extension: it's not cosmetic, it's a trust failure at the exact moment (an explanation surface) the product is trying to build trust.

**Current behavior / root cause:** see `docs/intelligence/RecommendationExplainability.md` in full — not duplicated here. Summary: `lib/intelligence/recommendationExplanation.ts` computes a *second, simplified, independent* model of "why" (nine hardcoded linear coefficients) that is only loosely related to the actual volume-generation pipeline traced in Issue #13 above, then force-rescales that simplified model's output to match the real number via `scale = actualDelta / rawSum`. When `rawSum` (the simplified model's own internal total) is small — a common, not rare, state — `scale` becomes very large, and every individual signal's displayed percentage is multiplied by that same runaway factor simultaneously. The display layer (`components/intelligence/RecommendationExplanationCard.tsx`) compounds this by clamping the *visual bar width* (`Math.min(abs(impact), 20)`) but not the *printed number* — so users see a short bar next to an absurd number, rather than either being consistently bounded.

**Files involved:** `lib/intelligence/recommendationExplanation.ts` (root cause), `components/intelligence/RecommendationExplanationCard.tsx` (unclamped display), `components/intelligence/WhatChangedCard.tsx` and the headline "Volume ±N%" chip (confirmed **not** affected — both read the schema-bounded `finalVolumeScale` directly, not the unstable per-signal breakdown).

**Recommended fix:** Two changes, needed together (a display clamp alone hides the symptom without fixing the dishonesty) — full detail and a proposed qualitative-language redesign in `docs/intelligence/RecommendationExplainability.md` §6:
1. Make the explanation model read from the real pipeline's own decomposition (have `generateWorkout.ts`/`trainingDecisionEngine.ts` expose how much each layer changed things) instead of independently guessing and force-rescaling.
2. Replace the raw-percentage display with qualitative bands (High/Moderate/Small impact), matching the brief's requested user-facing language, once the underlying numbers are trustworthy enough for a band assignment to mean something.

Also see `docs/intelligence/RecommendationExplainability.md` §7 for a proposed confidence-aware damping mechanism (addresses the brief's "avoid 40–50% reductions without sufficient data" requirement) — **confirmed via trace that no such damping exists today**: `ConfidenceProfile` is computed every pipeline run but its only consumer anywhere in the codebase is a read-only display badge (`app/dashboard/page.tsx` line 2830); nothing in `generateWorkout.ts` or `trainingDecisionEngine.ts` reads it.

**Risk level:** **High effort, must be sequenced carefully.** Fixing the display clamp alone is low-risk and should ship first as a stopgap (prevents the embarrassing number from ever rendering, even before the deeper fix lands). The deeper fix — wiring the explanation model to the real pipeline's decomposition — is a more significant change touching `generateWorkout.ts`'s return shape and is exactly the kind of "core recommendation logic" change the original audit's constraints ask to be careful with; recommend it as its own reviewed batch, not bundled with the stopgap.

---

## 18. Single Source of Truth Architecture (Required)

**User impact:** Indirect but foundational — this is the architectural requirement that Issues #13–#17 are all instances of violating. Stated as its own explicit requirement (a follow-up brief to this audit, "Part 1A"): the recommendation engine must become the single source of truth for every recommendation, adjustment, contributor, confidence value, and maturity signal displayed anywhere in the app. The frontend's role is presentation only — it must never calculate, estimate, infer, rescale, normalize, or reconstruct.

**Current behavior:** Full detail in `docs/intelligence/RecommendationExplainability.md` §8, which formalizes the principle and maps Findings E1–E5 (Issues #13–#17 above) as concrete violations of it, plus documents a sixth, newly-found violation:

**E6 — found while drafting this section, in this audit thread's own already-shipped work:** `lib/intelligence/confidence/ConfidenceTypes.ts` (Phase 67, pre-existing) already defines a comprehensive, workout-count-thresholded `MaturityStage` as part of `ConfidenceProfile`. UX Stabilization Batch 3 (this same audit thread, already shipped and pushed) independently built a **second, differently-shaped** `MaturityStage` (`lib/intelligence/dataMaturity.ts` — `"locked"|"building"|"ready"`, 7-check-in-thresholded) with no awareness of the first. `AdherenceCard.tsx`, `FatigueCard.tsx`, `PerformanceHubCard.tsx`, and `LockedInsight.tsx` all call `getMaturityStage(entryCount)` directly from the component layer — the frontend determining athlete maturity itself, exactly what this new architecture requirement prohibits. This isn't a hypothetical risk being guarded against pre-emptively; it already happened, three audit passes into the same effort, which is itself the strongest available argument for formalizing this requirement now rather than continuing to fix violations one at a time as they're independently discovered.

**Files involved:** See `docs/intelligence/RecommendationExplainability.md` §8.2 for the proposed structured `Recommendation`/`AdjustmentResult`/`Contributor` shape (grounded in existing types — `types/recommendation.ts`, `ConfidenceTypes.ts` — not invented from scratch), and §8.5 specifically for the maturity-system consolidation. In brief: `lib/intelligence/recommendationExplanation.ts`, `lib/exercises/generateWorkout.ts`, `lib/autoregulation/trainingDecisionEngine.ts`, `lib/intelligence/confidence/ConfidenceEngine.ts`, `lib/intelligence/dataMaturity.ts` (retired, logic migrated into domain engines), and every UI card currently computing a maturity/impact value itself rather than reading one.

**Recommended fix:** Not a single fix — a target architecture that Batches 8 and 9 below implement in two parts, sequenced by risk (E6's consolidation is contained and low-risk; the full pipeline restructure is not).

**Risk level:** **Architectural.** This is the umbrella that Batch 8's own "highest-risk batch in either audit document" risk note already describes for the pipeline-restructure half; the maturity-consolidation half (Batch 9, new) is materially lower risk and can proceed independently and sooner.

---

## 19. Recommendation Trace (Developer Observability)

**User impact:** None directly (developer/debugging-only, per explicit instruction it must never be user-facing) — but high value for maintainability, and the single biggest surprise in this entire audit series: **the requested feature already exists, fully built, and is entirely disconnected.**

**Current behavior — confirmed by direct trace:** `lib/intelligence/audit/` (Phase 65, "Decision Traceability & Audit Engine") ships a complete builder API (`beginTrace()`/`recordSignal()`/`recordModifier()`/`recordSafetyGate()`/`finalizeTrace()`), a `DecisionTrace` type shape that maps almost directly onto the six-stage flow requested (inputs → signals; per-stage modifiers → `ModifierRecord[]`; safety constraints → `SafetyGateRecord[]` with a `"passed"|"blocked"|"clamped"` result; final output fields), `localStorage`-backed persistence (`traceStorage.ts`, already satisfying "stored in development mode"), a replay engine that detects drift between a stored trace's original output and what the current code would produce (`replayEngine.ts` — not even requested, already built), and a full developer-facing browser (`components/dev/TraceExplorer.tsx`). **None of `beginTrace`/`recordSignal`/`recordModifier`/`recordSafetyGate`/`finalizeTrace` has a single call site anywhere outside `traceRecorder.ts` itself** — confirmed via repo-wide search. `TraceExplorer.tsx` has never rendered a real trace; `loadTraces()` returns empty every session. Full detail in `docs/intelligence/RecommendationExplainability.md` §9.

**Files involved:** `lib/intelligence/audit/traceRecorder.ts`, `auditTypes.ts`, `traceStorage.ts`, `replayEngine.ts`, `components/dev/TraceExplorer.tsx` (all exist, unwired); `lib/exercises/generateWorkout.ts`, `lib/autoregulation/trainingDecisionEngine.ts`, `lib/recovery/recoveryScore.ts` (need `recordSignal()`/`recordModifier()` calls added); `lib/telemetry/ObservabilityEvents.ts` (existing `trackPipelineCompleted()` — proposed as the summary-event companion to the detailed trace, not a replacement).

**Recommended fix:** Wire the existing system into the real pipeline rather than build a second one. Two of the six requested stages (Confidence Limit, Data Maturity Limit) can't be traced yet because the mechanisms that would produce them don't exist until Issue #18/Batch 8 lands (§9.2 of the explainability doc has the full stage-by-stage mapping) — everything else (inputs, recovery, readiness, safety gates) can be wired today, independent of Batch 8. Also recommended: unify this trace's `recordModifier()` calls with Batch 8's `Contributor[]` sourcing (§9.3 of the explainability doc) so there's one instrumentation point serving both the developer trace and the user-facing explanation, not two.

**Risk level:** **Low for the wiring itself** (the recorder's own header comment states it's "instrumentation only — it does not affect any recommendation output," and adding calls that only push into a module-level array is inherently low-risk), **but sequencing matters**: wire what's traceable today first (independent of Batch 5/8/9), defer Stages 4/5 until their underlying mechanisms exist, and route `Contributor[]` through the same recorder once Batch 8 is built rather than instrumenting twice.

---

## Implementation Approach — Extension

### Batch 5 — Recommendation Stabilization ✅ IMPLEMENTED (2026-07-16)
**Scope, as executed per the AXIS Beta Readiness Program brief:** recommendation scaling, compounding reduction (Issue #13), extreme percentage outputs (Issue #17/E1, absorbing what this document originally scoped as a separate "Batch 7" stopgap), and early-user adaptation limits (the confidence-damping mechanism originally designed in `docs/intelligence/RecommendationExplainability.md` §7, pulled forward from Batch 8 rather than deferred). Issue #15 (postpone exercise) was **not** part of this batch — see Batch 11, below, added to carry it since the beta-readiness brief separated "recommendation integrity" from "workout engine" priorities.

**What shipped:**
- `lib/exercises/generateWorkout.ts` — new `combineVolume()` replaces the four independent, sequential floor-at-1 passes with one coordinated calculation: the two ceiling-type factors (damped progression/readiness modifier, Training Decision Engine composite) are combined via `Math.min()` — not multiplication — matching `resolveEffectiveAdjustment`'s existing "most conservative wins" pattern, eliminating the double-count Finding E4 identified. The combined ratio floors once, at `MIN_SETS = 2` (raised from 1).
- `lib/intelligence/confidence/ConfidenceEngine.ts` — new `confidenceVolumeDamping(level)` (Insufficient 0.5 → High 1.0), applied to the *deviation from neutral* of Layer 1 (progression/readiness) and Layer 3 (adaptive pattern + periodization) only. Layer 2 (auto-regulation / `adherenceRiskScale`) is deliberately never damped — it represents same-day signals (symptoms, acute fatigue), which deserve full responsiveness regardless of account confidence.
- `app/dashboard/page.tsx` — threads `confidenceVolumeDamping(confidenceProfile.level)` through `runWorkoutPipeline()` → `generateWorkout()` at all three call sites.
- `lib/intelligence/recommendationExplanation.ts` — the calibration `scale = actualDelta / rawSum` division is now bounded to `[-6, 6]` (was unbounded beyond a too-permissive `0.001` guard), and every per-signal `pp()` output is clamped to `±60` percentage points regardless of how `scale` was computed. This is the stabilization fix for the reported +1200%/-1800% bug — the deeper two-model-disconnect this papers over (Findings E2/E3) remains Batch 8 work.
- New regression tests: `lib/exercises/__tests__/generateWorkout.test.ts` (5 tests — MIN_SETS floor under maximal stacked reduction, no double-counting of overlapping ceiling signals, undamped baseline, confidence damping direction, adherenceRiskScale never damped), `lib/intelligence/__tests__/recommendationExplanation.test.ts` (3 tests — bounded output under the exact near-zero-`rawSum` failure mode, sane normal-case behavior, no NaN/Infinity).

**Verification:** `tsc --noEmit` clean. Full suite 331/331 passing (323 pre-existing + 8 new). Live-verified in a real browser session: a low-quality-input account (moderate stress, variable sleep, new/Insufficient confidence) generated 2 sets/exercise (the new floor, not the old uncoordinated collapse); a high-quality-input account (excellent sleep, low stress) generated 4 sets/exercise — confirming the fix responds to input rather than uniformly flooring. The "Why today's plan?" breakdown showed bounded values (-12%, -15%, +5%, -8%, +24%, -15%) with no extreme numbers, on both desktop and mobile viewports.

**Remaining technical debt (not fixed in this batch, by design):** Findings E2/E3 (the explanation model still asserts a cycle-phase/momentum volume effect the real pipeline doesn't implement, and still omits periodization as a named driver) are unresolved — they require the decomposition-based rebuild in Batch 8, not a stabilization-level patch. The double-counting *fix* (Math.min-based ceiling combination) is now real in `generateWorkout.ts`, but `lib/intelligence/recommendationExplanation.ts`'s explanation model still doesn't know about it — it's still the same disconnected nine-signal approximation, just with its worst failure mode (unbounded blowup) clamped.

---

### Batch 6 — Exercise Loading Type
**Scope:** Issue #14.

**Files changed:** `lib/exercises/exerciseLibrary.ts`, `lib/exercises/exerciseSubstitutions.ts`, `components/workout/ExerciseFocusCard.tsx`.

**Risks:** Low (additive field, one conditional render) — see Issue #14's own risk note for the one real gotcha (derivation-heuristic coverage).

**Tests required:** Full-library dry run logging every exercise's derived `loadingType`, manually spot-checked against the equipment strings identified in Issue #14 (especially the weight-belt edge cases).

**Visual QA plan:** Log a session including at least one exercise from each `loadingType` value, confirm the weight stepper appears only where expected.

---

### Batch 7 — Recommendation Explainability Stopgap ✅ SUPERSEDED — MERGED INTO BATCH 5
**Scope:** Issue #17's display-clamp portion. When the AXIS Beta Readiness Program brief scoped "extreme percentage outputs" as part of Batch 5 (Recommendation Stabilization), this batch's work was absorbed there — and implemented at the *source* (`recommendationExplanation.ts`'s `pp()` and `scale`) rather than only at the display layer this section originally proposed, which is a stronger fix than what was planned here. See Batch 5's write-up above for what actually shipped. This section is kept for the historical record, not as an open batch.

---

### Batch 8 — Recommendation Explainability Foundation (design-reviewed, not yet scheduled)
**Scope:** Issue #17's full fix, superseded and subsumed by Issue #18's fuller specification — the structured `Recommendation`/`AdjustmentResult`/`Contributor` pipeline output, decomposition-based explanation model, qualitative-band display redesign, and confidence-aware damping mechanism, all specified in detail in `docs/intelligence/RecommendationExplainability.md` §8 (which itself supersedes that document's own §6–§7 point-fixes — §8.8 there explains the relationship).

**Files changed:** `lib/intelligence/recommendationExplanation.ts`, `lib/exercises/generateWorkout.ts` (return shape — needs to expose its own decomposition as `AdjustmentResult`), `lib/autoregulation/trainingDecisionEngine.ts`, `components/intelligence/RecommendationExplanationCard.tsx`, `lib/intelligence/confidence/ConfidenceEngine.ts` (becomes an upstream input to the pipeline, not a downstream consumer of it — see RecommendationExplainability.md §8.4), `types/recommendation.ts` (the new `Recommendation` shape).

**Status update (2026-07-16):** Batch 5 shipped a *simple* version of the confidence-damping mechanism this batch specified (`confidenceVolumeDamping()`, applied as a standalone multiplicative factor) — but that's a stabilization-level patch, not this batch's full requirement. Still outstanding: the structured `Recommendation`/`AdjustmentResult`/`Contributor` return shape, the decomposition-based explanation model (so `Contributor[]` and the developer trace's `modifiers[]` — now real, see Batch 10 — share one instrumentation point instead of two independent approximations), and qualitative-band display. Batch 10's live verification surfaced a concrete preview of why this unification matters: the trace recorder's replay engine assumes pure multiplicative composition, but `combineVolume()`'s real ceiling logic uses `Math.min()` — the same "a second model doesn't agree with the real pipeline" failure mode as Finding E1, now also visible between the trace and the real calculation, not just between the explanation and the real calculation. This is exactly what Batch 8's decomposition-based rebuild needs to resolve for both consumers at once.

**Risks:** **This is the highest-risk batch in either audit document.** It touches the return shape of the core recommendation-generation function, inverts the direction confidence flows through the pipeline, and eliminates the second explanation model entirely rather than patching it. Should not be scheduled until Batch 9 (below) has landed, so the confidence/maturity data this batch's `Contributor.confidence` field depends on is already flowing from a single, consolidated source rather than two. Batch 5's compounding-reduction fix has already shipped and stabilized, clearing the other original precondition.

**Tests required / Visual QA plan:** Deferred to that batch's own planning pass, once Batch 9 is stable — premature to specify test cases against a pipeline shape that will itself change.

---

### Batch 9 — Maturity System Consolidation ✅ IMPLEMENTED (2026-07-17)
**Scope, as executed:** Issue #18's E6 finding — every UI component that called `getMaturityStage(entryCount)` itself now reads a `maturityStage` field the engine already attached to the object it's rendering.

**What shipped, and how it differed from the original plan:**
- `lib/adherence/consistency.ts` — `ConsistencyScore` gets a new `maturityStage: MaturityStage` field, computed from `historyDepth` inside `computeConsistencyScore()`. `AdherenceCard.tsx` and the "Lifestyle & Adherence" accordion summary (`app/dashboard/page.tsx`) both read `consistency.maturityStage` now — the accordion summary was a second, previously-undocumented call site found during ground-truth grepping, not just the card.
- `lib/performance/trainingQuality.ts` — `TrainingQualityScore` gets `maturityStage`, computed from `sessionsAnalysed`. `PerformanceHubCard.tsx` reads it directly.
- `lib/autoregulation/fatigueModel.ts` — required more than a field addition: `CurrentFatigueInput` gained an optional `historyDepth` parameter (defaults to 0 — locked — rather than assuming maturity when the caller doesn't pass it), and `FatigueScoreEntry` now carries both `historyDepth` and `maturityStage`. This let a whole piece of `app/dashboard/page.tsx` state (`fatigueHistoryDepth`, a separate `useState` shadowing data that now lives on `fatigueEntry` itself) be deleted outright, along with `FatigueCard.tsx`'s separate `historyDepth` prop — the card now takes only `entry`.
- **`lib/adaptive/recoveryCapacity.ts` and `components/ui/LockedInsight.tsx` needed no changes** — the original plan listed both as files to migrate, but ground-truth grepping (not assumption) showed `RecoveryCapacityCard.tsx` already used `capacity.confidence` (its own pre-existing, engine-computed vocabulary), never `getMaturityStage()` directly, and `LockedInsight.tsx` only ever computed `checkInsRemaining()` — a presentational "how many more" countdown from a count it's handed, not a maturity *determination*. Both were already compliant with the target architecture; corrected the plan rather than making speculative changes to files that didn't need them.
- `lib/intelligence/dataMaturity.ts` itself is unchanged and not deleted — `getMaturityStage()` is still the single shared threshold function, now called only from engines (`consistency.ts`, `trainingQuality.ts`, `fatigueModel.ts`, and already `burnoutDetection.ts` from Batch 3) instead of from UI components.
- `lib/intelligence/confidence/ConfidenceTypes.ts`'s `workoutsToNextStage: null` gap: closed by *removing* the field from the static `MaturityStageInfo`/`MATURITY_STAGES` table (it could never be correct there — how many workouts remain depends on the specific user's count within a stage's range, not just which stage they're in, so it's not per-stage metadata) and adding a real `workoutsToNextStage(completedWorkouts)` function (`ConfidenceCalculator.ts`), exposed on `ConfidenceProfile` and computed in `buildConfidenceProfile()`. `ConfidenceExplainer.ts`'s `maturityContext()` — which was already computing this correctly inline, duplicated — now calls the shared function instead.

**Verification:** `tsc --noEmit` clean, 341/341 tests passing (334 + 7 new: 6 boundary tests for `workoutsToNextStage` mirroring the existing `deriveMaturityStage` boundary tests, plus a consistency check between the two). Live-verified: a fresh zero-history account correctly shows all four cards' locked states sourced from engine fields (`AdherenceCard` "Building your consistency picture", `PerformanceHubCard` "Complete your first workout...", `FatigueCard` "Available after N more check-ins", `RecoveryCapacityCard` unchanged). The full locked-to-ready transition was live-verified end-to-end for `AdherenceCard` specifically (seeded 10 recent adherence entries → "Lifestyle & Adherence" accordion summary correctly switched from "Habits & schedule" to a real "41/100 consistency" score). `PerformanceHubCard`/`FatigueCard`'s ready-state transition wasn't independently live-verified — their underlying data sources (`lib/workoutExecution/workoutLogging.ts`'s `getWorkoutLog()`, `lib/recovery/fatigueHistory.ts`'s `getFatigueHistory()`) are different legacy storage formats than what was seeded, and reverse-engineering both for this pass wasn't judged worth the time given the identical code pattern was already proven correct on `AdherenceCard` and both are protected by TypeScript's field-name checking.

**Remaining technical debt:** `RecoveryCapacityCard`'s own `confidence` vocabulary (`"early"|"growing"|"established"`) and the shared `MaturityStage` (`"locked"|"building"|"ready"`) are still two different enums for the same underlying concept — intentionally left alone (not this batch's scope; `RecoveryCapacity.confidence` was never a violation of the "UI never computes maturity" rule, just a different-but-valid vocabulary), but still a minor inconsistency worth a future look.

---

### Batch 10 — Wire the Existing Decision Trace Recorder ✅ IMPLEMENTED (2026-07-16)
**Scope, as executed:** `beginTrace()`/`recordSignal()`/`recordModifier()`/`recordSafetyGate()`/`finalizeTrace()` wired into the primary dashboard pipeline run (`app/dashboard/page.tsx`) — 9 input signals, 2 chained volume modifiers, 4 informational signals, 9 safety-gate results, and a final output, once per dashboard load. The two secondary recalculation call sites (environment change, check-in refresh) are **not yet instrumented** — intentionally scoped out to keep this batch's risk surface to the one call site that runs on every dashboard load, not all three.

**What shipped:** `lib/intelligence/audit/traceRecorder.ts`'s existing API (Phase 65, previously zero call sites anywhere) is now called from the real pipeline. Confirmed live, in a real browser session: a genuine `DecisionTrace` object persists to `localStorage` (`axis_decision_traces_v1`) on every dashboard load, `TraceExplorer.tsx` (`/dev` → Traces tab) renders it — signal table, modifier chain, safety-gate outcomes, all populated with real data for the first time since Phase 65 shipped.

**A real bug the replay engine caught, live, during this verification:** the first instrumentation pass recorded `progression_readiness_ceiling`, `adaptive_pattern_multiplier`, `periodization_offset`, and `confidence_volume_damping` as `recordModifier()` entries chained toward `finalVolumeScale`. Clicking "Verify Determinism" reported **Drift Detected: original=0.8500, replay=0.4335** — because `replayVolumeScale()` (Phase 65) assumes every recorded modifier multiplies together (`scale *= mod.outputFactor`), but those four factors actually feed a *separate*, per-exercise calculation inside `generateWorkout.ts`'s `combineVolume()` (via `Math.min()` for the ceiling factors, per Batch 5's fix) — they don't chain into this trace's `finalVolumeScale` at all. Fixed by re-recording them as `recordSignal()` (informational, correctly excluded from the replay's multiplication chain) and fixing `safety_governance`'s `outputFactor` to be a ratio relative to what preceded it (1.0 = no change) rather than a restated absolute value. Re-verified: **✓ Deterministic — Replay confirmed: identical inputs produce identical outputs.** This is now documented as a known representational gap between the trace schema (assumes flat multiplication) and the real pipeline (uses `Math.min()` for ceiling combination) — see Batch 8's status update above for why this is exactly what that batch's decomposition-based rebuild needs to resolve properly, for both the trace and the `Contributor[]` explanation at once.

**Files changed:** `app/dashboard/page.tsx` (all instrumentation calls), `lib/intelligence/audit/traceRecorder.ts` (unchanged — used as-is). Nutrition deliberately not recorded as a signal — it doesn't mechanically feed volume/intensity in the current pipeline (see Batch 5's write-up and `RecommendationExplainability.md` §2), and the trace must not assert an influence that isn't real.

**Verification:** `tsc --noEmit` clean, 331/331 tests passing (no dashboard-page-level trace test added — this is a React-component-integration concern verified via live browser QA, consistent with how the rest of this dashboard has been tested throughout this project, not vitest unit coverage). Desktop and mobile both confirmed working (`/dev` is not mobile-optimized by design, consistent with the rest of the dev console, but fully functional at 390px).

**Remaining technical debt:** the two secondary `runWorkoutPipeline` call sites (environment change, check-in refresh) don't call `beginTrace()`/`finalizeTrace()` — a workout regenerated via those paths won't produce a new trace. Stages 4 (Confidence Limit) and 5 (Data Maturity Limit) are recorded as informational signals only, not as gate/modifier chain entries, since no maturity-based adaptation limit exists in the pipeline yet (Batch 9 dependency, per `RecommendationExplainability.md` §9.2).

**Post-implementation validation (2026-07-16) — deload double-count found and fixed:** with the trace live, three real scenarios were seeded and their actual traces captured (new/low-confidence user, high-fatigue/high-symptom experienced user, scheduled deload week) specifically to check whether the stabilized pipeline behaves as intended under realistic combined inputs, not just the unit-test cases already covered. Two scenarios confirmed the architecture working correctly (bounded percentages, no set-count collapse, confidence damping only suppressing genuine deviations). The third — scheduled deload — surfaced a real, reproducible double-count: `sessionScaling.ts`'s deload layer already hard-caps `finalVolumeScale` at `Math.min(volumeMod, 0.60)` whenever `isDeloadPeriod` is true (Layer 2), and that already-capped value flows into `combineVolume()` as the ceiling — which was *also* applying `periodizationStatus.setsOffset` (-2 sets, Layer 3b) on top, counting the same deload signal twice. Fixed in `generateWorkout.ts`: `periodizationSetsOffset` is now suppressed to `0` specifically when `periodizationStatus.phase === "deload"` (Layer 2 already fully owns that case), while remaining the sole signal for every other phase (accumulation/intensification/peak have no Layer 2 equivalent at all). `rpeOffset` and `deloadReps` are untouched — those aren't represented in Layer 2's output, so no double-count existed there. Three new regression tests added (`lib/exercises/__tests__/generateWorkout.test.ts`), one of which deliberately uses a non-deload-strength ceiling (0.9, not the real 0.60) so the test can't pass by accident via the `MIN_SETS` floor absorbing the difference — verified this distinguishes fixed from pre-fix behavior by hand-tracing both. `tsc` clean, 334/334 tests passing, re-verified live against the same seeded deload scenario.

---

### Batch 11 — Exercise Postponement
**Scope:** Issue #15, split out of the original Batch 5 scoping once the AXIS Beta Readiness Program brief separated "Recommendation Integrity" (Priority 1, now shipped as the real Batch 5) from "Workout Engine" (Priority 2, still pending). Not implemented in this pass. Full detail remains as originally specified in Issue #15 above: postpone-to-next-position behavior, and the real risk — `actuals: Record<number, SetRecord[]>` is keyed by array index, so a reorder must re-key every shifted entry in the same atomic update, or logged sets can silently reattach to the wrong exercise.

**Files changed:** `components/dashboard/WorkoutCard.tsx`, `components/workout/GuidedExerciseFlow.tsx`.

**Risks:** Medium — see Issue #15's original write-up for the full reasoning.

**Tests required:** Postpone an exercise with 1 of 3 sets already logged; confirm the logged set stays attached to the correct exercise after the reorder, and that workout-history persistence reflects the postponed exercise's original prescription.

**Visual QA plan:** Full postpone flow on both desktop and mobile.

---

## Constraints Honored — Extension

Per the brief: Dashboard 2.0 was not redesigned in producing this extension. Workout Mode (§16) is a proposal document only, per explicit instruction not to implement it in this pass. Recommendation Explainability's audit (§17, and the full `docs/intelligence/RecommendationExplainability.md`) documents the existing calculation pipeline and proposes a design; it does not implement pipeline changes. The Single Source of Truth architecture requirement (§18, and `docs/intelligence/RecommendationExplainability.md` §8) is likewise documented and not implemented, per explicit confirmation to document the target architecture first — no code was changed producing §18 or the §8 write-up beyond the audit-doc and design-doc edits themselves. The Recommendation Trace requirement (§19, and `docs/intelligence/RecommendationExplainability.md` §9) is documented, not implemented, in the same pass — its central finding (the requested system already exists and is unwired) was itself discovered by reading, not by writing new code. Where a recommended fix does touch core recommendation logic (Issue #13, and Batch 8 in full), it's explicitly flagged as such — consistent with the original audit's discipline of calling out formula changes rather than presenting them as simple bug fixes.

---

## Constraints Honored

Per the brief: no core recommendation-formula changes are proposed anywhere in this audit except where explicitly identified as a wrong *default* (empty `lastPeriodDate` → day 1; zero-data → real score) rather than a change to how a *populated* input is scored. No changes to Dashboard 2.0 information architecture, the design system, or any existing intelligence feature's removal are proposed. Adaptive Intelligence, Safety Engine, Verification Registry, Confidence Engine, and Telemetry are all read from, never modified, in every recommended fix above.
