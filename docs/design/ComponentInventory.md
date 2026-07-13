# Component Inventory — Axis / CycleFit

Every reusable UI component identified by the DS-1 audit, grounded in the actual codebase. Usage counts are grep-derived approximations, not exact. "Design-system compliance" refers to whether the component itself uses tokens (`lib/design/tokens.ts` / `app/globals.css` `@theme` classes) rather than hardcoded hex/arbitrary values — not whether the component is *used elsewhere*, which is tracked separately under "Current usage."

**Note on scope:** Table 1 covers the formal shared library (`components/ui/`) — components explicitly built to be reused. Table 2 covers a second, onboarding-scoped primitive library. Table 3 is not a "shared component" list in the traditional sense — it documents feature-level components that conceptually do the *same job* (confidence display, recovery scoring, explanation, charting) but were built independently multiple times; these are the highest-priority consolidation targets for DS-2/DS-3/DS-5.

---

## Table 1 — Core Shared Library (`components/ui/`)

| Component | File | Purpose | Current usage | DS compliance | Refactor priority |
|---|---|---|---|---|---|
| `Button` | `components/ui/Button.tsx` | Primary CTA, variant (primary/secondary/ghost/danger/success) + size (sm/md/lg), loading/icon states | **0 external call sites** | Compliant (tokens) | **High** — highest-leverage single migration; retires ~66 hand-rolled button implementations once adopted |
| `Card`, `CardHeader`, `CardDivider`, `CardSection`, `CardRow` | `components/ui/Card.tsx` | Card container family, `variant` (default/subtle/raised) + `padding` | **0 external call sites** | Compliant, but mixes in one raw `text-[12px]` (see Gap doc) | **High** — retires ~66 hand-rolled card containers once adopted |
| `ProgressBar` (in `Card.tsx`) | `components/ui/Card.tsx` | Linear progress indicator | ~4 files | Compliant | Medium |
| `ToggleChip` (in `Card.tsx`) | `components/ui/Card.tsx` | Selectable chip/tag | 0 external call sites | Compliant | Low |
| `Badge` | `components/ui/Badge.tsx` | Status-variant label | 4 files (e.g. `ReadinessCard.tsx`) | Compliant | Medium — candidate to become the canonical confidence/status display primitive |
| `Pill`, `StatPill`, `RpePill` | `components/ui/Badge.tsx` | Small stat/label chips | 0 external call sites | Compliant | Low |
| `TextInput`, `Textarea` | `components/ui/Input.tsx` | Labeled form inputs (label/error/hint/prefix/suffix) | **0 external call sites** | Compliant | Medium — low current usage reflects the app's near-total lack of `<form>` usage, not a flaw in the component |
| `ProgressRing` | `components/ui/ProgressRing.tsx` | SVG arc/ring progress indicator | 0 external call sites (a near-identical bespoke ring is hand-rolled in `ReadinessConfidenceCard.tsx` instead) | Compliant, uses motion tokens correctly | **High** — direct fix available: point `ReadinessConfidenceCard` at this instead of its own `ConfidenceRing` |
| `SectionHeader` | `components/ui/SectionHeader.tsx` | Section/card heading | 2 files | Compliant | Low |
| `CardLabel` (alias in `SectionHeader.tsx`) | `components/ui/SectionHeader.tsx` | "Legacy alias" per its own comment | **25 files — most-used shared primitive in the app** | Compliant | Medium — ironic case: the "legacy" alias is the de facto standard; decide whether to promote `CardLabel` to first-class or migrate its 25 consumers to `SectionHeader` |
| `EmptyState` | `components/ui/EmptyState.tsx` | Designed empty-state UI (icon/title/description/CTA) | 2–3 files (~4% of the ~70+ places that silently `return null` instead) | Compliant | **High** — largest gap between component quality and adoption in the app |
| `LoadingState` | `components/ui/EmptyState.tsx` | Spinner + label | 0–1 files | Compliant | Medium |
| `Skeleton` | `components/ui/EmptyState.tsx` | Generic pulse-loading block | 0–1 files | Compliant | Medium |
| `MetricTile`, `StatGrid` | `components/ui/MetricTile.tsx` | Numeric stat display grid | 0 external call sites | Compliant | Medium |
| `Accordion` | `components/ui/Accordion.tsx` | Generic expand/collapse | 0 external call sites (dashboard sections use the separate, unrelated `components/dashboard/AccordionSection.tsx` instead) | Compliant | Low — dashboard already has its own working accordion; clarify whether these should be unified or intentionally stay separate (dashboard-section vs. generic-content use cases may legitimately differ) |
| `Divider` | `components/ui/Divider.tsx` | Horizontal rule, optional centered label | ~10 files | Compliant | Low |
| `PageContainer`, `ContentSection`, `DashboardGrid`, `ScrollableSection` | `components/ui/layout.tsx` | Page-level layout primitives | 0 external call sites | Compliant | Low |
| `Panel` (in `layout.tsx`) | `components/ui/layout.tsx` | Layout panel wrapper | 2 files | Compliant | Low |

**Barrel export**: `components/ui/index.ts` — documented as the intended import path ("Axis Design System 2.0"), but **zero files actually import through it**; every consumer imports individual files directly. Verify the barrel re-exports correctly, then standardize on it.

## Table 2 — Onboarding-Scoped Primitives (`components/ui/onboarding-primitives.tsx`)

| Component | Purpose | Current usage | DS compliance | Refactor priority |
|---|---|---|---|---|
| `OptionCard` | Selectable option tile | Onboarding steps only (`Steps1to5.tsx`, `Steps6to10.tsx`) | **Not compliant — raw hex, not tokens** | Medium |
| `ChipSelect` | Multi-select chip group | Onboarding steps only | Not compliant | Medium |
| `ScaleSlider` | Numeric scale input | Onboarding steps only | Not compliant | Low |
| `NumberStepper` | Increment/decrement numeric input | Onboarding steps only | Not compliant | Low |
| `SegmentedControl` | Multi-option toggle | Onboarding steps only | Not compliant | Low |
| `StepContinueButton` | Full-width pill CTA | Onboarding steps, `StepWrapper.tsx` | Not compliant; **functionally duplicates `Button` (`variant="primary" size="lg" fullWidth`)** | **High** — fold into `Button`, delete this duplicate |
| `StepLabel` | Step eyebrow label | Onboarding steps, `StepWrapper.tsx` | Not compliant | Low |

This entire file predates or bypassed the token system despite living inside `components/ui/`. Migrating it to tokens is lower risk than the main-app migration (small, contained blast radius: 3 consumer files).

## Table 3 — Duplicated Feature-Level Components (Consolidation Targets)

These are not part of a formal shared library — each was built independently within a feature area, but multiple implementations exist for the same conceptual UI job. Listed here because DS-2/DS-3/DS-5 will need to pick a canonical implementation from each group.

### Confidence display (7 implementations)
| File | Notable trait |
|---|---|
| `components/intelligence/ConfidenceBadge.tsx` | Phase 67; **correctly qualitative-only** (High/Medium/Low, no %) — recommended as canonical, see Design System doc §11 |
| `components/intelligence/ConfidenceIndicator.tsx` | Bar + raw `{pct}%`, tokens |
| `components/dashboard/ConfidenceDashboardCard.tsx` | Raw `{score}%`, hex colors |
| `components/dashboard/ReadinessConfidenceCard.tsx` | Custom SVG donut (`ConfidenceRing`), raw `%`, uses "medium" where others use "moderate" |
| `components/intelligence/CalibrationIntelligenceCard.tsx` | Calibration-specific variant |
| `components/dashboard/UserTrustCard.tsx` | Trust-framed variant |
| `components/intelligence/TrustDashboard.tsx` | Phase 67; **built, but imported nowhere — dead UI** |

### Explainability / "why" UI (5 implementations)
| File | Placement |
|---|---|
| `components/dashboard/RecommendationExplanationCard.tsx` | Layer 1 (always visible), hex colors |
| `components/intelligence/ExplainableRecommendation.tsx` | Layer 1 (always visible), tokens, includes the Counterfactual engine integration — **recommended as canonical** |
| `components/dashboard/SignalImportanceCard.tsx` | Layer 3 (collapsed "Axis Intelligence" accordion) |
| `components/dashboard/ExplainabilityCard.tsx` | Layer 3, hex colors |
| `components/dashboard/RecommendationExplanation.tsx` | Layer 3 |

### Recovery scoring/status cards (12 co-rendered in one accordion)
| File |
|---|
| `components/dashboard/ReadinessCard.tsx` — tokens, category set A |
| `components/dashboard/FatigueCard.tsx` |
| `components/dashboard/RecoveryIntelligenceCard.tsx` — raw Tailwind palette, category set B |
| `components/dashboard/FatigueInsightsCard.tsx` |
| `components/dashboard/BurnoutPreventionCard.tsx` |
| `components/dashboard/RecoveryOptimizationCard.tsx` |
| `components/dashboard/RecoveryCapacityCard.tsx` |
| `components/dashboard/RecoveryStatusCard.tsx` |
| `components/dashboard/RecoveryCheckinCard.tsx` |
| `components/dashboard/PersonalRecoveryCard.tsx` |
| `components/dashboard/CapacityCard.tsx` |
| `RecoveryCard` (defined inline in `components/dashboard/RecommendationCards.tsx:189`) — hardcoded hex, Lora serif headline (inconsistent with siblings) |

### Charts (no shared primitives beyond `ProgressRing`)
| File | Chart type |
|---|---|
| `components/ui/ProgressRing.tsx` | SVG arc ring — **the one genuinely reusable chart primitive** |
| `components/dashboard/ReadinessCard.tsx` (`Sparkline()`, local function) | 7-day bar sparkline (div-height based, not SVG) |
| `components/dashboard/ReadinessConfidenceCard.tsx` (`ConfidenceRing()`, local function) | SVG donut — duplicates `ProgressRing` |
| `components/dashboard/AccuracyTimelineCard.tsx` | Misnamed — 3 stacked progress bars, no time axis |
| `components/athlete/LongitudinalTimelineCard.tsx` | Real chronological timeline (vertical line + dots), tokens |
| `components/dashboard/SignalImportanceCard.tsx` | Ranked horizontal bar chart, mixed palette + hex fallback |

### Body Intelligence renderers (3 implementations, 1 live)
| File | Status |
|---|---|
| `components/body/rendering/PlaceholderBody.tsx` | Phase 58; procedural Three.js primitives, ~50-region `MUSCLE_ANCHORS` table |
| `components/body/rendering/GltfBody.tsx` | Phase 59; built for mesh-separated GLTF (`muscle_<id>` nodes) — **dead code in practice**, since the live asset has no such nodes |
| `components/body/rendering/HybridBody.tsx` | **Live implementation** — skin-only GLB + procedural overlay via hand-tuned coordinate constants |
| `components/body/BodyViewer.tsx`, `BodyViewport.tsx`, `ProceduralBodyViewer.tsx` | **Orphaned** — zero import references anywhere |
| `components/body/BodyIntelligenceViewer.tsx` | Live orchestrator; selects `HybridBody` vs. `PlaceholderBody` at runtime based on `NEXT_PUBLIC_BODY_MODEL_URL` |

### Error boundaries (2 implementations, 1 live)
| File | Status |
|---|---|
| `components/ErrorBoundary/GlobalErrorBoundary.tsx` | **Live** — wraps entire app in `app/layout.tsx`, well-built a11y |
| `components/resilience/ErrorBoundary.tsx` | Phase 69; **zero call sites** despite being documented in `docs/architecture/` as wrapping individual cards |

### Navigation
| File | Status |
|---|---|
| `components/dashboard/DashboardShell.tsx` | Global 5-item nav (desktop bar + mobile tab bar); **used only on `/dashboard`** |
| `app/body/page.tsx`, `app/exercises/page.tsx`, `app/profile/page.tsx`, `app/settings/page.tsx` | Each hand-rolls its own back-button-only header instead of reusing `DashboardShell` |

---

## Compliance Summary

- **Token/color compliance**: `components/ui/*` (excluding `onboarding-primitives.tsx`) — fully compliant. Everything outside it — the vast majority of the app — is majority non-compliant (see Audit for file counts).
- **Adoption**: inverted from what you'd want — the most compliant components have the lowest usage; the highest-usage pattern (`CardLabel`, at 25 files) is explicitly marked legacy in its own source.
