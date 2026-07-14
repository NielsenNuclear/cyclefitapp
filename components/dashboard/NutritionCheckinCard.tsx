"use client";

import { useState }                from "react";
import type { DailyNutritionCheckin } from "@/lib/nutrition/nutritionCheckin";
import { saveDailyNutritionCheckin }  from "@/lib/nutrition/nutritionCheckin";

// ─── Toggle button ────────────────────────────────────────────────────────────

interface ToggleProps {
  label:    string;
  value:    boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={[
        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-[12px] font-medium transition-colors",
        value
          ? "bg-success-bg border-success-border text-success"
          : "bg-surface-subtle border-border text-ink-secondary",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="text-[15px]">{value ? "✓" : "○"}</span>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  date:        string;   // YYYY-MM-DD
  onComplete?: (checkin: DailyNutritionCheckin) => void;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function NutritionCheckinCard({ date, onComplete }: Props) {
  const [hitProtein,   setHitProtein]   = useState(false);
  const [hitHydration, setHitHydration] = useState(false);
  const [hitVeggies,   setHitVeggies]   = useState(false);
  const [saved,        setSaved]         = useState(false);

  function handleSave() {
    const checkin: DailyNutritionCheckin = {
      date,
      hitProtein,
      hitHydration,
      hitVeggies,
      completedAt: new Date().toISOString(),
    };
    saveDailyNutritionCheckin(checkin);
    setSaved(true);
    onComplete?.(checkin);
  }

  if (saved) {
    const count = [hitProtein, hitHydration, hitVeggies].filter(Boolean).length;
    return (
      <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1">
          Nutrition Check-in
        </p>
        <p className="text-[13px] font-semibold text-ink">
          {count}/3 targets hit today
        </p>
        <p className="text-[11px] text-ink-secondary mt-0.5">
          Axis is learning from your nutrition patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-surface-hover">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Nutrition Check-in
        </p>
        <p className="text-[13px] font-semibold text-ink mt-0.5">
          How did you eat today?
        </p>
        <p className="text-[11px] text-ink-muted mt-0.5">
          30 seconds — no calorie counting.
        </p>
      </div>

      <div className="px-4 py-3 space-y-2">
        <Toggle
          label="Hit my protein target"
          value={hitProtein}
          onChange={setHitProtein}
        />
        <Toggle
          label="Hit my hydration target"
          value={hitHydration}
          onChange={setHitHydration}
        />
        <Toggle
          label="Ate fruits or vegetables"
          value={hitVeggies}
          onChange={setHitVeggies}
        />

        <button
          onClick={handleSave}
          className="w-full mt-1 py-2.5 rounded-xl bg-brand text-white text-[12px] font-semibold active:opacity-90"
        >
          Save
        </button>
      </div>
    </div>
  );
}
