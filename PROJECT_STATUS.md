# Project Status — Axis (CycleFit)

## Overview

Axis is a female-focused adaptive coaching platform that builds personalized training, nutrition, and recovery recommendations from cycle phase, sleep, stress, and energy signals. The current codebase is a **feature-complete frontend prototype** — the design, UI, onboarding flow, recommendation logic, and component architecture are all built. The backend (database, API, auth) does not yet exist.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19.2.4 |
| Styling | Tailwind CSS 4 |
| Fonts | Geist (body), DM Sans (UI), DM Serif Display (headings) |
| Database | None yet |
| Auth | None yet |
| API | None yet |

---

## Current Architecture

```
cyclefitapp/
├── app/                          # Next.js App Router routes
│   ├── layout.tsx                # Root layout — fonts, global styles
│   ├── page.tsx                  # Landing page (standalone, no imports)
│   ├── globals.css               # Tailwind + CSS variable setup
│   ├── onboarding/
│   │   └── page.tsx              # Onboarding orchestrator → saves to localStorage
│   └── dashboard/
│       └── page.tsx              # Dashboard orchestrator → renders mock data
│
├── components/
│   ├── ui/
│   │   └── onboarding-primitives.tsx   # Reusable atoms: OptionCard, ChipSelect,
│   │                                    # NumberStepper, ScaleSlider, SegmentedControl
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx    # Step router + state manager
│   │   ├── ProgressBar.tsx       # StepHeader — progress indicator + back button
│   │   ├── StepWrapper.tsx       # Animated step shell + continue button
│   │   ├── Steps1to5.tsx         # Goals, Training, Style, Recovery, Sleep
│   │   ├── Steps6to10.tsx        # Stress, Energy, Cycle Info, Symptoms, Priorities
│   │   └── ProfileSummary.tsx    # Final screen — adaptive profile reveal animation
│   └── dashboard/
│       ├── DashboardShell.tsx    # Sticky nav, brand logo, mobile tab bar
│       ├── DashboardHeader.tsx   # Greeting, date, readiness score ring
│       ├── PhaseCard.tsx         # Cycle phase display — arc progress, hormonal context
│       └── RecommendationCards.tsx  # TrainingCard, NutritionCard, RecoveryCard
│
├── lib/                          # Pure business logic (no React)
│   ├── onboarding-types.ts       # OnboardingData interface, STEPS config array
│   ├── adaptive-profile.ts       # buildAdaptiveProfile() — weights, badges, insights
│   ├── cycle/
│   │   └── calculatePhase.ts     # calculatePhase() — phase, energy trend, hormonal context
│   └── recommendations/
│       └── generateRecommendation.ts  # generateRecommendation() — training/nutrition/recovery
│
└── types/
    ├── onboarding-types.ts       # (duplicate of lib/onboarding-types.ts)
    └── recommendation.ts         # PhaseName, DailyRecommendation, all sub-types
```

---

## Existing Pages

### `/` — Landing Page (`app/page.tsx`)
Full marketing site. Sections: hero, feature pills, "What Axis is not" comparison, rotating adaptive coaching preview cards, social proof stats, 5-signal explainer ("How it works"), onboarding CTA, science callout, footer. Self-contained — no component imports.

### `/onboarding` — Onboarding Flow (`app/onboarding/page.tsx`)
10-step intake form. Collects goals, training history, recovery practices, sleep, stress, energy patterns, cycle data, symptoms, and performance priorities. On completion, calls `buildAdaptiveProfile()`, saves both raw data and profile to `localStorage`, and navigates to `/dashboard`. The POST to `/api/onboarding/complete` is commented out, waiting for a backend.

### `/dashboard` — Daily Dashboard (`app/dashboard/page.tsx`)
Displays training, nutrition, and recovery recommendations for the day. Currently renders **hardcoded mock data** — the `calculatePhase()` and `generateRecommendation()` functions are available in `lib/` but not yet wired to the dashboard.

---

## Existing Components

### Onboarding Components (`components/onboarding/`)

| Component | Role |
|-----------|------|
| `OnboardingFlow` | Top-level orchestrator. Owns `OnboardingData` state, routes between steps 1–10 and the summary screen, calls `buildAdaptiveProfile()` on finish |
| `ProgressBar` / `StepHeader` | Progress bar + step count + back button |
| `StepWrapper` | Animated shell around each step. Validates before advancing |
| `Steps1to5` | Steps 1–5 UI: Goals (chips), Training Level (option cards), Training Style (multi-select), Recovery Practices (chips), Sleep (stepper + segment) |
| `Steps6to10` | Steps 6–10 UI: Stress (slider + chips), Energy Pattern (option cards), Cycle Info (stepper + date + segment), Symptoms (chips + severity), Performance Priorities (ranked chips + deadline) |
| `ProfileSummary` | Post-onboarding screen. Animated weight bars (signal importance), readiness ring build-up, coaching insight card |

### Dashboard Components (`components/dashboard/`)

| Component | Role |
|-----------|------|
| `DashboardShell` | Layout chrome. Sticky top nav with logo + icon buttons, scrollable content area, mobile bottom tab bar |
| `DashboardHeader` | Greeting ("Good morning, [name]"), current date, animated readiness score ring |
| `PhaseCard` | Shows current cycle phase (Menstrual/Follicular/Ovulatory/Luteal/Late Luteal), arc progress bar, energy trend badge, days until next phase, hormonal context, physiological note |
| `RecommendationCards` | Three cards: `TrainingCard` (badge, intensity, headline, suggestions), `NutritionCard` (macro emphasis, key nutrients, timing), `RecoveryCard` (sleep target, practices, stress note) |

### UI Primitives (`components/ui/onboarding-primitives.tsx`)

| Primitive | Role |
|-----------|------|
| `OptionCard` | Single-select card with icon, title, subtitle. Selected state highlighted |
| `ChipSelect` | Multi-select pill chips |
| `NumberStepper` | Increment/decrement integer input |
| `ScaleSlider` | 1–10 slider with labeled endpoints |
| `SegmentedControl` | 2–4 option button group |
| `StepContinueButton` | Primary CTA button for step advancement |
| `StepLabel` | Section label typography |

### Business Logic (`lib/`)

| Module | What it does |
|--------|--------------|
| `calculatePhase()` | Takes last period date + cycle length → returns phase name, cycle day, energy trend, hormonal context, physiological note, days until next phase |
| `generateRecommendation()` | Takes `PhaseData` + `UserOnboarding` → returns `DailyRecommendation` with training badge, intensity, headline, suggestions, nutrition priorities, recovery protocol, and explanation points (signal transparency layer) |
| `buildAdaptiveProfile()` | Takes completed `OnboardingData` → returns calibrated signal weights, training badge, nutrition approach, recovery protocol, coaching insight, key signals list |

---

## Missing Pieces

### Backend (nothing exists yet)
- **Database** — No schema, no migrations, no ORM (Prisma/Drizzle). No tables for users, cycle profiles, recommendations, or daily check-ins.
- **API routes** — No `app/api/` directory. The `/api/onboarding/complete` POST is commented out. No endpoint to read or persist user data.
- **Authentication** — No sign-up, login, session management, or protected routes. `/dashboard` is publicly accessible.

### Missing Features
- **Daily check-in form** — No way to log today's sleep quality, energy level, soreness, or stress. The recommendation engine is built to consume these signals but there's no input UI.
- **Real dashboard data** — Dashboard page uses hardcoded mock data. `calculatePhase()` and `generateRecommendation()` are not called; `localStorage` data from onboarding is not read.
- **History / trend view** — The nav has a history icon but no `/history` page exists.
- **Profile / settings page** — The nav has a profile icon but no `/profile` page exists.
- **Cycle log** — No UI to record or adjust cycle data over time (period start dates, cycle length changes).
- **Push / email reminders** — No notification infrastructure.

### Code Quality Gaps
- **Duplicate files** — `onboarding-types.ts`, `adaptive-profile.ts`, and `onboarding-primitives.tsx` are duplicated between `lib/`, `types/`, and `components/`. Only `lib/` and `types/` should be authoritative.
- **No `.env.example`** — No documented environment variable requirements.
- **No tests** — Zero test files. Recommendation logic in `lib/` is pure and easily unit-testable.
- **No error boundaries** — Unhandled rejections or render errors will crash silently.
- **Hardcoded mock data in dashboard** — `MOCK_RECOMMENDATION` object in `app/dashboard/page.tsx` should be replaced with real data fetching.

---

## Recommended Next Development Order

### Phase 1 — Wire the frontend to real data (no backend required yet)

These tasks eliminate the mock data and make the existing logic actually run, without touching the server.

1. **Read onboarding data from localStorage in dashboard** — Replace `MOCK_RECOMMENDATION` with a call to `calculatePhase()` and `generateRecommendation()` using the stored onboarding data. This makes the dashboard immediately personalized.
2. **Build daily check-in UI** — A small form (sleep hours, sleep quality, energy, stress, soreness) that saves to localStorage and feeds into `generateRecommendation()` for same-day signal updates.
3. **Deduplicate shared files** — Remove copies of `onboarding-types.ts` and `adaptive-profile.ts` from `components/onboarding/` and `types/`. Update imports to use `lib/` as the single source.

### Phase 2 — Add persistence (backend introduction)

4. **Choose and set up ORM** — Add Prisma or Drizzle with a Postgres or SQLite database. Define schema: `users`, `cycle_profiles`, `daily_checkins`, `recommendation_log`.
5. **Implement API routes** — `POST /api/onboarding/complete`, `POST /api/checkin`, `GET /api/dashboard` (returns today's phase + recommendation).
6. **Authentication** — Add NextAuth.js or Clerk. Protect `/dashboard` and `/onboarding` routes. Replace localStorage usage with database reads/writes.
7. **Environment config** — Add `.env.example` with `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.

### Phase 3 — Complete missing pages

8. **`/profile` page** — Edit cycle data, training preferences, symptom history. Recalibrate adaptive weights.
9. **`/history` page** — Chart of readiness scores, phase progression, recommendation history over time.
10. **Cycle log** — UI to record new period start dates; auto-adjusts future phase calculations.

### Phase 4 — Quality and polish

11. **Unit tests for `lib/`** — `calculatePhase()` and `generateRecommendation()` are pure functions; test all phase boundaries, edge cases (very short/long cycles, missing data).
12. **Error boundaries** — Wrap dashboard and onboarding in React error boundaries with graceful fallback UI.
13. **Accessibility audit** — Check color contrast, keyboard navigation, ARIA labels on interactive elements.
14. **Responsive QA** — Test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1280px (desktop).
