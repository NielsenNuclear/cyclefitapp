# Design Roadmap — DS-2 through DS-7

Sequenced remediation plan following DS-1 (this documentation pass). No implementation has occurred yet — this is a proposal for review before any phase begins. Each phase should get explicit go-ahead before work starts, same as DS-1 did.

Sequencing logic: **DS-2 first**, because component-library adoption and color-token migration are prerequisites for almost everything after it (you can't cleanly consolidate recovery/confidence cards, build a coherent chart kit, or ship dark mode while most of the app still hardcodes hex). DS-5 (Body Intelligence) is largely independent and can run in parallel with DS-2/3 if resourcing allows. DS-7 (Premium Polish) must come last, since dark mode specifically depends on the color-token migration being complete.

---

## DS-2 — Component Library

**Goals**
Close the gap between "the shared library exists" and "the shared library is used." Migrate high-traffic call sites onto `components/ui/`, retire duplicate/hand-rolled equivalents, and build the primitives that don't exist yet so the next feature isn't forced to hand-roll a fourth overlay.

**Deliverables**
- Migrate dashboard cards' hand-rolled card containers and buttons onto `Card`/`Button` (prioritize the ~86 files in `components/dashboard/`; ~66 hand-rolled cards, ~66 hand-rolled buttons per the audit, with overlap).
- Migrate color usage from raw hex/arbitrary Tailwind classes to semantic tokens across the same file set.
- Fix and standardize on the `@/components/ui` barrel import.
- Fold `StepContinueButton` into a `Button` variant; migrate `onboarding-primitives.tsx` off raw hex onto tokens.
- Point `ReadinessConfidenceCard.tsx` at the existing `ProgressRing` instead of its bespoke `ConfidenceRing`.
- Roll out `EmptyState` to the ~70 files currently doing `if (!x) return null`.
- Establish a consistent loading-state pattern (adopt `LoadingState`/`Skeleton`, or a route-level convention) beyond the body-viewer feature.
- Build missing primitives: `Modal`/`Dialog`, `Toast`, `Tabs`, `Select`/`Dropdown`, `Sheet` — and migrate the two existing hand-rolled overlays (`app/settings/page.tsx`, `BodyIntelligenceViewer.tsx`) onto the new `Dialog`/`Sheet`.
- Build a `useFocusTrap` hook and `<VisuallyHidden>` utility as part of the new Modal/Dialog work; use them to fix the known focus-trap bug in `BodyIntelligenceViewer.tsx`'s sheet.
- Build a shared `<Icon>` component/registry; migrate the 34 files of hand-rolled inline SVG and the unicode-glyph usages onto it incrementally (can extend past this phase if scope is large — flag for split if so).
- Delete dead/legacy artifacts identified in the audit: `components/dashboard/globals.css` (+ its 3 README references), orphaned body-viewer files (`BodyViewer.tsx`, `BodyViewport.tsx`, `ProceduralBodyViewer.tsx` — confirm orphan status doesn't overlap with DS-5 first), and resolve `components/resilience/ErrorBoundary.tsx` (wire it up for real per its documented intent, or delete it and correct `docs/architecture/ErrorRecoveryArchitecture.md` / `PhaseB-VerificationReport.md`).

**Dependencies**
None — this is the foundational phase. Should be scoped/approved first.

**Estimated effort**
Large. Highest file-count phase in the roadmap (~130+ call sites across dashboard, onboarding, settings). Recommend splitting into sub-waves (e.g. by feature directory) rather than one monolithic PR, given each card change is user-visible and needs individual verification, not just a type-check pass.

**Success criteria**
- `Button`, `Card` family, `TextInput`, `ProgressRing`, `MetricTile` each have real call sites outside `components/ui/`.
- Raw hex / arbitrary-value color usage in `components/` drops from its current ~112+ files to a small, justified residual (documented exceptions only).
- `EmptyState` adoption covers the dashboard's card set, not 3 files.
- `Modal`, `Toast`, `Tabs`, `Select` exist and have at least one real consumer each.
- The known modal focus-trap bug is fixed and covered by the new `useFocusTrap` hook.
- No component in `components/ui/` or `components/dashboard/` still imports the deleted legacy `globals.css`.

---

## DS-3 — Dashboard 2.0

**Goals**
Resolve the information-architecture problems specific to the dashboard: confidence and explainability content mis-layered as "advanced," 12-card recovery sprawl, and 5-way explainability duplication.

**Deliverables**
- **Decision + implementation**: relocate confidence and explainability content from Layer 3 ("Axis Intelligence," collapsed by default) into Layer 1 or default-open Layer 2, per `AxisDesignSystem.md` §11. This needs explicit product sign-off before implementation — it changes what users see by default, not just styling.
- Consolidate the 5 explainability components (`RecommendationExplanationCard`, `ExplainableRecommendation`, `SignalImportanceCard`, `ExplainabilityCard`, `RecommendationExplanation`) onto one canonical implementation. Audit each for functionality not present in `ExplainableRecommendation.tsx` (the recommended base) before deleting the others, so nothing is silently lost (e.g. `SignalImportanceCard`'s ranked-bar view may be worth preserving as a mode/tab within the canonical component rather than deleted outright).
- Consolidate confidence display onto `ConfidenceBadge.tsx`'s qualitative-first pattern; audit `ConfidenceIndicator`, `ConfidenceDashboardCard`, `ReadinessConfidenceCard` for unique functionality (e.g. the confidence ring visualization) worth folding in as an expandable detail view rather than deleted.
- Canonicalize the recovery status vocabulary (`optimal/ready/moderate/cautious/recover`, per `ReadinessCard.tsx`) and consolidate the 12 co-rendered recovery cards into a materially smaller set — this requires a product decision on which distinct recovery concepts (readiness "now" vs. debt vs. capacity vs. burnout risk) genuinely need separate cards vs. which are redundant views of the same underlying score. Flag for a scoping conversation before implementation; this is not a pure styling refactor.
- Wire `TrustDashboard.tsx` into the dashboard (in the same layer as other confidence content) or delete it — no longer allowed to sit unmounted.
- Apply the "second-person, present-tense" copy voice (§12) to cards touched during this consolidation.

**Dependencies**
DS-2 (component library adoption) should be substantially underway so consolidated cards are built on `components/ui/` primitives from the start rather than needing a second migration pass immediately after.

**Estimated effort**
Medium–Large. Smaller file count than DS-2, but higher product-decision overhead (recovery card consolidation and confidence-vocabulary unification both require explicit sign-off on resulting UX, not just engineering judgment).

**Success criteria**
- One explainability component, reachable without opening an "Advanced" accordion.
- One confidence vocabulary and one default (qualitative-first) presentation, used everywhere confidence is shown.
- Recovery accordion card count measurably reduced, with a single shared status vocabulary across all remaining recovery cards.
- No unmounted intelligence-surface components remain (`TrustDashboard.tsx` resolved one way or the other).

---

## DS-4 — Motion System

**Goals**
Make the existing (currently unused) motion tokens the actual source of truth for transitions app-wide, and define the small, deliberate set of signature micro-interactions the product wants (this phase inherits scope from the previously-planned but unbuilt "Premium Motion & Micro-Interaction System" referenced in prior project notes — confirm that scope against current product priorities before committing to it wholesale, since it was never actually started).

**Deliverables**
- Sweep the app's ~233 `transition-*`/`duration-*` usages onto the defined `--duration-*`/`--ease-*` tokens (mechanical, low-risk — mirrors the pattern already correctly used in `ProgressRing.tsx`/`ConfidenceIndicator.tsx`).
- Define and implement a small set of signature interactions where they add real product value (candidates, subject to product review, not a commitment yet): workout set-completion confirmation, progress-bar fill animation, accordion expand/collapse easing, metric-counter animation on score updates.
- Add `prefers-reduced-motion` handling — currently absent entirely.
- Explicit decision on whether a dedicated animation library (e.g. `framer-motion`) is warranted, or whether CSS transitions + tokens remain sufficient — do not add a new dependency without a concrete interaction that CSS can't reasonably express.

**Dependencies**
Loosely depends on DS-2 (cleaner if the component migration has already touched most transition-bearing components, avoiding a second edit pass on the same files) but not strictly blocking — can run in parallel if resourced separately.

**Estimated effort**
Small–Medium for the token-wiring sweep; Medium additional if a meaningful set of new signature interactions is greenlit (scope depends on product decision above).

**Success criteria**
- No hardcoded `duration-*`/arbitrary easing values remain outside the token set (or remaining exceptions are documented, not accidental).
- `prefers-reduced-motion` is respected app-wide.
- If new signature interactions are built, each ships with a stated rationale (what user moment it reinforces), not motion for its own sake.

---

## DS-5 — Body Intelligence

**Goals**
Resolve the gap between the Body Intelligence feature's actual architecture and what its phase history implies. Make the live renderer's coordinate mapping verified rather than hand-tuned-and-hoped, and remove dead code so the next contributor doesn't get misled by `GltfBody.tsx`'s apparent readiness.

**Deliverables**
- Run (or build, if it doesn't yet function) the `scripts/blender/calibrate_anchors.py` calibration script referenced in `HybridBody.tsx`'s own comments, to replace the current hand-estimated `SX/SY/SZ/OY` constants with verified values.
- Add a lightweight regression check (even a manual visual QA checklist, if automated testing of 3D hit-testing isn't practical) so a future `AxisFemale.glb` update doesn't silently break muscle-region alignment with no signal.
- Make an explicit decision on `GltfBody.tsx`: either commission/obtain a mesh-separated model (`muscle_<id>`-named nodes) that would make it live, or remove it and document `HybridBody.tsx`'s overlay approach as the intended long-term architecture, not a stopgap.
- Delete the orphaned viewer files (`BodyViewer.tsx`, `BodyViewport.tsx`, `ProceduralBodyViewer.tsx`) once confirmed to have no remaining references (re-verify at execution time in case DS-2 cleanup already touched these).
- Migrate `PlaceholderBody.tsx`/`HybridBody.tsx` styling (where applicable — much of this is Three.js material config, not Tailwind) onto `lib/design/tokens.ts` values for any UI chrome (panels, tooltips) rendered around the 3D scene.

**Dependencies**
Independent of DS-2/DS-3 — can be scheduled in parallel. Coordinate only on the dead-file deletion overlap noted above.

**Estimated effort**
Medium. The calibration work is the long pole and depends on tooling (Blender script) that may need engineering time beyond typical frontend work — get a concrete estimate from whoever owns that script before committing to a timeline.

**Success criteria**
- Coordinate constants in `HybridBody.tsx` are calibration-derived, not hand-estimated, with the source documented.
- `GltfBody.tsx` is either live (real mesh-separated model in use) or removed — no dead code presenting as production-ready.
- No orphaned body-viewer files remain in the tree.

---

## DS-6 — Data Visualization

**Goals**
Replace the current pattern of "every card reinvents its own chart" with a small shared charting kit, so future intelligence cards (and the DS-3 recovery consolidation) have a consistent visual language for scores, trends, and rankings.

**Deliverables**
- Formalize `ProgressRing` as the canonical ring/arc primitive; migrate `ReadinessConfidenceCard`'s bespoke `ConfidenceRing` onto it (can be done as part of DS-2 if sequencing works out better there — flag for whichever phase picks it up first).
- Build a shared `Sparkline` component (replacing `ReadinessCard.tsx`'s local div-based implementation) and a shared ranked-bar component (replacing `SignalImportanceCard.tsx`'s local implementation), both token-driven.
- Fix or rename `AccuracyTimelineCard.tsx` — it currently has no time axis despite its name; either build a real timeline view or rename it to reflect what it actually shows (three stacked progress bars).
- Establish `LongitudinalTimelineCard.tsx`'s approach (already token-compliant, genuinely a timeline) as the reference pattern for any future chronological/timeline UI.
- Define a shared color-scale convention for charts specifically (which token maps to which data meaning — e.g. is "good" always `--color-success` regardless of chart type) and document it as an addendum to `AxisDesignSystem.md` §5.

**Dependencies**
Benefits from DS-2's color-token migration being complete (charts currently split three ways between tokens/raw-Tailwind-palette/hex — cleaner to build the shared kit once that's settled) and pairs naturally with DS-3's recovery-card consolidation (consolidated recovery cards will want a shared charting vocabulary).

**Estimated effort**
Medium. Smaller in file count than DS-2/DS-3, but each new shared chart component needs real design + engineering care (these are the most visually prominent elements on the dashboard).

**Success criteria**
- No dashboard card still defines its own one-off inline SVG chart where a shared primitive covers the use case.
- One documented color-scale convention for chart data across the app.
- `AccuracyTimelineCard` accurately named/implemented.

---

## DS-7 — Premium Polish

**Goals**
The final pass: dark mode, systematized accessibility, and a voice/tone consistency sweep — explicitly sequenced last since dark mode depends on color-token migration (DS-2) being essentially complete, and a "polish" pass is only meaningful once the underlying inconsistencies (DS-2–DS-6) are resolved rather than being polished over.

**Deliverables**
- Define dark-mode token values for every existing `--color-*` custom property; implement a `data-theme`/`prefers-color-scheme` switching strategy.
- Full QA pass across the app in dark mode — given how recently the light-mode token system itself was unified, expect to find and fix contrast/legibility issues, not just flip a switch.
- Complete the accessibility items not already resolved incidentally by DS-2 (skip-link component, `htmlFor` labeling audit across all inputs, `aria-live` review on all score-updating cards, full keyboard-navigation pass beyond the initial modal fix).
- Voice/tone consistency sweep against `AxisDesignSystem.md` §12 across all card copy (not just the cards touched incidentally during DS-2/DS-3).
- Final icon-system completion (if DS-2's icon migration was partial/incremental, finish it here).
- Cross-cutting visual QA: confirm no remaining hardcoded hex/arbitrary values slipped through earlier phases (a repo-wide grep sweep as an exit check for the whole roadmap, not just this phase).

**Dependencies**
DS-2 (hard dependency — dark mode cannot be done cleanly with hardcoded hex still in the tree), and ideally DS-3/DS-4/DS-6 substantially complete, since this phase is explicitly "polish the finished system," not "fix the system."

**Estimated effort**
Medium–Large, driven mostly by the dark-mode QA pass (touches every screen) rather than by novel component work.

**Success criteria**
- App is fully usable and visually coherent in both light and dark mode.
- Accessibility checklist from `AxisDesignSystem.md` §10 is fully satisfied, not just the highest-risk item (modal focus trap) fixed in DS-2.
- A repo-wide grep for raw hex color values in `components/`/`app/` returns only documented, justified exceptions.

---

## Cross-Phase Notes

- **Nothing here has been scoped into tickets or estimated in engineering days/weeks** — "Small/Medium/Large" are relative to each other within this roadmap, not calibrated to a specific team's velocity. First step after this document is reviewed should be translating DS-2 specifically into a real sprint-level plan, since it's the prerequisite for everything else.
- **Two items flagged for explicit product sign-off before implementation**, not just engineering execution: the DS-3 recovery-card consolidation (which of the 12 current cards represent genuinely distinct concepts vs. redundant views) and the DS-3 confidence/explainability dashboard-layer relocation (changes default visible content for all users).
- **Navigation inconsistency** (`DashboardShell` used only on `/dashboard`) wasn't assigned its own DS phase — recommend folding it into DS-2 as an additional deliverable (extend `DashboardShell` to the other four routes) since it's a component-adoption problem structurally identical to the rest of that phase's scope.
