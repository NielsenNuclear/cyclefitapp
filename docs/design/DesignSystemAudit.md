# Design System Audit — Axis / CycleFit

**Date:** 2026-07-13
**Method:** Five parallel, read-only codebase audits (design foundations/tokens, shared component library, dashboard/nav/forms/onboarding, states/motion/accessibility, explainability/confidence/recovery/body-intelligence/charts). All findings below are grounded in the actual current implementation as of this date — no proposed or hypothetical components are described here. File paths and counts are as reported by the audits; treat exact counts as approximate (grep-derived), not precise to the file.

This document is descriptive (what exists, and where it's inconsistent). Prescriptive standards live in `AxisDesignSystem.md`. Gap-by-gap remediation tracking lives in `DesignSystemImplementationGap.md`.

---

## Current Strengths

- **A real token system exists and is well-designed.** `app/globals.css`'s `@theme inline` block (Phase 61, "Axis Design System 2.0") plus its TypeScript mirror `lib/design/tokens.ts` define a coherent ~45-property system: surface/text/border, brand, five-step semantic status colors (with `-bg` tints), domain accents (cycle/nutrition/performance), shadows, motion durations/easings, and font stacks. This is not aspirational — it's a functioning, importable system.
- **`components/ui/` is a legitimate, well-typed shared component library.** `Button`, `Card` family, `Badge` family, inputs, `ProgressRing`, `SectionHeader`, `EmptyState`/`LoadingState`/`Skeleton`, `MetricTile`, `Accordion`, `Divider`, layout primitives — all built with consistent `variant`/`size` prop conventions. The engineering quality of this layer is good; the problem (below) is adoption, not design.
- **Onboarding is the most consistent flow in the app.** A single orchestrator (`OnboardingFlow.tsx`) drives 11 steps through a shared `StepWrapper`, shared progress UI, and centralized advancement gating (`canAdvance(step, data)` in `lib/onboarding-types.ts`). It's reused as-is for profile editing (`app/profile/page.tsx`), avoiding duplication between the two flows.
- **The dashboard's information architecture is deliberate, not accidental.** Despite rendering ~89 distinct cards, `app/dashboard/page.tsx` implements an explicit three-layer model (Always Visible → Expandable Intelligence accordions → Advanced) with persisted expand/collapse state and lazy-mounted accordion content. Given the card count, this is a reasonable retrofit, not a mess.
- **The root error boundary is genuinely well-built**, including accessibility: `GlobalErrorBoundary.tsx` wraps the entire app, integrates with real recovery/session-detection logic (`lib/errorRecovery/`), and its fallback UI (`ErrorFallback.tsx`) uses `role="alert"`, `aria-live="assertive"`, hides stack traces behind a details disclosure, and auto-focuses a `RetryButton` with a visible focus ring.
- **No accessibility anti-patterns at the element level.** Zero `<div onClick>` handlers found anywhere; 205 real `<button>` elements. The team is not fighting semantic HTML, just under-using ARIA/focus patterns beyond the basics.
- **The 3D Body Intelligence viewer genuinely works as an interactive experience** (hover/click, camera controls, tooltips), despite the coordinate-mapping workaround underneath it (see Weaknesses) — the user-facing interaction layer is real, not a stub.
- **Explainability logic is real and sophisticated**, not just backend plumbing — the Counterfactual engine (`lib/evidence/counterfactualEngine`) is actually rendered and interactive in `ExplainableRecommendation.tsx`.

## Current Weaknesses

- **Token adoption is roughly 20–25% across the component tree.** Across colors specifically: ~112–127 files (of ~150–182 `.tsx` files in `components/`) use raw hardcoded hex or Tailwind arbitrary-value color classes, versus 35–44 using the token classes. This isn't scattered noise — it's the majority pattern, with token usage being the exception, concentrated in components built during/after Phase 61.
- **The shared component library is built but almost unused.** Of 13 primitives in `components/ui/`, most have **zero external call sites**: `Button`, `Card`/`CardHeader`/`CardDivider`/`CardSection`/`CardRow`/`ToggleChip`, `TextInput`/`Textarea`, `ProgressRing`, `MetricTile`/`StatGrid`, `Accordion`, and most of `layout.tsx` are imported nowhere outside `components/ui/` itself. Only 7 files in the entire app import from `components/ui/*` at all, and none import the barrel (`components/ui/index.ts`) despite its own header comment instructing consumers to do so.
- **`EmptyState` exists and is well-designed, but is used in ~3 of the 70+ places that need it.** The dominant pattern for "no data yet" is `if (!x) return null` — the entire card silently vanishes for a new user rather than explaining that the feature will activate once data exists.
- **No consistent loading-state convention.** `isLoading` state appears in only ~2 files app-wide; several `React.Suspense` boundaries in the body-viewer feature use `fallback={null}` (i.e., nothing renders while loading). Loading UI exists only where the body-intelligence feature specifically built it.
- **Motion tokens exist but are used almost nowhere.** Only 2 components (`ProgressRing.tsx`, `ConfidenceIndicator.tsx`) reference the defined `--duration-*`/`--ease-*` tokens. Everywhere else, 233 raw `transition-*`/`duration-*` declarations pick from six different undocumented duration values.
- **No dark mode exists** (no `dark:` classes, no `prefers-color-scheme`, no `data-theme` handling anywhere), despite the token architecture being structurally ready for it.
- **No icon system.** Icons are unicode glyphs (`"◎"`, `"♾"`, `"⬆"`) in some places and 34 files of hand-rolled inline SVG in others, with no shared `<Icon>` component or registry.
- **No form infrastructure.** No form library is installed; `lib/validation/` is an empty directory; real `<form>` elements appear in only 2 files app-wide. Validation is reinvented per-component as ad hoc boolean gates.
- **Confidence UI has at least 7 divergent implementations** with inconsistent vocabulary (`medium` vs. `moderate`) and a direct contradiction of the app's own documented design intent: `ConfidenceBadge.tsx`'s comment explicitly states "no numeric percentages for users," while three sibling components (`ConfidenceIndicator`, `ConfidenceDashboardCard`, `ReadinessConfidenceCard`) lead with a raw `%`.
- **Explainability UI is duplicated 5 ways** across the dashboard (`RecommendationExplanationCard`, `ExplainableRecommendation`, `SignalImportanceCard`, `ExplainabilityCard`, `RecommendationExplanation`), split across two visual languages (hardcoded hex vs. tokens), with two shown prominently and three buried in a collapsed accordion.
- **Recovery UI has the worst card sprawl in the app**: 12 recovery-adjacent cards render simultaneously in a single default-open accordion section, using three incompatible styling conventions and at least two different category vocabularies (`optimal/ready/moderate/cautious/recover` vs. `Excellent/Good/Moderate/Compromised/Poor`) for what is conceptually the same underlying score.
- **The Body Intelligence renderer is a documented workaround, not the clean architecture its phase name implies.** The actual production model (`public/models/AxisFemale.glb`) is a single-mesh basemesh with no per-muscle nodes; `GltfBody.tsx` (built for a mesh-separated model) is therefore dead code in practice, and the live renderer (`HybridBody.tsx`) overlays procedural sphere anchors on the skin mesh using hand-tuned, code-comment-admitted "estimate" coordinate constants pending a calibration script that hasn't been run.
- **No shared charting primitives.** Every chart (sparkline, ring, ranked bar, timeline) is hand-rolled per card with no shared color scale, axis convention, or tooltip pattern — `ProgressRing` is the only genuinely reusable visualization primitive in the app.
- **Documentation and code have drifted apart in at least one safety-relevant place**: architecture docs (`docs/architecture/ErrorRecoveryArchitecture.md`, `docs/architecture/PhaseB-VerificationReport.md`) describe `components/resilience/ErrorBoundary.tsx` as wrapping individual cards for granular recovery — it has zero actual call sites. In practice, only the single root boundary is wired, so any deep component crash takes down the entire app rather than isolating to one card.
- **A fully-built confidence/trust surface, `TrustDashboard.tsx` (Phase 67), is never imported or mounted anywhere** — shipped, then never wired in.
- **Navigation is only global on one route.** The five-item tab bar (`DashboardShell.tsx`) is used exclusively by `/dashboard`; Body, Exercises, Settings, and Profile each hand-roll their own back-button-only header, so the persistent tab structure disappears the moment a user leaves the dashboard.
- **A second, dead theme file exists** (`components/dashboard/globals.css`, Tailwind v3 syntax, different token names) with zero live imports, referenced only in three READMEs as a copy-paste snippet — a trap for a future contributor.

## Component Inconsistencies

See `ComponentInventory.md` for the full file-by-file list. Summary of the pattern: for nearly every UI concept in the app (card container, button, confidence indicator, recovery score, "why" explanation, chart), there are 2–5 independent implementations that do the same conceptual job with different props, different color sourcing (token vs. hex vs. Tailwind palette), and in the confidence/recovery cases, different category vocabularies for the same underlying score.

## Technical Debt

Ranked by how much it costs to leave unresolved:

1. **Shared library non-adoption** — the highest-leverage debt. The fix (component library) is already built; the cost is purely migration effort across ~130+ call sites.
2. **Color-token non-adoption** (112+ files) — blocks any future theming work (including dark mode) until resolved, since hardcoded hex can't respond to a theme switch.
3. **Confidence/explainability/recovery UI fragmentation** — user-facing inconsistency in the app's core differentiator (adaptive, explainable intelligence); also the highest risk of contradicting the product's own stated design intent (qualitative-only confidence).
4. **Dead/misleading code**: `GltfBody.tsx` (dead vs. actual asset), `TrustDashboard.tsx` (built, unmounted), `components/resilience/ErrorBoundary.tsx` (documented as wired, isn't), orphaned viewer files (`BodyViewer.tsx`, `BodyViewport.tsx`, `ProceduralBodyViewer.tsx`), and the second `globals.css`. Low effort to clean up, meaningful clarity gain, and prevents the docs/code drift from getting worse.
5. **Body Intelligence coordinate hack** — functional today but fragile (hand-tuned constants, no calibration script run); a model change or GLB update would silently break hit-testing accuracy with no test coverage to catch it.
6. **No form/validation infrastructure** — currently manageable because "forms" are simple (tap-to-select, immediate-write), but will not scale gracefully if more complex data entry is added.
7. **Motion token non-adoption** — lowest user-facing impact today (six inconsistent duration values still all "feel" reasonably similar), but blocks a coherent motion system (DS-4) until addressed.

## Accessibility Findings

- **Good**: semantic element discipline (no div-as-button), consistent `<button>` usage, a strong reference implementation in `RetryButton.tsx` and `ErrorFallback.tsx` (focus management, `aria-live`, calm/clear copy).
- **Gap — form labeling**: `htmlFor` appears in only 2 files app-wide; most inputs rely on placeholder text rather than an associated `<label>`.
- **Gap — no skip-link pattern** anywhere in the app.
- **Gap — no keyboard-navigation infrastructure** beyond native button semantics; `onKeyDown` handling exists in only 2 files (`RestScreen.tsx`, `RetryButton.tsx`).
- **Concrete bug — the one modal in the app has no focus trap.** `BodyIntelligenceViewer.tsx`'s sheet sets `role="dialog"` and `aria-modal` correctly but has no `Escape` handler and no focus containment — a keyboard user can currently tab out of the open sheet into the page behind it.
- **Non-finding, noted for completeness**: zero `<img>`/`alt=` usage app-wide is not a violation — the app renders no raster images (all imagery is CSS/SVG/3D) — but it also means there's no established alt-text convention to fall back on if images are introduced later.
- **Overall**: accessibility is handled well in a handful of high-traffic components but is not systemized — there's no reusable `useFocusTrap` hook or `<VisuallyHidden>` primitive, so coverage today depends entirely on whether an individual component's author happened to think about it.

## Dashboard Findings

- 3,246-line single client component (`app/dashboard/page.tsx`), ~89 distinct cards, 86 files in `components/dashboard/` alone, 130+ `lib/` imports.
- The three-layer hierarchy (§8 of the Design System doc) is real and functioning, with `localStorage`-persisted accordion state and lazy-mounted section content — this materially helps performance and usability despite the raw scale.
- Composition is fully manual JSX placement — there is no declarative registry mapping card → layer → section, so correct placement of new cards depends on convention, not enforcement.
- The Recovery accordion section specifically is over-dense (12 cards, 3 visual languages) relative to every other section and is the clearest single candidate for consolidation.
- Confidence and explainability content is currently split between Layer 1 (2 duplicate "why" cards, always visible) and Layer 3 (3 more duplicate "why" cards, plus most confidence cards, behind a collapsed "Advanced" accordion) — an information-architecture inconsistency, not just a visual one: the same conceptual content is being treated as both core and advanced simultaneously.

## Refactor Priorities

(Ranked; effort/risk detail follows in the next two sections and is expanded per-phase in `DesignRoadmap.md`.)

1. Migrate `components/ui/` adoption across the highest-traffic surfaces (dashboard cards) — unlocks nearly every other fix.
2. Consolidate confidence UI to one component + one vocabulary (aligns implementation with the app's own documented intent).
3. Consolidate explainability UI to one component; relocate to Layer 1/2.
4. Consolidate recovery cards (12 → a materially smaller, visually unified set).
5. Delete/resolve dead code (`GltfBody.tsx` disposition, `TrustDashboard.tsx` — mount or delete, `resilience/ErrorBoundary.tsx` — wire up or delete + fix docs, orphaned body-viewer files, second `globals.css`).
6. Fix the modal focus trap (small, isolated, high-value accessibility fix).
7. Build missing shared primitives (Modal/Dialog, Toast, Tabs, Select, Icon system) so the next feature doesn't hand-roll a fourth overlay.
8. Wire motion tokens through existing `duration-*` usages.
9. Body Intelligence coordinate calibration (run/build the calibration script; decide `GltfBody.tsx`'s fate for real once a mesh-separated model exists or is ruled out).
10. Dark mode (net-new work, not a fix — sequence after the color-token migration, since hardcoded hex has to be gone first).

## Estimated Effort

Rough, directional (see `DesignRoadmap.md` for phase-level estimates):

| Item | Size |
|---|---|
| Component library migration (dashboard cards → `components/ui/`) | Large (multi-week, ~80+ files, mechanical but high file-count) |
| Confidence UI consolidation | Medium (7 components → 1–2, plus vocabulary fix) |
| Explainability UI consolidation | Medium (5 components → 1, plus dashboard-layer relocation) |
| Recovery card consolidation | Medium–Large (12 cards, real product/IA decisions needed, not just styling) |
| Dead code cleanup | Small (mostly deletion + doc correction) |
| Modal focus trap fix | Small (isolated to one component + a shared hook) |
| Missing primitives (Modal/Toast/Tabs/Select/Icon) | Medium (new components, then a second migration wave to adopt them) |
| Motion token wiring | Small–Medium (mechanical find/replace, low risk) |
| Body Intelligence calibration | Medium (requires the Blender calibration script to actually be run, plus decision on `GltfBody.tsx`) |
| Dark mode | Medium–Large (new token values + systematic QA pass), and blocked on color-token migration finishing first |

## Risk Assessment

- **Low risk, do first**: dead-code deletion, the modal focus-trap fix, motion token wiring. These are isolated, don't touch shared state or the intelligence pipeline, and have immediate, verifiable payoff.
- **Medium risk**: component-library migration for dashboard cards is mechanical but touches ~80+ files that render live user data (recovery scores, readiness, etc.) — regressions would be visible/user-facing (a card silently breaking) rather than silent, so this needs visual/functional verification per card, not just a type-check pass.
- **Higher risk, needs product input, not just engineering**: recovery card consolidation and confidence-vocabulary unification are not pure refactors — they require deciding which of several currently-live category systems is the "real" one, which affects what users actually see about their own state. This should not be done as a drive-by styling pass; it needs explicit sign-off on the resulting information architecture before implementation (flagged for discussion before DS-3/DS-5 execution, not just documentation).
- **Contained but currently silent risk**: the Body Intelligence coordinate hack is stable today because the underlying GLB hasn't changed, but there's no test guarding the hand-tuned constants — a future asset update could silently misalign hit-testing with no CI signal. Worth a lightweight regression check even before full recalibration.
- **No risk identified in leaving current dashboard hierarchy as-is** — Layer 1/2/3 structure is sound; the risk there is purely about *what's placed where* (confidence/explainability), not the mechanism itself.
