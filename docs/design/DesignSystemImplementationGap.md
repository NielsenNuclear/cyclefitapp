# Design System Implementation Gap

Cross-references every recommendation in `AxisDesignSystem.md` against the current implementation (per `DesignSystemAudit.md`). Status categories:

- **Implemented** — already true of the codebase today, no work needed.
- **Requires Refactor** — the right component/token exists; call sites need to be migrated to use it.
- **Requires New Component** — no shared implementation exists yet; must be built.
- **Documentation Only** — a policy/standard with no corresponding code artifact (nothing to build or migrate, just a rule to follow going forward).

---

## §3 Design Tokens

| Recommendation | Status | Notes |
|---|---|---|
| Single token source (`app/globals.css` `@theme`) | **Implemented** | Exists, Phase 61. |
| TypeScript mirror for non-Tailwind contexts | **Implemented** | `lib/design/tokens.ts` exists and is accurate. |
| Tokens stay in sync between the two files | **Requires New Component** | No generation step exists; currently hand-mirrored. Needs a build script (or single-source generation) — net-new tooling. |
| New/refactored components use tokens, not literals | **Requires Refactor** | 112–127 files currently use hardcoded hex/arbitrary values. |
| Delete legacy `components/dashboard/globals.css` | **Requires Refactor** | Small, mechanical: delete file, update 3 README references. |
| Resolve or remove unused `--font-mono` token | **Documentation Only** / **Requires Refactor** | Either load a mono font somewhere or delete the token — a one-line decision + edit. |

## §4 Typography

| Recommendation | Status | Notes |
|---|---|---|
| Type scale defined (`.type-*` classes) | **Implemented** | Exists in `app/globals.css`, well-specified. |
| Fonts wired via `next/font` | **Implemented** | DM Sans + Lora correctly loaded and bound to tokens. |
| All components use `.type-*` classes instead of raw `text-[Npx]` | **Requires Refactor** | Even token-adopting components (e.g. `components/ui/Card.tsx`) mix in raw sizing. |
| Serif (`Lora`) usage stays rare/intentional | **Requires Refactor** | Currently violated by at least one recovery card using serif as a default card-title font. |

## §5 Colors

| Recommendation | Status | Notes |
|---|---|---|
| Structural tokens (`bg-surface`, `text-ink`, `border-border`) | **Implemented** | Exist and are correctly defined. |
| Semantic status tokens (success/caution/danger/info/neutral) | **Implemented** | Exist, 5-step, with `-bg` variants. |
| Domain accent tokens (cycle/nutrition/performance) | **Implemented** | Exist but under-adopted (see below). |
| All components use semantic tokens instead of raw palette/hex for status | **Requires Refactor** | ~112 files use raw hex; some (e.g. `RecoveryIntelligenceCard.tsx`) use raw Tailwind palette classes (`emerald-600` etc.) directly instead of semantic tokens. |
| One canonical status vocabulary (`optimal/ready/moderate/cautious/recover`) | **Requires Refactor** | Currently at least 2 competing vocabularies live simultaneously (recovery cards). This is a product/IA decision as much as a code change — flag for sign-off before executing. |
| `PhaseCard.tsx` migrated to domain accent tokens | **Requires Refactor** | Currently a fully separate, hand-invented palette. |
| Dark mode strategy | **Requires New Component** | No `dark:`/`data-theme` handling exists anywhere; needs new token values + a theming mechanism. Sequenced after color-token migration in the roadmap. |

## §6 Spacing

| Recommendation | Status | Notes |
|---|---|---|
| Use default Tailwind spacing scale | **Implemented** | Already the dominant pattern (~8:1 over arbitrary values); no new scale needed. |
| Arbitrary values reserved for genuine edge cases only | **Documentation Only** | Policy is already mostly followed in practice; formalizing it as a rule prevents drift, no code change required. |

## §7 Component Standards

| Recommendation | Status | Notes |
|---|---|---|
| `components/ui/` as canonical shared library | **Implemented** | Library exists, well-typed, `variant`/`size` conventions in place. |
| App-wide adoption of `components/ui/` components | **Requires Refactor** | The single largest gap in this whole audit — most of `Button`, `Card` family, `TextInput`, `ProgressRing`, `MetricTile`, `Accordion`, layout primitives have zero external call sites. ~130+ call sites to migrate. |
| Fix barrel import (`@/components/ui`) so it's actually usable as documented | **Requires Refactor** | Barrel file (`components/ui/index.ts`) exists but nothing imports through it — verify it re-exports correctly, then adopt it as the standard import path. |
| Remove duplicate CTA primitive (`StepContinueButton` vs `Button`) | **Requires Refactor** | Fold into a `Button` variant; update onboarding call sites. |
| Modal / Dialog shared component | **Requires New Component** | Does not exist; 2 features currently hand-roll their own overlay. |
| Toast shared component | **Requires New Component** | Does not exist; `app/settings/page.tsx` hand-rolls a local one-off. |
| Tabs shared component | **Requires New Component** | Does not exist anywhere in the app currently. |
| Select / Dropdown shared component | **Requires New Component** | Does not exist. |
| Sheet shared component | **Requires New Component** | `BodyIntelligenceViewer.tsx`'s sheet is currently a one-off; could become the basis for a shared version. |
| Icon system / shared `<Icon>` component | **Requires New Component** | Currently unicode glyphs + 34 files of hand-rolled inline SVG, no registry. |

## §8 Dashboard Hierarchy

| Recommendation | Status | Notes |
|---|---|---|
| Three-layer model (Always Visible / Expandable / Advanced) | **Implemented** | Already real and functioning. |
| Every new card explicitly assigned a layer at build time | **Documentation Only** | Convention/process rule; no code change, but currently unenforced. |
| Relocate confidence/explainability content out of Layer 3 into Layer 1/2 | **Requires Refactor** | Concrete move of ~5 existing components' placement in `app/dashboard/page.tsx`; needs product sign-off on new placement (flagged as a decision, not just a code move). |
| Declarative card registry (id → layer → section) | **Requires New Component** | Does not exist; currently hand-placed JSX. Optional/future — only needed if card count keeps growing (see AxisDesignSystem.md §13). |

## §9 Motion System

| Recommendation | Status | Notes |
|---|---|---|
| Duration/easing tokens defined | **Implemented** | Exist in `app/globals.css`. |
| All transitions reference the tokens | **Requires Refactor** | Only 2 of many components (`ProgressRing.tsx`, `ConfidenceIndicator.tsx`) actually reference them; 233 raw `transition-*` declarations elsewhere across 6 inconsistent duration values. |
| Dedicated animation library | **Documentation Only** | Explicitly *not* recommended at this time — current CSS-token approach is judged sufficient; revisit only if DS-4 scope requires choreographed/gesture interactions. |

## §10 Accessibility Standards

| Recommendation | Status | Notes |
|---|---|---|
| Real semantic elements (no div-as-button) | **Implemented** | Already true app-wide. |
| Visible focus states on interactive elements | **Requires Refactor** | Good reference exists (`RetryButton.tsx`); not applied consistently elsewhere — needs an audit-and-fix pass, not new infrastructure. |
| Modal focus trap + Escape-to-close | **Requires Refactor** | Concrete, isolated bug: `BodyIntelligenceViewer.tsx`'s sheet has the ARIA roles but no actual focus/keyboard behavior. |
| `aria-live` on components with unprompted data updates | **Requires Refactor** | Good precedent exists (`ErrorFallback.tsx`); not applied to score-updating dashboard cards. |
| Explicit `<label htmlFor>` on all form inputs | **Requires Refactor** | Currently only 2 files app-wide use `htmlFor`. |
| Skip-link pattern | **Requires New Component** | Does not exist anywhere; needs to be built (likely a small shared component + a landmark target). |
| Shared `useFocusTrap` hook | **Requires New Component** | Does not exist; needed to fix the modal bug above and prevent repeat issues in future overlays. |
| `<VisuallyHidden>` utility | **Requires New Component** | Does not exist. |
| `alt`/`aria-hidden` convention for future images/icons | **Documentation Only** | No current violation (app renders no raster images) — this is a standing rule for when images/icons are added, not a current fix. |

## §11 Explainability Guidelines

| Recommendation | Status | Notes |
|---|---|---|
| Underlying explainability logic (signal drivers, counterfactuals) | **Implemented** | Real and sophisticated (`lib/evidence/counterfactualEngine`), already rendered in `ExplainableRecommendation.tsx`. |
| One canonical explanation component | **Requires Refactor** | 5 components exist doing an overlapping job; consolidate onto `ExplainableRecommendation.tsx`'s data model, retire the other 4 (or fold their unique capabilities into the canonical one first — audit each for functionality not present in the canonical version before deleting). |
| Explainability content promoted out of "Advanced" | **Requires Refactor** | Same dashboard-placement work as §8's confidence/explainability item — track as one piece of work, not two. |
| Qualitative-first confidence display (no leading raw %) | **Requires Refactor** | `ConfidenceBadge.tsx` already implements this correctly; `ConfidenceIndicator`, `ConfidenceDashboardCard`, `ReadinessConfidenceCard` currently violate it and need to change their default presentation (numeric detail can remain available on expand). |
| One confidence vocabulary (`Medium`, not `moderate`) | **Requires Refactor** | Small but must be swept across all confidence-displaying components consistently. |
| No unmounted/dead intelligence surfaces | **Requires Refactor** | `TrustDashboard.tsx` needs an explicit decision: wire it into the dashboard (state where, per §8) or delete it — currently in limbo. |

## §12 Voice and Tone

| Recommendation | Status | Notes |
|---|---|---|
| Calm, reassurance-first error copy | **Implemented** | `ErrorFallback.tsx` already models this well. |
| Qualitative-before-numeric framing generally | **Requires Refactor** | Same underlying work as the confidence-vocabulary item above — this is a tone consequence of that fix, not separate work. |
| Second-person, present-tense status copy | **Documentation Only** | No systematic audit was done of every card's copy; treat as a style rule applied during other refactor passes (e.g. while touching a card for token migration, also fix its copy voice) rather than a standalone sweep. |

## §13 Future Extensibility

| Item | Status | Notes |
|---|---|---|
| Dark mode token scaffolding | **Documentation Only** (design) / **Requires New Component** (implementation) | Token *structure* already supports it; actual dark values + switching mechanism don't exist yet. Explicitly sequenced as DS-7, after color-token migration. |
| Generated token sync (single source of truth) | **Requires New Component** | Tooling gap, not currently blocking, but will compound the longer both files are hand-maintained. |
| Icon system | **Requires New Component** | See §7. |
| Card registry | **Requires New Component** | See §8; explicitly optional/deferred, only needed if growth continues. |
| Shared charting primitives | **Requires New Component** | Only `ProgressRing` currently qualifies as reusable; sparkline/ring/ranked-bar/timeline patterns are each reinvented per card today. Scoped to DS-6. |

---

## Summary Roll-Up

| Status | Approx. count |
|---|---|
| Implemented | 15 |
| Requires Refactor | 24 |
| Requires New Component | 14 |
| Documentation Only | 6 |

The largest single bucket is refactor work against existing tokens/components — meaning the foundational design system does not need to be redesigned, it needs to be *adopted*. New-component work is concentrated in three areas: overlay primitives (Modal/Toast/Tabs/Select), accessibility infrastructure (focus trap, skip link, visually-hidden), and charting.
