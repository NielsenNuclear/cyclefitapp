# Dashboard Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /onboarding                                                 │   │
│  │  10-step form → writes axis_onboarding to localStorage      │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ redirect on complete                   │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /dashboard   (app/dashboard/page.tsx)                       │   │
│  │                                                              │   │
│  │  useEffect()                                                 │   │
│  │    ├─ localStorage.getItem("axis_onboarding")                │   │
│  │    │    └─ if null → router.push("/onboarding")              │   │
│  │    ├─ calculatePhase(lastPeriodDate, cycleLength)            │   │
│  │    └─ generateRecommendation(phase, user)                    │   │
│  │         └─ setRecommendation(result)                         │   │
│  │                                                              │   │
│  │  render: DashboardShell                                      │   │
│  │    ├─ DashboardHeader       ← readiness badge, greeting      │   │
│  │    ├─ PhaseCard             ← cycle arc, energy trend        │   │
│  │    ├─ TrainingCard          ← focus, intensity, suggestions  │   │
│  │    ├─ NutritionCard         ← macro emphasis, nutrients      │   │
│  │    ├─ RecoveryCard          ← sleep target, practices        │   │
│  │    └─ RecommendationExplanation ← signal audit (expandable)  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

Pure function layer (no React, no side effects):
  lib/cycle/calculatePhase.ts
  lib/recommendations/generateRecommendation.ts
```

---

## Data Flow

```
localStorage("axis_onboarding")
        │
        │  JSON.parse → OnboardingData
        ▼
calculatePhase({
  lastPeriodDate,   ← "YYYY-MM-DD"
  cycleLength,      ← days (e.g. 28)
  cycleRegularity   ← "regular" | "irregular" | ...
})
        │
        │  returns PhaseData
        ▼
generateRecommendation(phase, user)
        │
        │  returns DailyRecommendation
        ▼
React state: setRecommendation(result)
        │
        ▼
Components render from recommendation.*
  recommendation.phase          → PhaseCard
  recommendation.training       → TrainingCard + DashboardHeader (badge)
  recommendation.nutrition      → NutritionCard
  recommendation.recovery       → RecoveryCard
  recommendation.explanationPoints → RecommendationExplanation
  recommendation.disclaimer     → RecommendationExplanation (footer)
```

**Guard:** if `localStorage("axis_onboarding")` is absent, the route immediately
redirects to `/onboarding`. No dashboard renders without onboarding data.

**Loading state:** `recommendation` initialises as `null`. The page renders nothing
(`return null`) until the pipeline completes, preventing a flash of empty UI.

---

## File Structure

```
app/
  dashboard/
    page.tsx                    ← Route entry point (Client Component)
  onboarding/
    page.tsx                    ← Onboarding multi-step form

components/
  dashboard/
    DashboardShell.tsx          ← Sticky nav, mobile tab bar, page wrapper
    DashboardHeader.tsx         ← Greeting, date, readiness badge
    PhaseCard.tsx               ← Cycle arc SVG, energy trend bar, phase info
    RecommendationCards.tsx     ← TrainingCard, NutritionCard, RecoveryCard
    RecommendationExplanation.tsx ← Expandable signal audit with disclaimer
    globals.css                 ← Dashboard-scoped global styles
    README.md                   ← Component-level notes

lib/
  cycle/
    calculatePhase.ts           ← Phase calculation (pure function)
  recommendations/
    generateRecommendation.ts   ← Recommendation engine (pure function)
  adaptive-profile.ts           ← Signal weighting logic
  onboarding-types.ts           ← OnboardingData interface + STEPS config

types/
  recommendation.ts             ← All recommendation-domain TypeScript types
  onboarding.ts                 ← MOCK_USER stub (used during development only)
```

All dashboard logic has a single canonical location. No duplicates remain.

---

## Onboarding Pipeline

The onboarding form at `/onboarding` collects 10 steps of user data and writes
the complete `OnboardingData` object to `localStorage("axis_onboarding")` on
completion.

### Step Sequence

| Step | Category | Fields collected |
|---|---|---|
| 1 | Goals | `goals[]` |
| 2 | Experience | `trainingLevel`, `trainingYears` |
| 3 | Training style | `trainingStyles[]`, `sessionsPerWeek` |
| 4 | Recovery | `recoveryPractices[]` |
| 5 | Sleep | `sleepHours`, `sleepQuality` |
| 6 | Stress | `stressLevel`, `stressSources[]` |
| 7 | Energy | `energyPattern`, `lowEnergyTriggers[]` |
| 8 | Physiology | `cycleLength`, `lastPeriodDate`, `cycleRegularity`, `trackingPreference` |
| 9 | Symptoms | `symptoms[]`, `symptomSeverity` |
| 10 | Priorities | `performancePriorities[]`, `primaryGoalDeadline` |

### Storage

```ts
localStorage.setItem("axis_onboarding", JSON.stringify(onboardingData));
```

Key: `axis_onboarding`
Format: JSON-serialised `OnboardingData`
Scope: browser origin (no expiry set)

---

## Recommendation Pipeline

The recommendation pipeline runs entirely in the browser on each dashboard load.
Both functions are pure: given the same inputs they always return the same output.

### Phase Calculation — `calculatePhase(input)`

```
Input:  lastPeriodDate (YYYY-MM-DD), cycleLength (days), cycleRegularity?
Output: PhaseData
```

1. Compute `cycleDay`: days elapsed since last period, wrapped modulo `cycleLength`.
2. Build four `PhaseWindow` ranges using hormonal research defaults:
   - Menstrual: days 1–5
   - Follicular: days 6 to (ovulationDay − 2)
   - Ovulatory: (ovulationDay − 1) to (ovulationDay + 1)
   - Luteal: remainder
3. Find the window containing `cycleDay`.
4. Refine: if in Luteal and within the final 4 days, reclassify as `Late Luteal`.
5. Attach energy trend, hormonal context, and physiological note.

### Recommendation Engine — `generateRecommendation(phase, user)`

```
Input:  PhaseData, OnboardingData
Output: DailyRecommendation
```

The engine computes a **readiness modifier** (−2 to +2) from:

| Signal | Weight | Effect |
|---|---|---|
| Sleep quality | ~40% (primary) | Poor/variable: −1 or −2 modifier |
| Stress level | Primary at ≥7 | High stress: −1 or −2 modifier |
| Session frequency | Secondary | ≥5 sessions/week for non-competitive: −1 |
| Cycle phase | ~10% (advisory) | Shapes intensity range, not overrides |

The modifier shifts training badge and intensity recommendations:

| Badge | Modifier range |
|---|---|
| Push | +1 or +2 |
| Maintain | 0 |
| Watch | −1 |
| Recover | −2 |

Four sub-builders produce the output:

- **`buildTraining(phase, user)`** — badge, focus, intensity, suggestions, signal drivers
- **`buildNutrition(phase, user)`** — macro emphasis, key nutrients, hydration, timing
- **`buildRecovery(phase, user)`** — sleep target, practices, stress note
- **`buildExplanation(phase, user)`** — transparency layer: each signal, observation, implication, weight

---

## Component Hierarchy

```
DashboardPage                    [Client Component — app/dashboard/page.tsx]
│  Owns: recommendation state, redirect logic, pipeline execution
│
└─ DashboardShell                [layout]
   │  Sticky nav (desktop) + fixed bottom tab bar (mobile)
   │  max-w-2xl centred, bg #FAF9F5
   │
   ├─ DashboardHeader            Props: recommendation
   │    Displays: date, time-of-day greeting, motivational context line,
   │    readiness badge (Push/Maintain/Watch/Recover)
   │
   └─ <div px-5 space-y-4>      Content column
      │
      ├─ PhaseCard               Props: phase (PhaseData)
      │    Displays: phase name, cycle arc SVG, energy trend bar,
      │    physiological note, days until next phase
      │
      ├─ TrainingCard            Props: training (TrainingRecommendation)
      │    Displays: focus label, badge, intensity, headline quote,
      │    rationale body, suggestion list, optional avoid note
      │
      ├─ NutritionCard           Props: nutrition (NutritionRecommendation)
      │    Displays: focus, body, macro emphasis pill, priority list,
      │    key nutrient tags, hydration note, optional timing note
      │
      ├─ RecoveryCard            Props: recovery (RecoveryRecommendation)
      │    Displays: focus, body, sleep target, practice list,
      │    optional stress note
      │
      └─ RecommendationExplanation  Props: points[], disclaimer
           Collapsible accordion. Displays each ExplanationPoint:
           signal name, weight badge, observation, implication.
           Disclaimer shown at bottom of expanded state.
```

**Internal atoms in `RecommendationCards.tsx`** (not exported):
- `CardLabel` — section header typography
- `ListItem` — bullet list item with dot
- `PillTag` — coloured pill (neutral / teal / purple / amber variants)

---

## Key TypeScript Types

### `OnboardingData` — `lib/onboarding-types.ts`

The complete user profile collected during onboarding. 20 fields across 10 steps.

```ts
interface OnboardingData {
  goals: string[];
  trainingLevel: string;
  trainingYears: string;
  trainingStyles: string[];
  sessionsPerWeek: number;
  recoveryPractices: string[];
  sleepHours: number;
  sleepQuality: string;          // "excellent" | "good" | "variable" | "poor"
  stressLevel: number;           // 1–10
  stressSources: string[];
  energyPattern: string;
  lowEnergyTriggers: string[];
  cycleLength: number;
  lastPeriodDate: string;        // "YYYY-MM-DD"
  cycleRegularity: string;
  trackingPreference: string;
  symptoms: string[];
  symptomSeverity: string;
  performancePriorities: string[];
  primaryGoalDeadline: string;
}
```

### `PhaseData` — `types/recommendation.ts`

Output of `calculatePhase`. Describes the user's current cycle position.

```ts
interface PhaseData {
  name: PhaseName;               // "Menstrual" | "Follicular" | "Ovulatory" | "Luteal" | "Late Luteal"
  cycleDay: number;              // 1-indexed day in current cycle
  cycleLength: number;
  dayInPhase: number;            // 1-indexed day within this phase
  energyTrend: EnergyTrend;      // "Rising" | "Peak" | "Variable" | "Declining" | "Low"
  hormonalContext: string;       // brief hormonal summary
  physiologicalNote: string;     // what's typically happening in the body
  daysUntilNextPhase: number;
}
```

### `DailyRecommendation` — `types/recommendation.ts`

Root output of `generateRecommendation`. Passed into all display components.

```ts
interface DailyRecommendation {
  generatedAt: string;            // ISO timestamp
  phase: PhaseData;
  training: TrainingRecommendation;
  nutrition: NutritionRecommendation;
  recovery: RecoveryRecommendation;
  explanationPoints: ExplanationPoint[];
  disclaimer: string;
}
```

### `TrainingRecommendation`

```ts
interface TrainingRecommendation {
  badge: ReadinessBadge;         // "Push" | "Maintain" | "Watch" | "Recover"
  focus: string;
  intensity: IntensityLevel;     // "Low" | "Light to Moderate" | "Moderate" | "Moderate to High" | "High"
  headline: string;
  body: string;
  suggestions: string[];
  signalDrivers: string[];       // human-readable list of what drove this recommendation
  avoidNote?: string;
}
```

### `ExplanationPoint`

```ts
interface ExplanationPoint {
  signal: string;
  observation: string;
  implication: string;
  weight: "Primary" | "Secondary" | "Advisory";
}
```

---

## Extension Points

### Add a daily check-in

The recommendation engine is already parameterised on `sleepQuality` and
`stressLevel`. A daily check-in form can update these fields in localStorage
before the dashboard runs its pipeline. No changes to the engine are required —
the readiness modifier will respond automatically.

Suggested approach:
1. Add a `axis_checkin_today` localStorage key with `{ sleepQuality, stressLevel, date }`.
2. In `app/dashboard/page.tsx`, merge check-in data over the onboarding baseline before calling `generateRecommendation`.
3. The engine reads the same field names — no signature changes.

### Add history tracking

Each `DailyRecommendation` includes a `generatedAt` ISO timestamp and the full
`PhaseData` snapshot. Persisting to a `axis_history` array in localStorage (or a
backend) requires no changes to the pipeline — snapshot the output after
`generateRecommendation` returns.

### Connect to a backend

Replace the `localStorage.getItem("axis_onboarding")` read in
`app/dashboard/page.tsx` with an API call. The pipeline downstream is
unchanged — `calculatePhase` and `generateRecommendation` are pure functions
that accept the same types regardless of where the data came from.

### Add new recommendation domains

`DailyRecommendation` can be extended with new fields (e.g. `supplements`,
`mindfulness`) without breaking existing components. Add a new `buildX` function
in `generateRecommendation.ts` following the same pattern, and add a
corresponding display component in `components/dashboard/`.

### Adjust signal weighting

The readiness modifier logic is isolated in `getReadinessModifier()` in
`generateRecommendation.ts` (lines 24–38). Changing signal weights affects all
phase recommendations uniformly without touching the per-phase switch blocks.

### Irregular cycle support

`calculatePhase` already accepts `cycleRegularity` as an optional input. The
current implementation uses it as metadata only. Irregular cycle handling —
such as widening phase windows or reducing phase confidence — can be added
inside `calculatePhase` without changing its public signature.
