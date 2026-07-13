# Axis Design System

**Status:** v1.0 (DS-1) — formalizes the design language that already exists in the codebase (primarily introduced as "Axis Design System 2.0" in Phase 61, `app/globals.css` + `lib/design/tokens.ts`) and sets binding standards for everything built on top of it going forward.

This document is prescriptive. It does not describe current adoption levels — see `docs/design/DesignSystemAudit.md` for the as-built state, and `docs/design/DesignSystemImplementationGap.md` for what's already compliant vs. what needs work.

---

## 1. Product Philosophy

Axis is a menstrual-cycle-aware training app whose core promise is that it *adapts* — to cycle phase, recovery state, symptoms, equipment, and behavior over time — and that it can *explain why*. The product is not a static workout plan; it's a running conversation between the athlete's data and a set of intelligence engines (confidence scoring, verification, recovery modeling, adaptive coaching).

Every design decision should reinforce three things the product is actually built to do:

1. **Adapt.** Recommendations change with the user's state. The UI must make change legible (what changed, and why) rather than presenting each session as a fresh, unexplained state.
2. **Explain.** The app already computes confidence, evidence grades, and counterfactuals (`lib/evidence/counterfactualEngine`, the Verification Registry, the Confidence Engine). Design must surface this reasoning, not bury it — an adaptive system that can't explain itself reads as arbitrary.
3. **Earn trust incrementally.** The app is explicit in places (`ConfidenceBadge.tsx`'s own comment: *"no numeric percentages for users"*) that trust should be communicated qualitatively, especially early, rather than through false precision. This principle should be applied consistently — it currently is not (see §11 and the Audit).

## 2. Design Principles

1. **One system, not one-off.** A card, button, or color choice made in a new feature must first ask "does `components/ui/` already solve this?" before writing new markup. The shared library (`components/ui/`) is real, typed, and functional — new UI is a bug in the design system if it doesn't use it.
2. **Tokens over literals.** No new component may introduce a raw hex value, an arbitrary Tailwind bracket color (`bg-[#...]`), or a magic spacing/duration value where a token already exists for that purpose. If no token exists for a legitimate new need, add the token — don't work around it locally.
3. **Hierarchy is a layout decision, not a scroll order.** With 80+ intelligence cards competing for space (see Audit §Dashboard), every new card must be explicitly placed into one of the three dashboard layers (§8) at the time it's built — never just appended to the bottom of the page.
4. **Confidence and explainability have one voice.** There is one way to show "how sure is Axis," and one way to show "why did Axis recommend this." Net-new confidence or explanation UI reuses the canonical component (§11); it does not invent a fifth variant.
5. **Accessible by construction, not by audit.** Interactive elements are real `<button>`/`<input>`/`<label>` elements with the states (`aria-*`, focus rings, keyboard handling) built in from the primitive, so individual feature authors don't have to remember to add them each time.
6. **Every screen has three states before it ships:** the loaded state, the empty state, and (where data can fail to load) the error state. A card with no plan for "no data yet" is incomplete, not just unpolished.

## 3. Design Tokens

The single source of truth is the CSS-native `@theme inline { ... }` block in `app/globals.css` (lines 13–104), mirrored 1:1 in TypeScript at `lib/design/tokens.ts` for contexts that can't consume Tailwind classes (inline `style=`, Three.js materials, SVG props). **These two files must never diverge** — any change to one must be mirrored in the other by hand until they're generated from a single source (see DS-2).

Token categories currently defined:
- **Surface / text / border**: `--color-surface`, `--color-canvas`, `--color-ink`, `--color-ink-muted`, `--color-ink-secondary`, `--color-border`
- **Brand**: `--color-brand`, `--color-brand-dark` (declared but currently unpaired with any dark-mode strategy — see §9 and Audit)
- **Semantic status**: success / caution / danger / info / neutral, each with a `-bg` variant for tinted backgrounds
- **Domain accents**: cycle, nutrition, performance
- **Elevation**: `shadow-card` and related shadow tokens
- **Motion**: `--duration-fast/normal/slow/slower`, `--ease-spring/smooth/out`
- **Type**: `--font-sans` (DM Sans), `--font-serif` (Lora) — both loaded via `next/font/google` in `app/layout.tsx` and correctly bound to these variables. `--font-mono` is declared but nothing currently loads a mono font — either wire one up or remove the token (see Gap doc).

**Rule going forward:** a color, spacing value, duration, or easing curve used in more than one place is a token candidate. If it's genuinely one-off (e.g. a hairline `h-[2px]` progress bar where the spacing scale has no small-enough step), an arbitrary value is acceptable — but it must be the exception, not, as it is today, ~90+ files' default approach.

**Legacy file to retire:** `components/dashboard/globals.css` is a second, Tailwind-v3-syntax theme file with a different token naming scheme (`--c-brand`, `--c-bg`, etc.) and its own Google Fonts `@import`. It has zero live imports — it exists only as copy-pasted reference in three component READMEs. Delete it and update those READMEs; a second theme file sitting in the tree invites a future contributor to import the wrong one.

## 4. Typography

Type scale (`app/globals.css` lines 128–198), applied as semantic utility classes — **use these, not raw `text-[Npx]`**:

| Class | Size / weight | Use |
|---|---|---|
| `.type-display` | 36px / 700 | Rare, hero numbers only |
| `.type-page-title` | 24px / 600 | Route-level page titles |
| `.type-section-title` | 18px / 600 | Accordion / section headers |
| `.type-card-title` | 15px / 600 | Card headings |
| `.type-metric-xl` / `.type-metric` / `.type-metric-sm` | 40 / 28 / 20px, tabular-nums | Numeric readouts (readiness score, recovery %, etc.) — tabular figures required so numbers don't jitter the layout as they update |
| `.type-body-md` | 14px / 400 | Primary body copy |
| `.type-body` | 13px / 400 | Secondary body copy |
| `.type-caption` | 11px | Meta text, timestamps |
| `.type-micro` | 10px, uppercase, letter-spaced | Eyebrow labels, tags |

Two typefaces, deliberately: **DM Sans** (`--font-sans`) for UI and body text, **Lora** (`--font-serif`) reserved for a small number of editorial/headline moments. Serif usage must stay rare and intentional — it should signal "this is a considered, human-authored insight," not become a default card-title font (an inconsistency already present in the recovery cards; see Audit).

## 5. Colors

Colors are used for two jobs and must not be mixed:
- **Structural** (surface, canvas, ink, border) — always via tokens (`bg-surface`, `text-ink`, `border-border`).
- **Semantic status** (success/caution/danger/info/neutral) — always via the semantic tokens, never a raw palette color chosen for its look (e.g. `emerald-600`/`amber-600`/`red-500` used directly). Two components computing "how good is this recovery score" must map to the same five-step semantic scale, not invent their own category vocabulary (existing drift: `optimal/ready/moderate/cautious/recover` vs. `Excellent/Good/Moderate/Compromised/Poor` for conceptually the same score — pick one, canonicalize it here: **use the `ReadinessCard.tsx` scale (`optimal/ready/moderate/cautious/recover`) as canonical**, since it already maps directly onto the 5-step success→danger token ramp).
- **Domain accents** (cycle / nutrition / performance) exist as their own token group specifically so phase- or domain-colored UI (e.g. `PhaseCard.tsx`) doesn't need to invent a bespoke palette. `PhaseCard.tsx` currently does invent one (`#FDF3F2`, `#9B2015`, `#6B4F8C`, etc.) — this is the canonical example of a component that predates the token system and must be migrated (DS-2).

**Dark mode:** no strategy currently exists (no `dark:` variants, no `prefers-color-scheme`, no `data-theme`). This is a real gap, not a stylistic choice — it should be scoped explicitly as a roadmap item (see DS-7) rather than solved ad hoc by whichever component happens to need it first.

## 6. Spacing

Use Tailwind's default spacing scale (`p-*`, `gap-*`, `px-*`) — there is no custom scale, and none is needed; the default scale is already the dominant pattern (~8:1 over arbitrary values). Arbitrary bracket values (`p-[13px]`) are permitted only where the default scale genuinely has no adequate step (e.g. sub-4px hairlines) — not as a substitute for picking the nearest scale value.

## 7. Component Standards

`components/ui/` is the canonical shared library and must be the first stop for any new UI need. It already covers: `Button`, `Card` (+ `CardHeader`/`CardDivider`/`CardSection`/`CardRow`/`ProgressBar`/`ToggleChip`), `Badge` (+ `Pill`/`StatPill`/`RpePill`), `TextInput`/`Textarea`, `ProgressRing`, `SectionHeader`, `EmptyState`/`LoadingState`/`Skeleton`, `MetricTile`/`StatGrid`, `Accordion`, `Divider`, and layout primitives (`PageContainer`/`ContentSection`/`Panel`/`DashboardGrid`).

Standards:
- **Import path**: always `@/components/ui/<Component>` (or, once fixed — see Gap doc — the barrel `@/components/ui`). Do not hand-roll a card container (`rounded-2xl border ...` divs) or a button (`<button className="...">`) when `Card`/`Button` already exist and do the job.
- **Props**: shared components take a `variant` + `size` pattern (`Button`, `Badge`, `Card`). New shared components must follow this same shape rather than inventing bespoke prop names per component.
- **No duplicate primitives.** `components/ui/onboarding-primitives.tsx` currently duplicates `Button` with its own `StepContinueButton`. This is the pattern to avoid — if onboarding needs pill-shaped, full-width CTAs, that's a `Button` variant, not a parallel component.
- **Missing primitives that must be built, not improvised per-feature**: Modal/Dialog, Toast, Tabs, Select/Dropdown, Sheet. Two features (`app/settings/page.tsx`, `components/body/BodyIntelligenceViewer.tsx`) already each hand-rolled their own overlay — the next feature that needs one must use a shared `Dialog`, not a third hand-rolled version.

## 8. Dashboard Hierarchy

The dashboard (`app/dashboard/page.tsx`) already implements a deliberate three-layer model — this is the standard, and it is good; the rule going forward is that every new card must be placed correctly within it, not appended below the fold:

1. **Layer 1 — Always visible.** The primary, actionable content for *today*: check-in, daily status, the workout itself, safety constraints, top-line confidence, highlights. Nothing goes here unless a user should see it on every visit without expanding anything. Currently: `DailyCheckIn`, `DailyStatus`, `TrainingCard`, `SafetyConstraintBanner`, `ConfidenceBadge`, `WorkoutCard`, `TodayHighlights`, `BodyStatusCard`.
2. **Layer 2 — Expandable intelligence.** Grouped into named `AccordionSection`s (Recovery, Cycle Intelligence, Nutrition, Progress & Performance, Athlete Development, Training Plan, Performance Tracking, Insights & Analytics, Lifestyle & Adherence). Only the section the user is most likely to check daily (currently Recovery) defaults open. New cards belong in the section matching their domain — not a new top-level section unless a genuinely new domain is being introduced.
3. **Layer 3 — Advanced.** Meta/calibration content (confidence internals, calibration, drift, executive summaries) behind a single "Axis Intelligence" accordion, explicitly for power users. This is also, currently, where explainability and confidence UI has been getting buried by default (see Audit) — that placement should be revisited per DS-3, since "why did Axis recommend this" is arguably Layer 1/2 content, not an advanced/optional extra.

Composition today is hand-placed JSX, not a declarative registry — that's an acceptable v1 pattern given the current card count, but if the dashboard continues to grow, a config-driven card registry (id → layer → section) is worth considering in a later phase so layer placement is enforced structurally rather than by convention.

## 9. Motion System

Tokens exist (`--duration-fast/normal/slow/slower`, `--ease-spring/smooth/out`) and must be used for all transitions — reference them via Tailwind's arbitrary-value syntax against the CSS var, or inline `style` where Tailwind can't reach, exactly as `ProgressRing.tsx` and `ConfidenceIndicator.tsx` already do. Do not hardcode a duration class (`duration-500`, `duration-300`, etc.) chosen by eye — six different undocumented duration values are already in inconsistent use across the app; new work must not add a seventh.

No animation library is installed and none is required for current needs — CSS transitions plus the duration/easing tokens are sufficient for the current interaction vocabulary (expand/collapse, hover, progress fill, fade-in). A dedicated animation library is in scope only if DS-4 (Motion System) determines choreographed/gesture-driven interactions are needed.

## 10. Accessibility Standards

Baseline, non-negotiable for all new and refactored components:
- Interactive elements are real `<button>`, `<input>`, `<label htmlFor>` — never `<div onClick>`. (The codebase already holds this line well — keep holding it.)
- Any modal/sheet/dialog must: trap focus while open, close on `Escape`, restore focus to the triggering element on close, and carry `role="dialog"` + `aria-modal="true"`. (`BodyIntelligenceViewer.tsx`'s sheet currently has the roles but none of the actual keyboard/focus behavior — this is a concrete, fixable bug, not a future nice-to-have.)
- Any element whose content updates without user action (a score changing, a check-in confirming) that isn't inside a page navigation should use `aria-live` appropriately (polite for routine updates, assertive only for errors/interruptions) — following the precedent already set well in `ErrorFallback.tsx`.
- Every form input has an explicit associated `<label htmlFor>` — not a placeholder standing in for a label.
- Any future `<img>` or meaningful SVG icon carries `alt`/`aria-label`; purely decorative SVG carries `aria-hidden="true"`.
- Focus states are visible (`focus-visible:outline`) on every interactive element — `RetryButton.tsx` is the reference implementation.

These should be built into the shared primitives in `components/ui/` (a `useFocusTrap` hook, a `<VisuallyHidden>` utility) so correctness is inherited automatically rather than re-implemented — and re-forgotten — per feature.

## 11. Explainability Guidelines

Axis has real, sophisticated explainability logic (signal drivers, counterfactuals via `lib/evidence/counterfactualEngine`, evidence grading) — the guideline is about presentation discipline, not building new capability:

- **One explanation component.** There is currently one canonical, token-compliant implementation (`components/intelligence/ExplainableRecommendation.tsx`) and four other components doing an overlapping job with inconsistent visuals and hardcoded colors (`RecommendationExplanationCard`, `SignalImportanceCard`, `ExplainabilityCard`, `RecommendationExplanation`). Going forward, explanatory UI extends the canonical component's data model rather than spawning a sibling.
- **Explainability is not "advanced."** "Why did Axis recommend this" is core-loop content for a product whose whole value proposition is adaptive reasoning — it should live in Layer 1 or the default-open portion of Layer 2, not require opening the Layer-3 "Axis Intelligence" accordion to find.
- **Confidence has one visual language**, decided once here: **qualitative by default** (High/Medium/Low, as `ConfidenceBadge.tsx` already documents as the intent), with numeric detail available on tap/expand for users who want it — never a raw percentage as the first thing shown. This directly resolves the current contradiction where `ConfidenceIndicator`, `ConfidenceDashboardCard`, and `ReadinessConfidenceCard` all lead with a bare `%` against `ConfidenceBadge`'s own stated design intent.
- **Consistent vocabulary.** "Medium" and "moderate" are not two different confidence levels — pick one term (`Medium`) and use it everywhere a three-step confidence scale is shown.
- Any component that computes and displays a score derived from Axis's models (confidence, recovery, readiness) but is not actually mounted anywhere (e.g. `TrustDashboard.tsx`) is either wired into the dashboard or deleted — a fully-built, unreachable trust surface is worse than not having it, since it silently drifts out of sync with the components that are live.

## 12. Voice and Tone

Derived from the app's own best existing copy (`ErrorFallback.tsx`, `EmptyState` usage, `ConfidenceBadge`'s qualitative-only stance) rather than invented fresh:

- **Calm, not alarming**, even when something has gone wrong. *"Something unexpected happened... Your data is safe"* is the model — reassurance before apology, no raw technical detail in the primary message.
- **Confident but not falsely precise.** Prefer qualitative framing (High/Medium/Low, "ready," "recovering") over bare numbers as the headline; numbers are supporting detail, not the lead.
- **Direct and short.** Card copy is functional, not marketing voice — describe the state and, where relevant, the one action available (a check-in, a retry), not a paragraph of explanation on the card face itself (save the depth for the explainability surface, §11).
- **Second person, present tense** for status ("Your recovery is trending down this week"), not passive/report voice ("Recovery score decreased").

## 13. Future Extensibility

This document defines v1 of the token and component contract. Known, intentionally deferred extension points:
- **Dark mode** — token structure (`--color-*` custom properties) already supports a `data-theme` or `prefers-color-scheme` override strategy without a rewrite; no dark values are defined yet (§5, DS-7).
- **Generated token sync** — `app/globals.css`'s `@theme` block and `lib/design/tokens.ts` are hand-mirrored today; a build step to generate one from the other removes an entire class of future drift (DS-2).
- **Icon system** — no icon library or shared `<Icon>` component exists yet (current usage is unicode glyphs + 34 files of hand-rolled inline SVG); adding one is in scope for DS-2/DS-6 rather than this foundational pass.
- **Card registry** — if dashboard card count keeps growing past its current ~89, migrate from hand-placed JSX to a declarative layer/section registry (§8).
- **Charting primitives** — no shared chart components exist beyond `ProgressRing`; DS-6 (Data Visualization) is scoped to build a small shared chart kit (sparkline, ring, ranked-bar, timeline) so future charts stop being reinvented per card.
