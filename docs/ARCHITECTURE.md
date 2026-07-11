# Axis — Architecture Overview

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, see AGENTS.md for version notes) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Persistence | `localStorage` (all user data is client-side only) |
| 3D rendering | Three.js / GLTF via `GltfBody` component (optional — falls back to `PlaceholderBody`) |

## Directory structure

```
app/                    # Next.js App Router routes
  dev/                  # Developer Tools (/dev)
  privacy/              # Privacy Dashboard (/privacy)
  terms/                # Terms of Service (/terms)
  medical-disclaimer/   # Medical Disclaimer (/medical-disclaimer)

components/
  dev/                  # Developer tool UI panels
  intelligence/         # User-facing intelligence badges and cards
  privacy/              # Privacy dashboard UI
  resilience/           # ErrorBoundary

lib/
  data/                 # Schema definitions, migrations, data integrity
    schema/             # STORAGE_SCHEMA_MAP, SchemaDefinition types
    migrations/         # MigrationEngine — schema versioning + VersionStamp
    integrity/          # DataIntegrityService — health checks + cross-validation
  dev/                  # Developer experience tooling
    FeatureFlags.ts     # Runtime feature flag system
    DebugConsole.ts     # Structured debug logging
    MockDataGenerator.ts # Synthetic test data injection
  intelligence/
    confidence/         # Trust & confidence framework (Phases 67)
    safety/             # Safety governance and rules (Phase 68)
  launch/               # Beta readiness and launch checklist (Phase 76)
  performance/          # Performance budgets, memoCache, benchmarks (Phase 71)
  privacy/              # Consent registry, data inventory, deletion (Phase 72)
  qa/                   # QA audit types, feature audit, release checklist (Phase 73)
  resilience/           # IntegrityMonitor, SessionRecovery, RecoveryManager (Phase 69)
  telemetry/            # Privacy-first telemetry (Phase 75)
  testing/              # Regression scenarios

research/               # Evidence library (BibTeX, README per folder)
scripts/                # CLI utilities (verify_refs.py, setup_zotero.py)
docs/                   # This documentation
```

## Data layer

All user data lives in `localStorage` under `axis_*` keys. There are no server calls during normal app use.

Every stored object is stamped with a `VersionStamp` (`_schemaVersion`, `_createdAt`, `_updatedAt`, `_migrationVersion`) via `MigrationEngine.stampVersion()`. `STORAGE_SCHEMA_MAP` in `lib/data/schema/coreSchemas.ts` is the single source of truth for which keys exist and what shape they hold.

SSR safety: every function that touches `localStorage` begins with `if (!isClient()) return ...` where `isClient = () => typeof window !== "undefined"`.

## Intelligence engine (Phases 1–72)

The adaptive intelligence system is composed of layered engines:

1. **Onboarding** — 11-step profile collection
2. **Recommendation engine** — generates workout plans from profile + cycle phase + readiness
3. **Adaptive engine** — adjusts volume/intensity based on feedback loops
4. **Safety governance** — 9 rules (critical → informational priority) that constrain volume scale
5. **Confidence framework** — 6-dimension weighted composite score (calibration 25%, verification 20%, data completeness 20%, personalization maturity 15%, prediction stability 10%, historical context 10%)
6. **Verification registry** — records recommendation outcomes and computes success rates
7. **Decision trace** — full audit log of every recommendation decision
8. **Regression suite** — 15 canonical scenarios with snapshot diffing

**Rule: Do not modify Adaptive Engine logic without explicit Phase specification.** All Phases 64+ are additive observability and governance — they instrument but do not change the core algorithm.

## Algorithm versioning

All traces, verification records, and snapshots carry `algorithmVersion: "axis-v1.0"`. When the algorithm changes materially, bump this string and register a migration in `MigrationEngine`.

## Security & privacy

- No credentials are hardcoded. API keys (Zotero) come from environment variables only.
- `scripts/.env` is gitignored. Never commit it.
- The app makes no outbound network calls during normal use. `ConsentRegistry` controls future opt-in features (cloud sync, wearables) — all default to `false`.
- `DeletionFramework` provides category-level and full-wipe deletion.

## Performance targets

| Operation | Target | Budget source |
|---|---|---|
| Dashboard render | < 200ms | `PerformanceBudget` |
| Recommendation compute | < 100ms | `PerformanceBudget` |
| Storage read | < 5ms | `PerformanceBudget` |
| Interaction (set completion) | < 50ms | `PerformanceBudget` |

`MemoCache` (TTL-aware, LRU-eviction) is used for recommendation and analytics caches. Default TTL: 5 minutes (aligned with Next.js prompt cache window).
