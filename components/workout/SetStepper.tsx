"use client";

// ─── components/workout/SetStepper.tsx ────────────────────────────────────────
// Phase UX-1 — thumb-friendly stepper control for weight and reps.
// Replaces raw number inputs during guided workout flow.

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
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9B9690]">{label}</span>
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={decrement}
          disabled={inactive}
          aria-label={`Decrease ${label}`}
          className="w-10 h-10 flex items-center justify-center rounded-l-xl bg-[#F5F3EE] border border-[#E0DDD4] text-[#5C5850] text-[18px] font-light active:bg-[#EAE7DE] transition-colors disabled:pointer-events-none"
        >
          −
        </button>
        <div className="flex flex-col items-center justify-center h-10 px-3 bg-white border-t border-b border-[#E0DDD4] min-w-[64px]">
          <span className="text-[18px] font-bold text-[#1C1B18] tabular-nums leading-none">{display}</span>
          <span className="text-[9px] text-[#9B9690] leading-none mt-0.5">{unit}</span>
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={inactive}
          aria-label={`Increase ${label}`}
          className="w-10 h-10 flex items-center justify-center rounded-r-xl bg-[#F5F3EE] border border-[#E0DDD4] text-[#5C5850] text-[18px] font-light active:bg-[#EAE7DE] transition-colors disabled:pointer-events-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
