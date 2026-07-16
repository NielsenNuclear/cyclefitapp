# Workout Mode Proposal — Axis

**Date:** 2026-07-16
**Status:** Proposal only. No implementation in this pass.
**Origin:** UX Stabilization extension — "Axis UX Stabilization — Workout Engine & Recommendation Explainability" brief, Part 2.

**Framing:** the dashboard is the coach's briefing room — review status, review today's plan, decide to start. Workout Mode is the gym floor — one exercise, one decision, minimal chrome. The two surfaces currently share one visual language (white cards, dense information, the full navigation shell) because the guided flow (`GuidedExerciseFlow` / `ExerciseFocusCard`, built in Phase UX-1) is rendered *inside* `WorkoutCard`, which itself lives inside the dashboard's accordion stack. It already behaves like a distinct mode functionally — this proposal is about giving it a distinct visual and navigational identity to match.

---

## 1. Current State (what exists today)

Traced directly from code, not assumed:

- `components/dashboard/WorkoutCard.tsx` owns a three-state machine: `idle` (`WorkoutHeroView`) → `active` (`GuidedExerciseFlow` + `RestScreen`) → `done` (`WorkoutCompletionView`). All three render inside the same card, inside the same dashboard page, inside `DashboardShell`'s persistent bottom nav.
- `GuidedExerciseFlow` already has the right *interaction* model for a focused mode: one exercise dominant, progress dots, prev/next, a single primary CTA. It just doesn't have a distinct *environment* — it renders on the same `bg-white` canvas as every other dashboard card, at the same information density, with the dashboard's nav bar still visible and tappable underneath it.
- Warmup and cooldown (`WarmupScreen`, `CooldownScreen`, added in UX Stabilization Batch 1) are full-bleed-ish but still composed within `WorkoutCard`'s existing container, not a route or overlay of their own.
- There is no motion/transition system yet (Phase 61, "Premium Motion & Micro-Interaction System," is unstarted per the roadmap) — any transition into/out of Workout Mode needs to ship with its own minimal transition, not assume a shared primitive exists.

**What this proposal changes:** the container and chrome around the existing guided-flow components, not the guided-flow interaction model itself, which is already sound.

---

## 2. Information Architecture

Two surfaces, two jobs:

| Surface | Job | Contains |
|---|---|---|
| **Dashboard** ("briefing room") | Plan, review, decide | Readiness/recovery/cycle status, today's recommendation + explanation, all intelligence cards, nutrition, settings entry points |
| **Workout Mode** ("gym floor") | Execute, log, finish | Warmup → current exercise → rest → next exercise → ... → cooldown → completion |

Workout Mode is **not** a new route with its own URL in this proposal's default recommendation — see §7 for the routed alternative and why a modal/overlay is preferred first. Either way, the dashboard's persistent bottom nav (`DashboardShell`) must not be reachable while Workout Mode is active. That's the actual functional requirement ("distraction-free"); how it's implemented (route vs. overlay) is secondary.

### Entry
`WorkoutHeroView`'s "Start Workout" button (`components/dashboard/WorkoutCard.tsx`, `handleStart()`) is the sole entry point today and stays the sole entry point. It already sets `mode: "active"` — this proposal changes what renders when `mode === "active"`, not how you get there.

### Exit
Two paths, both already exist as concepts, neither currently leaves the dashboard shell:
1. **Finish workout** → `WorkoutCompletionView` → "Done" → `setMode("idle")` (fixed in Batch 1). In Workout Mode, this becomes the transition back to the dashboard.
2. **End early / partial finish** → same `onFinish("partial")` path, same destination.

No other way out. No back-button escape mid-set — see §5.

---

## 3. Screen Flow

```
Dashboard (briefing room)
    │  tap "Start Workout"
    ▼
┌─────────────────────────────────────────┐
│  WORKOUT MODE (gym floor)                │
│                                           │
│  Warmup screen (if warmupBlock present)   │
│         │ skippable                       │
│         ▼                                 │
│  Exercise 1 of N  ──▶  Rest  ──▶  Exercise 2 of N  ──▶ ...
│         │ (per set)         (per set)                  │
│         │                                               │
│         ▼ (at N of N, all sets done)                    │
│  Session difficulty + Finish                             │
│         │                                                │
│         ▼                                                │
│  Cooldown screen (if recoveryBlock present)               │
│         │ skippable                                       │
│         ▼                                                 │
│  Workout Complete                                          │
│         │  "Return to Dashboard"                            │
└─────────▼─────────────────────────────────────────────────┘
Dashboard (briefing room) — "Logged today" state
```

Mid-session, two lateral moves are always available without leaving the mode: **Prev/Next exercise** (already exists) and **Add Exercise** (Batch 2). **Postpone Exercise** (this brief's Part 1 §3, separate implementation) becomes a third.

---

## 4. Visual Language

Reuses the existing Axis Design System 2.0 token set (`lib/design/tokens.ts`) — this is a new *surface*, not a new *palette*. Concretely:

| Element | Dashboard (today) | Workout Mode (proposed) |
|---|---|---|
| Background | `canvas` `#FAF9F5` / card `surface` `#FFFFFF` | A dedicated dark-neutral, e.g. `#1C1B18` (the existing `ink` token, inverted to a background role) or a new `canvas-workout` token one step darker than `ink` — **needs a design decision, not a code decision**; do not invent a new hex without running it through the same token-derivation discipline as the rest of DS-2 |
| Card surfaces | White cards, `shadow-card` | Slightly-raised dark panels (`rgba(255,255,255,0.04–0.06)` over the dark canvas), not white — avoids the harsh white-card-on-dark-page look |
| Brand accent | `brand` `#534AB7` used sparingly | `brand` and `brandLight` `#6B63C8` used *more* — the primary CTA, the active progress dot, the timer pulse all already use brand purple (`ExerciseFocusCard`, `GuidedExerciseFlow`) and should stay purple; it reads correctly on a dark background without adjustment (contrast-check in §6) |
| Text | `ink` `#1C1B18` on light | Nearly-white text (e.g. `#F5F3EE`, close to existing `surfaceSubtle`) on dark |
| Status colors | `success` / `caution` / `danger` at their light-mode values | Same hues, likely need a lightness bump for AA contrast on a dark background — **needs a contrast audit before implementation**, not a copy-paste of light-mode values |
| Touch targets | Standard (buttons ~40–44px per DS-2) | Larger — the primary "Complete Set" button (`ExerciseFocusCard.tsx`) is already full-width and 4-padding; increase min-height for Workout Mode specifically (e.g. 56px vs. current ~52px) since this is the button tapped hundreds of times per session, often with sweaty/gloved hands |

This is deliberately **not** a full dark-mode implementation of the whole app (Phase 61-adjacent territory, out of scope) — it's one dedicated dark surface for one mode, similar to how many fitness apps (Strong, Hevy, Strava's active-activity screen) use a dark execution view against a light planning view without the whole app being dark-mode-aware.

---

## 5. Interaction Model

- **One primary action per screen**, already the `GuidedExerciseFlow`/`ExerciseFocusCard` pattern — preserve exactly.
- **No destructive navigation.** No back-button-to-dashboard, no nav bar, no way to accidentally lose in-progress set data. The only way out is Finish, Partial Finish, or (native OS back gesture, unavoidable on mobile web) — which should trigger a confirmation, not a silent exit, since `WorkoutCard` already persists `actives` via `setActiveWorkout`/`getActiveWorkout` (resumable), so an accidental exit is recoverable but should still be confirmed to avoid surprise.
- **Rest timer stays a first-class, high-contrast element** — `RestScreen` (fixed for accuracy in Batch 1) already exists as a distinct screen; in Workout Mode it should feel like a natural beat in the flow, not an interruption. Large countdown, one-tap skip, matches the dark canvas.
- **Quick logging**: `SetStepper`'s tap-to-increment pattern (already built) is the quick-entry mechanism — no change needed, just re-skinned.
- **Remaining exercises overview**: `ProgressDots` (`GuidedExerciseFlow.tsx`) already exists but is minimal (dots only, no names). Proposed addition: a collapsible "Up next" strip — tap the progress-dots row to expand a compact list of remaining exercise names with set counts, tap again to collapse. Doesn't need a new screen, an expand/collapse of existing chrome.
- **Persistent workout progress**: `elapsedSeconds` timer already renders in the top bar (`GuidedExerciseFlow.tsx` lines 150–153) — keep it, re-skin it for the dark canvas.

---

## 6. Accessibility Considerations

- **Contrast**: every color pairing above needs a real contrast check (WCAG AA, 4.5:1 body text / 3:1 large text) against the dark canvas before implementation — do not assume light-mode token values port over correctly when the background lightness inverts. This is the single biggest risk in this proposal if skipped.
- **Touch targets**: WCAG 2.5.5 (AA) wants 44×44px minimum; §4 already proposes going larger than that for the primary action, which is good, but every secondary control (Prev, Skip, Add Exercise, progress dots) needs the same minimum, not just the primary button.
- **Motion**: no motion system exists yet (Phase 61 unstarted). The transition into/out of Workout Mode should be a simple opacity/scale cross-fade, gated behind `prefers-reduced-motion` from day one (a straightforward CSS media query, not dependent on Phase 61 landing first) rather than shipping an un-gated animation now and retrofitting the check later.
- **Screen readers**: the existing guided flow has some `aria-label`s (`ExerciseFocusCard`'s "Complete set N") but not full coverage — Workout Mode's darker, denser UI raises the stakes on this (a low-vision user relying on VoiceOver/TalkBack while also dealing with reduced contrast during a workout is a real, not edge-case, user). A full pass belongs in the implementation batch, not this proposal, but should be an explicit line item, not an afterthought.
- **One-handed use**: gym context often means one hand on a bar/bench. Primary CTA should stay within thumb reach at the bottom of the viewport (already the case — `ExerciseFocusCard`'s "Complete Set" button is bottom-anchored within its card) — preserve this in any re-layout.

---

## 7. Implementation Strategy

Recommended sequencing, not a commitment to build now:

**Option A — Overlay/portal (recommended first step).** Render Workout Mode as a fixed-position full-viewport overlay (similar mechanism to `components/ui/Sheet.tsx`'s portal pattern, already proven in this codebase) mounted from `WorkoutCard` when `mode === "active"`, rather than inline in the accordion flow. Lowest risk: no routing changes, no new page, `DashboardShell`'s nav is trivially hidden by the overlay's z-index, state (`actuals`, `exercises`, timers) stays exactly where it already lives in `WorkoutCard`. This is almost entirely a CSS/container change plus a token-and-contrast pass, not a data-flow change.

**Option B — Dedicated route (`/workout/active` or similar).** Cleaner separation, real browser back-button semantics, but requires lifting `WorkoutCard`'s state up or into a shared store/context so it survives a route change, plus handling deep-link/refresh-mid-workout (partially already handled via `getActiveWorkout()`/localStorage persistence, but a route adds surface area: what does `/workout/active` render if there's no active workout in storage? Redirect to dashboard, presumably — an edge case that doesn't exist today because there's no dedicated route to land on directly). More work, more risk, better long-term ergonomics (shareable state, real navigation history).

**Recommendation:** ship Option A first. It delivers the actual user-facing value (distraction-free dark execution surface) with the least architectural risk, reusing `Sheet.tsx`'s existing portal pattern instead of inventing routing infrastructure. Revisit Option B only if a concrete need emerges (e.g., wanting the browser back button to step between exercises, which nothing in this brief asks for).

**Suggested batch breakdown for a future implementation pass:**
1. Contrast-audit and finalize the dark token set (design decision, blocks everything else)
2. Build the overlay/portal container + re-skin `GuidedExerciseFlow`, `ExerciseFocusCard`, `RestScreen`, `WarmupScreen`, `CooldownScreen`, `WorkoutCompletionView` onto it (mechanical — same components, new container and classes)
3. "Up next" expandable strip (net-new, small)
4. Accessibility pass (contrast verification in a real browser, screen-reader pass, reduced-motion gating)
5. Exit-confirmation for the native-back-gesture edge case

---

## Constraints Honored

Per the brief: this is a proposal, not an implementation. No code changes were made producing this document. Dashboard 2.0's information architecture is untouched — this proposal only concerns the surface that already exists behind "Start Workout," and explicitly recommends the lowest-risk path (overlay, not a redesign of the dashboard or a new routing architecture) as the default.
