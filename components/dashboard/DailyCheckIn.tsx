"use client";

import { useState } from "react";
import type { CheckinData, CheckinSymptom } from "@/lib/checkin";
import { getTodayCheckin, saveTodayCheckin } from "@/lib/checkin";
import type { Symptom } from "@/lib/symptoms/symptomCatalog";
import { getQuickSymptoms, getOtherSymptoms } from "@/lib/symptoms/symptomPreferences";
import { AxisIcon } from "@/components/ui/Icon";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLEEP_OPTIONS: { value: CheckinData["sleepQuality"]; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good",      label: "Good"      },
  { value: "variable",  label: "Variable"  },
  { value: "poor",      label: "Poor"      },
];

const SEVERITY_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: "–",
  1: "Mild",
  2: "Mod",
  3: "Sev",
};

const SEVERITY_ACTIVE: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-surface-subtle text-ink-muted border-border-strong",
  1: "bg-brand-bg-mid text-brand-text border-brand-border",
  2: "bg-caution-bg text-caution-text border-caution-border",
  3: "bg-caution-bg text-caution-text border-caution-border",
};

const SEVERITY_INACTIVE = "bg-surface-subtle text-ink-faint border-border";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  const label = step === 4 ? "Additional symptoms" : `Step ${step} of 3`;
  const pct   = step >= 3 ? 100 : Math.round((step / 3) * 100);
  return (
    <div className="mb-4">
      <div className="text-[10px] text-ink-muted mb-1.5">{label}</div>
      <div className="h-[3px] bg-border rounded-full">
        <div
          className="h-full bg-brand rounded-full transition-all duration-slow"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SymptomRow({
  symptom,
  severity,
  onChange,
}: {
  symptom:  Symptom;
  severity: 0 | 1 | 2 | 3;
  onChange: (id: string, sev: 0 | 1 | 2 | 3) => void;
}) {
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <div className="text-[12px] font-medium text-ink mb-1.5">{symptom.name}</div>
      <div className="flex gap-1.5">
        {([0, 1, 2, 3] as const).map(sev => (
          <button
            key={sev}
            type="button"
            onClick={() => onChange(symptom.id, sev)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
              severity === sev ? SEVERITY_ACTIVE[sev] : SEVERITY_INACTIVE
            }`}
          >
            {SEVERITY_LABELS[sev]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DailyCheckInProps {
  onComplete:         (data: CheckinData) => void;
  lowReadinessAlert?: boolean;
}

export function DailyCheckIn({ onComplete, lowReadinessAlert = false }: DailyCheckInProps) {
  const [priorCheckin]   = useState<CheckinData | null>(() => getTodayCheckin());
  const [isEditing, setIsEditing]             = useState(false);
  // Dashboard 2.0 — Layer 1. Check-in no longer blocks the workout hero: it
  // starts as a compact, non-blocking banner and only expands to the full
  // multi-step form when the user taps it.
  const [showForm, setShowForm]               = useState(false);
  const [step, setStep]                       = useState<1 | 2 | 3 | 4>(1);
  const [sleepQuality, setSleepQuality]       = useState<CheckinData["sleepQuality"] | null>(null);
  const [stressLevel, setStressLevel]         = useState(5);
  const [symptomSeverities, setSymptomSeverities] = useState<Record<string, 0 | 1 | 2 | 3>>({});
  const [quickSymptoms] = useState<Symptom[]>(() => getQuickSymptoms());
  const [otherSymptoms] = useState<Symptom[]>(() => getOtherSymptoms());

  function getSeverity(id: string): 0 | 1 | 2 | 3 {
    return symptomSeverities[id] ?? 0;
  }

  function handleSeverityChange(id: string, sev: 0 | 1 | 2 | 3) {
    setSymptomSeverities(prev => ({ ...prev, [id]: sev }));
  }

  function handleEdit() {
    if (priorCheckin) {
      setSleepQuality(priorCheckin.sleepQuality);
      setStressLevel(priorCheckin.stressLevel);
      if (priorCheckin.symptoms) {
        const map: Record<string, 0 | 1 | 2 | 3> = {};
        for (const s of priorCheckin.symptoms) map[s.symptomId] = s.severity;
        setSymptomSeverities(map);
      }
    }
    setStep(1);
    setIsEditing(true);
  }

  function handleSubmit() {
    if (!sleepQuality) return;
    const allSymptoms: CheckinSymptom[] = Object.entries(symptomSeverities)
      .filter(([, s]) => s > 0)
      .map(([symptomId, severity]) => ({ symptomId, severity }));
    const data: CheckinData = {
      sleepQuality,
      stressLevel,
      date:     new Date().toISOString().slice(0, 10),
      symptoms: allSymptoms.length > 0 ? allSymptoms : undefined,
    };
    saveTodayCheckin(data);
    onComplete(data);
  }

  // ── Compact "already checked in" state ────────────────────────────────────

  if (priorCheckin && !isEditing) {
    const symptomCount = priorCheckin.symptoms?.filter(s => s.severity > 0).length ?? 0;
    return (
      <div className="bg-surface rounded-2xl border border-border px-5 py-4 shadow-card flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-success-bg border border-success-border flex items-center justify-center flex-shrink-0">
          <AxisIcon name="check" size={12} strokeWidth={2.5} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-ink">Checked in for today</div>
          <div className="text-[11px] text-ink-muted">
            Sleep: {priorCheckin.sleepQuality} · Stress: {priorCheckin.stressLevel}/10
            {symptomCount > 0 && ` · ${symptomCount} symptom${symptomCount > 1 ? "s" : ""}`}
          </div>
        </div>
        <button
          type="button"
          onClick={handleEdit}
          className="flex-shrink-0 text-[11px] font-semibold text-brand hover:text-brand-dark transition-colors"
        >
          Edit
        </button>
      </div>
    );
  }

  // ── Compact "not yet checked in" prompt (Dashboard 2.0 — non-blocking) ────

  if (!showForm && !isEditing) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full bg-surface rounded-2xl border border-border px-5 py-3.5 shadow-card flex items-center gap-3 text-left hover:border-brand-border transition-colors min-h-[44px]"
      >
        <div className="w-7 h-7 rounded-full bg-brand-bg-mid flex items-center justify-center flex-shrink-0">
          <AxisIcon name="check" size={12} strokeWidth={2.5} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-ink">How did you sleep last night?</div>
          <div className="text-[11px] text-ink-muted">
            {lowReadinessAlert
              ? "Yesterday's readiness was cautious — a quick check-in helps calibrate today's plan"
              : "30-second check-in shapes today's recommendation"}
          </div>
        </div>
        <span className="flex-shrink-0 text-[11px] font-semibold text-brand">Check in</span>
      </button>
    );
  }

  // ── Multi-step form ───────────────────────────────────────────────────────

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Daily Check-In
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(prev => (prev - 1) as 1 | 2 | 3 | 4)}
            className="text-[11px] text-ink-muted hover:text-brand transition-colors"
          >
            ← Back
          </button>
        )}
      </div>

      <ProgressBar step={step} />

      {/* ── Step 1: Sleep quality ─────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug mb-4">
            How did you sleep last night?
          </h3>

          {lowReadinessAlert && (
            <div className="mb-4 p-3 bg-caution-bg rounded-xl border border-caution-border">
              <p className="text-[11px] text-caution-text leading-relaxed">
                Yesterday&apos;s readiness was in the cautious range. Sleep and stress carry the most
                weight in the model — taking a moment to reflect before selecting may improve
                today&apos;s recommendations.
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 mb-5">
            {SLEEP_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSleepQuality(value)}
                className={`py-2 rounded-xl text-[11px] font-semibold border transition-colors ${
                  sleepQuality === value
                    ? "bg-brand-bg-mid text-brand-text border-brand-border"
                    : "bg-surface-hover text-ink-secondary border-border-strong hover:bg-brand-bg-mid hover:text-brand-text hover:border-brand-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!sleepQuality}
            className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-colors ${
              sleepQuality
                ? "bg-brand text-white hover:bg-brand-dark"
                : "bg-surface-hover text-ink-faint cursor-not-allowed"
            }`}
          >
            Next
          </button>
          {!sleepQuality && (
            <p className="text-center text-[11px] text-ink-muted mt-2">
              Select your sleep quality to continue
            </p>
          )}
        </>
      )}

      {/* ── Step 2: Stress level ──────────────────────────────────────────── */}
      {step === 2 && (
        <>
          <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug mb-4">
            What&apos;s your stress level today?
          </h3>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Stress level
              </div>
              <div className="text-[13px] font-semibold text-ink">
                {stressLevel}
                <span className="text-ink-muted font-normal">/10</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={stressLevel}
              onChange={e => setStressLevel(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-ink-muted">Low</span>
              <span className="text-[10px] text-ink-muted">High</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-xl text-[13px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            Next
          </button>
        </>
      )}

      {/* ── Step 3: Quick symptoms ────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug mb-1">
            Any symptoms today?
          </h3>
          <p className="text-[11px] text-ink-muted mb-4">
            Select a severity, or leave at — if not present.
          </p>

          <div className="mb-5">
            {quickSymptoms.map(symptom => (
              <SymptomRow
                key={symptom.id}
                symptom={symptom}
                severity={getSeverity(symptom.id)}
                onChange={handleSeverityChange}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-[13px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors mb-2"
          >
            Update today&apos;s recommendations
          </button>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-brand hover:text-brand-dark transition-colors"
          >
            Track more symptoms →
          </button>
        </>
      )}

      {/* ── Step 4: Other symptoms (optional) ────────────────────────────── */}
      {step === 4 && (
        <>
          <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug mb-1">
            Additional symptoms
          </h3>
          <p className="text-[11px] text-ink-muted mb-4">
            Track anything else you&apos;re noticing today.
          </p>

          <div className="mb-5">
            {otherSymptoms.map(symptom => (
              <SymptomRow
                key={symptom.id}
                symptom={symptom}
                severity={getSeverity(symptom.id)}
                onChange={handleSeverityChange}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-[13px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            Update today&apos;s recommendations
          </button>
        </>
      )}

    </div>
  );
}
