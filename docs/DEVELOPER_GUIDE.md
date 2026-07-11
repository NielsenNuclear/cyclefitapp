# Axis — Developer Guide

## Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Type-check without emitting (run before every commit)
npx tsc --noEmit

# Production build
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in values. The following are currently used:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BODY_MODEL_URL` | URL to GLTF anatomical model (optional — falls back to `PlaceholderBody`) |
| `ZOTERO_API_KEY` | Zotero API key for research library sync (scripts only, never in-app) |
| `ZOTERO_LIBRARY_ID` | Zotero library ID (scripts only) |

**Never hardcode credentials. Never commit `.env` files.**

## Coding standards

### TypeScript
- Strict mode is enabled. All code must pass `npx tsc --noEmit` before committing.
- Prefer `interface` over `type` for object shapes. Use `type` for unions.
- No `any`. Use `unknown` and narrow explicitly.

### React / Next.js
- All interactive components need `"use client"` at the top.
- The only place a React class component is appropriate is `ErrorBoundary` (requires lifecycle methods unavailable in function components).
- SSR safety: guard every `localStorage` access with `if (typeof window === "undefined") return`.
- See `AGENTS.md` — this version of Next.js has breaking API changes. Read `node_modules/next/dist/docs/` before writing routing or data-fetching code.

### Storage
- All `localStorage` keys follow the pattern `axis_<feature>_v<n>` (e.g. `axis_verification_registry_v1`).
- Register new keys in `STORAGE_SCHEMA_MAP` in `lib/data/schema/coreSchemas.ts`.
- Stamp all stored objects via `MigrationEngine.stampVersion()`.
- Never silently delete user data — use `DeletionFramework` functions explicitly.

### Comments
- Default to no comments. Add one only when the WHY is non-obvious.
- No multi-line docstrings or paragraph comment blocks.

### Algorithm changes
- Do not modify the core adaptive recommendation engine without an explicit Phase specification.
- All observability, governance, and QA work (Phases 64+) is additive — it instruments the engine, never changes its logic.
- Bump `algorithmVersion` in traces when the algorithm changes materially.

## Developer tools

Visit `/dev` in the browser to access the Intelligence Workbench. It includes:

- **Verification** — recommendation outcome tracking
- **Traces** — full audit log and replay
- **Regression** — 15-scenario snapshot diffing
- **Confidence** — trust profile and dimension inspector
- **Safety** — rule activation audit
- **Resilience** — storage health + chaos testing
- **Data Health** — schema validation, cross-object consistency
- **Performance** — timing stats and scalability benchmarks
- **QA** — feature audit and release checklist
- **Dev Tools** — feature flags, debug console, mock data injection
- **Telemetry** — product analytics (privacy-first)
- **Launch** — beta readiness dashboard

Feature flags (`lib/dev/FeatureFlags.ts`) let you toggle dev-only behaviors at runtime. All flags default to `false`.

Mock data injection (`lib/dev/MockDataGenerator.ts`) injects synthetic workout history, recovery check-ins, and cycle data tagged with `_isMock: true`, stored in separate keys from real user data.

## Research library

The evidence library lives in `research/`. See `research/CITATION_STANDARDS.md` for citation rules.

Before adding a new reference:
1. Confirm the DOI resolves at `https://doi.org/{doi}`.
2. Run `python scripts/verify_refs.py` — it exits non-zero on unresolved DOIs.
3. Never invent authors, titles, journals, years, volumes, pages, or DOIs.

## Release process

1. Run `npx tsc --noEmit` — must be clean.
2. Run `npm run build` — must succeed.
3. Open `/dev` → QA tab → feature audit must have zero blockers.
4. Open `/dev` → Launch tab → beta readiness must be green.
5. All required items in the Release Checklist must be `complete` or `skipped`.
6. Legal review: Terms, Privacy Policy, Medical Disclaimer must be signed off.
