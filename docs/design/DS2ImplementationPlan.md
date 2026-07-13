# DS-2 Implementation Plan — Component Library & Token Adoption

**Status:** Planning only. No code has been modified. This plan is built from `AxisDesignSystem.md` (standards), `DesignSystemAudit.md` (findings), `DesignSystemImplementationGap.md` (status per recommendation), and `ComponentInventory.md` (file-level detail) — treat those four as authoritative source data; this document sequences the work they describe.

---

## 0. Scope

**In scope for DS-2**: making `components/ui/` and the color/type/spacing token system the thing the app actually uses — migrating hand-rolled cards/buttons/inputs onto shared primitives, migrating hardcoded hex/arbitrary values onto tokens, building the primitives that don't exist yet (Modal/Dialog, Toast, Tabs, Select, Sheet, Icon system, `useFocusTrap`, `<VisuallyHidden>`), rolling out `EmptyState`/loading-state patterns, and extending `DashboardShell` navigation to all routes.

**Explicitly out of scope for DS-2** (belongs to later phases, per `DesignRoadmap.md` — do not let this work drift into these):
- Consolidating the 5 explainability components or 7 confidence components down to one each — **DS-3**. DS-2 migrates each one individually onto tokens/`components/ui/` primitives *without* deleting or merging any of them.
- Consolidating the 12 recovery cards or unifying their status vocabulary — **DS-3**. Same rule: migrate styling/components in place, do not touch the underlying category logic.
- Relocating confidence/explainability content out of the Layer-3 "Advanced" accordion — **DS-3** (an IA/product decision, not a styling one).
- Motion token wiring beyond what's incidental to a component migration — **DS-4**.
- Body Intelligence coordinate calibration, `GltfBody.tsx` disposition — **DS-5** (DS-2 only touches Body Intelligence UI chrome styling, not the renderer logic).
- Shared chart primitives (`Sparkline`, ranked-bar, etc.) — **DS-6**.
- Dark mode — **DS-7**.

Keeping this boundary explicit matters because several of the messiest files (recovery cards, explainability cards) sit at the intersection of "needs token migration" (DS-2) and "needs consolidation" (DS-3) — the plan below migrates their *styling* now and leaves their *structure* alone, so DS-3 isn't stuck rebasing over just-changed files.

---

## 1. Pre-flight decisions (before Batch 1 starts)

Two small decisions block a clean start — both cheap to make now, expensive to leave ambiguous while 80+ files are mid-migration:

1. **`CardLabel` vs. `SectionHeader`.** `CardLabel` (marked "legacy alias" in its own source, `components/ui/SectionHeader.tsx`) is the most-used shared primitive in the app at 25 call sites; `SectionHeader`, the component it aliases, has 2. Recommendation: **promote `CardLabel` to the first-class export**, keep `SectionHeader` as the deprecated/internal name, and update the doc comment — reverse of what the code currently implies. Rationale: migrating 25 existing call sites' import path for no functional gain is pure churn; every dashboard-card batch below will touch files using `CardLabel`, so this needs to be settled before Batch 3.
2. **`components/resilience/ErrorBoundary.tsx`.** Currently documented (`docs/architecture/ErrorRecoveryArchitecture.md`, `PhaseB-VerificationReport.md`) as wrapping individual cards, but has zero call sites. Recommendation: **wire it up**, not delete it — per-card error isolation is a real reliability win once the dashboard is rendering ~89 cards, and the component already exists and matches its docs' intent; deleting it would mean rewriting those architecture docs to remove a capability that was clearly intended. This should land as part of Batch 3 (Layer 1) since that's the highest-value/highest-traffic place to prove out per-card isolation first.

Neither decision requires new design work — both are "pick the existing option that's already winning" calls.

---

## 2. Batching strategy

Batches are organized **by feature directory / dashboard layer**, not by fix-type, so each file is opened once and gets the full treatment in one pass (token migration + component adoption + empty-state wiring + any incidental barrel-import fix), rather than three separate sweeps across the same 80+ files. This minimizes total review/QA passes.

Ordering logic:
1. **Zero-risk / infrastructure first** — deletions and net-new components touch no existing render output, so they carry no regression risk and unblock everything after them.
2. **Small, contained, high-polish areas next** (onboarding) — proves the migration pattern on a small, well-tested surface before scaling to the large, messy dashboard directory.
3. **Highest-traffic, smallest-file-count dashboard slice next** (Layer 1 — 8 components) — this is what every user sees on every visit, so it's where visible consistency gains matter most; small enough to do carefully.
4. **Navigation extension** — mechanical, isolated to route-level shells, independent of card-level work.
5. **Layer 2 accordion sections**, ordered simplest-first, Recovery last within this tier (highest file count, most style divergence, most tempting to accidentally start doing DS-3 consolidation work — do it last so the "just migrate styling, don't restructure" discipline is well-practiced by the time you get there).
6. **Layer 3 "Advanced" accordion** — lowest visibility (collapsed by default, opt-in), so lowest risk despite housing the confidence/explainability duplicates; safe to style-migrate without triggering the DS-3 consolidation decision.
7. **Icon system rollout** — orthogonal to the above, lower consistency impact than color/component work, trails behind.

Unit tests (323 tests, 6 files, per current `vitest run`) are logic-focused and **will not catch visual/styling regressions** — they're a baseline sanity check (nothing broke functionally), not a regression gate for this work. The actual regression gate for every batch below is manual visual QA against the dev server (and, where useful, the `gstack` skill for before/after screenshots) — call this out explicitly per batch rather than assuming green tests mean the batch is safe.

---

## 3. Batches

### Batch 0 — Dead code & infrastructure (no visual change)
**Scope:**
- Delete `components/dashboard/globals.css`; update its 3 README references (`components/dashboard/README.md`, `components/onboarding/README.md`, `app/onboarding/README.md`).
- Verify/fix `components/ui/index.ts` barrel exports; confirm `@/components/ui` resolves all primitives correctly (no consumers yet — this just makes the barrel usable for Batch 1+).
- Re-run the orphan check on `components/body/BodyViewer.tsx`, `BodyViewport.tsx`, `ProceduralBodyViewer.tsx` (grep for import references); if still zero, delete. If DS-5 scoping has claimed any of them in the interim, skip and flag.
- Land the two pre-flight decisions from §1 as code: rename/re-export so `CardLabel` is primary; add real usage of `components/resilience/ErrorBoundary.tsx` is **deferred to Batch 3** (needs a real wrapping target), but the *decision* (keep + wire, don't delete) is recorded here so Batch 3 doesn't re-litigate it.

**Risk:** **Low.** Nothing here changes rendered output except the barrel fix (additive only) and the CardLabel rename (mechanical, single-file source change, no call-site changes needed since `CardLabel` keeps its name).
**Regression surface:** None expected. `tsc --noEmit` + `vitest run` are sufficient verification — no manual QA needed.
**Rollback:** Trivial (single-purpose commits, revert individually).

---

### Batch 1 — Build missing shared primitives (net-new, zero existing call sites touched)
**Scope:** Build, but do not yet wire in anywhere except the fixes noted:
- `Modal`/`Dialog` component (with focus trap, `Escape`-to-close, focus restore)
- `useFocusTrap` hook + `<VisuallyHidden>` utility (built alongside `Dialog` since they're its dependencies)
- `Toast` component
- `Tabs` component
- `Select`/`Dropdown` component
- `Sheet` component

**Risk:** **Low.** Pure addition — no existing file is edited except new files being created under `components/ui/`.
**Regression surface:** None (nothing consumes these yet).
**Verification:** `tsc --noEmit`, plus a throwaway/dev-only usage to visually confirm each primitive works (can be a temporary route or Storybook-style page if one exists, otherwise a quick manual mount in `/dev`).
**Note:** Do not migrate `app/settings/page.tsx`'s hand-rolled toast or `BodyIntelligenceViewer.tsx`'s hand-rolled sheet in this batch — that's Batch 4 (settings) and coordinated with the focus-trap fix respectively. Building the primitive and adopting it are kept as separate commits so a bad adoption doesn't implicate the primitive itself.

---

### Batch 2 — Onboarding migration (pilot batch)
**Scope:** `components/ui/onboarding-primitives.tsx` (`OptionCard`, `ChipSelect`, `ScaleSlider`, `NumberStepper`, `SegmentedControl`, `StepLabel`) migrated from raw hex to tokens. Fold `StepContinueButton` into `Button` (`variant="primary" size="lg" fullWidth`) and update its 2 consumers (`StepWrapper.tsx`, any direct step usage).

**Why here:** Small, fully self-contained blast radius (5-ish consumer files: `StepWrapper.tsx`, `Steps1to5.tsx`, `Steps6to10.tsx`, `EquipmentStep.tsx`), and it's the single best place to prove the token-migration pattern works end-to-end before scaling up — if something subtle breaks (e.g. a visual regression in spacing), you find it here, cheaply, not 80 files deep into the dashboard.

**Risk:** **Medium** — not because it's technically hard (it's the smallest batch), but because onboarding is, per the Audit, "the most consistent flow in the app" and every new user goes through it. A visual regression here is maximally visible even though the file count is minimal. Treat as medium-risk-small-scope: extra care, not extra size.
**Regression surface:** Onboarding steps 1–11 and the profile-edit reuse of the same step components (`app/profile/page.tsx`).
**Verification:** Full manual walkthrough of all 11 onboarding steps *and* the profile-edit flow (since it reuses the same components) in the dev server before merging. This is the first batch where visual QA is mandatory, not optional.
**Rollback:** Isolated to one file + its ~4 consumers; safe to revert as a unit if the walkthrough finds issues.

---

### Batch 3 — Dashboard Layer 1 ("Always Visible")
**Scope:** `DailyCheckIn`, `DailyStatus`, `TrainingCard`, `SafetyConstraintBanner`, `ConfidenceBadge`, `WorkoutCard`, `TodayHighlights`, `BodyStatusCard` (8 files). For each: hardcoded hex/arbitrary values → tokens; hand-rolled card container/buttons → `Card`/`Button`; silent `if (!x) return null` → `EmptyState` where the underlying data can legitimately be absent (e.g. `BodyStatusCard` for a user who hasn't opened Body Intelligence yet). Wire `components/resilience/ErrorBoundary.tsx` around each of these 8 (per the Batch 0 decision) for per-card crash isolation, since this is the content every user sees on every visit — highest value for isolation here.

**Why here:** Highest-traffic surface in the app, but small enough (8 files) to migrate carefully in one batch. This is where visible consistency gains are most noticeable to users, so it's worth doing right after the pilot batch proves the pattern.

**Risk:** **Medium-High.** Small file count, but these components render live user data (today's readiness, today's workout) — a bug here is immediately visible to every user, every day, unlike a bug in a collapsed Layer-3 card. Treat each of the 8 as its own commit, not one combined commit, so a problem in one doesn't block/rollback the other 7.
**Regression surface:** The entire above-the-fold dashboard experience.
**Verification:** Manual QA against multiple data states per component if feasible (populated, empty/new-user, and — if `components/dev` mock-data tooling supports it — an error state to confirm the new `ErrorBoundary` wrapping actually isolates correctly rather than just adding dead code).
**Rollback:** Per-component commits allow surgical revert.

---

### Batch 4 — Navigation extension + Settings/Profile/Exercises/Body route shells
**Scope:** Extend `DashboardShell` (currently `/dashboard`-only) to `app/body/page.tsx`, `app/exercises/page.tsx`, `app/profile/page.tsx`, `app/settings/page.tsx`, replacing each route's bespoke back-button-only header. Migrate `app/settings/page.tsx`'s local `setState`+`setTimeout` toast onto the new `Toast` primitive (Batch 1). Migrate `BodyIntelligenceViewer.tsx`'s hand-rolled overlay onto the new `Sheet`/`Dialog` primitive, which as a side effect fixes the known focus-trap/`Escape` bug flagged in the Audit (the new `Dialog`/`Sheet` carries `useFocusTrap` by construction).

**Why here:** Mechanical and largely independent of the card-content work in Batches 3/5/6 — good to interleave as a change of pace, and unblocks nothing downstream so it's safe to place mid-sequence. Bundling the settings-toast and body-viewer-sheet migrations here (rather than a separate batch) keeps "migrate the last two hand-rolled overlays" together as one theme.

**Risk:** **Medium.** Navigation change touches every route's chrome (visible on every page), but the change itself (swap header for `DashboardShell`) is structurally simple. The `BodyIntelligenceViewer` sheet migration is the riskier half of this batch — it's the most complex interactive feature in the app (WebGL scene + overlay); test the focus-trap fix specifically (tab through the open sheet, confirm focus stays contained, confirm `Escape` closes it) since that's new behavior, not just restyling.
**Regression surface:** Every non-dashboard route's top-level navigation; Body Intelligence's detail-panel interaction.
**Verification:** Click through all 5 routes confirming nav consistency; dedicated keyboard-only pass on the Body Intelligence sheet (this is the one place in the whole plan introducing genuinely new interactive behavior, not just a visual swap).

---

### Batch 5 — Dashboard Layer 2 accordion sections (ordered simplest → Recovery last)
**Scope:** The ~50 cards across the 10 named `AccordionSection`s (Cycle Intelligence, Nutrition, Progress & Performance, Athlete Development, Training Plan, Performance Tracking, Insights & Analytics, Lifestyle & Adherence, plus Recovery). Same per-file treatment as Batch 3 (tokens, `Card`/`Button` adoption, `EmptyState` for no-data cases, loading-state pattern where a card currently has none).

**Sequencing within this batch:** Run a quick file-count pass per section before starting (the audits didn't break Layer 2 down section-by-section) and order sub-batches smallest-file-count first, **holding Recovery for last** regardless of its count — it has the most cards (12), the most style divergence (3 different conventions per the Audit), and is the section most likely to tempt scope creep into DS-3's vocabulary-consolidation work. Discipline for the Recovery sub-batch specifically: migrate each of the 12 cards' *styling* to tokens/components, but leave `optimal/ready/moderate/cautious/recover` vs. `Excellent/Good/Moderate/Compromised/Poor` category logic untouched even though it's visibly inconsistent — that inconsistency is DS-3's to resolve, not DS-2's.

**Risk:** **Medium**, roughly flat across sub-batches except Recovery (**Medium-High**, due to card count and the scope-creep temptation above).
**Regression surface:** Whichever accordion section is being touched, isolated from the others by construction (collapsed accordions don't interact) — this is the main reason this ordering is relatively low-risk despite being the largest batch by file count.
**Verification:** Open each accordion section in the dev server pre/post change; since sections are independently collapsible, a regression in one section is easy to isolate and doesn't require re-testing the whole dashboard.
**Rollback:** One commit per accordion section (not per card) is the right granularity — small enough to bisect, large enough to not be 50 tiny commits.

---

### Batch 6 — Dashboard Layer 3 ("Axis Intelligence" advanced accordion)
**Scope:** The ~20 meta/calibration cards, including the 5 explainability components and most of the 7 confidence components living here. Same styling-only treatment — tokens, `Card`/`Button`, `EmptyState`. **Do not** merge/delete any of the duplicate explainability or confidence components in this batch, and do not move any of them to a different layer — both are DS-3 decisions requiring product sign-off per `DesignRoadmap.md`.

**Why here:** Lowest visibility (collapsed by default, power-user-only), so lowest risk despite being conceptually the messiest area — by the time DS-3 comes to consolidate these, they'll already be token-compliant individually, which makes the eventual merge easier (comparing 5 token-compliant components is much easier than comparing 5 components each with their own ad hoc hex palette).
**Risk:** **Low-Medium.** Low traffic minimizes user-facing blast radius; the main risk is a contributor getting tempted to "just quickly fix" the duplication while in these files — explicitly resist that in code review for this batch.
**Regression surface:** Limited to users who actively expand "Axis Intelligence."
**Verification:** Standard dev-server check of the expanded accordion; no special QA needed beyond that given low traffic.

---

### Batch 7 — Icon system
**Scope:** Build a shared `<Icon>` component/registry; migrate the 34 files of hand-rolled inline SVG and the unicode-glyph usages (`PhaseCard.tsx`, `Steps1to5.tsx`, etc.) onto it.

**Why last:** Lowest consistency impact relative to color/component work (icons are a smaller part of the visual language than card/button/color consistency), and touches a wide, disjoint set of files with no natural batching structure (unlike the dashboard layers) — cheapest to do as a final sweep once the higher-value batches are done, and can be parallelized/split arbitrarily since icon swaps are low-interdependency.
**Risk:** **Low.** Visual swap of icon representations; unlikely to affect layout or logic.
**Verification:** Visual diff per component (icon renders roughly the same size/weight as its glyph/SVG predecessor).

---

## 4. Risk summary

| Batch | Files (approx.) | Risk | Primary reason |
|---|---|---|---|
| 0 — Dead code / infra | ~5 | Low | No rendered-output change |
| 1 — New primitives | ~7 new files | Low | Nothing consumes them yet |
| 2 — Onboarding | ~5 | **Medium** | Small scope, but highest-visibility flow in the app |
| 3 — Layer 1 | 8 | **Medium-High** | Every user, every day; live data rendering |
| 4 — Nav + overlays | ~6 | Medium | New interactive behavior (focus trap) introduced, not just restyle |
| 5 — Layer 2 (incl. Recovery) | ~50 | Medium (Recovery: Medium-High) | Largest batch; isolated by accordion boundaries; scope-creep risk in Recovery |
| 6 — Layer 3 | ~20 | Low-Medium | Low traffic; scope-creep temptation is the main risk |
| 7 — Icons | 34 | Low | Cosmetic swap, low interdependency |

---

## 5. Phased checklist for incremental commits

Each checked item below is sized to be one (or a small handful of) commits — not one commit per batch.

**Pre-flight**
- [ ] Decide + implement: `CardLabel` promoted to first-class export (source-only change)
- [ ] Decide: `components/resilience/ErrorBoundary.tsx` gets wired up (not deleted) — record decision, implementation lands in Batch 3

**Batch 0 — Infrastructure**
- [ ] Delete `components/dashboard/globals.css`; update 3 README references
- [ ] Verify/fix `components/ui/index.ts` barrel; confirm `@/components/ui` import path works
- [ ] Re-check and delete orphaned body-viewer files if still zero references (coordinate with DS-5 scoping first)

**Batch 1 — New primitives**
- [ ] `useFocusTrap` hook + `<VisuallyHidden>` utility
- [ ] `Modal`/`Dialog` component
- [ ] `Sheet` component
- [ ] `Toast` component
- [ ] `Tabs` component
- [ ] `Select`/`Dropdown` component

**Batch 2 — Onboarding (pilot)**
- [ ] Migrate `onboarding-primitives.tsx` to tokens
- [ ] Fold `StepContinueButton` into `Button` variant; update consumers
- [ ] Full manual walkthrough: all 11 onboarding steps + profile-edit reuse

**Batch 3 — Layer 1** (one commit per component)
- [ ] `DailyCheckIn`
- [ ] `DailyStatus`
- [ ] `TrainingCard`
- [ ] `SafetyConstraintBanner`
- [ ] `ConfidenceBadge`
- [ ] `WorkoutCard`
- [ ] `TodayHighlights`
- [ ] `BodyStatusCard` (+ wire `components/resilience/ErrorBoundary.tsx` around all 8)

**Batch 4 — Navigation + overlays**
- [ ] Extend `DashboardShell` to `/body`, `/exercises`, `/profile`, `/settings`
- [ ] Migrate settings page toast to shared `Toast`
- [ ] Migrate `BodyIntelligenceViewer` overlay to shared `Sheet`; verify focus-trap/`Escape` behavior explicitly

**Batch 5 — Layer 2** (one commit per accordion section, smallest first, Recovery last)
- [ ] Quick per-section file-count pass to finalize sub-batch order
- [ ] Lifestyle & Adherence
- [ ] Training Plan
- [ ] Performance Tracking
- [ ] Progress & Performance
- [ ] Athlete Development
- [ ] Cycle Intelligence
- [ ] Nutrition
- [ ] Insights & Analytics
- [ ] Recovery (12 cards — styling only, vocabulary untouched)

**Batch 6 — Layer 3**
- [ ] Migrate all ~20 "Axis Intelligence" cards to tokens/components, no structural changes

**Batch 7 — Icons**
- [ ] Build shared `<Icon>` component/registry
- [ ] Migrate 34 inline-SVG files + glyph usages

**Exit check**
- [ ] Repo-wide grep for raw hex in `components/`/`app/` — confirm only documented exceptions remain
- [ ] `tsc --noEmit` and `vitest run` clean
- [ ] Confirm no DS-3-scoped work (component consolidation, vocabulary unification, layer relocation) accidentally landed during DS-2
