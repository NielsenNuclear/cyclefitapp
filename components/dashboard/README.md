# Axis Dashboard — Installation Guide

## Architecture

```
app/
└── dashboard/
    └── page.tsx                        ← Thin orchestration only. No business logic.

components/
└── dashboard/
    ├── DashboardShell.tsx              ← Layout: nav, mobile tab bar, max-width wrapper
    ├── DashboardHeader.tsx             ← Greeting, date, readiness badge
    ├── PhaseCard.tsx                   ← Phase name, cycle arc, energy trend, hormonal note
    ├── RecommendationCards.tsx         ← TrainingCard + NutritionCard + RecoveryCard
    ├── RecommendationExplanation.tsx   ← Collapsible transparency layer (why?)
    └── DashboardShell.tsx              ← Page layout + nav

lib/
├── cycle/
│   └── calculatePhase.ts              ← Pure function: dates → PhaseData
└── recommendations/
    └── generateRecommendation.ts      ← Pure function: PhaseData + user → DailyRecommendation

types/
├── onboarding.ts                      ← UserOnboarding interface + MOCK_USER
└── recommendation.ts                  ← All recommendation types (PhaseData, DailyRecommendation, etc.)

app/
└── globals.css                        ← Fonts (Lora + DM Sans), base styles
```

---

## Data flow

```
MOCK_USER (types/onboarding.ts)
    ↓
calculatePhase() (lib/cycle/calculatePhase.ts)
    ↓ PhaseData
generateRecommendation() (lib/recommendations/generateRecommendation.ts)
    ↓ DailyRecommendation
page.tsx passes structured data to components
    ↓
DashboardHeader | PhaseCard | TrainingCard | NutritionCard | RecoveryCard | RecommendationExplanation
```

---

## Installation

### 1. Add to existing Next.js project

Copy files into your project at matching paths. The dashboard assumes the onboarding
`types/onboarding.ts` file is already present (from the onboarding package).

If starting fresh:
```bash
npx create-next-app@latest axis --typescript --tailwind --app
cd axis
```

### 2. Path aliases

`tsconfig.json` must have:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

### 3. Import globals.css in root layout

```tsx
// app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 4. Navigate to dashboard

```
http://localhost:3000/dashboard
```

---

## Replacing mock data with real user data

In `app/dashboard/page.tsx`, replace `MOCK_USER` with a real fetch:

```tsx
// Server component — fetch user from DB
import { getServerSession } from "next-auth";
import { getUserProfile }   from "@/lib/db/users";

export default async function DashboardPage() {
  const session = await getServerSession();
  const user    = await getUserProfile(session.userId);

  const phase          = calculatePhase({ ... });
  const recommendation = generateRecommendation(phase, user);
  ...
}
```

---

## Connecting to daily check-in data

To make the dashboard readiness-driven (not just phase-driven), extend `generateRecommendation()` to also accept a `DailyCheckIn` object with today's sleep/energy/soreness/stress signals. The engine's `getReadinessModifier()` already handles this — just wire in real check-in data.

---

## Component props reference

| Component | Key props |
|---|---|
| `DashboardHeader` | `recommendation: DailyRecommendation, userName?: string` |
| `PhaseCard` | `phase: PhaseData` |
| `TrainingCard` | `training: TrainingRecommendation` |
| `NutritionCard` | `nutrition: NutritionRecommendation` |
| `RecoveryCard` | `recovery: RecoveryRecommendation` |
| `RecommendationExplanation` | `points: ExplanationPoint[], disclaimer: string` |
| `DashboardShell` | `children: React.ReactNode` |

---

## Design tokens

| Token | Value | Use |
|---|---|---|
| Brand purple | `#534AB7` | Primary actions, phase accent |
| Brand purple light | `#EEEDFE` | Selected states, callouts |
| Teal | `#0F6E56` | Push badge, success |
| Amber | `#854F0B` | Watch, caution |
| Background | `#FAF9F5` | Warm off-white page bg |
| Border | `#E8E5DC` | Card borders |
| Text | `#1C1B18` | Near-black |
| Text muted | `#6B6860` | Body copy |
| Text faint | `#9B9690` | Labels, metadata |
| Display font | Lora (serif, italic accents) | Headings, phase names |
| Body font | DM Sans | All body copy |

---

## Extending the dashboard

**Add a new card:**
1. Add fields to `DailyRecommendation` in `types/recommendation.ts`
2. Add generation logic in `lib/recommendations/generateRecommendation.ts`
3. Create `components/dashboard/YourCard.tsx`
4. Import and render in `app/dashboard/page.tsx`

**Add a new phase:**
1. Add to `PhaseName` union in `types/recommendation.ts`
2. Add to `getPhaseWindows()` in `lib/cycle/calculatePhase.ts`
3. Add to all `switch` blocks in `lib/recommendations/generateRecommendation.ts`
4. Add to `PHASE_CONFIG` in `components/dashboard/PhaseCard.tsx`
