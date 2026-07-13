# DS-2 Migration Baseline

**Captured:** 2026-07-13, Batch 0. **Frozen reference point** — do not edit these numbers as migration proceeds; re-measure and record deltas in `DS2Progress.md` instead. This is the success metric DS-2 is measured against on completion.

**Method:** `ripgrep` pattern counts across all `.tsx` files in `components/` and `app/` (195 files total — this matches the surface scanned by the DS-1 audits). Counts are grep-derived and approximate by nature (a handful of matches may be non-visual, e.g. a hex value inside a comment) but are consistent and reproducible — re-run the same commands post-migration for an apples-to-apples comparison.

---

## Summary Metrics

| Metric | Count |
|---|---|
| Total `.tsx` files analyzed (`components/` + `app/`) | **195** |
| Files with ≥1 hardcoded hex color | **133** (68%) |
| Total hardcoded hex color occurrences | **3,500** |
| Files using raw Tailwind palette color classes (e.g. `emerald-600`, not a token) | **47** (24%) |
| Raw Tailwind palette color occurrences | **603** |
| Files using semantic token color classes (`bg-surface`, `text-ink`, `bg-brand`, etc.) | **49** (25%) |
| Files using shared shadow tokens (`shadow-card`, `shadow-subtle`, `shadow-float`) | **14** (7%) |
| Files using `.type-*` typography classes | **20** (10%) |
| Files using raw arbitrary `text-[Npx]` instead of `.type-*` | **154** (79%) |
| Raw arbitrary `text-[Npx]` occurrences | **1,451** |
| Files using arbitrary spacing brackets (`p-[13px]`, `w-[24px]`, etc.) | **37** (19%) |
| Arbitrary spacing occurrences | **55** |
| Standard Tailwind spacing-scale occurrences (`p-4`, `gap-2`, etc.) | **3,262** |
| Files importing from `@/components/ui/*` at all | **5** (2.6%) |
| **Files fully compliant** (zero hardcoded hex, zero arbitrary `text-[]`, zero raw palette classes) | **15** (7.7%) |
| Files using ≥1 token class **but** still containing a violation elsewhere in the same file | **42** |
| Files using ≥1 token class **and** fully clean | **7** |
| **Files requiring migration** (≥1 of the three tracked bypass patterns) | **180** (92.3%) |

**Read on the headline number:** only **15 of 195 files (7.7%)** are fully compliant with the token system today. This is a stricter and more precise figure than the DS-1 audits' file-count estimates (which used slightly different, broader sampling) — treat this as the authoritative baseline going forward.

---

## Hardcoded Colors

133 files, 3,500 occurrences. Heaviest concentrations (top of the list — not exhaustive):

| File | Hex occurrences (top value) |
|---|---|
| `app/page.tsx` | 24× `#534AB7`, 21× `#1C1B18`, 18× `#8A8880`, 11× `#EAE7DE` |
| `components/onboarding/Steps6to10.tsx` | 21× `#8A8880` |
| `components/exercises/ExerciseLibraryCard.tsx` | 19× `#9B9690` |
| `components/dashboard/RecoveryOptimizationCard.tsx` | 15× `#9B9690` |
| `components/body/panels/ExerciseIntelligencePanel.tsx` | 15× `#9B9690` |
| `components/onboarding/ProfileSummary.tsx` | 14× `#534AB7` |
| `components/ui/onboarding-primitives.tsx` | 11× `#8A8880`, 9× `#1C1B18` |

Notable: `#9B9690` (the exact hex value of `--color-ink-muted`) and `#534AB7` (the exact hex value of `--color-brand`) are among the most-repeated hardcoded values in the app — meaning a large share of "hardcoded" color usage isn't inventing new colors, it's re-typing existing token values as literals. This is good news for migration risk: most of these are mechanical find-and-replace (`#9B9690` → `text-ink-muted` or equivalent), not judgment calls about what color something should be.

`#8A8880` appears heavily in onboarding but does not match any defined token exactly — closest is `--color-ink-muted` (`#9B9690`) or `--color-ink-secondary` (`#5C5850`); this one needs a judgment call (or a new token) rather than mechanical substitution, flagged for Batch 2.

## Arbitrary Spacing

Comparatively minor — 37 files, 55 occurrences, against 3,262 standard-scale occurrences (~59:1 ratio). This confirms the DS-1 audit's finding that spacing is *not* a significant problem area. No dedicated remediation pass needed beyond normal cleanup incidental to each batch's file touches.

## Border Radius — Duplicate Values & a Naming Collision

Usage by class, across the app:

| Class | Occurrences |
|---|---|
| `rounded-full` | 357 |
| `rounded-xl` | 208 |
| `rounded-2xl` | 185 |
| `rounded-lg` | 104 |
| `rounded` (bare) | 25 |
| `rounded-t` / `rounded-md` / `rounded-r` / `rounded-sm` / `rounded-l` | 6 / 5 / 4 / 3 / 1 |
| Arbitrary `rounded-[Npx]` (14px, 12px, 10px) | 3 (2 files) |

**Finding requiring a decision, not a mechanical fix — do not silently resolve in Batch 0:** `lib/design/tokens.ts` defines a `radius` scale (`sm:8, md:12, lg:16, xl:20, "2xl":24, pill:9999`), but `app/globals.css`'s `@theme` block does **not** define any `--radius-*` custom properties — its own comment states "standard Tailwind rounded-xl covers this," relying on Tailwind's *built-in* default radius scale (`rounded-sm=2px, rounded-md=6px, rounded-lg=8px, rounded-xl=12px, rounded-2xl=16px, rounded-3xl=24px, rounded-full=9999px`) instead.

That assumption is only partially true, and creates a real naming collision:
- `radius.sm` (8) ↔ Tailwind `rounded-lg` (8px) ✓ — name mismatch but value matches
- `radius.md` (12) ↔ Tailwind `rounded-xl` (12px) ✓ — name mismatch but value matches
- `radius.lg` (16) ↔ Tailwind `rounded-2xl` (16px) ✓ — name mismatch but value matches
- `radius.xl` (20) ↔ **no Tailwind default utility produces 20px** — there is no way to express this token via a plain class name today
- `radius["2xl"]` (24) ↔ Tailwind `rounded-3xl` (24px), **not** `rounded-2xl` — the token's own name ("2xl") and Tailwind's class of the same name ("rounded-2xl") refer to two different pixel values (24px vs 16px)

Given `rounded-xl` (208 uses) and `rounded-2xl` (185 uses) are two of the most common classes in the app, this collision is a live source of confusion, not a theoretical one — a contributor reasoning from the token name `radius["2xl"]` could easily reach for the wrong class. **This is not fixed as part of Batch 0**: defining explicit `--radius-*` values in the `@theme` block to resolve it would silently redefine what every existing `rounded-lg`/`rounded-xl`/`rounded-2xl` in the app renders as (since Tailwind v4's `@theme` radius keys override the built-in scale directly), which is exactly the kind of behavior-changing, high-blast-radius move DS-2's rules prohibit without deliberate review. Logged as a known issue in `DS2Progress.md`; recommend resolving via distinctly-named utilities (e.g. a documentation clarification, not a token/class rename) at the point radius is actually touched in a later batch, with explicit sign-off first.

## Duplicate Shadow Values

Usage by class:

| Class | Occurrences |
|---|---|
| Arbitrary `shadow-[...]` (bracket syntax) | 114 |
| `shadow-card` (token) | 19 |
| `shadow-sm` (Tailwind default, non-token) | 13 |
| `shadow` (bare, non-token) | 8 |
| `shadow-2xl` / `shadow-xl` / `shadow-lg` (Tailwind default, non-token) | 4 / 1 / 1 |
| `shadow-subtle` (token) | 2 |
| `shadow-float` (token) | 1 |

(`shadow-camera`, `shadow-mapSize`, `shadow-bias` — 20 combined hits — are React Three Fiber light props, not Tailwind classes; excluded from the counts above.)

**Concrete duplicate found:** `shadow-[0_1px_12px_rgba(0,0,0,0.04)]` is hardcoded **82 separate times** across the codebase. Compare to the actual `--shadow-card` token: `0 1px 12px rgba(28, 27, 24, 0.06)` — same offset/blur values, different (near-black vs. token-ink) color and opacity. This reads as the same design intent as `shadow-card`, reimplemented by hand 82 times with a slightly different value each time it was typed rather than copy-pasted from a single source — the single highest-value, lowest-risk mechanical fix available in the whole baseline (replace with `shadow-card`, verify the very slight visual delta is acceptable, done). A smaller family of brand-purple "glow" shadows (`rgba(83,74,183,...)`, ~10+ near-variant occurrences, mostly in onboarding) has no token equivalent at all — candidate for a new token if this glow effect is intentional and worth keeping consistent, otherwise candidate for removal/simplification.

## Typography Inconsistencies

154 files (79% of the codebase) use raw `text-[Npx]` arbitrary sizing — 1,451 occurrences — against only 20 files (10%) using the defined `.type-*` semantic classes. This is the single largest compliance gap of any category measured, both in file-count and raw occurrence count, and confirms the DS-1 audit's finding at much higher precision than the earlier sample-based estimate.

## Components Already Using Design Tokens

- **49 files** use at least one semantic color token class.
- Of those, only **7** are otherwise fully clean (no hex/arbitrary-text/raw-palette elsewhere in the file) — the other **42** are "mixed": they've adopted tokens in some places while still bypassing them in others (the exact pattern the DS-1 Audit flagged in `components/ui/Card.tsx` itself, now confirmed as a widespread pattern, not an isolated case).
- **5 files** actually import a component from `@/components/ui/*`.

## Components Still Bypassing the Design System

**180 of 195 files (92.3%)** trigger at least one of the three tracked bypass patterns (hardcoded hex, raw arbitrary typography, or raw Tailwind palette color). This is the number DS-2 exists to reduce.

---

## Estimated Migration Effort (grounded in the counts above)

| Work item | Basis | Relative effort |
|---|---|---|
| Color token migration | 133 files, 3,500 hex occurrences (many mechanically map to exact existing token values) | Large, but substantially mechanical |
| Typography token migration | 154 files, 1,451 arbitrary `text-[]` occurrences | Large — highest occurrence count of any category |
| Raw-palette → semantic-token migration | 47 files, 603 occurrences | Medium |
| `shadow-[0_1px_12px_rgba(0,0,0,0.04)]` → `shadow-card` | 82 occurrences, single find-and-replace pattern | **Small — highest-value quick win identified in this baseline** |
| Arbitrary spacing cleanup | 37 files, 55 occurrences | Small (already a minor category) |
| `components/ui/*` primitive adoption | 5 files today, ~130+ target call sites per `DesignRoadmap.md` | Large (tracked separately in `DS2ImplementationPlan.md` batches 2–6) |
| Border-radius naming collision | Documentation/decision only in DS-2; no mass edit planned yet | Small, but requires explicit sign-off before any resolution |

This table refines, but does not replace, the batch-level estimates in `DS2ImplementationPlan.md` — those batches remain the execution plan; this baseline is what each batch's "after" numbers get compared against.
