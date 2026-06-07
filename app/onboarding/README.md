# Axis — Adaptive Female Performance Platform
## Onboarding Flow — Installation Guide

---

### Stack
- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS v3**
- Fonts: DM Sans + DM Serif Display (Google Fonts, no install needed)

---

### File structure

```
app/
├── globals.css                         ← Base styles + font imports
├── layout.tsx                          ← Root layout (add globals.css import here)
└── onboarding/
    └── page.tsx                        ← Route: /onboarding

components/
├── ui/
│   └── onboarding-primitives.tsx       ← OptionCard, ChipSelect, ScaleSlider,
│                                          NumberStepper, SegmentedControl,
│                                          StepContinueButton, StepLabel
└── onboarding/
    ├── OnboardingFlow.tsx              ← Main orchestrator (step router + state)
    ├── ProgressBar.tsx                 ← ProgressBar + StepHeader
    ├── StepWrapper.tsx                 ← Animated step shell + continue button
    ├── Steps1to5.tsx                   ← Goals, Experience, Style, Recovery, Sleep
    ├── Steps6to10.tsx                  ← Stress, Energy, Cycle, Symptoms, Priorities
    └── ProfileSummary.tsx              ← Final adaptive profile summary screen

lib/
├── onboarding-types.ts                 ← OnboardingData type, EMPTY_ONBOARDING, STEPS config
└── adaptive-profile.ts                 ← buildAdaptiveProfile() — derives profile from answers
```

---

### Installation

**1. Create a new Next.js project** (skip if adding to existing):
```bash
npx create-next-app@latest axis --typescript --tailwind --app --src-dir
cd axis
```

**2. Copy files**
Copy each file from this package into the matching path in your project:
```
app/globals.css                         → app/globals.css
app/onboarding/page.tsx                 → app/onboarding/page.tsx
components/ui/onboarding-primitives.tsx → components/ui/onboarding-primitives.tsx
components/onboarding/OnboardingFlow.tsx
components/onboarding/ProgressBar.tsx
components/onboarding/StepWrapper.tsx
components/onboarding/Steps1to5.tsx
components/onboarding/Steps6to10.tsx
components/onboarding/ProfileSummary.tsx
lib/onboarding-types.ts
lib/adaptive-profile.ts
```

**3. Configure path aliases**
Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```
And `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

**4. Add font import to root layout**
In `app/layout.tsx`, ensure `globals.css` is imported:
```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**5. Run**
```bash
npm run dev
```
Navigate to `http://localhost:3000/onboarding`

---

### Connecting to your backend

In `app/onboarding/page.tsx`, replace the localStorage stub with a real API call:

```ts
const handleComplete = async (data: OnboardingData) => {
  const res = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save");
  router.push("/dashboard");
};
```

The API route should accept `OnboardingData` (see `lib/onboarding-types.ts`) and create:
- `users` record
- `cycle_profiles` record
- Initial `recommendations` baseline

See `adaptive_femtech_platform.js` for full database schema.

---

### Extending the flow

**Add a step:**
1. Add to `STEPS` array in `lib/onboarding-types.ts`
2. Add field(s) to `OnboardingData` and `EMPTY_ONBOARDING`
3. Create the step component in `Steps1to5.tsx` or `Steps6to10.tsx`
4. Add to the step router in `OnboardingFlow.tsx`
5. Add validation case to `canAdvance()`

**Customise validation:**
Edit `canAdvance()` in `OnboardingFlow.tsx` — each step returns `boolean`.

**Customise profile logic:**
Edit `buildAdaptiveProfile()` in `lib/adaptive-profile.ts` — it derives all profile fields from `OnboardingData`.

---

### Component API reference

| Component | Props | Purpose |
|---|---|---|
| `OptionCard` | `label, selected, onClick, description?, icon?, accent?, size?` | Single/multi select card |
| `ChipSelect` | `options, selected, onChange, max?` | Pill chip multi-select |
| `ScaleSlider` | `value, onChange, min, max, lowLabel?, highLabel?` | Labelled range slider |
| `NumberStepper` | `value, onChange, min, max, step, unit?` | +/− numeric stepper |
| `SegmentedControl` | `options, value, onChange` | Segmented tab selector |
| `StepWrapper` | `step, canContinue, onContinue, isLast?` | Animated step shell |
| `ProgressBar` | `currentStep, totalSteps?` | Progress bar + dots |
| `StepHeader` | `currentStep, onBack` | Top nav with progress |
| `ProfileSummary` | `data, profile, onComplete` | Final summary screen |
| `OnboardingFlow` | `onComplete` | Full flow orchestrator |

---

### Design tokens

All colours are defined as Tailwind arbitrary values matching the platform spec:

| Token | Value | Use |
|---|---|---|
| Primary | `#534AB7` | Brand, primary actions |
| Primary light | `#EEEDFE` | Selected states, callouts |
| Teal | `#0F6E56` | Success, positive signals |
| Teal light | `#E1F5EE` | Positive backgrounds |
| Amber | `#854F0B` | Warning, caution |
| Amber light | `#FAEEDA` | Warning backgrounds |
| Text primary | `#1C1B18` | Headings, primary copy |
| Text muted | `#6B6860` | Body copy |
| Text faint | `#8A8880` | Labels, meta |
| Background | `#FAF9F6` | Page background |
| Border | `#E8E5DC` | Card borders |
