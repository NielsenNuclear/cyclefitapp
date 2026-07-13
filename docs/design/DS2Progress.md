# DS-2 Progress Tracker

Living document — updated at the end of every batch. For the frozen point-in-time baseline this tracks progress against, see `DS2Baseline.md`. For the batch plan being executed, see `DS2ImplementationPlan.md`. For binding constraints on this phase, see the DS-2 kickoff instructions (design-system adoption only; no consolidation, no redesign, no logic changes).

---

## Overall Migration Progress

| Batch | Status |
|---|---|
| 0 — Migration Baseline | ✅ Complete |
| Pre-flight decisions | ✅ Decided and implemented in Batch 1 |
| 1 — New shared primitives | ✅ Complete |
| 2 — Onboarding (pilot) | ⏳ Not started |
| 3 — Dashboard Layer 1 | ⏳ Not started |
| 4 — Navigation + overlays | ⏳ Not started |
| 5 — Dashboard Layer 2 (accordion sections) | ⏳ Not started |
| 6 — Dashboard Layer 3 ("Axis Intelligence") | ⏳ Not started |
| 7 — Icon system | ⏳ Not started |

**Compliance headline (from `DS2Baseline.md`):** 15 of 195 files (7.7%) fully token-compliant at baseline. Batch 1 added net-new, fully-compliant files — it did not migrate any of the 180 non-compliant files (that's Batches 2+), so this number is unchanged as a *percentage of the original 195*; re-measure against `DS2Baseline.md`'s methodology once Batch 2 lands the first real migration.

## Current Batch

**Batch 1 — New shared primitives: complete.** Adds six new `components/ui/` primitives (`useFocusTrap`, `VisuallyHidden`, `Dialog`, `Sheet`, `Toast`/`ToastProvider`, `Tabs`/`TabPanel`, `Select`) plus both pre-flight decisions, implemented. No existing call site was migrated to use these yet — that starts in Batch 2 (onboarding) and Batch 4 (settings toast, body-viewer sheet), per `DS2ImplementationPlan.md`.

**Next up:** Batch 2 (onboarding pilot migration) — awaiting review sign-off before starting.

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

(Hashes are reported per-batch in the end-of-batch report rather than embedded here. Run `git log --oneline -- docs/design/ components/ui/ components/resilience/ErrorBoundary.tsx` for the authoritative record.)

## Verification Status (Batch 1)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) — required two rounds of fixes (see Known Issues) |
| `vitest run` | ✅ 323/323 passing, 6 files (unchanged — no test coverage exists for these new UI primitives yet; nothing to add for net-new components with no call sites) |
| Dev server launches | ✅ Confirmed clean startup, multiple times across this batch |
| `/dev`, `/dashboard`, `/body` routes compile and return HTTP 200 | ✅ Confirmed via direct request (see Visual QA note below for why this substitutes for browser QA) |
| Manual visual QA | **Partial — see below.** Automated browser QA (gstack) could not be completed in this environment; fell back to code-level manual verification per the batch plan's documented fallback. |
| git status clean of unrelated changes | ✅ Confirmed — only Batch 1 files staged per commit; pre-existing unrelated changes (`package-lock.json`, `axis-research-setup-claude-code-brief.md`, `research/files (2).zip`) untouched |

### Visual QA note — tooling gap, not skipped

Automated browser-based QA (the `gstack` skill) requires a Playwright headless-Chromium binary that wasn't installed in this environment. Attempted to resolve it (with your go-ahead) by running `npx playwright install`, but that pulled browser build `1228` from an ambient/global Playwright resolution while gstack's bundled server needs the exact matching build `1208` for its pinned `playwright-core` version. Retried by installing directly from gstack's own local dependency (`node_modules/playwright` v1.58.2) two more times; the second attempt genuinely stalled mid-download (confirmed via unchanging file size + live process check) and was killed rather than left hanging.

**Given the go-ahead to stop sinking time into the tooling itself, verification for this batch was done as:**
1. `tsc --noEmit` — catches all type errors, JSX structural errors (unbalanced tags), and import resolution errors across every new file and every edited call site.
2. Direct HTTP requests to every route touched (`/dev`, `/dashboard`, `/body`) confirming Turbopack compiles the full module graph (including the new `DesignSystemShowcase.tsx` and its six primitive imports) with no server errors.
3. **Manual line-by-line logic review** of the new primitives, specifically focused on the two areas static checks can't catch: focus-trap correctness and the Sheet's closed-state DOM behavior.

This manual review caught two real bugs before they shipped (see below) — worth recording as evidence the fallback path did real work, not just a formality. **What manual review could not confirm**: actual rendered visual appearance (spacing, colors, shadow — though these are the same token classes already used correctly elsewhere in the app, e.g. `shadow-modal`, `bg-surface`, so risk is low), and real keyboard-driven interactive behavior in an actual browser (Tab cycling, Escape, click-to-close). **Recommend a real browser check of the `/dev` → "Design System" tab before Batch 4 wires these into production surfaces** — flagging this explicitly rather than silently treating code review as equivalent to interaction testing.

## Remaining Work

Everything in `DS2ImplementationPlan.md` Batches 2–7. Additionally: a real-browser interaction check of the Batch 1 primitives (see Visual QA note) is recommended before Batch 4 specifically, since that's when `Dialog`/`Sheet` get their first production call sites.

## Known Issues

1. **Border-radius naming collision** (from Batch 0) — unresolved, unchanged. See `DS2Baseline.md` → "Border Radius."
2. **`#8A8880`** (onboarding) has no exact token match — unresolved, unchanged. Needs a judgment call in Batch 2.
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

## Notes for Batch 2 kickoff

- Recommend a real-browser pass over the `/dev` → "Design System" tab before or during Batch 2, now that the Playwright browser binary is actually installed and working (`chromium-headless-shell` build `1208` confirmed present) — the earlier failures were pure version-resolution issues, now resolved, not an environment blocker going forward.
- Batch 2 scope per `DS2ImplementationPlan.md`: migrate `components/ui/onboarding-primitives.tsx` to tokens, fold `StepContinueButton` into `Button`, full manual walkthrough of all 11 onboarding steps + profile-edit reuse. Resolve the `#8A8880` judgment call (Known Issue #2) as part of this batch.
