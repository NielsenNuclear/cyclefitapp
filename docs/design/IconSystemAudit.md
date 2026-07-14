# Icon System Audit — Axis / CycleFit

**Date:** 2026-07-14
**Method:** Read-only codebase survey (grep-based inventory + targeted file reads) across `components/` and `app/`. No production code was modified for this audit. Counts are grep-derived — treat as approximate, not precise to the character, consistent with the methodology `DesignSystemAudit.md` used.

This document prepares **DS-2 Batch 7** (icon system). It follows the same non-goal boundary as every other DS-2 batch: adoption, not redesign. Nothing here proposes new icon *meanings* — only a consistent library, size scale, color rule, and accessibility baseline for icons that already exist.

---

## 0. Executive Summary

- **No icon library or shared `<Icon>` component exists.** `package.json` has zero icon-related dependencies (confirmed by direct inspection — only `@react-three/drei`, `@react-three/fiber`, `three` for the Body Intelligence 3D viewer). Every icon in the app is either a hand-rolled inline `<svg>` or a Unicode glyph character used as a stand-in.
- **37 files** contain at least one inline `<svg>`. **7 additional files** use Unicode glyphs as icons (4 via an `icon: "…"` object property, 3 as inline JSX text). **2 files appear in both lists.** Total unique files touching icon-like content: **42**.
- Icon sizing has **at least 13 distinct pixel dimensions** in active use for small action/status icons alone (6–24px), with no shared scale. Separately, a handful of much larger `<svg>` elements (64–88px) are **data-visualization rings/arcs** (confidence rings, cycle-position arcs), not icons — these are correctly out of this audit's scope and belong to `components/ui/ProgressRing.tsx`'s territory (already a shared primitive) or a future DS-6 chart kit, not the icon system.
- Color is the one area that's already mostly healthy: **37 of ~53 `stroke=` declarations use `stroke="currentColor"`**, the correct pattern (inherits from a token-driven text color class, so it survives any future re-theming for free). The remaining ~16 are a mix of hardcoded hex (mostly already piped through `lib/design/tokens.ts`'s `color` export as a side effect of Batches 5–6) and two confirmed-working `stroke="var(--color-brand)"` uses in `ProfileSummary.tsx`.
- **Glyph icon reuse across unrelated meanings is a real, if minor, information-design gap**: the same glyph (e.g. `◎`, `◆`, `◉`, `↻`) is independently reused for 2–3 *different* onboarding goal categories. Not a Batch 7 blocker, but worth flagging since a canonical icon registry makes this visible/fixable for the first time (see §2 and §5).
- Accessibility baseline is decent but inconsistent: 24 of 37 SVG-containing files use `aria-hidden="true"` on purely decorative icons; the two real nav-icon buttons (`DashboardShell.tsx`) are correctly labeled (`aria-label`) with touch targets at 36px (desktop, mouse-context) and 48×56px (mobile, meets the 44px minimum). No file in the app uses `prefers-reduced-motion` — a pre-existing, app-wide gap, not an icon-specific one, but Batch 7 will touch at least one animated icon (a rotating chevron) and should not make it worse.

---

## 1. Current State

### 1.1 Libraries used

**None.** Confirmed via direct `package.json` inspection:

```
dependencies: @react-three/drei, @react-three/fiber, next, react, react-dom, three
devDependencies: @tailwindcss/postcss, @types/*, eslint*, tailwindcss, typescript, vitest
```

No `lucide-react`, `react-icons`, `@heroicons/react`, `@radix-ui/react-icons`, `@tabler/icons-react`, `phosphor-react`, or any icon font/library of any kind. This matches `DesignSystemAudit.md`'s original finding ("Icons are unicode glyphs... and 34 files of hand-rolled inline SVG... with no shared `<Icon>` component or registry") — unchanged since that audit.

### 1.2 Icon implementation patterns found

Three distinct patterns are in live use, with no consistency rule governing which one a new feature reaches for:

1. **Inline `<svg>` with a `<path>`/`<circle>`/etc.** — the dominant pattern (37 files, 71 `<svg>` tags). Usually copy-pasted per file rather than shared, though several files clearly share the same underlying icon (e.g. a chevron/arrow shape appears independently hand-coded in at least 6 different files with slightly different `viewBox`/stroke-width choices).
2. **A small, already-shared `NavIcon` component** (`components/dashboard/DashboardShell.tsx`) — a single component that takes a `path` prop and renders a consistent 18×18 `currentColor`-stroked SVG shell around it, fed by a `NAV_ITEMS` data array of raw path strings. This is, structurally, already a miniature version of the icon registry Batch 7 needs to build — just scoped to five nav icons instead of the whole app. **Strong candidate as the internal pattern to generalize**, rather than starting from nothing (see §3).
3. **Unicode glyph characters** (`◎ ◐ ◑ ◕ ◆ ↻ ◉ ▸ ✕ ◈ ▶ ◇ ≈ ⬆ ♾ ▲ — + ↑ ↓ →`) used as plain text content, either as an `icon:` property in a config object (`PhaseCard.tsx`, `Steps1to5.tsx`, `Steps6to10.tsx`, `components/ui/MetricTile.tsx`) or inline in JSX (`BurnoutPreventionCard.tsx`, `GoalRoadmapCard.tsx`, `SituationMemoryCard.tsx`). Rendered via a plain `<span>`, sized with `text-[Npx]` and colored with `text-*` classes (token or hex) rather than SVG props.

A fourth, notably good, non-icon pattern also exists and is worth preserving as-is: **`ConfidenceBadge.tsx`'s status dot** is a pure CSS shape (`<span className="w-1.5 h-1.5 rounded-full bg-current" />`), not a glyph or SVG at all. It inherits color from the parent's token-driven text class via `bg-current`. This is arguably a *better* pattern than a glyph for simple dot/marker indicators and should be the model for any new status-dot need, rather than reaching for a Unicode bullet.

### 1.3 Sizing inconsistencies

Raw pixel `width="N" height="N"` values found on small action/status/decorative icons (excludes the large data-viz rings, listed separately below):

| Size (px) | Occurrences |
|---|---|
| 16 | 13 |
| 14 | 11 |
| 13 | 10 |
| 10 | 8 |
| 12 | 5 |
| 18 | 4 |
| 8 | 3 |
| 6 | 3 |
| 9 | 2 |
| 24 | 2 |
| 11 | 1 |
| 20 | 1 |

**13 distinct sizes, no documented scale.** For comparison, `AxisDesignSystem.md` already defines a spacing scale and a typography scale (`.type-*`) but no icon-size scale — this is a real, acknowledged gap in the design system itself, not just inconsistent adoption of an existing rule.

Separately, larger `<svg>` elements exist purely for **data visualization** (confidence rings, cycle-position arcs, score rings): 64, 72, 82, 88px, plus a couple of odd aspect-ratio ones (8×28, 7×22, 20×28 — thin vertical bars, not icons at all). These are correctly **out of icon-system scope** — they belong either to `components/ui/ProgressRing.tsx` (if consolidated) or a future DS-6 chart-kit pass, and Batch 7 should not touch them.

Glyph-icon sizing is similarly ungoverned: `text-[9px]` and `text-[10px]` are both observed for what appear to be equivalent-weight status glyphs across different files (`BurnoutPreventionCard.tsx` at 9px vs. onboarding option glyphs closer to 14–16px equivalent visual weight via their surrounding layout).

### 1.4 Color inconsistencies

| Pattern | Count | Assessment |
|---|---|---|
| `stroke="currentColor"` | 37 | ✅ Correct pattern — inherits the token-driven text color of whatever wraps it. |
| `stroke="white"` | 16 | Mostly intentional (icons on solid dark/brand-colored fills, e.g. a badge circle) — needs a per-instance check, not a blanket flag. |
| `stroke="rgba(255,255,255,0.08)"` / `rgba(0,0,0,0.06)` | 5 | Structural — the always-visible "track" behind a data-viz ring, not a color-token concern (same class of exception the color-migration batches already documented for shadow/border hairlines). |
| Hardcoded hex (`#534AB7`, `#EAE7DE`, `#854F0B`, `#C8C5BC`, `#9B9690`, `#0F6E56`, `#085041`) | 14 | Mostly the **exact values already resolved through `lib/design/tokens.ts`'s `color` export** in Batches 5–6 (e.g. `PhaseCard.tsx`'s `stroke={tokenColor.danger}`, `RecommendationExplanation.tsx`'s `stroke={tokenColor.brand}`) — these are correct, just not visually distinguishable from "raw hex" by a naive grep. A handful of others are genuinely still-unmigrated (see §5, low-risk bucket). |
| `stroke="var(--color-brand)"` / `var(--color-success)` | 3 | **Confirmed working** — `ProfileSummary.tsx`'s completion-screen ring uses this directly as a literal SVG attribute string, and it was visually verified rendering correctly in Batch 2's browser QA (ring renders in brand-purple, not black/broken). This settles an open question from Batch 6's documentation, which assumed (incorrectly, as it turns out) that `var()` wouldn't resolve in a plain SVG presentation-attribute context and used the TS token mirror instead as a more conservative fallback. **Both approaches work**; `var(--color-x)` directly in the attribute is simpler (no import needed) and should be the documented default going forward — see §3. |
| `fill="none"` | 82 | The overwhelming default for stroke-based (outline) icons — consistent, no issue. |
| `fill="var(--color-border)"` | 6 | Correct token usage for a filled (not stroked) shape. |

**No raw Tailwind-palette color classes** (e.g. `text-emerald-400`) were found feeding an icon specifically — that drift pattern (found and fixed repeatedly in Batches 3, 5, 6 for card *text*) does not appear to have leaked into icon coloring specifically.

### 1.5 Accessibility concerns

- **`aria-hidden="true"`**: present in 24 of 37 SVG-containing files. Where absent, most of the remaining 13 are cases where the SVG *is* the entire accessible content of an interactive element and needs a real `aria-label` on the parent instead (not `aria-hidden` on the icon) — this needs a per-file check during migration, not a blanket "add aria-hidden everywhere" fix.
- **Nav icon buttons** (`DashboardShell.tsx`) are the reference-quality example: `aria-label={item.label}` on the button, `aria-hidden="true"` on the decorative `NavIcon` inside it, `aria-current="page"` when active. Touch targets: desktop `w-9 h-9` (36×36px — acceptable for a `hidden sm:flex` mouse-only context, but worth noting it's below the 44px guideline if this nav ever becomes touch-reachable at that breakpoint), mobile `min-w-[3rem] min-h-[3.5rem]` (48×56px, comfortably meets the 44px minimum) plus a redundant visible text label under the icon — the strongest a11y pattern in the app for icon-plus-label navigation.
- **`RetryButton.tsx`** (the app's own documented a11y reference implementation per `DesignSystemAudit.md`) contains **no icon at all** — it's text-only ("Try again"). Worth noting so a future contributor doesn't go looking for an icon-accessibility pattern there and come up empty; the real icon-accessibility reference is `DashboardShell.tsx`'s nav buttons.
- **`Dialog.tsx`/`Sheet.tsx`** (the shared overlay primitives) do not render their own close ("✕") button — closing is left to the consumer (backdrop click, Escape, or a caller-supplied action inside `children`). This means there's no single shared "icon-only close button" pattern to standardize yet; whatever Batch 7 builds as the canonical close-button icon should be adopted by call sites individually, not retrofitted into `Dialog`/`Sheet` themselves (out of scope — that would be a primitive API change, not an icon swap).
- **No `prefers-reduced-motion` support anywhere in the app** (`grep` for `prefers-reduced-motion`/`motion-reduce` across all `.tsx`/`.css` returns zero matches). This is a pre-existing, app-wide gap unrelated to icons specifically, but Batch 7 will touch at least one animated icon transition (`RecommendationExplanation.tsx`'s expand/collapse chevron, `duration-200` rotate) — the migration should not regress this further, and a shared `<Icon>` component would be a reasonable place to bake in a `motion-reduce:transition-none` default for any future rotating/animating icon variant, without that being a scope-creep redesign (it's a pure accessibility floor, matching `AxisDesignSystem.md` §10's existing non-negotiable list).

---

## 2. Classification

Every icon *pattern* found, classified by role. (Individual icon instances aren't enumerated one-by-one — see §5 for the file-level list.)

| Pattern | Classification | Examples | Notes |
|---|---|---|---|
| `DashboardShell.tsx` nav icons (grid/library/body/settings/profile) | **Navigation** | `NavIcon` component, 5 paths | Already the closest thing to a canonical shared icon component in the app. |
| Toggle/expand chevrons (accordion sections, `RecommendationExplanation`, `Select`) | **Action** | Down-chevron that rotates 180° on expand | Interaction-state-bearing (rotates), needs `motion-reduce` consideration. |
| Close/dismiss icons (Toast, any modal-adjacent consumer) | **Action** | "✕"-shaped path | No single shared close-button icon exists yet — every consumer hand-rolls its own. |
| Back/forward arrows (pre-DS-2 nav headers, still present in a few non-shell contexts) | **Navigation** | Chevron-left shapes | Some of these predate `DashboardShell`'s rollout (Batch 4) and may be dead code now that all 5 routes use the shared shell — worth a quick dead-code check during Batch 7, not a redesign. |
| Trend arrows (`↑`/`↓`/`→` in `MetricTile.tsx` and several card files) | **Informational** | `up`/`down`/`neutral` glyph + `text-success`/`text-caution`/`text-ink-muted` | Color already correctly token-driven per file; glyph choice itself (Unicode vs. SVG) is what Batch 7 would standardize. |
| Onboarding goal/option icons (`Steps1to5.tsx`, `Steps6to10.tsx`, `EquipmentStep.tsx`) | **Informational** (category identity, not a status judgment) | `◎`/`♾`/`⬆`/`◆`/`↻`/`◉`/`▸`/`✕`/`◈`/`▶`/`◇`/`≈`/`—`/`+`/`▲`/`↑` | Same "categorical, not semantic" principle Batch 5 already established for color applies here — these glyphs identify a *category* (which goal, which equipment type), not a good/bad judgment, so a future `<Icon name="...">` swap must preserve one distinct icon per category, not consolidate lookalikes. **Reuse problem**: `◎` currently means both "body composition" and "cycling"; `◆` means both "athletic performance" and "mental performance"; `◉` means "cycle-aware training," "team/court sport," AND "understand my body"; `↻` means both "recover better" and "recovery quality." A shared registry makes this collision visible for the first time — worth a product decision on whether to differentiate them (out of scope for a pure styling/library swap, flag and defer) or accept the reuse (glyphs were never meant to be looked up by meaning, just decorative). |
| Cycle-phase icons (`PhaseCard.tsx`'s `◎ ◐ ● ◑ ◕`) | **Status** (phase-of-cycle indicator) | Same category-identity reasoning as Batch 5's "Late Luteal" color exception — these 5 glyphs are a deliberate progression (waxing/full/waning moon-phase-style shapes), already visually distinct from each other by design, not drifted duplicates. Preserve as-is in meaning; only the *implementation* (glyph → shared icon) is in scope. |
| Confidence/status dots (`ConfidenceBadge.tsx`) | **Status** | CSS-only `bg-current` dot, no glyph/SVG | Already good — not a migration target, a model to point to. |
| Severity markers (`BurnoutPreventionCard.tsx`, `GoalRoadmapCard.tsx` — small `▲`) | **Status** | Colored via `text-danger`/`text-caution`/`text-info` per severity | Color already correct; glyph choice (a small triangle) is arbitrary and could become a shared "alert" icon. |
| Body Intelligence layer picker (`Today`/`Recovery`/`Fatigue`/etc.) | **Navigation/Status** (hybrid — layer selector + legend) | Text-only, no icon glyphs at all | Confirmed via direct read of `OverlaySystem.ts` — the layer picker and legend use text labels and color swatches, not icons. **Out of Batch 7 scope** — there's nothing to migrate here. |
| Workout flow icons (`RestTimerOverlay.tsx`, `WorkoutCompletionView.tsx`, `ExerciseCard.tsx`) | **Action/Decorative** | Play/pause/checkmark-style SVGs | Not yet individually audited icon-by-icon; grouped here by file-level pattern (inline SVG, `currentColor` stroke, no glyph). |
| Decorative background/illustrative SVGs (`app/page.tsx` marketing/landing content, if any) | **Decorative** | — | Lowest priority, purely visual, `aria-hidden` already the norm here. |

---

## 3. Standardization Plan

### 3.1 Canonical icon library — recommendation: **build an internal registry, do not add a dependency**

Two real options exist; recommending the first, but this is a genuine decision point worth a beat of explicit sign-off before Batch 7 starts, since it's the one part of this audit that isn't purely mechanical:

**Option A (recommended): Zero-dependency internal `<Icon>` registry.** Generalize `DashboardShell.tsx`'s existing `NavIcon` pattern into a shared `components/ui/Icon.tsx`: a single component taking a `name` prop, backed by a curated `Record<IconName, string>` map of SVG path data (most of which can be extracted from the 37 files' existing hand-rolled paths — many are already simple, single-path outline icons that don't need redrawing). Consistent with every other DS-2 primitive decision so far (`Select` wraps native `<select>` instead of adding a listbox library; `Sheet`/`Dialog`/`Toast` were built in-house rather than pulling in a modal library) — this app's established pattern is "build the thin shared primitive in-house before reaching for a dependency," and an icon set is no exception. Zero bundle-size risk, zero new supply-chain surface, and the existing `NavIcon` proves the pattern already works end-to-end in this codebase.

**Option B: Add `lucide-react`.** Widely used, tree-shakeable (only imports icons actually used), MIT-licensed, actively maintained, and would cover every icon need in this audit (nav, action, status, chevrons) plus give a much larger library for future features without hand-drawing new SVG paths. The cost is a new dependency and a full re-draw/replace of every existing icon (can't "extract" `lucide`'s paths from the current hand-rolled ones — they're different icon designs), which is more churn than Option A for icons that already look correct today.

**Recommendation: Option A**, specifically because Batch 7's mandate (per every batch instruction so far) is adoption of an existing pattern, not introducing new dependencies or visual redesign — swapping to `lucide-react`'s house style would change how every icon in the app *looks* (different corner radii, stroke weights, silhouettes), which is a real design decision outside a pure migration batch's remit. Option A preserves every icon's current appearance exactly, just centralizes and standardizes *how* it's declared, sized, and colored. Flagging Option B here so it's an explicit, visible choice rather than a default neither considered nor decided.

### 3.2 Approved size scale

Recommend a 4-step scale, mapped to Tailwind's existing spacing scale (no new tokens needed — `AxisDesignSystem.md` §6 already establishes "use Tailwind's default spacing scale, no custom scale needed" as the house rule):

| Token name | Size | Tailwind | Use |
|---|---|---|---|
| `icon-xs` | 12px | `w-3 h-3` | Inline with `text-[11px]`/`text-caption` text (severity markers, trend arrows) |
| `icon-sm` | 16px | `w-4 h-4` | Default action/status icon size — covers the majority of current 13–18px usages |
| `icon-md` | 20px | `w-5 h-5` | Card-header icons, slightly higher-emphasis actions |
| `icon-lg` | 24px | `w-6 h-6` | Nav icons (rounding `DashboardShell`'s current 18px up slightly for consistency with this 4-step scale, a ~1px visual difference, not a redesign) |

This collapses the current 13 ad hoc sizes down to 4, chosen to require the least visual change from the *modal* (most common) current sizes — 16px is already the single most common size found (13 occurrences), so it anchors the default rather than being invented.

### 3.3 Approved color usage

1. **Default: `stroke="currentColor"` / `fill="currentColor"`**, letting the icon inherit color from a token-driven `text-*` class on itself or its parent. This is already the dominant, correct pattern (37 of ~53 stroke declarations) — Batch 7 should convert the remaining hardcoded-hex stragglers onto this pattern wherever the icon's color is meant to track surrounding text (which is the common case).
2. **Where an icon's color is intentionally decoupled from surrounding text** (e.g. a status dot that's always green regardless of the label text color next to it), use a **Tailwind token class directly on the icon** (`text-success`, `text-danger`, etc.) rather than `currentColor` — same rule already established for every other component in Batches 3–6.
3. **Where a literal hex value is unavoidable** (an SVG attribute in a context where neither a class nor `currentColor` applies — e.g. a dynamically-computed ring color passed as a raw prop), use **`var(--color-token-name)` directly as the attribute string** — confirmed working (§1.4) — in preference to importing `lib/design/tokens.ts`'s `color` object for this specific case, since it's simpler and avoids a JS import for a CSS concern. The TS mirror remains correct for genuinely JS-computed values (e.g. picking between three possible token colors based on a runtime score threshold, as several dashboard cards already do) — this is a preference between two already-correct options, not a fix.
4. **Categorical icon sets keep their own distinct colors**, never collapsed onto the semantic success/caution/danger/info/brand ramp — same principle Batch 5 established for categorical colors (PhaseCard's phase accents, MacroBar's per-nutrient legend). `PhaseCard.tsx`'s 5 phase glyphs are the icon-system's version of this: they must stay visually distinct from each other, not get recolored onto a 4-step status scale that would make two phases collide.

### 3.4 Approved interaction states

- **Decorative icons** (the vast majority): `aria-hidden="true"`, no interactive states of their own — any hover/focus/active state belongs to the parent button/link, per `AxisDesignSystem.md` §10's existing rule that interactive elements are real `<button>`/`<a>`, never a clickable icon standing alone.
- **Icon-only interactive elements** (a button whose entire accessible content is an icon): real `aria-label` on the button (not the icon), icon itself `aria-hidden="true"` inside it — exactly `DashboardShell.tsx`'s nav-button pattern, which should be the copy-paste reference for every icon-only button Batch 7 touches.
- **Toggle/rotating icons** (expand/collapse chevrons): keep the existing `transition-transform duration-200`-style rotation (already using a real, if not token-named, duration — `AxisDesignSystem.md` §9's motion-token wiring is explicitly out of scope for icon work per `DS2ImplementationPlan.md`'s batch sequencing, deferred to whatever motion-token batch comes later), and add `motion-reduce:transition-none` as a baseline accessibility floor on any new shared `<Icon>` component's animated variant — this is a floor, not new motion design, so it doesn't conflict with "no new UX flows."
- **Touch targets**: any icon-only button must meet the 44×44px minimum on any breakpoint reachable by touch (mirroring `DashboardShell`'s mobile tab bar, `min-w-[3rem] min-h-[3.5rem]`) — flag, during migration, any icon-only button that doesn't already clear this (none found in the audit above the fold, but not every one of the 42 files was individually measured).

---

## 4. Migration Risk

### Low risk (mechanical swap, no behavior/appearance change expected)

- Files where the icon is purely decorative and already `aria-hidden` + `currentColor`-stroked (majority of the 37 `<svg>` files) — swapping the inline markup for `<Icon name="x" />` should be pixel-identical.
- The 14 hardcoded-hex `stroke=` values already routed through `lib/design/tokens.ts` in Batches 5–6 — converting these to `var(--color-x)` directly (per §3.3) is a same-value substitution.
- Trend-arrow glyphs (`↑`/`↓`/`→`) already using correct token color classes — only the glyph-vs-icon implementation changes, not the color logic around it.

### Medium risk (needs a visual/behavioral check, not just a class-name swap)

- The 7 glyph-icon files (`PhaseCard.tsx`, `Steps1to5.tsx`, `Steps6to10.tsx`, `MetricTile.tsx`, `BurnoutPreventionCard.tsx`, `GoalRoadmapCard.tsx`, `SituationMemoryCard.tsx`) — replacing a Unicode character with an SVG icon changes the exact visual weight/baseline alignment even at "the same" pixel size (glyphs and vector icons don't share metrics), so each needs a side-by-side visual check, not just a mechanical find-replace. `PhaseCard.tsx` specifically is the highest-traffic of these (renders on every dashboard visit) — treat with Batch-3-level care (per-component visual QA), not a batch-wide sweep.
- Toggle/rotating chevrons — confirming the rotation animation still fires correctly and `motion-reduce` doesn't silently break the expand/collapse state (only the *rotation*, not the expand logic itself, should respect reduced motion).
- Any icon-only button discovered mid-migration that's missing an `aria-label` today — fixing it is correct and in-scope (an accessibility floor, per every DS-2 batch's accessibility requirement), but it's a behavior-adjacent change (assistive-tech users will now hear something they didn't before) worth calling out per-instance in the batch report, not silently bundled in.

### High risk (needs explicit product/design input before touching)

- **The glyph-reuse collisions found in §2** (`◎`/`◆`/`◉`/`↻` each currently standing for 2–3 different, unrelated onboarding categories). A shared icon registry will make these collisions visible in a way the current per-file glyph declarations don't — resist the temptation to "fix" this during Batch 7 by assigning each category a genuinely distinct icon, since that's a real information-design decision (which distinct icon best represents "cycle-aware training" vs. "understand my body"?) requiring product sign-off, not a styling migration. Document the collision, preserve the current (shared) glyph-to-icon mapping 1:1 during Batch 7, and flag for a future decision.
- Any back/forward-arrow nav icon found to predate `DashboardShell`'s rollout (§2) — before deleting or migrating, confirm it's genuinely dead code (zero remaining call sites) rather than a still-live secondary nav pattern Batch 4 missed; this needs the same "re-check the orphan, don't assume" discipline `DS2ImplementationPlan.md` Batch 0 used for `BodyViewer.tsx`/`BodyViewport.tsx`.

---

## 5. Batch 7 Scope

### 5.1 Files to be modified (42 unique files)

**Build phase (new, zero existing files touched):**
- `components/ui/Icon.tsx` — new shared component + icon registry (Option A, §3.1)
- `components/ui/index.ts` — barrel export update

**Adoption phase — inline-`<svg>` files (37):**

```
app/page.tsx
app/settings/page.tsx
components/body/BodyPanel.tsx
components/body/MuscleDetailPanel.tsx
components/body/panels/DetailPanel.tsx
components/body/panels/ExerciseIntelligencePanel.tsx
components/body/panels/LeftSidebar.tsx
components/body/panels/RegionDetailsPanel.tsx
components/dashboard/AccordionSection.tsx
components/dashboard/AdherenceCard.tsx
components/dashboard/BodyStatusCard.tsx
components/dashboard/CapacityCard.tsx
components/dashboard/DailyCheckIn.tsx
components/dashboard/DashboardShell.tsx
components/dashboard/ForecastCard.tsx
components/dashboard/PhaseCard.tsx
components/dashboard/ReadinessConfidenceCard.tsx
components/dashboard/RecommendationCards.tsx
components/dashboard/RecommendationExplanation.tsx
components/dashboard/WorkoutFeedbackCard.tsx
components/intelligence/ExplainableRecommendation.tsx
components/intelligence/Tooltip.tsx
components/onboarding/EquipmentStep.tsx
components/onboarding/ProfileSummary.tsx
components/onboarding/ProgressBar.tsx
components/onboarding/Steps1to5.tsx
components/profile/SymptomPreferencesPanel.tsx
components/ui/Accordion.tsx
components/ui/onboarding-primitives.tsx
components/ui/ProgressRing.tsx           (data-viz only — see note below)
components/ui/Select.tsx
components/workout/CompletionButton.tsx
components/workout/ExerciseCard.tsx
components/workout/ExerciseFocusCard.tsx
components/workout/RestScreen.tsx
components/workout/RestTimerOverlay.tsx
components/workout/WorkoutCompletionView.tsx
```

**Adoption phase — glyph-icon files (7, 2 overlapping the list above: `PhaseCard.tsx`, `Steps1to5.tsx`):**

```
components/dashboard/PhaseCard.tsx        (overlap)
components/onboarding/Steps1to5.tsx       (overlap)
components/onboarding/Steps6to10.tsx
components/ui/MetricTile.tsx
components/dashboard/BurnoutPreventionCard.tsx
components/dashboard/GoalRoadmapCard.tsx
components/dashboard/SituationMemoryCard.tsx
```

**Note on `components/ui/ProgressRing.tsx`**: appears in the `<svg>` list because it *contains* an SVG, but it's the data-visualization ring primitive itself (large-format score/confidence rings), not an icon — listed here for completeness since it matched the grep, but **no icon-registry change applies to it**; confirm during Batch 7 kickoff and skip.

**Explicitly out of scope** (confirmed via direct inspection, not just assumption):
- `components/body/rendering/OverlaySystem.ts` and the Body Intelligence layer picker — text labels and color swatches only, zero icon glyphs (§2).
- `components/dev/*` and `app/dev/page.tsx` — dev-tooling-only, consistent with every prior batch's treatment.
- Large-format data-viz SVGs (confidence rings, cycle arcs, score rings — 64–88px) wherever they appear inside the 37-file list above — these are the *ring itself*, not an icon inside a ring; don't recolor/resize them as part of an icon pass.

### 5.2 Estimated icon count

~120–150 individual icon instances across the 42 files (71 raw `<svg>` tags, most files have 1–3; plus glyph instances in the 7 glyph files, several of which declare 5–15 glyphs each in a config array, e.g. `Steps1to5.tsx`'s onboarding-goal list). Treat as directional — exact count depends on how many of the 37 `<svg>` files' icons turn out to be duplicates of the same shape (several already look identical across files per §1.2) and therefore collapse to fewer *registry entries* than raw instances.

### 5.3 Expected effort

**Medium**, matching `DesignSystemAudit.md`'s original estimate ("Medium... cosmetic swap, low interdependency... can be parallelized/split arbitrarily since icon swaps are low-interdependency"). Concretely:

1. Build `Icon.tsx` + registry (small, isolated, zero regression risk — same category as Batch 1's primitive-building work).
2. Extract/normalize path data from the 37 `<svg>` files into the registry (mechanical, but requires eyeballing each for genuine duplicates vs. near-duplicates before consolidating).
3. Swap call sites onto `<Icon name="..." size="..." />`, file by file (low risk per-file, per §4), with the 7 glyph files and any icon-only-button accessibility fixes getting individual visual QA (medium risk per §4).
4. The 2 high-risk items (§4) — glyph-reuse collisions, possible dead nav-icon code — get flagged and deferred, not resolved, in this batch.

### 5.4 Regression risk

**Low-Medium overall**, in line with the Audit's original risk rating. The main real risk is visual (a swapped icon looking subtly different from its hand-rolled predecessor — different stroke width, different corner rounding), which is why Option A (§3.1, reuse existing path data rather than a new library's redrawn icons) keeps this risk low by construction. No behavioral/logic risk is expected — icons carry no state or business logic in this codebase (confirmed: no icon in the audit gates a `recommendation`/`Safety Engine`/`Verification Registry`/`Confidence` computation; they're purely presentational).

---

## 6. Recommended Migration Approach

1. Confirm the Option A vs. Option B decision (§3.1) explicitly before starting — this is the one non-mechanical judgment call in this whole batch and deserves a sentence of sign-off rather than a default.
2. Build `components/ui/Icon.tsx` + registry as an isolated, zero-call-site first commit (mirrors Batch 1's "build the primitive, adopt it separately" discipline).
3. Adopt across the 37 `<svg>` files first (lower risk, higher file count) in a small number of grouped commits (by directory, similar to Batch 5/6's grouping), holding the 7 glyph files for last (medium risk, needs visual QA per file).
4. Do not resolve the glyph-reuse collisions or investigate possible dead nav-icon code as part of adoption — flag both explicitly in the Batch 7 report for a follow-up decision, per §4's high-risk guidance.
5. Verify: `tsc --noEmit`, `vitest run`, and a full visual QA pass (desktop + mobile) analogous to Batches 5/6's dashboard walkthrough, plus a dedicated keyboard-only pass on every icon-only button touched (confirms no `aria-label` regressions).
