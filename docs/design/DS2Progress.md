# DS-2 Progress Tracker

Living document — updated at the end of every batch. For the frozen point-in-time baseline this tracks progress against, see `DS2Baseline.md`. For the batch plan being executed, see `DS2ImplementationPlan.md`. For binding constraints on this phase, see the DS-2 kickoff instructions (design-system adoption only; no consolidation, no redesign, no logic changes).

---

## Overall Migration Progress

| Batch | Status |
|---|---|
| 0 — Migration Baseline | ✅ Complete |
| Pre-flight decisions | ✅ Decided, recorded below — **implementation deferred to start of Batch 1** |
| 1 — New shared primitives | ⏳ Not started |
| 2 — Onboarding (pilot) | ⏳ Not started |
| 3 — Dashboard Layer 1 | ⏳ Not started |
| 4 — Navigation + overlays | ⏳ Not started |
| 5 — Dashboard Layer 2 (accordion sections) | ⏳ Not started |
| 6 — Dashboard Layer 3 ("Axis Intelligence") | ⏳ Not started |
| 7 — Icon system | ⏳ Not started |

**Compliance headline (from `DS2Baseline.md`):** 15 of 195 files (7.7%) fully token-compliant at baseline. This number is the metric every subsequent batch's "after" state gets compared against.

## Current Batch

**Batch 0 — Migration Baseline: complete.** No production code was modified — this batch was measurement and documentation only, per its own scope. Pre-flight decisions for Batch 1 have been decided (see below) but not yet implemented in code; implementation of those decisions is the first work of Batch 1, not Batch 0.

**Next up:** Batch 1 (new shared primitives) — awaiting review sign-off before starting, per the "pause for review before beginning the next batch" rule.

## Commit History

| Batch | Commit subject | Files |
|---|---|---|
| Docs (DS-1 + DS-2 Batch 0) | `docs: design system documentation (DS-1) and DS-2 migration baseline` | `docs/design/*.md` (7 files — see commit for full list) |

(Hashes are reported per-batch in the end-of-batch report rather than embedded here, to avoid a self-referential commit needing to know its own hash before it exists. Run `git log --oneline -- docs/design/` for the authoritative record.)

## Verification Status (Batch 0)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 323/323 passing, 6 files |
| Dev server launches | ✅ Confirmed (see below) |
| Manual visual QA | **N/A for this batch** — Batch 0 added only new `.md` files under `docs/design/`; no `.tsx`/`.ts`/`.css` file was created, edited, or deleted, so there is no rendered UI surface to visually verify. First batch requiring visual QA is Batch 1 (build-only, low-risk) / Batch 2 (first batch with mandatory full manual QA, per `DS2ImplementationPlan.md`). |
| git status clean of unrelated changes | ✅ Confirmed — only `docs/design/` files staged; pre-existing unrelated changes (`package-lock.json` modification, `axis-research-setup-claude-code-brief.md`, `research/files (2).zip`) left untouched, not included in this commit |

## Remaining Work

Everything in `DS2ImplementationPlan.md` Batches 1–7, plus the two pre-flight-decision implementations (below), which land at the start of Batch 1.

## Known Issues

1. **Border-radius naming collision** (found during Batch 0 baseline measurement, not previously documented in DS-1): `lib/design/tokens.ts`'s `radius["2xl"]` (24px) and Tailwind's own `rounded-2xl` utility class (16px) refer to different pixel values under the same name; `radius.xl` (20px) has no matching Tailwind utility at all. See `DS2Baseline.md` → "Border Radius" for full detail. **Not resolved in Batch 0** — resolving it would mean either redefining Tailwind's built-in radius scale (high blast radius, affects `rounded-lg`/`rounded-xl`/`rounded-2xl` app-wide, explicitly out of scope for a zero-risk batch) or a naming/documentation fix. Flagged for explicit decision before any batch does bulk radius-token migration.
2. **`#8A8880`** (heavily used in onboarding, 21+ occurrences) does not exactly match any defined ink/border token — closest are `--color-ink-muted` (`#9B9690`) and `--color-ink-secondary` (`#5C5850`). Needs a judgment call in Batch 2, not a mechanical substitution.
3. **"Weekly Insights" has no exact matching component name in the codebase** — see Pre-flight Decision #2 below; best-guess mapping recorded, needs confirmation before Batch 1 implementation.

---

## Pre-flight Decisions (decided; implementation deferred to Batch 1 start)

### Decision 1 — `SectionHeader` promoted as canonical (supersedes `DS2ImplementationPlan.md`'s original recommendation)

Per explicit instruction, **`SectionHeader` (`components/ui/SectionHeader.tsx`) is canonical**, not `CardLabel`. This reverses the plan's earlier recommendation (which favored `CardLabel` on adoption-count grounds — 25 call sites vs. 2). `CardLabel` may remain in the codebase as an internal styling variant where it's genuinely a different visual treatment, not merely renamed.

**Implementation (deferred to Batch 1):** update `components/ui/SectionHeader.tsx`'s doc comment to remove the "legacy alias" framing from `CardLabel` and instead frame `CardLabel` as an intentional variant (if it is one) or begin migrating its 25 call sites to `SectionHeader` (if it isn't). This needs one more look at the actual visual diff between the two before writing migration code — noting here rather than guessing.

### Decision 2 — `components/resilience/ErrorBoundary.tsx` wraps major feature surfaces only

Per explicit instruction: **not** per-card (reversing this plan's original Batch 3 proposal to wrap all 8 Layer-1 cards individually). Instead, four wrap points:

| Surface | Target (best-current mapping) | Confidence |
|---|---|---|
| Dashboard sections | `app/dashboard/page.tsx` — wrap at the Layer 2/3 `AccordionSection` level (each accordion section gets its own boundary, so one section's crash doesn't take down the others or the always-visible Layer 1 content) | High — matches the dashboard's existing layer/section structure documented in `AxisDesignSystem.md` §8 |
| Workout experience | `components/dashboard/WorkoutCard.tsx` (the Layer-1 card that mounts `components/workout/WorkoutHeroView.tsx` → `GuidedExerciseFlow.tsx`) — wrap at `WorkoutCard`'s render boundary to cover the full workout subtree | High — confirmed via import trace: `WorkoutCard.tsx` is the only mount point for `WorkoutHeroView`/`GuidedExerciseFlow` |
| Body Intelligence | `components/body/BodyIntelligenceViewer.tsx` — the confirmed live orchestrator (per `ComponentInventory.md`) | High |
| Weekly Insights | **No component named "Weekly Insights" exists in the codebase.** Closest candidates: `components/dashboard/InsightsCard.tsx`, `components/insights/InsightDiscoveryCard.tsx`, or the "Insights & Analytics" `AccordionSection` (Layer 2). Best-current guess: this refers to the **"Insights & Analytics" accordion section**, in which case it's already covered by the Dashboard-sections wrap point above and doesn't need a fifth, separate boundary. | **Low — needs confirmation before Batch 1 implementation.** Proceeding on the "already covered by the accordion-level wrap" assumption unless corrected. |

**Explicit non-goal restated:** four boundaries (or three, if Weekly Insights collapses into the dashboard-sections wrap as suspected), not eighty-nine. No per-card wrapping.

---

## Notes for Batch 1 kickoff

- Confirm the "Weekly Insights" mapping above before writing the `ErrorBoundary` wiring code.
- Confirm `SectionHeader` vs. `CardLabel` visual diff before deciding rename-vs-variant.
- First actual code change of DS-2 lands in Batch 1: the six new shared primitives (`useFocusTrap`, `<VisuallyHidden>`, `Modal`/`Dialog`, `Sheet`, `Toast`, `Tabs`, `Select`) plus the two pre-flight-decision implementations above.
