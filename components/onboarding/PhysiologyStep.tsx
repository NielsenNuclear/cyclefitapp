"use client";

// ─── Step 12: Body Metrics ─────────────────────────────────────────────────────
// Nutrition Intelligence 2.0. Establishes a physiological baseline (age,
// height, weight, activity level) so Axis can compute real BMR/TDEE-based
// nutrition targets from day one, instead of a flat default. Sex is optional
// and only affects the Mifflin-St Jeor constant used in
// lib/nutrition/tdee.ts — left unset (or "prefer_not_to_say") defaults to
// the female constant, matching the app's core cycle-tracking assumption.
// Dietary preference is stored for future use and does not affect any
// current calculation.

import { NumberStepper, OptionCard, SegmentedControl } from "@/components/ui/onboarding-primitives";
import type { OnboardingData } from "@/lib/onboarding-types";

interface StepProps {
  data:     OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

// Values here must match lib/nutrition/tdee.ts's ACTIVITY_MULTIPLIERS keys —
// the same loose-coupling convention already accepted for goals/GoalType
// (see lib/exercises/goalBasedSelection.ts's mapOnboardingGoalToGoalType).
const ACTIVITY_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "sedentary",   label: "Sedentary",         desc: "Little to no structured exercise, desk-based day" },
  { value: "light",       label: "Lightly active",    desc: "Light exercise 1–3 days a week" },
  { value: "moderate",    label: "Moderately active",  desc: "Moderate exercise 3–5 days a week" },
  { value: "active",      label: "Very active",       desc: "Hard exercise 6–7 days a week" },
  { value: "very_active", label: "Athlete",            desc: "Very hard training, often twice a day" },
];

const SEX_OPTIONS = [
  { value: "female",             label: "Female" },
  { value: "male",                label: "Male" },
  { value: "prefer_not_to_say",  label: "Prefer not to say" },
];

const DIETARY_OPTIONS = [
  { value: "omnivore",   label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan",      label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "other",      label: "Other / no preference" },
];

export function Step12Physiology({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <NumberStepper
          label="Age"
          value={data.age ?? 25}
          onChange={val => onChange({ age: val })}
          min={13} max={90} step={1}
          unit="yrs"
        />
        <NumberStepper
          label="Height"
          value={data.heightCm ?? 165}
          onChange={val => onChange({ heightCm: val })}
          min={120} max={220} step={1}
          unit="cm"
        />
        <NumberStepper
          label="Weight"
          value={data.weightKg ?? 65}
          onChange={val => onChange({ weightKg: val })}
          min={35} max={180} step={1}
          unit="kg"
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Activity level</div>
        <div className="space-y-2">
          {ACTIVITY_OPTIONS.map(a => (
            <OptionCard
              key={a.value}
              label={a.label}
              description={a.desc}
              selected={data.activityLevel === a.value}
              onClick={() => onChange({ activityLevel: a.value })}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">
          Sex <span className="normal-case text-ink-faint">(optional — refines your calorie baseline)</span>
        </div>
        <SegmentedControl
          options={SEX_OPTIONS}
          value={data.sex ?? "prefer_not_to_say"}
          onChange={val => onChange({ sex: val as OnboardingData["sex"] })}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">
          Dietary preference <span className="normal-case text-ink-faint">(optional)</span>
        </div>
        <div className="space-y-2">
          {DIETARY_OPTIONS.map(d => (
            <OptionCard
              key={d.value}
              label={d.label}
              size="sm"
              selected={data.dietaryPreference === d.value}
              onClick={() => onChange({ dietaryPreference: d.value })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
