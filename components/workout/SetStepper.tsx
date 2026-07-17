"use client";

// ─── components/workout/SetStepper.tsx ────────────────────────────────────────
// Phase UX-1 — thumb-friendly stepper control for weight and reps.
// Replaces raw number inputs during guided workout flow.
//
// Workout Engine Sprint — Phase C.9: re-skinned for the dark Workout Mode
// canvas (only used from ExerciseFocusCard, which only renders inside
// WorkoutModeShell now). Buttons bumped from 40px to 44px — WCAG 2.5.5's
// AA minimum — since this is tapped hundreds of times per session, often
// with sweaty or gloved hands (docs/ux/WorkoutModeProposal.md §6).

interface SetStepperProps {
  value:     number | undefined;
  onChange:  (v: number | undefined) => void;
  min:       number;
  max?:      number;
  step:      number;
  unit:      string;
  label:     string;
  inactive?: boolean; // dimmed for completed/future sets
}

export function SetStepper({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  label,
  inactive = false,
}: SetStepperProps) {
  const display = value !== undefined ? value : "—";

  function decrement() {
    const current = value ?? min;
    const next    = Math.max(min, current - step);
    onChange(next);
  }

  function increment() {
    const current = value ?? min;
    const next    = max !== undefined ? Math.min(max, current + step) : current + step;
    onChange(next);
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${inactive ? "opacity-40" : ""}`}>
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A8580]">{label}</span>
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={decrement}
          disabled={inactive}
          aria-label={`Decrease ${label}`}
          className="w-11 h-11 flex items-center justify-center rounded-l-xl bg-white/5 border border-white/10 text-[#D9D5CC] text-[18px] font-light active:bg-white/10 transition-colors disabled:pointer-events-none"
        >
          −
        </button>
        <div className="flex flex-col items-center justify-center h-11 px-3 bg-white/[0.03] border-t border-b border-white/10 min-w-[64px]">
          <span className="text-[18px] font-bold text-[#F5F3EE] tabular-nums leading-none">{display}</span>
          <span className="text-[9px] text-[#8A8580] leading-none mt-0.5">{unit}</span>
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={inactive}
          aria-label={`Increase ${label}`}
          className="w-11 h-11 flex items-center justify-center rounded-r-xl bg-white/5 border border-white/10 text-[#D9D5CC] text-[18px] font-light active:bg-white/10 transition-colors disabled:pointer-events-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
