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
| 3 — Dashboard Layer 1 | ✅ Complete (with one scoped gap — see below) |
| 4 — Navigation + overlays | ✅ Complete |
| 5 — Dashboard Layer 2 (accordion sections) | ✅ Complete |
| 6 — Dashboard Layer 3 ("Axis Intelligence") | ⏳ Not started |
| 7 — Icon system | ⏳ Not started |

**Compliance headline — re-measured after Batch 5** (same methodology as `DS2Baseline.md`, app-wide across `components/`+`app/`). The file count itself grew from 195 → 202 `.tsx` files between Batch 3 and Batch 5 (ordinary feature work landing on the branch in parallel, not a migration artifact) — percentages below are recomputed against the current 202 for Batch 5's column rather than left stale against the old denominator:

| Metric | Baseline (Batch 0) | After Batch 2 | After Batch 3 | After Batch 5 |
|---|---|---|---|---|
| Fully compliant files | 15 (7.7%) | 22 (11.3%) | 22 (11.3%) | **22 (10.9% of 202) — see note below** |
| Files using ≥1 token color class | 49 (25%) | 62 (32%) | 68 (35%) | **121 (60% of 202)** |
| Files with ≥1 hardcoded hex | 133 (68%) | 127 (65%) | 122 (63%) | **73 (36% of 202)** |
| Total hardcoded hex occurrences | 3,500 | 3,227 | 3,049 | **1,755** |

Batch 5 alone replaced **~1,270 hardcoded hex occurrences across 50 files** with token classes — by a wide margin the largest single-batch reduction of the whole DS-2 effort so far. "Fully compliant files" still doesn't move (same reason as Batch 3: it also requires zero arbitrary `text-[Npx]` sizing, which this batch — a color-only pass, per scope — didn't touch), but every other metric moved sharply.

**Why "fully compliant files" didn't move in Batch 3** despite real progress: that metric requires *zero* hardcoded hex **and** zero arbitrary `text-[Npx]` sizing **and** zero raw Tailwind palette classes. Batch 3 fully eliminated hardcoded hex from all 8 Layer-1 files (their color-token adoption is complete), but did not convert their arbitrary pixel font sizes (`text-[11px]`, `text-[13px]`, etc.) to the `.type-*` semantic scale — that's the typography-migration effort flagged in `DS2Baseline.md` as the single largest compliance gap in the app (154 files, 1,451 occurrences), and doing it properly for 8 files in the middle of a color-migration batch risked scope creep into a second, much larger unplanned effort. Color-token adoption (the metric that actually moved) is the more consequential of the two per the baseline's own analysis.

## Current Batch

**Batch 5 — Dashboard Layer 2 accordion sections: complete.** Migrated all 9 Layer-2 `AccordionSection`s (Recovery, Cycle Intelligence, Nutrition, Progress & Performance, Athlete Development, Training Plan, Performance Tracking, Insights & Analytics, Lifestyle & Adherence — 50 card files, ~61 individual card components, 793+477 pre-migration hex occurrences) from hardcoded hex to design tokens, per the plan's sequencing rule (smallest section first, Recovery last regardless of its card count). Category vocabulary (`optimal/ready/moderate/cautious/recover`, `Ahead/On Track/Behind/Stalled`, etc.) was left completely untouched — only the *colors* backing each category changed, never the categories themselves. See "Batch 5 details" below for the migration methodology, the three deliberate categorical-color exceptions, and the scoped gaps (Card/Button componentization, EmptyState rollout) carried forward from Batch 3's precedent at a larger scale.

**Next up:** Batch 6 (Dashboard Layer 3 "Axis Intelligence") — awaiting review sign-off before starting.

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
| 3 | `refactor: migrate Confidence Engine color helpers to design tokens` | `lib/intelligence/confidence/ConfidenceEngine.ts` |
| 3 | `refactor: migrate DailyCheckIn and DailyStatus to design tokens` | `components/dashboard/DailyCheckIn.tsx`, `components/dashboard/DailyStatus.tsx` |
| 3 | `refactor: migrate SafetyConstraintBanner to design tokens` | `components/intelligence/SafetyConstraintBanner.tsx` |
| 3 | `refactor: migrate TrainingCard (RecommendationCards.tsx) to design tokens` | `components/dashboard/RecommendationCards.tsx` |
| 3 | `refactor: migrate WorkoutCard to design tokens` | `components/dashboard/WorkoutCard.tsx` |
| 3 | `refactor: migrate TodayHighlights and BodyStatusCard to design tokens, add EmptyState` | `components/dashboard/TodayHighlights.tsx`, `components/dashboard/BodyStatusCard.tsx` |
| 3 | `docs: update DS2Progress.md — Batch 3 complete` | `docs/design/DS2Progress.md` |
| 4 | `refactor(ui): extend DashboardShell (fullBleed/hideMobileNav) to /body /exercises /profile /settings, migrate settings toast to shared Toast` | `components/dashboard/DashboardShell.tsx`, `components/ui/Toast.tsx`, `app/body/page.tsx`, `app/exercises/page.tsx`, `app/profile/page.tsx`, `app/settings/page.tsx` |
| 4 | `refactor(ui): migrate BodyIntelligenceViewer overlay to shared Sheet component` | `components/ui/Sheet.tsx`, `components/body/BodyIntelligenceViewer.tsx` |
| 4 | `docs: update DS2Progress.md — Batch 4 complete` | `docs/design/DS2Progress.md` |
| 5 | `refactor: adopt design system for Batch 5 dashboard Layer 2 accordion sections` | 50 files across `components/dashboard/`, `components/intelligence/`, `components/insights/`, `components/athlete/`, plus `docs/design/DS2Progress.md` — single commit per this batch's instructions (contrast with Batches 1–4's per-concern granularity) |

(Hashes are reported per-batch in the end-of-batch report rather than embedded here. Run `git log --oneline -- docs/design/ components/ui/ components/resilience/ErrorBoundary.tsx components/onboarding/ components/dashboard/ components/intelligence/ lib/intelligence/` for the authoritative record.)

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

## Verification Status (Batch 3)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 323/323 passing, 6 files (unchanged) |
| Dev server launches | ✅ Confirmed clean startup |
| Automated browser QA (gstack) | ✅ Full walkthrough — see "Batch 3 details" below |
| Console errors | ✅ none, across the whole dashboard QA session |
| git status clean of unrelated changes | ✅ Confirmed |

## Batch 3 details

### `ConfidenceBadge`'s color logic lived one layer up — migrated `ConfidenceEngine.ts`, not the component

`ConfidenceBadge.tsx` itself has zero hardcoded styling; it delegates to `getConfidenceLevelColor`/`getConfidenceLevelBg`/`getConfidenceLevelBorder` in `lib/intelligence/confidence/ConfidenceEngine.ts`. Those returned raw Tailwind palette classes across 5 confidence levels (`text-green-400`, `text-yellow-400`, `text-orange-400`, `text-red-400`, plus `bg-green-900/20`-style dark-theme translucent overlays with no light-mode equivalent — already a latent bug in this light-mode-only app). Consolidated onto the real 4-step semantic scale (success/brand/caution/danger); **Building and Limited now both map to `caution`**, since the original yellow/orange split was never a deliberate design-system distinction — just two adjacent off-the-shelf Tailwind swatches. Documented in the source as a judgment call, not asserted silently. Confirmed via browser QA: renders as "● Limited Confidence" with a correct caution-colored dot.

### The stale/broken token-family bug (found in `ErrorBoundary.tsx` and `/dev` during Batch 1) recurred in `SafetyConstraintBanner.tsx`

Same pattern as Batch 1's finding: `bg-ui-surface`, `border-ui-border`, `text-ink-base`, `text-ink-subtle` — none of these are real Tailwind utilities under the current token system (they don't match any `@theme` key), so they were generating no styling at all. Replaced with the real tokens (`bg-surface`, `border-border`, `text-ink`, `text-ink-secondary`). This is now confirmed as a recurring pattern across at least 3 files (`components/dev/`, `components/resilience/`, `components/intelligence/`) — worth a repo-wide grep for `-ui-surface|-ui-border|ink-base|ink-subtle` before closing out DS-2, in case it recurs elsewhere in Batches 4–6.

### `TrainingCard` lives inside a shared file with two out-of-scope siblings

`components/dashboard/RecommendationCards.tsx` defines `TrainingCard` (Layer 1, in scope), `NutritionCard`, and `RecoveryCard` (both Layer 2, out of scope until Batch 5). Migrated `TrainingCard` plus the genuinely shared helpers at the top of the file (`CardLabel`, `ListItem`, `PillTag`, `BADGE_CONFIG` — all `TrainingCard`-only or shared-but-harmless to migrate now) to tokens; left `NutritionCard`'s and `RecoveryCard`'s own top-level container styling (their independent hex) untouched for Batch 5, as originally scoped. `NutritionCard`/`RecoveryCard` incidentally benefit from the shared-helper migration (free, zero-risk win) without being fully migrated themselves.

### `EmptyState` rollout: `BodyStatusCard` only

Of the 8 files, only `BodyStatusCard` had a genuine "no data yet" silent-null case (`if (!snapshot) return null`) — replaced with a `Card`-chrome-wrapped `EmptyState` ("Body Intelligence not started yet"). `DailyCheckIn` and `TodayHighlights` also have early-return/conditional-render patterns, but neither is a "hidden feature" case: `DailyCheckIn` always renders *something* (compact state or the form, never nothing), and `TodayHighlights` returning nothing when there's genuinely no noteworthy insight is correct, intentional behavior, not a bug — added no `EmptyState` to either, to avoid manufacturing noise where the current silence is actually the right call.

### Scoped gap: did not swap hand-rolled card containers onto `<Card>`

`DS2ImplementationPlan.md`'s Batch 3 text said "hand-rolled card container/buttons → Card/Button." Evaluated this for all 8 files and **deliberately did not do it**: `<Card>` applies a uniform `space-y-4` between children, but every one of these 8 files has its own specific internal spacing (`mb-3`, `mb-4`, per-child margins) that doesn't map cleanly onto a uniform gap — swapping would have meant reworking each file's internal spacing to match Card's model, which is a real risk of introducing spacing regressions I couldn't fully verify pixel-for-pixel, not a mechanical rename. Given the explicit instruction to prioritize low regression risk over completeness, chose to keep the hand-rolled `<div className="bg-surface rounded-2xl border border-border shadow-card p-5">` structure — now fully token-compliant, just not componentized. This is a real, acknowledged gap against the plan's literal text, not a silent omission. Flagged for a dedicated future pass (possibly worth a `Card` API addition — e.g. an `unstyled`/no-default-gap variant — rather than reworking 8+ files' internal spacing by hand).

### Full dashboard browser QA

Lost the Batch 2 QA session's onboarding-completed state (gstack's browser server had crashed/restarted between sessions), so re-completed onboarding to reach real dashboard data rather than test against a redirect-to-onboarding empty state. With real data:

| Area | Result |
|---|---|
| `DailyCheckIn` — sleep-quality selection state, enabled/disabled Next button | ✅ correct brand-tinted selected state, correct disabled→enabled transition |
| `DailyCheckIn` — stress slider (step 2) | ✅ brand-purple fill/thumb |
| `DailyCheckIn` — symptom severity rows, all 3 active tiers (Mild/Mod/Sev) | ✅ Mild renders brand-tinted, Mod/Sev both render caution-tinted (matches the intentional 4-tier consolidation) |
| `DailyCheckIn` — compact "already checked in" state | **Not directly observed** — `app/dashboard/page.tsx` wraps `DailyCheckIn` in `{!checkinComplete && (...)}`, which removes the component from the tree entirely once checked in, so `DailyCheckIn.tsx`'s own compact-state branch never gets a chance to render on the live dashboard (pre-existing behavior, not something this batch touched or should fix — a "no logic changes" boundary). Verified via code review only: the migration is a straightforward class substitution identical in pattern to the surrounding code that *was* visually confirmed elsewhere the same session. |
| `DailyStatus` tiles (Readiness/Recovery/Phase) | ✅ correct brand/success/brand-bg-mid tile colors, live-recalculated after check-in submission (84→75) |
| `TrainingCard` | ✅ "Peak Performance" card, "MAINTAIN" badge, serif headline, caution-tinted avoid-note box |
| `SafetyConstraintBanner` | **Not triggered** by the seeded data (`safetyResult` was falsy) — not independently screenshotted. Verified via code review only, same reasoning as the `DailyCheckIn` compact state above. |
| `ConfidenceBadge` | ✅ "● Limited Confidence" with correct caution dot |
| `WorkoutCard` (idle state via `WorkoutHeroView`) | ✅ renders correctly (environment tabs, workout summary, "Start Workout" CTA) — note `WorkoutHeroView.tsx` itself is a separate file, not migrated this batch, its correct appearance here is incidental |
| `TodayHighlights` | ✅ success-toned insight box rendered correctly |
| `BodyStatusCard` (populated state) | ✅ silhouette, status chips, "Today's Targets" pills all correct — did not observe the new `EmptyState` branch live (would require a snapshot-less profile) but it uses the same `EmptyState` + `Card`-chrome pattern already confirmed working in Batch 1's `/dev` showcase |
| Console errors, entire session | ✅ none |

## Verification Status (Batch 4)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 323/323 passing, 6 files (unchanged) |
| Dev server launches | ✅ Confirmed clean startup |
| `/dashboard`, `/body`, `/exercises`, `/profile`, `/settings` return HTTP 200 | ✅ Confirmed via direct request |
| Automated browser QA (gstack) | ⚠️ Partial — see "Batch 4 details" below |
| Console errors (routes actually reached) | ✅ none (pre-existing THREE.js/WebGL deprecation warnings only, unrelated to this batch) |
| git status clean of unrelated changes | ✅ Confirmed |

## Batch 4 details

### `DashboardShell` needed two new opt-in props, not just new consumers

`DashboardShell` was built in earlier batches for `/dashboard` alone, which assumes a `max-w-2xl` centered scrolling column and always wants the mobile bottom tab bar. Neither assumption holds for `/body`:

- **`fullBleed`** — Body Intelligence owns a full-height, full-width WebGL canvas layout with its own internal scroll regions (side panels, mobile bottom sheet). Forcing it into `max-w-2xl mx-auto pb-20` would have broken the 3D viewport. `fullBleed` swaps the shell to `h-screen overflow-hidden flex flex-col` and drops the max-width/padding constraint on `<main>`, while the top nav bar itself is unchanged (still full-width via the same conditional).
- **`hideMobileNav`** — Body Intelligence has its own bottom-anchored mobile layer-picker pill bar (`MobilePillBar`). Stacking the shared mobile tab bar underneath it would collide. `hideMobileNav` skips rendering the shared bottom tab bar entirely for that one route.

Both default to `false`/off, so `/exercises`, `/profile`, and `/settings` get the exact same shell behavior `/dashboard` already had — no behavior change for those three beyond the header swap itself.

### `/profile`'s sticky save bar had to move up to clear the new mobile tab bar

`/profile` didn't have a mobile bottom tab bar before (bespoke header, no shell). Its `fixed bottom-0` save button bar would now sit directly underneath — and get covered by — `DashboardShell`'s mobile tab bar on small screens. Changed to `bottom-14 sm:bottom-0` (14 = the shell's tab bar height) so the save bar clears it on mobile but sits flush on desktop, where the tab bar is `sm:hidden` anyway. Also bumped the scroll content's bottom padding (`pb-32` → `pb-40`) so the last section isn't hidden behind the now-taller stack of (save bar + tab bar) on mobile.

### Settings toast migration was a straight swap, not a redesign

`app/settings/page.tsx`'s original toast was local `useState<string|null>` + `setTimeout`, single-toast-at-a-time, fixed bottom-center pill. Replaced with `ToastProvider` wrapping the page and `useToast().show(msg)` at each of the existing call sites — same call-site shape (`showToast("message")`), so no logic changes at the 4-5 call sites themselves, only the declaration and rendering mechanism. `ToastProvider` needed a real mount point since Batch 1 built it with zero production consumers; this is that first consumer.

### `Sheet` gained three new props to fit `BodyIntelligenceViewer`'s exact prior behavior

The hand-rolled `BottomSheet` it replaced had three behaviors `Sheet` didn't yet support, all added as opt-in props defaulting to the shape `Sheet`'s existing consumers already expect (no change for `Dialog`/other `Sheet` call sites):

- `showHandle` — the drag-handle bar (`w-10 h-1 rounded-full`) `BottomSheet` always rendered above its content; `Sheet` had no title-less "just a handle" mode.
- `bodyPadding` (default `true`, set `false` here) — `BottomSheet` didn't pad its content (`RegionDetailsPanel` manages its own internal spacing); `Sheet`'s default `p-5` would have double-padded it.
- `wrapperClassName` — `BottomSheet` was `lg:hidden` on the *whole thing including the backdrop*, not just visually hidden above that breakpoint. `Sheet` had no way to conditionally not-exist above a breakpoint without also hiding a `Dialog`-style backdrop unconditionally, so added a wrapper-level className hook.

Wiring is otherwise a direct swap: `isOpen={!!selectedId}` / `onClose={onDeselect}` map onto the same state `BottomSheet` used (`isOpen`/`onDismiss`), and `RegionDetailsPanel`'s own `onDeselect` prop is untouched — it was never coupled to the sheet implementation.

### Tooling limitation: could not automate the keyboard focus-trap check on `/body`'s sheet

Per the plan's Batch 4 verification note, the sheet migration is "the one place in the whole plan introducing genuinely new interactive behavior" and calls for a dedicated keyboard-only pass (Tab-containment, Escape-closes). Confirmed nav consistency (identical `DashboardShell` nav tree via `snapshot` on `/body`, `/exercises`, `/settings`) and the settings toast (fired, rendered with `role="status"`, correct token styling — screenshot-verified) via `gstack` successfully. But triggering the sheet itself requires clicking a body region on the WebGL canvas, and every attempt to dispatch a synthetic `PointerEvent` at the canvas crashed gstack's headless Chromium server outright (not a timeout — the server process died and had to restart, losing page state each time; reproduced 3 times). The `GL Driver Message ... GPU stall due to ReadPixels` warnings already present in this environment's console output (visible on every WebGL page load, pre-existing, unrelated to this diff) point to a headless GPU/driver instability specific to this machine, not a regression from this batch — the same instability class `DS2Progress.md`'s "Notes for Batch 4 kickoff" already flagged as recurring at the *server-restart* level.

**Given that, the focus-trap/Escape check was verified by code review instead:** `Sheet`'s `useFocusTrap` integration (the hook itself, its Tab-cycle/Escape/focus-restore logic) was already exercised end-to-end via real browser interaction in Batch 1's QA pass against the `/dev` Design System showcase — same hook, same component, unmodified in this batch. `BodyIntelligenceViewer`'s change is purely a consumer swap (`BottomSheet` → `Sheet` with the props above); the trigger condition (`isOpen={!!selectedId}`) and dismiss path (`onClose={onDeselect}`) are identical to what `BottomSheet` used, and `RegionDetailsPanel`'s internal close button already calls the same `onDeselect` prop it always has. No new logic sits between the click-to-select interaction and the sheet open state. Flagged here as a real gap against the plan's literal verification instruction, not a silent skip — worth a manual (non-automated) keyboard pass in a real browser before considering DS-2 fully closed out, since headless WebGL instability makes this specific check unautomatable in this environment as currently configured.

## Verification Status (Batch 5)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 323/323 passing, 6 files (unchanged) |
| Dev server launches | ✅ Confirmed clean startup |
| `/dashboard` returns HTTP 200 | ✅ Confirmed via direct request |
| Stale `-ui-surface`/`-ui-border`/`ink-base`/`ink-subtle` token family | ✅ Zero matches across all 50 touched files |
| Automated browser QA (gstack) | ✅ Full walkthrough — see "Batch 5 details" below |
| Console errors across entire session (onboarding + all 9 sections expanded) | ✅ none |
| git status clean of unrelated changes | ✅ Confirmed |

## Batch 5 details

### Scale required a systematic approach, not a file-by-file manual pass

Batches 1–4 topped out at 8 files in a single batch. Batch 5 is 50 files and ~1,270 hardcoded hex occurrences — doing each one by hand at Batch 3's pace was not tractable in a single pass. Instead:

1. Extracted the actual token table from `app/globals.css`'s `@theme` block (the source of truth) and cross-referenced every distinct hex value found across the 50 files against it.
2. The vast majority of occurrences turned out to be either **exact** matches to an existing token (e.g. `#9B9690` → `ink-muted`, 225 occurrences alone) or **near-exact** matches (off by a few points in one RGB channel — e.g. `#C0392B` vs. the real `danger` token `#C0390B`, a popular "flat-UI-colors" red that several files had independently reached for instead of the app's own token). This is exactly the kind of hex-drift the Design System Audit describes: multiple components inventing their own near-identical swatch for the same concept instead of sharing one.
3. Built a verified hex→token lookup table and applied it mechanically across all 50 files via a script (Tailwind arbitrary-value classes like `text-[#HEX]`, `bg-[#HEX]`, `border-[#HEX]`, `ring-[#HEX]`, gradient stops, etc.) — this handled **1,143 of the ~1,270 occurrences** in the first pass alone.
4. The remaining stragglers were resolved individually by hand, then re-run through the same script until zero unmapped Tailwind-class hex remained.
5. A separate pass covered hex embedded in **inline JS color-map objects** (`{ color: "#1A7A3E", label: "Building" }`-style status scales feeding `style={{ backgroundColor: ... }}`) that the class-name script couldn't reach — these were migrated to import `color`/`statusColors` from `lib/design/tokens.ts` (the TS mirror built for exactly this use case, and the same pattern Batch 2 established for `ProfileSummary.tsx`'s `weightColors`).

Every near-match substitution is a judgment call in the same spirit as Batch 2's `#8A8880` → `ink-muted` precedent: pick the closest real token rather than inventing a new one for a value that's clearly drift, not a deliberate distinct color.

### Three deliberate exceptions — categorical identity colors, not status colors, left unmapped

Not everything is a status scale. Three places use color to *distinguish between categories* (each category needs its own recognizable hue) rather than to *judge* good/bad — forcing these onto the 4-step success/caution/danger/brand semantic ramp would be a real behavior change (colors colliding or implying a value judgment that isn't there), not adoption:

- **`PhaseCard.tsx`'s "Late Luteal" phase** (`accent: "#6B4F8C"`, `bg-[#F5F0FA]`, `border-[#C9AEDC]`, `text-[#4A2E70]`) — the other 4 cycle phases (Menstrual/Follicular/Ovulatory/Luteal) happened to already match real tokens (danger/brand/success/caution respectively) almost exactly, and are now token-driven via `lib/design/tokens.ts`'s `color` export instead of hardcoded hex. "Late Luteal" has no 5th matching token, and mapping it onto an existing one (e.g. reusing `brand` from Follicular) would make two different cycle phases visually indistinguishable — a real functional regression for a feature whose whole point is phase-at-a-glance color coding. Left as documented hex, with a code comment explaining why.
- **`NutritionIntelligenceCard.tsx`'s `MacroBar` colors** (6 distinct hues for Calories/Protein/Carbs/Fats/Hydration/Fiber) — a categorical chart legend, not a status judgment. Some of the 6 hex values happen to numerically resemble `brand`/`success`/`caution`/`danger`, but using those tokens here would incorrectly imply "Fats = danger" (bad) and "Protein = success" (good), which isn't the intended meaning — it's just each macro's assigned legend color. Left as-is with a code comment; this is squarely `DS-6` (shared chart/categorical-palette) territory, not a DS-2 gap.
- **`lib/periodization/goalProfiles.ts`'s `PHASE_COLORS`** (accumulation/intensification/peak/deload, consumed by `PeriodizationCard.tsx`) — same reasoning, a 4-way categorical badge palette for training-block phases, left untouched. Only the two `?? "#9B9690"`/`?? "#534AB7"` *fallback* defaults in `PeriodizationCard.tsx` (used when a phase key doesn't match) were tokenized, since those aren't part of the categorical set itself.

One additional resolved-in-place case: `CycleIntelligenceCard.tsx` had a tan `#C8B89A` used for an eyebrow label and a bullet dot, while its sibling `CardLabel` helper in the same file used `text-ink-muted` for what is visibly the same "eyebrow label" role. Concluded this was drift, not an intentional third label treatment, and consolidated it onto `ink-muted` (documented judgment call, same category as the `CardLabel`/`SectionHeader` type of near-duplicate resolution).

### `RecommendationCards.tsx`'s `RecoveryCard` incidentally migrated — the mirror image of Batch 3's note

Batch 3 migrated `TrainingCard` in this shared file and explicitly left `NutritionCard`/`RecoveryCard`'s own container styling untouched (out of scope at the time). This batch's scope includes `NutritionCard` (Nutrition section) but `RecoveryCard` is Layer 3 (Batch 6). Since the token-migration script operates on the whole file rather than cherry-picking JSX blocks, `RecoveryCard`'s hex incidentally got migrated too — free, zero-risk (same exact/near-match tokens, no restructuring), consistent with Batch 3's own precedent of accepting incidental migration of an out-of-scope sibling in a shared file. `RecoveryCard`'s Card/Button componentization and any Layer-3-specific gaps remain fully deferred to Batch 6.

### Scoped gaps carried forward from Batch 3, at 50-file scale

Both of Batch 3's documented judgment calls apply here too, now across a much larger file set:

- **Card/Button componentization**: not done, for the same reason as Batch 3 — every one of these 50 files has its own bespoke internal spacing that doesn't map cleanly onto `<Card>`'s uniform `space-y-4`, and forcing it risks spacing regressions across 50 files that would be expensive to verify pixel-for-pixel. Color-token adoption (the metric that actually moved this batch) was prioritized over componentization, per the same reasoning Batch 3 used.
- **`EmptyState` rollout**: not done in bulk. 37 of the 50 files have a `return null` (or equivalent silent) branch for missing data. Unlike Batch 3's 8 files (where exactly one, `BodyStatusCard`, was a genuine "hidden feature" case), these 50 files sit inside dense accordion sections where several cards can simultaneously be in a "not enough data yet" state for a new user — during QA, most of these already surface an inline explanatory sentence ("No workout data yet. Start logging sessions to track training quality.", "Track 3 more sessions to see your goal progress.") rather than vanishing silently, which is a reasonable low-noise pattern already in place. Wrapping all 37 in the full `EmptyState` component would risk turning a newly-onboarded user's expanded accordion section into a wall of repeated empty-state cards — a real UX/IA call that belongs to product judgment, not a styling pass. Flagged here as a real, acknowledged gap rather than silently skipped; a follow-up pass should decide section-by-section (not file-by-file) whether the existing inline messages are sufficient or warrant the full component.

### Full dashboard browser QA

Completed onboarding fresh (fillable date field for last-period-start, equipment preset selection) to reach real dashboard data, then expanded all 9 Layer-2 sections simultaneously and screenshotted representative cards from each:

| Section | Result |
|---|---|
| Recovery (10 cards, incl. hand-edited `PersonalRecoveryCard` status maps) | ✅ "Your Personal Recovery Profile" — success-tinted header, brand-purple "STABLE" pill, mint 7-day outlook tiles, all colors correct |
| Cycle Intelligence (9 cards, incl. hand-edited `PhaseCard`) | ✅ "Ovulatory" phase card — success-green ring/bar/text throughout, matches the phase's semantic color exactly |
| Nutrition (4 cards, incl. hand-edited `NutritionIntelligenceCard`) | ✅ `FuelingCard`'s success/neutral/danger-tinted pills all correct; `NutritionCard`'s serif headline + success-tinted nutrient pills correct |
| Progress & Performance (10 cards) | ✅ Caution-tinted "Adjustments" box, orange-fill milestone progress bar, all new-user empty-state messages render legibly |
| Athlete Development (6 cards) | ✅ Brand-tinted "Learning…" pills, "Maintain" badge in brand-purple, empty stat tiles clean |
| Training Plan (9 cards, incl. hand-edited `PeriodizationCard`) | ✅ Categorical "ACCUMULATION"/"INTENSIFICATION" badges (left as designed, untouched) render distinctly from the now-tokenized "Neutral"/"On Track" status badges alongside them — confirms the categorical-vs-status distinction actually reads correctly in the live UI, not just in theory |
| Performance Tracking (4 cards) | ✅ Success-tinted "Opportunity detected" callout, green readiness-forecast pills |
| Insights & Analytics (3 cards) | ✅ All 3 render their existing inline empty-state text cleanly (new-user state, no data yet) |
| Lifestyle & Adherence (6 cards, incl. hand-edited `AdherenceCard`) | ✅ Danger-red "At Risk" ring + text, success-green "Risk: Low" text, correctly distinct |
| Keyboard focus (Tab through nav) | ✅ Visible brand-purple focus ring on nav icons — confirms Batch 5's pure color-only changes didn't disturb existing focus/keyboard behavior (expected, since no interactive elements or event handlers were touched, only className/color-prop values) |
| Console errors, entire session (onboarding + full dashboard + all 9 sections expanded) | ✅ none |

## Remaining Work

Everything in `DS2ImplementationPlan.md` Batches 6–7, plus the acknowledged Card/Button-componentization gap (Batch 3, now also Batch 5) and the `EmptyState` rollout gap (Batch 5) if either gets picked up as a follow-up, plus the manual (non-headless) keyboard QA pass on the Body Intelligence sheet flagged in Batch 4. The three categorical-color exceptions (PhaseCard's Late Luteal, MacroBar, PeriodizationCard's PHASE_COLORS) are candidates for a future shared categorical-palette token (DS-6), not a DS-2 gap.

## Known Issues

1. **Border-radius naming collision** (from Batch 0) — unresolved, unchanged. See `DS2Baseline.md` → "Border Radius."
2. **`#8A8880`** (onboarding) — **resolved in Batch 2**: mapped to `text-ink-muted` (closer numeric/semantic match than `ink-secondary`), applied consistently across all 7 onboarding files.
2b. **New, found in Batch 2**: `text-[#D3D1C7]` in `ProfileSummary.tsx`'s dark "what happens next" block — light text on a dark surface, and this app has **no on-dark-surface text token scale at all** (confirmed: no dark-mode tokens exist per Batch 0/DS-1 findings). Left as a documented, scoped hex exception rather than forcing a poor-fit light-mode token. Real fix is a dark-surface text scale, which belongs to dark-mode work (DS-7), not this batch.
2c. **New, found in Batch 2**: a third pill-button treatment exists (`ProfileSummary.tsx`'s "Go to my dashboard" CTA — brand-purple glow, distinct from both `Button`'s `primary` and the new `dark`+`pill` combo). Tokenized in place, **not consolidated onto `Button`** — that's a consolidation decision (DS-3/DS-6 territory per DS-2 rules), not this batch's job. Now three known button treatments in the app: `Button primary`, `Button dark+pill` (onboarding steps), and this one (profile-summary completion CTA).
2d. **New, found in Batch 2**: the brand-purple "glow" shadow family (`rgba(83,74,183,0.3)` etc., ~10+ occurrences per `DS2Baseline.md`) still has no token — confirmed present in `ProfileSummary.tsx`'s final CTA, left as-is (not tokenized) since inventing a new global shadow token is a small but real design decision outside pure adoption scope. Candidate for a future token if DS-6 or a dedicated token-expansion review picks it up.
2e. **New, found in Batch 3**: the `bg-ui-surface`/`border-ui-border`/`text-ink-base`/`text-ink-subtle` stale token family has now been found and fixed in 3 files (`ErrorBoundary.tsx`, `SafetyConstraintBanner.tsx`, and it's still present, unfixed, in `app/dev/page.tsx` — that one was explicitly out of scope in Batch 1 and remains out of scope, low-priority since it's dev-tooling-only, not user-facing).
2f. **New, found in Batch 3**: `<Card>` component's uniform `space-y-4` doesn't fit these 8 files' bespoke internal spacing — Card/Button componentization deliberately deferred for this batch (see "Batch 3 details"), color-token migration completed instead.
3. **Fixed in Batch 1**: `VisuallyHidden`'s initial implementation (`<Tag className=... >{children}</Tag>` with a dynamic `ElementType`) failed `tsc` — TypeScript couldn't reconcile the polymorphic tag's children type. Fixed by using `createElement` directly instead of JSX for the dynamic-tag case.
4. **Fixed in Batch 1 (real bug, caught by manual review, not tooling)**: `Sheet.tsx` always renders its children (needed for the slide-in/out transition) and only marked the closed state via `aria-hidden` + a CSS transform pushing it off-screen. `aria-hidden` alone doesn't reliably stop keyboard focus from reaching off-screen content in every browser. Fixed by adding `inert={!isOpen}` (React 19 passes this through natively) so closed-sheet content is genuinely unfocusable, not just visually hidden.
5. **Fixed in Batch 1 (real bug, caught by manual review, not tooling)**: `useFocusTrap`'s effect originally depended on `[active, onEscape, initialFocus]`. Since `onEscape` is normally an inline arrow function from the caller (e.g. `onClose={() => setDialogOpen(false)}`), its identity changes on every render of the parent — meaning *any* unrelated re-render of the parent while a Dialog/Sheet was open would re-run the effect, re-capture "previously focused element," and yank focus back to the trap's first focusable element, potentially interrupting a user mid-interaction (e.g. typing). Fixed by reading `onEscape` through a ref updated every render, with the effect itself depending only on `[active]`.
6. **Still open**: the "Weekly Insights" → Insights & Analytics accordion-section mapping (Pre-flight Decision 2) was implemented on the stated working assumption, unconfirmed. If wrong, the fix is a one-line addition of a fourth wrap point once the actual target is identified — not a structural problem.
7. **New, found and resolved in Batch 5**: `CycleIntelligenceCard.tsx` had a tan `#C8B89A` used for its `SectionHeading` eyebrow label and a bullet dot, while the same file's `CardLabel` helper — visibly the same "eyebrow label" role — used `text-ink-muted`. Concluded this was drift rather than an intentional third label treatment and consolidated both onto `ink-muted`.
8. **New, documented in Batch 5 (not a bug — a deliberate, permanent exception)**: three places use color categorically (to distinguish between items) rather than semantically (to judge good/bad), and were left as hardcoded hex rather than forced onto the success/caution/danger/brand ramp: `PhaseCard.tsx`'s "Late Luteal" cycle phase, `NutritionIntelligenceCard.tsx`'s `MacroBar` per-macro legend, and `lib/periodization/goalProfiles.ts`'s `PHASE_COLORS`. See "Batch 5 details" for the full reasoning. Candidates for a future categorical-palette token (DS-6), not a gap to close within DS-2.
9. **New, found in Batch 5**: hex-drift near-misses of real tokens are common and now confirmed systemic — e.g. `#C0392B` (a popular "flat-UI-colors" red) used in place of the actual `danger` token `#C0390B` across at least half a dozen Batch 5 files. All resolved onto the real token. Worth expecting the same pattern in Batch 6/7.

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

## Notes for Batch 4 kickoff (historical)

- Browser QA tooling remains flaky at the *server-restart* level (gstack's browse server crashed and lost session state twice more during Batch 3, unrelated to app code) — expect to occasionally need to redo a data-seeding walkthrough (e.g. re-complete onboarding) if the browser session resets mid-batch. Not a blocker.
- Batch 4 scope per `DS2ImplementationPlan.md`: extend `DashboardShell` navigation to `/body`, `/exercises`, `/profile`, `/settings`; migrate the settings-page toast to the real `Toast`/`ToastProvider` (built in Batch 1, still has zero production call sites); migrate `BodyIntelligenceViewer`'s hand-rolled mobile sheet to the real `Sheet` component, which also fixes its known focus-trap gap as a side effect.
- The stale `-ui-surface`/`-ui-border`/`ink-base`/`ink-subtle` token family has now recurred 3 times (`ErrorBoundary.tsx`, `SafetyConstraintBanner.tsx`, and still-unfixed `app/dev/page.tsx`) — worth a quick repo-wide grep at the start of Batch 4 in case any navigation/overlay code shares the same stale pattern.
- Four known button/CTA treatments now exist (`Button primary`, `Button dark+pill`, `ProfileSummary`'s glow CTA, plus whatever `WorkoutHeroView`'s "Start Workout" button turns out to be — not yet audited, it wasn't in Batch 3's file list). Continue resisting consolidation on sight — that's DS-3 territory.
- Recovery card consolidation (12 cards, 3 style conventions per the original Audit) is Batch 5, not Batch 4 — don't get pulled into it early just because Batch 4 touches `BodyIntelligenceViewer`, which sits structurally near but not inside that accordion section.

## Notes for Batch 5 kickoff (historical)

- The stale token grep came back clean for all Batch 4 files (`bg-ui-surface|border-ui-border|ink-base|ink-subtle` — zero matches across the 8 touched files). Still recurs elsewhere (confirmed unfixed in `app/dev/page.tsx`, out of scope); keep grepping each new file touched in Batch 5.
- gstack's headless browser server is now confirmed to crash specifically on synthetic WebGL canvas pointer events on this machine (not just idle server-restart flakiness noted previously) — reproduced 3/3 attempts trying to click a body region on `/body`. This didn't block Batch 4 (Body Intelligence's canvas itself wasn't modified, only its overlay), but Batch 5/6 have no WebGL surfaces in scope, so this shouldn't recur there. If any future batch needs to interact with the 3D viewer, expect to fall back to manual/handoff browser testing rather than automated `gstack` clicks.
- Batch 4 left `/body`, `/exercises`, `/profile`, `/settings` with plenty of remaining hardcoded hex in their own page-level markup (filter chips, section headers, dialogs, etc.) — this was correctly out of scope per the plan's literal Batch 4 text (shell/nav + toast + sheet only, not a full color pass on those routes' content), but it means those 4 files are not "done" in the Batch 0 compliance-metric sense. No batch in the 5-7 range currently covers them (5-6 are the dashboard accordion sections, 7 is icons) — flag for a scoping decision on where standalone route content lives before declaring DS-2 complete.
- `DashboardShell`'s new `fullBleed`/`hideMobileNav` props are additive and default off; no reason Batch 5/6 (both pure dashboard-accordion work, no shell changes) should need to touch `DashboardShell.tsx` at all.

## Notes for Batch 6 kickoff

- Batch 6 scope per `DS2ImplementationPlan.md`: the ~20 "Axis Intelligence" cards in the single Layer-3 accordion (`app/dashboard/page.tsx`'s `id="intelligence"` section) — same styling-only treatment as Batch 5 (tokens, no `Card`/`Button` componentization forced, no `EmptyState` rollout forced), explicitly **not** a license to merge/consolidate the 7 confidence or 5 explainability components living in that section, or to relocate any of them out of Layer 3 — both are DS-3 decisions.
- `components/dashboard/RecommendationCards.tsx`'s `RecoveryCard` was already incidentally migrated to tokens as a side effect of Batch 5's file-level script pass (see "Batch 5 details" above) — when Batch 6 opens this file, expect it to already be token-compliant; don't re-do the migration, just confirm and move on.
- The three categorical-color exceptions documented in Batch 5 (`PhaseCard`'s Late Luteal phase, `NutritionIntelligenceCard`'s `MacroBar`, `lib/periodization/goalProfiles.ts`'s `PHASE_COLORS`) are a pattern worth watching for in Layer 3 too — if any Axis Intelligence card uses color to distinguish between categories (not to judge good/bad), don't force it onto the success/caution/danger/brand ramp; document it as the same kind of exception instead.
- The stale token grep (`bg-ui-surface|border-ui-border|ink-base|ink-subtle`) came back clean across all 50 Batch 5 files — still only unfixed in the known, out-of-scope `app/dev/page.tsx`. Keep grepping each new file touched in Batch 6 regardless, since it's recurred 3 times historically.
- Batch 5's hex→token lookup table (built against `app/globals.css`'s real `@theme` values) is reusable for Batch 6 — most of Layer 3's confidence/explainability cards almost certainly draw from the same drifted palette (the Design System Audit's own finding: "Confidence UI has at least 7 divergent implementations" with inconsistent hex). Worth checking for the same near-match patterns (e.g. `#C0392B` vs. the real `danger` token `#C0390B`) before assuming Layer 3's hex is novel.
