"use client";

import { OptionCard, ChipSelect, ScaleSlider, SegmentedControl } from "@/components/ui/onboarding-primitives";
import type { OnboardingData } from "@/lib/onboarding-types";

interface StepProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

// ─── Step 6: Stress ───────────────────────────────────────────────────────────

const STRESS_SOURCES = [
  { value: "work",        label: "Work / career" },
  { value: "relationships", label: "Relationships" },
  { value: "finances",    label: "Finances" },
  { value: "health",      label: "Health concerns" },
  { value: "schedule",    label: "Time pressure" },
  { value: "performance", label: "Performance anxiety" },
  { value: "sleep",       label: "Sleep deprivation" },
  { value: "low",         label: "Generally low stress" },
];

export function Step6Stress({ data, onChange }: StepProps) {
  const stressLabel = (v: number) => {
    if (v <= 2) return "Very low";
    if (v <= 4) return "Low";
    if (v <= 6) return "Moderate";
    if (v <= 8) return "High";
    return "Very high";
  };

  return (
    <div className="space-y-6">
      {/* Stress scale */}
      <div className="bg-surface-subtle rounded-2xl p-5 border border-border">
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
          Typical weekly stress level
        </div>
        <div className="text-[11px] text-ink-muted mb-4">Not current stress — your average baseline</div>

        <div className="text-center mb-4">
          <span className="text-[36px] font-light font-serif text-ink">
            {data.stressLevel}
          </span>
          <span className="text-[13px] text-ink-muted ml-2">— {stressLabel(data.stressLevel)}</span>
        </div>

        <ScaleSlider
          value={data.stressLevel}
          onChange={val => onChange({ stressLevel: val })}
          min={1} max={10}
          lowLabel="Minimal" highLabel="Overwhelming"
          showValue={false}
          accent={data.stressLevel >= 7 ? "amber" : data.stressLevel >= 5 ? "purple" : "teal"}
        />
      </div>

      {/* Sources */}
      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">
          Primary sources (optional)
        </div>
        <ChipSelect
          options={STRESS_SOURCES}
          selected={data.stressSources}
          onChange={vals => onChange({ stressSources: vals })}
        />
      </div>

      <div className="p-3.5 bg-canvas rounded-xl border border-border">
        <p className="text-[11px] text-ink-muted leading-relaxed italic">
          "Stress is a physiological input — elevated chronic stress suppresses recovery and reduces training adaptation. Axis models this explicitly, not as a moral judgment."
        </p>
      </div>
    </div>
  );
}


// ─── Step 7: Energy Patterns ──────────────────────────────────────────────────

const ENERGY_PATTERNS = [
  { value: "consistent_high",  label: "Consistently high",  desc: "Generally energised throughout the day and week" },
  { value: "morning_peak",     label: "Morning peak",       desc: "Best energy in the morning, fades by afternoon" },
  { value: "afternoon_peak",   label: "Afternoon peak",     desc: "Slow start, energised from midday onwards" },
  { value: "variable",         label: "Variable",           desc: "Energy shifts significantly day to day" },
  { value: "consistently_low", label: "Consistently low",   desc: "Frequently fatigued regardless of sleep" },
];

const TRIGGERS = [
  { value: "poor_sleep",    label: "Poor sleep" },
  { value: "stress",        label: "High stress" },
  { value: "diet",          label: "Food choices" },
  { value: "cycle",         label: "Cycle phase" },
  { value: "overtraining",  label: "Overtraining" },
  { value: "dehydration",   label: "Dehydration" },
  { value: "illness",       label: "Illness / immune stress" },
  { value: "unknown",       label: "Not sure yet" },
];

export function Step7Energy({ data, onChange }: StepProps) {
  const toggle = (val: string) => {
    const t = data.lowEnergyTriggers;
    onChange({ lowEnergyTriggers: t.includes(val) ? t.filter(x => x !== val) : [...t, val] });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Typical energy pattern</div>
        <div className="space-y-2">
          {ENERGY_PATTERNS.map(p => (
            <OptionCard
              key={p.value}
              label={p.label}
              description={p.desc}
              selected={data.energyPattern === p.value}
              onClick={() => onChange({ energyPattern: p.value })}
              accent={p.value === "consistent_high" ? "teal" : p.value === "consistently_low" ? "amber" : "purple"}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">
          Known low-energy triggers
        </div>
        <ChipSelect
          options={TRIGGERS}
          selected={data.lowEnergyTriggers}
          onChange={vals => onChange({ lowEnergyTriggers: vals })}
        />
      </div>
    </div>
  );
}


// ─── Step 8: Cycle Information ────────────────────────────────────────────────

const REGULARITY_OPTIONS = [
  { value: "regular",   label: "Regular",   desc: "Typically arrives within ±2 days of expected date" },
  { value: "variable",  label: "Variable",  desc: "Varies by 3–7 days cycle to cycle" },
  { value: "irregular", label: "Irregular", desc: "Significantly variable or unpredictable" },
  { value: "unknown",   label: "Unsure",    desc: "Haven't tracked closely" },
];

const TRACKING_PREFS = [
  { value: "full",    label: "All signals" },
  { value: "partial", label: "Context only" },
  { value: "none",    label: "Skip cycle data" },
];

export function Step8Cycle({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">

      {/* Framing callout */}
      <div className="p-4 bg-brand-bg-mid rounded-xl border border-brand-border">
        <div className="text-[12px] font-semibold text-brand-text mb-1.5">Why we ask this</div>
        <p className="text-[12px] text-brand leading-relaxed">
          Cycle phase is one signal among several in your readiness model — weighted at approximately 10%.
          It never overrides sleep, energy, or recovery signals. You can opt out entirely and receive
          equally effective recommendations from other signals alone.
        </p>
      </div>

      {/* Cycle length */}
      <div className="bg-surface-subtle rounded-2xl p-5 border border-border">
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-4">Typical cycle length</div>
        <div className="flex items-center gap-4 justify-center">
          <button
            type="button"
            onClick={() => onChange({ cycleLength: Math.max(21, data.cycleLength - 1) })}
            className="w-9 h-9 rounded-full border border-border-strong bg-surface text-lg flex items-center justify-center hover:bg-brand-bg-mid hover:border-brand-border transition-all"
          >−</button>
          <div className="text-center">
            <span className="text-[36px] font-light font-serif text-ink">
              {data.cycleLength}
            </span>
            <span className="text-[13px] text-ink-muted ml-1.5">days</span>
            <div className="text-[10px] text-ink-muted mt-0.5">typical range: 21–38 days</div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ cycleLength: Math.min(38, data.cycleLength + 1) })}
            className="w-9 h-9 rounded-full border border-border-strong bg-surface text-lg flex items-center justify-center hover:bg-brand-bg-mid hover:border-brand-border transition-all"
          >+</button>
        </div>
      </div>

      {/* Regularity */}
      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Cycle regularity</div>
        <div className="space-y-2">
          {REGULARITY_OPTIONS.map(r => (
            <OptionCard
              key={r.value}
              label={r.label}
              description={r.desc}
              selected={data.cycleRegularity === r.value}
              onClick={() => onChange({ cycleRegularity: r.value })}
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* Tracking preference */}
      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">How much cycle context do you want?</div>
        <div className="text-[11px] text-ink-muted mb-3">This affects how prominently cycle data appears in your dashboard</div>
        <SegmentedControl
          options={TRACKING_PREFS}
          value={data.trackingPreference}
          onChange={val => {
            onChange({ trackingPreference: val });
            if (val === "none") onChange({ lastPeriodDate: "" });
          }}
        />
      </div>

      {/* Last period date — shown when user wants cycle tracking */}
      {data.trackingPreference !== "none" && data.trackingPreference !== "" && (
        <div className="bg-surface-subtle rounded-2xl p-5 border border-border">
          <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
            First day of last period
          </div>
          <div className="text-[11px] text-ink-muted mb-3">
            Used to estimate your current cycle phase. Approximate is fine.
          </div>
          <input
            type="date"
            value={data.lastPeriodDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => onChange({ lastPeriodDate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border-strong bg-surface text-[13px] text-ink focus:outline-none focus:border-brand-border focus:ring-1 focus:ring-brand-border"
          />
        </div>
      )}
    </div>
  );
}


// ─── Step 9: Symptoms ─────────────────────────────────────────────────────────

const SYMPTOMS = [
  { value: "cramps",           label: "Cramps" },
  { value: "fatigue",          label: "Fatigue" },
  { value: "bloating",         label: "Bloating" },
  { value: "headache",         label: "Headache" },
  { value: "mood_swings",      label: "Mood fluctuations" },
  { value: "breast_tenderness",label: "Breast tenderness" },
  { value: "back_pain",        label: "Lower back pain" },
  { value: "nausea",           label: "Nausea" },
  { value: "insomnia",         label: "Sleep disruption" },
  { value: "anxiety",          label: "Anxiety" },
  { value: "joint_pain",       label: "Joint discomfort" },
  { value: "none",             label: "None that affect training" },
];

const SEVERITY_OPTIONS = [
  { value: "mild",     label: "Mild",     desc: "Noticeable but doesn't affect training" },
  { value: "moderate", label: "Moderate", desc: "Sometimes requires modifying workouts" },
  { value: "severe",   label: "Significant", desc: "Regularly affects training capacity" },
];

export function Step9Symptoms({ data, onChange }: StepProps) {
  const toggleSymptom = (val: string) => {
    if (val === "none") { onChange({ symptoms: ["none"] }); return; }
    const s = data.symptoms.filter(x => x !== "none");
    onChange({ symptoms: s.includes(val) ? s.filter(x => x !== val) : [...s, val] });
  };

  const hasSymptoms = data.symptoms.length > 0 && !data.symptoms.includes("none");

  return (
    <div className="space-y-5">
      <div className="p-3.5 bg-canvas rounded-xl border border-border">
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Only select symptoms that affect your training. This is performance-relevant context — not a medical history. Axis uses this to calibrate readiness adjustments, not diagnose conditions.
        </p>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Select relevant symptoms</div>
        <div className="grid grid-cols-2 gap-2">
          {SYMPTOMS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSymptom(s.value)}
              className={`px-3 py-2.5 rounded-xl text-[12px] font-medium border text-left transition-all
                ${data.symptoms.includes(s.value)
                  ? "bg-brand-bg-mid text-brand-text border-brand-border"
                  : "bg-surface text-ink-secondary border-border-strong hover:border-ink-faint"
                }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {hasSymptoms && (
        <div>
          <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Typical symptom severity</div>
          <div className="space-y-2">
            {SEVERITY_OPTIONS.map(s => (
              <OptionCard
                key={s.value}
                label={s.label}
                description={s.desc}
                selected={data.symptomSeverity === s.value}
                onClick={() => onChange({ symptomSeverity: s.value })}
                size="sm"
                accent={s.value === "severe" ? "amber" : "purple"}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Step 10: Performance Priorities ─────────────────────────────────────────

const PRIORITIES = [
  { value: "progressive_strength",  label: "Progressive strength gains",   icon: "↑" },
  { value: "injury_prevention",     label: "Injury prevention",            icon: "◎" },
  { value: "body_composition",      label: "Body composition change",      icon: "◈" },
  { value: "energy_stability",      label: "Daily energy stability",       icon: "≈" },
  { value: "cycle_awareness",       label: "Cycle-aware training",         icon: "◉" },
  { value: "performance_peaks",     label: "Performance peaking",          icon: "▲" },
  { value: "recovery_quality",      label: "Recovery quality",             icon: "↻" },
  { value: "mental_resilience",     label: "Mental performance",           icon: "◆" },
  { value: "endurance",             label: "Endurance development",        icon: "♾" },
  { value: "consistency",           label: "Long-term consistency",        icon: "—" },
];

const TIMELINE_OPTIONS = [
  { value: "no_deadline",   label: "No specific timeline" },
  { value: "1_month",       label: "Within 1 month" },
  { value: "3_months",      label: "3 months" },
  { value: "6_months",      label: "6 months" },
  { value: "12_months",     label: "12 months" },
  { value: "ongoing",       label: "Long-term ongoing" },
];

export function Step10Priorities({ data, onChange }: StepProps) {
  const toggle = (val: string) => {
    const p = data.performancePriorities;
    if (p.includes(val)) {
      onChange({ performancePriorities: p.filter(x => x !== val) });
    } else if (p.length < 3) {
      onChange({ performancePriorities: [...p, val] });
    }
  };

  const rank = (val: string) => {
    const idx = data.performancePriorities.indexOf(val);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <div className="space-y-5">
      <div className="p-3.5 bg-brand-bg-mid rounded-xl border border-brand-border">
        <p className="text-[12px] text-brand-text leading-relaxed">
          Select up to 3. The order you select them sets your priority ranking — the adaptive engine weights decisions to favour your top outcomes.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Top 3 priorities</div>
          <div className="text-[11px] text-ink-muted">{data.performancePriorities.length}/3 selected</div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PRIORITIES.map(p => {
            const r = rank(p.value);
            const isSelected = r !== null;
            const isDisabled = !isSelected && data.performancePriorities.length >= 3;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => !isDisabled && toggle(p.value)}
                disabled={isDisabled}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150
                  ${isSelected   ? "bg-brand-bg-mid border-brand-border"          :
                    isDisabled   ? "bg-canvas border-border opacity-40 cursor-not-allowed" :
                    "bg-surface border-border-strong hover:border-ink-faint"
                  }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0
                  ${isSelected ? "bg-brand text-white" : "bg-surface-hover text-ink-muted"}`}>
                  {isSelected ? r : <span className="text-[10px] font-mono">{p.icon}</span>}
                </div>
                <span className={`text-[13px] font-medium ${isSelected ? "text-brand-text" : "text-ink"}`}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3">Primary goal timeline</div>
        <div className="flex flex-wrap gap-2">
          {TIMELINE_OPTIONS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ primaryGoalDeadline: t.value })}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all
                ${data.primaryGoalDeadline === t.value
                  ? "bg-brand-bg-mid text-brand-text border-brand-border"
                  : "bg-surface text-ink-secondary border-border-strong hover:border-ink-faint"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
