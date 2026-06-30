"use client";

import { OptionCard, ChipSelect, NumberStepper, ScaleSlider, SegmentedControl } from "@/components/ui/onboarding-primitives";
import type { OnboardingData } from "@/lib/onboarding-types";

// ─── Step 1: Fitness Goals ────────────────────────────────────────────────────

interface StepProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const GOALS = [
  { value: "build_strength",      label: "Build strength",          desc: "Progressive overload, compound lifts, 1RM gains",      icon: "⬆" },
  { value: "improve_endurance",   label: "Improve endurance",       desc: "Aerobic base, running, cycling, or sustained output",   icon: "♾" },
  { value: "body_composition",    label: "Body composition",        desc: "Lean mass development and fat reduction over time",     icon: "◎" },
  { value: "improve_performance", label: "Athletic performance",    desc: "Sport-specific output, speed, power, agility",          icon: "◆" },
  { value: "recover_better",      label: "Recover better",          desc: "Reduce fatigue, improve sleep-training relationship",   icon: "↻" },
  { value: "understand_my_body",  label: "Understand my body",      desc: "Learn how physiology affects how I train and feel",     icon: "◉" },
  { value: "stay_consistent",     label: "Stay consistent",         desc: "Build a sustainable, long-term training habit",         icon: "▸" },
];

export function Step1Goals({ data, onChange }: StepProps) {
  const toggle = (val: string) => {
    const current = data.goals;
    onChange({ goals: current.includes(val) ? current.filter(g => g !== val) : [...current, val] });
  };

  return (
    <div className="space-y-2.5">
      {GOALS.map(g => (
        <OptionCard
          key={g.value}
          label={g.label}
          description={g.desc}
          icon={<span className="text-[16px]">{g.icon}</span>}
          selected={data.goals.includes(g.value)}
          onClick={() => toggle(g.value)}
        />
      ))}
    </div>
  );
}


// ─── Step 2: Training Experience ─────────────────────────────────────────────

const LEVELS = [
  { value: "just_starting", label: "Just starting",      desc: "Less than 6 months of consistent training" },
  { value: "recreational",  label: "Recreational",       desc: "1–2 years, training for health and enjoyment" },
  { value: "consistent",    label: "Consistent athlete", desc: "2–5 years, training with structure and intent" },
  { value: "competitive",   label: "Competitive",        desc: "5+ years, performance-driven with coaching history" },
];

const YEARS_OPTIONS = [
  { value: "under_1",  label: "< 1 year" },
  { value: "1_2",      label: "1–2 years" },
  { value: "3_5",      label: "3–5 years" },
  { value: "6_10",     label: "6–10 years" },
  { value: "over_10",  label: "10+ years" },
];

export function Step2Experience({ data, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-3">Training level</div>
        <div className="space-y-2">
          {LEVELS.map(l => (
            <OptionCard
              key={l.value}
              label={l.label}
              description={l.desc}
              selected={data.trainingLevel === l.value}
              onClick={() => onChange({ trainingLevel: l.value })}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-3">Years training</div>
        <div className="flex flex-wrap gap-2">
          {YEARS_OPTIONS.map(y => (
            <button
              key={y.value}
              type="button"
              onClick={() => onChange({ trainingYears: y.value })}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all
                ${data.trainingYears === y.value
                  ? "bg-[#EEEDFE] text-[#3C3489] border-[#C4C0EE]"
                  : "bg-white text-[#6B6860] border-[#E0DDD4] hover:border-[#C8C5BC]"
                }`}
            >
              {y.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Step 3: Training Style ───────────────────────────────────────────────────

const STYLES = [
  { value: "strength",     label: "Strength training",    icon: "↑" },
  { value: "hiit",         label: "HIIT",                 icon: "◈" },
  { value: "running",      label: "Running",              icon: "▶" },
  { value: "cycling",      label: "Cycling",              icon: "◎" },
  { value: "yoga",         label: "Yoga / mobility",      icon: "◇" },
  { value: "crossfit",     label: "CrossFit",             icon: "✕" },
  { value: "sport",        label: "Team / court sport",   icon: "◉" },
  { value: "pilates",      label: "Pilates",              icon: "—" },
  { value: "swimming",     label: "Swimming",             icon: "≈" },
  { value: "other",        label: "Other / mixed",        icon: "+" },
];

export function Step3TrainingStyle({ data, onChange }: StepProps) {
  const toggle = (val: string) => {
    const s = data.trainingStyles;
    onChange({ trainingStyles: s.includes(val) ? s.filter(x => x !== val) : [...s, val] });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-3">Select all that apply</div>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(s => (
            <OptionCard
              key={s.value}
              label={s.label}
              icon={<span className="text-[14px] font-mono">{s.icon}</span>}
              selected={data.trainingStyles.includes(s.value)}
              onClick={() => toggle(s.value)}
              size="sm"
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-4">Sessions per week</div>
        <NumberStepper
          value={data.sessionsPerWeek}
          onChange={val => onChange({ sessionsPerWeek: val })}
          min={1} max={14} step={1}
          unit="sessions"
        />
      </div>
    </div>
  );
}


// ─── Step 4: Recovery Habits ──────────────────────────────────────────────────

const RECOVERY_OPTIONS = [
  { value: "stretching",    label: "Stretching / cool-down" },
  { value: "yoga",          label: "Yoga or mobility work" },
  { value: "sleep_focus",   label: "Intentional sleep habits" },
  { value: "foam_rolling",  label: "Foam rolling / massage" },
  { value: "cold_therapy",  label: "Cold shower / ice bath" },
  { value: "nutrition",     label: "Post-workout nutrition" },
  { value: "active_rest",   label: "Active rest days" },
  { value: "meditation",    label: "Meditation / breathwork" },
  { value: "none",          label: "No structured recovery" },
];

export function Step4Recovery({ data, onChange }: StepProps) {
  const toggle = (val: string) => {
    if (val === "none") { onChange({ recoveryPractices: ["none"] }); return; }
    const current = data.recoveryPractices.filter(x => x !== "none");
    onChange({ recoveryPractices: current.includes(val) ? current.filter(x => x !== val) : [...current, val] });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#EEEDFE] rounded-xl border border-[#C4C0EE]">
        <div className="flex gap-2.5">
          <div className="text-[#534AB7] mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-[12px] text-[#3C3489] leading-relaxed">
            Recovery practices are weighted signals in your readiness model. Even selecting "none" is useful data — it helps us calibrate expectations for your recovery curve.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {RECOVERY_OPTIONS.map(opt => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            selected={data.recoveryPractices.includes(opt.value)}
            onClick={() => toggle(opt.value)}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}


// ─── Step 5: Sleep ────────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { value: "excellent", label: "Excellent", desc: "Wake rested consistently. Rarely disrupted." },
  { value: "good",      label: "Good",      desc: "Generally sleep well. Occasional disruptions." },
  { value: "variable",  label: "Variable",  desc: "Quality changes significantly week to week." },
  { value: "poor",      label: "Poor",      desc: "Frequently disrupted, unrefreshed, or short." },
];

export function Step5Sleep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Hours slider */}
      <div className="bg-[#F5F3EE] rounded-2xl p-5 border border-[#EAE7DE]">
        <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-4">Average sleep per night</div>
        <NumberStepper
          value={data.sleepHours}
          onChange={val => onChange({ sleepHours: val })}
          min={3} max={12} step={0.5}
          unit="hours"
        />
      </div>

      {/* Quality */}
      <div>
        <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mb-3">Sleep quality</div>
        <div className="space-y-2">
          {QUALITY_OPTIONS.map(q => (
            <OptionCard
              key={q.value}
              label={q.label}
              description={q.desc}
              selected={data.sleepQuality === q.value}
              onClick={() => onChange({ sleepQuality: q.value })}
              accent={q.value === "poor" ? "amber" : q.value === "excellent" ? "teal" : "purple"}
            />
          ))}
        </div>
      </div>

      <div className="p-3.5 bg-[#E1F5EE] rounded-xl border border-[#A8DFC8]">
        <p className="text-[11px] text-[#085041] leading-relaxed">
          Sleep hours and quality carry the highest combined weight in your readiness score — up to 40% in the adaptive model. Accurate data here matters most.
        </p>
      </div>
    </div>
  );
}
