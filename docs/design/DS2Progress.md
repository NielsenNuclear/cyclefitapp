# DS-2 Progress Tracker

Living document — updated at the end of every batch. For the frozen point-in-time baseline this tracks progress against, see `DS2Baseline.md`. For the batch plan being executed, see `DS2ImplementationPlan.md`. For binding constraints on this phase, see the DS-2 kickoff instructions (design-system adoption only; no consolidation, no redesign, no logic changes).

---

## Overall Migration Progress

| Batch | Status |
|---|---|
| 0 — Migration Baseline | ✅ Complete |
| Pre-flight decisions | ✅ Decided and implemented in Batch 1 |
| 1 — New shared primitives | ✅ Complete |
| 2 — Onboarding (pilot) | ✅ Complete |
| 3 — Dashboard Layer 1 | ⏳ Not started |
| 4 — Navigation + overlays | ⏳ Not started |
| 5 — Dashboard Layer 2 (accordion sections) | ⏳ Not started |
| 6 — Dashboard Layer 3 ("Axis Intelligence") | ⏳ Not started |
| 7 — Icon system | ⏳ Not started |

**Compliance headline — re-measured after Batch 2** (same methodology as `DS2Baseline.md`, app-wide across `components/`+`app/`, 195 `.tsx` files):

| Metric | Baseline (Batch 0) | After Batch 2 | Change |
|---|---|---|---|
| Fully compliant files | 15 (7.7%) | **22 (11.3%)** | +7 |
| Files using ≥1 token color class | 49 (25%) | **62 (32%)** | +13 |
| Files with ≥1 hardcoded hex | 133 (68%) | **127 (65%)** | −6 |
| Total hardcoded hex occurrences | 3,500 | **3,227** | −273 |

Batch 2 migrated 7 files (all of `components/onboarding/` + `components/ui/onboarding-primitives.tsx`) — 275 of the 273-hex-occurrence reduction came directly from this batch's scope (the small residual difference is from Batch 1's `Button.tsx`/`ErrorBoundary.tsx` edits already counted in a prior measurement window). One file (`ProfileSummary.tsx`) still shows 2 hex occurrences — both are the single documented exception (see Known Issues), not missed migration work.

## Current Batch

**Batch 2 — Onboarding (pilot): complete.** Migrated `components/ui/onboarding-primitives.tsx` and all 6 onboarding feature files (`StepWrapper.tsx`, `Steps1to5.tsx`, `Steps6to10.tsx`, `EquipmentStep.tsx`, `ProfileSummary.tsx`, `ProgressBar.tsx`) to tokens — broader than `DS2ImplementationPlan.md`'s literal Batch 2 text (which named only the primitives file + `StepWrapper.tsx` as StepContinueButton's consumer), because the baseline re-audit found the step files themselves carried the majority of onboarding's hex usage (275 of 275 occurrences migrated came from across all 7 files, not just the 2 originally named) — migrating only the primitives library would have left the pilot batch's own stated goal ("prove the pattern on a fully-consistent flow") half-done. Full detail in "Batch 2 details" below.

**Next up:** Batch 3 (Dashboard Layer 1) — awaiting review sign-off before starting.

## Commit History

| Batch | Commit subject | Files |
|---|---|---|
| Docs (DS-1 + DS-2 Batch 0) | `docs: design system documentation (DS-1) and DS-2 migration baseline` | `docs/design/*.md` (8 files) |
| 1 | `feat(ui): add Batch 1 shared primitives (Dialog, Sheet, Toast, Tabs, Select, useFocusTrap, VisuallyHidden)` | 8 new files in `components/ui/` + barrel export update |
| 1 | `fix(resilience): use current design tokens in ErrorBoundary fallback, adopt Button` | `components/resilience/ErrorBoundary.tsx` |
| 1 | `feat(resilience): wrap dashboard sections, workout experience, and body intelligence in ErrorBoundary` | `components/dashboard/AccordionSection.tsx`, `components/dashboard/WorkoutCard.tsx`, `components/body/BodyIntelligenceViewer.tsx` |
| 1 | `docs(ui): promote SectionHeader as canonical, reframe CardLabel as compact variant` | `components/ui/SectionHeader.tsx` |
| 1 | `chore(dev): add Design System primitive showcase to /dev console` | `components/dev/DesignSystemShowcase.tsx`, `app/dev/page.tsx` |
| 1 | `docs: update DS2Progress.md — Batch 1 complete` | `docs/design/DS2Progress.md` |
| 1 (follow-up) | `docs: record completed browser QA pass for Batch 1` | `docs/design/DS2Progress.md` |
| 2 | `feat(ui): add dark/pill Button variant for onboarding CTA` | `components/ui/Button.tsx` |
| 2 | `refactor: migrate onboarding-primitives.tsx to design tokens` | `components/ui/onboarding-primitives.tsx` |
| 2 | `refactor: migrate onboarding step files to design tokens` | `components/onboarding/{StepWrapper,Steps1to5,Steps6to10,EquipmentStep,ProfileSummary,ProgressBar}.tsx` |
| 2 | `docs: update DS2Progress.md — Batch 2 complete` | `docs/design/DS2Progress.md` |

(Hashes are reported per-batch in the end-of-batch report rather than embedded here. Run `git log --oneline -- docs/design/ components/ui/ components/resilience/ErrorBoundary.tsx components/onboarding/` for the authoritative record.)

## Verification Status (Batch 1)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) — required two rounds of fixes (see Known Issues) |
| `vitest run` | ✅ 323/323 passing, 6 files (unchanged — no test coverage exists for these new UI primitives yet; nothing to add for net-new components with no call sites) |
| Dev server launches | ✅ Confirmed clean startup, multiple times across this batch |
| `/dev`, `/dashboard`, `/body` routes compile and return HTTP 200 | ✅ Confirmed via direct request |
| Automated browser QA (gstack) | ✅ **Completed as a follow-up pass** — see "Browser QA — completed" below. The Playwright build-mismatch issue (documented below for the record) was fully resolved. |
| git status clean of unrelated changes | ✅ Confirmed — only Batch 1 files staged per commit; pre-existing unrelated changes (`package-lock.json`, `axis-research-setup-claude-code-brief.md`, `research/files (2).zip`) untouched |

### Visual QA note — tooling gap, not skipped

Automated browser-based QA (the `gstack` skill) requires a Playwright headless-Chromium binary that wasn't installed in this environment. Attempted to resolve it (with your go-ahead) by running `npx playwright install`, but that pulled browser build `1228` from an ambient/global Playwright resolution while gstack's bundled server needs the exact matching build `1208` for its pinned `playwright-core` version. Retried by installing directly from gstack's own local dependency (`node_modules/playwright` v1.58.2) two more times; the second attempt genuinely stalled mid-download (confirmed via unchanging file size + live process check) and was killed rather than left hanging.

**Given the go-ahead to stop sinking time into the tooling itself, verification for this batch was done as:**
1. `tsc --noEmit` — catches all type errors, JSX structural errors (unbalanced tags), and import resolution errors across every new file and every edited call site.
2. Direct HTTP requests to every route touched (`/dev`, `/dashboard`, `/body`) confirming Turbopack compiles the full module graph (including the new `DesignSystemShowcase.tsx` and its six primitive imports) with no server errors.
3. **Manual line-by-line logic review** of the new primitives, specifically focused on the two areas static checks can't catch: focus-trap correctness and the Sheet's closed-state DOM behavior.

This manual review caught two real bugs before they shipped (see Known Issues #4 and #5) — worth recording as evidence the fallback path did real work, not just a formality.

### Browser QA — completed (follow-up pass)

Root cause of the version mismatch: gstack's browser server needs Playwright build `1208`; `npx playwright install` (ambient/global resolution) grabbed `1228` instead; `bunx playwright install` also resolved to `1228` (bunx's own package resolution, not gstack's local `node_modules/playwright` v1.58.2 dependency). Fixed by invoking gstack's local dependency directly (`node node_modules/playwright/cli.js install chromium-headless-shell` from within the gstack skill directory). Even that stalled twice on the final extraction/rename step (the underlying zip did fully download to a temp staging folder both times — confirmed via file size — but the installer never completed moving it into place); resolved by manually extracting the already-downloaded zip (`Expand-Archive`) to the expected `chromium_headless_shell-1208` path, bypassing the installer's stuck final step entirely.

With the browser working, ran the full interactive QA pass against `/dev` → "Design System":

| Check | Result |
|---|---|
| Dialog: opens centered, `shadow-modal`, correct token colors | ✅ |
| Dialog: initial focus lands on first focusable element (Close button) | ✅ |
| Dialog: Tab/Shift+Tab wrap correctly within the trap | ✅ |
| Dialog: `role="dialog"` `aria-modal="true"` `aria-labelledby` correct (verified via DOM query, not just visual) | ✅ |
| Dialog: Escape closes it, fully unmounts, focus returns to the triggering button | ✅ |
| Sheet: slides in from the right, full height, correct styling | ✅ |
| Sheet: backdrop click closes it | ✅ |
| Sheet: closed state is genuinely `inert` (not just `aria-hidden`) — **directly confirms the Known Issue #4 fix works in a real browser**, not just in theory | ✅ |
| Toast: all three variants (neutral/success/danger) render with correct token colors, stack correctly when fired in quick succession, auto-dismiss on schedule (confirmed 0 toasts remaining after the dismiss window) | ✅ |
| Select: native `<select>` changes value correctly, options list correct | ✅ |
| VisuallyHidden: icon-only "✕" button has a real accessible name ("Dismiss") distinct from the visual glyph, confirmed via accessibility-tree snapshot | ✅ |
| Focus ring: keyboard-navigated (Tab) focus on the icon button shows a visible solid brand-purple ring; mouse-click focus correctly does *not* show one (expected `:focus-visible` behavior, not a bug) | ✅ |
| Tabs: ArrowRight moves both focus and selection through Dialog/Sheet → Toast → Select | ✅ |
| Mobile viewport (390×844): Dialog and Sheet both render without horizontal overflow or clipping | ✅ |
| Console errors across the entire session | ✅ none |
| Pre-existing "1 Issue" badge in the `/dev` overlay | Investigated — a hydration mismatch in `components/dev/LaunchDashboard.tsx` (live-clock render, pre-existing "Launch" tab, era 76). **Unrelated to Batch 1**, not introduced by this work, not fixed (out of scope). |

No new bugs found beyond the two already caught and fixed by manual review — this pass corroborated the manual-review findings rather than surfacing anything new, which is itself useful signal that the manual review was thorough.

## Verification Status (Batch 2)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 323/323 passing, 6 files (unchanged) |
| Dev server launches | ✅ Confirmed clean startup |
| Automated browser QA (gstack) | ✅ **Full interactive walkthrough completed** — all 11 onboarding steps + profile-edit reuse. See "Batch 2 details" below. |
| Console errors across entire walkthrough | ✅ none |
| git status clean of unrelated changes | ✅ Confirmed |

## Batch 2 details

### Button gets a `dark` variant + `pill` shape (design decision, not just token substitution)

`StepContinueButton`'s original implementation (`bg-[#1C1B18] hover:bg-[#2C2B28]`, `rounded-full`, lifted hover shadow) is visually a *different* button treatment from `Button`'s existing `primary` (brand purple, fixed-height, `rounded-lg`/`xl`) — not a hex-vs-token difference, a genuinely different shape and color. `DS2ImplementationPlan.md`'s literal Batch 2 text said fold it in as `variant="primary" size="lg" fullWidth`, which would have silently repainted the onboarding CTA purple — a real design change, not adoption. Caught this before implementing and instead:
- Added `variant: "dark"` to `Button` (`bg-ink`/`hover:bg-ink/90`, tokens) — same ink color as before, just token-driven.
- Added `shape: "pill" | "default"` to `Button` — pill uses padding-driven height + `rounded-full` + a documented, ink-tinted arbitrary shadow (`shadow-[0_4px_20px_rgba(28,27,24,0.12)]` etc. — doesn't map to any of the 5 shadow tokens, kept scoped to this one shape rather than inventing a 6th global token for one use).
- `StepContinueButton` is now a ~15-line wrapper: `<Button variant="dark" shape="pill" size="lg" fullWidth iconEnd={<ArrowIcon/>}>`. Same visible output, single implementation.
- Confirmed via browser QA: enabled/disabled/hover states all pixel-equivalent to the original.

### `'DM Serif Display'` was never actually loading — real bug, fixed

Found while migrating: `StepWrapper.tsx`'s step title, `ScaleSlider`/`NumberStepper`'s numeric displays, `ProfileSummary.tsx`'s headline/ring text, and `ProgressBar`-adjacent step counters all set `fontFamily: "'DM Serif Display', Georgia, serif"` inline. **`DM Serif Display` is not loaded anywhere in the app** — no `next/font` declaration, no `@font-face`. Every one of these was silently falling back to generic `Georgia` this whole time, not the app's actual configured serif (`Lora`, loaded correctly via `next/font` and available as the `font-serif` token). Replaced every instance with `font-serif`. This is a fix, not a redesign judgment call — `font-serif` is the one serif that was ever really available; treating "make broken font references resolve to the real, working token" as adoption rather than a style change. Confirmed via browser QA: numeric displays and headlines now render in Lora, look more considered/on-brand than the Georgia fallback, no layout shift.

### Found and neutralized a second pre-existing bug: a shadow declaration that could never have rendered

`OptionCard`'s selected state built a Tailwind class string as `` `shadow-[0_0_0_1px_${a.border}]` `` where `a.border` was itself a full class name (e.g. `"border-[#534AB7]"`), producing the literal (invalid) string `shadow-[0_0_0_1px_border-[#534AB7]]` — not parseable Tailwind syntax, so this ring shadow never rendered in production, ever. Two options: make it actually work (visible change, arguably redesign) or remove the dead declaration (zero visual change, matches current behavior exactly). Chose the latter — removed it, selected-state styling is unchanged (border + background color swap only, as it's actually looked all along). Not "fixed," just correctly left broken-as-before rather than accidentally un-breaking it into a new visual.

### Full interactive browser QA — all 11 steps + profile-edit reuse

With the Playwright tooling now working (per Batch 1's resolution), ran the actual walkthrough rather than deferring it:

| Area | Result |
|---|---|
| Step 1 (Goals) — OptionCard multi-select, disabled→enabled Continue transition | ✅ purple selected-state, dark pill CTA correct |
| Step 2 (Experience) — OptionCard single-select + pill chip row | ✅ |
| Step 3 (Training Style) — OptionCard grid + NumberStepper | ✅ serif "3 sessions" numeral confirmed |
| Step 4 (Recovery) — OptionCard + brand-tinted info callout | ✅ |
| Step 5 (Sleep) — NumberStepper + accent-variant OptionCards (teal "Excellent", amber "Poor") | ✅ both accent color families render correctly |
| Step 6 (Stress) — ScaleSlider + serif numeral (the `font-serif` fix) + ChipSelect | ✅ confirmed Lora rendering, not Georgia |
| Step 7 (Energy) — OptionCard + ChipSelect | ✅ |
| Step 8 (Cycle) — brand callout, custom stepper, regularity cards, SegmentedControl, conditional date field | ✅ all render/interact correctly, conditional field appears exactly per existing logic |
| Step 9 (Symptoms) — toggle-button grid + conditional severity OptionCards | ✅ |
| Step 10 (Priorities) — ranked-selection with numbered badges (brand-purple selected badge vs. neutral unselected) | ✅ |
| Step 11 (Equipment) — preset cards, "N items selected" summary, per-group accordions | ✅ |
| `ProfileSummary` (completion screen) | ✅ ring/score, weight bars (5 distinct token-sourced colors via `lib/design/tokens.ts`'s `color` export), badges, dark "what happens next" block, purple-glow final CTA — all correct |
| `/profile` route (StepWrapper/Step1Goals reuse for profile editing) | ✅ renders identically to fresh onboarding, confirming shared-component reuse still works |
| Console errors, entire walkthrough | ✅ none |

### `weightColors` in `ProfileSummary.tsx` — the actual intended use of `lib/design/tokens.ts`

This was a plain JS object feeding inline `style={{ background: color }}`, not a className string — exactly the documented use case for the TS token mirror. Now imports `color` from `@/lib/design/tokens` instead of hardcoding hex, e.g. `sleep: tokenColor.brand` instead of `sleep: "#534AB7"`.

## Remaining Work

Everything in `DS2ImplementationPlan.md` Batches 3–7. Batches 1 and 2 are both code-reviewed and browser-verified — no outstanding QA debt carried forward.

## Known Issues

1. **Border-radius naming collision** (from Batch 0) — unresolved, unchanged. See `DS2Baseline.md` → "Border Radius."
2. **`#8A8880`** (onboarding) — **resolved in Batch 2**: mapped to `text-ink-muted` (closer numeric/semantic match than `ink-secondary`), applied consistently across all 7 onboarding files.
2b. **New, found in Batch 2**: `text-[#D3D1C7]` in `ProfileSummary.tsx`'s dark "what happens next" block — light text on a dark surface, and this app has **no on-dark-surface text token scale at all** (confirmed: no dark-mode tokens exist per Batch 0/DS-1 findings). Left as a documented, scoped hex exception rather than forcing a poor-fit light-mode token. Real fix is a dark-surface text scale, which belongs to dark-mode work (DS-7), not this batch.
2c. **New, found in Batch 2**: a third pill-button treatment exists (`ProfileSummary.tsx`'s "Go to my dashboard" CTA — brand-purple glow, distinct from both `Button`'s `primary` and the new `dark`+`pill` combo). Tokenized in place, **not consolidated onto `Button`** — that's a consolidation decision (DS-3/DS-6 territory per DS-2 rules), not this batch's job. Now three known button treatments in the app: `Button primary`, `Button dark+pill` (onboarding steps), and this one (profile-summary completion CTA).
2d. **New, found in Batch 2**: the brand-purple "glow" shadow family (`rgba(83,74,183,0.3)` etc., ~10+ occurrences per `DS2Baseline.md`) still has no token — confirmed present in `ProfileSummary.tsx`'s final CTA, left as-is (not tokenized) since inventing a new global shadow token is a small but real design decision outside pure adoption scope. Candidate for a future token if DS-6 or a dedicated token-expansion review picks it up.
3. **Fixed in Batch 1**: `VisuallyHidden`'s initial implementation (`<Tag className=... >{children}</Tag>` with a dynamic `ElementType`) failed `tsc` — TypeScript couldn't reconcile the polymorphic tag's children type. Fixed by using `createElement` directly instead of JSX for the dynamic-tag case.
4. **Fixed in Batch 1 (real bug, caught by manual review, not tooling)**: `Sheet.tsx` always renders its children (needed for the slide-in/out transition) and only marked the closed state via `aria-hidden` + a CSS transform pushing it off-screen. `aria-hidden` alone doesn't reliably stop keyboard focus from reaching off-screen content in every browser. Fixed by adding `inert={!isOpen}` (React 19 passes this through natively) so closed-sheet content is genuinely unfocusable, not just visually hidden.
5. **Fixed in Batch 1 (real bug, caught by manual review, not tooling)**: `useFocusTrap`'s effect originally depended on `[active, onEscape, initialFocus]`. Since `onEscape` is normally an inline arrow function from the caller (e.g. `onClose={() => setDialogOpen(false)}`), its identity changes on every render of the parent — meaning *any* unrelated re-render of the parent while a Dialog/Sheet was open would re-run the effect, re-capture "previously focused element," and yank focus back to the trap's first focusable element, potentially interrupting a user mid-interaction (e.g. typing). Fixed by reading `onEscape` through a ref updated every render, with the effect itself depending only on `[active]`.
6. **Still open**: the "Weekly Insights" → Insights & Analytics accordion-section mapping (Pre-flight Decision 2) was implemented on the stated working assumption, unconfirmed. If wrong, the fix is a one-line addition of a fourth wrap point once the actual target is identified — not a structural problem.

---

## Pre-flight Decisions — Implemented

### Decision 1 — `SectionHeader` canonical, `CardLabel` a compact variant

Implemented in `components/ui/SectionHeader.tsx`: doc comments rewritten so `SectionHeader` is presented as the component to reach for by default, and `CardLabel` is reframed from "legacy alias" to an intentional compact eyebrow-only variant for cards that don't need a full title row. **No call sites were migrated** — this was a documentation-only change in Batch 1, deliberately, to avoid touching the 25 existing `CardLabel` consumers (all outside Batch 1's scope; those files get visited properly in Batches 3/5/6 and can pick `SectionHeader` or keep `CardLabel` per-card as appropriate at that point).

### Decision 2 — `ErrorBoundary` wraps major feature surfaces only

Implemented — three wrap points, not per-card:

| Surface | Implementation |
|---|---|
| Dashboard sections | `components/dashboard/AccordionSection.tsx` now wraps its lazily-mounted `children` in `<ErrorBoundary label={`dashboard-section:${id}`}>`. Since every Layer 2/3 dashboard section renders through this one component, this single edit gives every accordion section its own crash boundary without touching `app/dashboard/page.tsx`'s ~89 individual card call sites. |
| Workout experience | `components/dashboard/WorkoutCard.tsx`'s full return (covering idle/active/done modes and the rest-timer overlay) wrapped in `<ErrorBoundary label="workout-experience">`. |
| Body Intelligence | `components/body/BodyIntelligenceViewer.tsx`'s full return (3D canvas, side panels, mobile bottom sheet) wrapped in `<ErrorBoundary label="body-intelligence">`. |
| Weekly Insights | **Not given a separate boundary** — implemented on the working assumption that this refers to the "Insights & Analytics" accordion section, which is already covered by the dashboard-sections wrap point above. **Unconfirmed — flagged in Known Issues.** |

As a prerequisite for wiring this component up for real (it previously had zero call sites, so its fallback UI had never actually been seen by a user), fixed `components/resilience/ErrorBoundary.tsx`'s fallback markup, which was written against stale/undefined class names (`bg-ui-surface`, `border-ui-border`, `text-ink-base`, `bg-orange-900/20`, `text-orange-400`, `text-canvas` used incorrectly as a text color) that don't exist in the current token system — meaning the fallback would have rendered essentially unstyled the first time a real crash hit it. Replaced with real tokens (`bg-surface`, `border-border`, `text-ink`, `bg-caution-bg`/`text-caution`) and adopted the new `Button` component for its action, plus added `role="alert"`/`aria-live="polite"` to match the accessibility pattern already established in `GlobalErrorBoundary`'s fallback (`AxisDesignSystem.md` §10).

---

## New primitives reference (Batch 1)

| File | Exports | Notes |
|---|---|---|
| `components/ui/useFocusTrap.ts` | `useFocusTrap` | Tab-cycle trap + Escape handling + focus restore. Used by `Dialog` and `Sheet`. |
| `components/ui/VisuallyHidden.tsx` | `VisuallyHidden` | Thin wrapper over Tailwind's `sr-only`. |
| `components/ui/Dialog.tsx` | `Dialog`, `DialogSize` | Centered modal, portaled, focus-trapped, scroll-locks body while open. |
| `components/ui/Sheet.tsx` | `Sheet`, `SheetSide` | Slide-in panel (`right` or `bottom`), same focus-trap behavior as `Dialog`. |
| `components/ui/Toast.tsx` | `ToastProvider`, `useToast`, `ToastVariant` | Requires mounting `<ToastProvider>` — not yet mounted anywhere app-wide; that lands in Batch 4 alongside the settings-page toast migration. |
| `components/ui/Tabs.tsx` | `Tabs`, `TabPanel`, `TabItem` | Roving-tabindex tab list with arrow-key nav; controlled, consumer owns `activeId`. |
| `components/ui/Select.tsx` | `Select`, `SelectOption` | Styled wrapper over native `<select>` — deliberately not a hand-rolled listbox (no new dependency, full native a11y). |

All exported from the `components/ui` barrel (`components/ui/index.ts`).

**QA surface**: `/dev` → "Design System" tab (`components/dev/DesignSystemShowcase.tsx`) exercises all of the above. Kept mounted permanently as a living component gallery rather than deleted after this batch — cheap regression check for future batches.

---

## Notes for Batch 3 kickoff

- Browser QA tooling remains flaky at the *server-restart* level (gstack's browse server crashed and auto-restarted twice mid-session during Batch 2, unrelated to app code) but was recoverable every time by re-running the command — not a blocker, just expect an occasional retry.
- Batch 3 scope per `DS2ImplementationPlan.md`: migrate the 8 Layer-1 "always visible" dashboard cards (`DailyCheckIn`, `DailyStatus`, `TrainingCard`, `SafetyConstraintBanner`, `ConfidenceBadge`, `WorkoutCard`, `TodayHighlights`, `BodyStatusCard`) to tokens/`components/ui/` primitives, one commit per component. This is the highest-traffic surface in the app — treat with the same care as onboarding, but note it's rated Medium-High risk in the plan (small file count, but live user data on every visit).
- `WorkoutCard.tsx` already got a light touch in Batch 1 (ErrorBoundary wrap only, styling untouched) — Batch 3 will do its full token migration; don't be surprised the file already has one recent edit in git history.
- Three known button treatments now exist in the app (`Button primary`, `Button dark+pill`, `ProfileSummary`'s glow CTA) and a fourth-treatment temptation will arise the moment Batch 3 touches any dashboard card with its own CTA — resist consolidating on sight; that's DS-3 territory per the DS-2 rules, this batch is styling-in-place only.
