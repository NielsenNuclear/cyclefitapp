"use client";

import { STEPS } from "@/lib/onboarding-types";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressBar({ currentStep, totalSteps = STEPS.length }: ProgressBarProps) {
  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full">
      {/* Track */}
      <div className="h-[2px] bg-[#E8E5DC] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#534AB7] rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step dots — hidden on small screens, shown from sm+ */}
      <div className="hidden sm:flex justify-between mt-2 px-0.5">
        {STEPS.map((step) => {
          const isDone    = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isDone || isCurrent ? "opacity-100" : "opacity-30"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isDone    ? "bg-[#534AB7]" :
                  isCurrent ? "bg-[#534AB7] ring-2 ring-[#534AB7] ring-offset-1" :
                  "bg-[#D3D1C7]"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compact header used at top of every step ────────────────────────────────

interface StepHeaderProps {
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
}

export function StepHeader({ currentStep, totalSteps = STEPS.length, onBack }: StepHeaderProps) {
  return (
    <div className="w-full px-5 pt-5 pb-3">
      <div className="flex items-center justify-between mb-4">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-1.5 text-[12px] text-[#8A8880] hover:text-[#1C1B18] transition-colors ${
            currentStep <= 1 ? "invisible pointer-events-none" : ""
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>

        {/* Brand */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#534AB7] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-[#1C1B18]">Axis</span>
        </div>

        {/* Step counter */}
        <span className="text-[12px] text-[#8A8880] tabular-nums">
          {currentStep}<span className="text-[#D3D1C7]">/{totalSteps}</span>
        </span>
      </div>

      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
    </div>
  );
}
