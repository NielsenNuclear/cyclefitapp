"use client";

import { useEffect, useState } from "react";
import { StepLabel, StepContinueButton } from "@/components/ui/onboarding-primitives";
import { STEPS } from "@/lib/onboarding-types";

interface StepWrapperProps {
  step: number;
  canContinue?: boolean;
  onContinue: () => void;
  continueLabel?: string;
  isLast?: boolean;
  children: React.ReactNode;
  hideButton?: boolean;
}

export function StepWrapper({
  step, canContinue = true, onContinue,
  continueLabel, isLast = false,
  children, hideButton = false,
}: StepWrapperProps) {
  const [visible, setVisible] = useState(false);
  const config = STEPS[step - 1];

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div
      className={`flex flex-col h-full transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="max-w-lg mx-auto">

          {/* Category + step label */}
          <div className="pt-2 pb-5">
            <StepLabel category={config?.category ?? ""} step={step} total={STEPS.length} />
            <h2 className="text-[clamp(1.4rem,5vw,2rem)] font-light font-serif text-ink leading-tight mb-2">
              {config?.title}
            </h2>
            {config?.subtitle && (
              <p className="text-[13px] text-ink-muted leading-relaxed">
                {config.subtitle}
              </p>
            )}
          </div>

          {/* Step-specific content */}
          {children}
        </div>
      </div>

      {/* Fixed continue button */}
      {!hideButton && (
        <div className="px-5 pb-6 pt-3 bg-surface border-t border-border max-w-lg mx-auto w-full">
          <StepContinueButton
            onClick={onContinue}
            disabled={!canContinue}
            label={continueLabel}
            isLast={isLast}
          />
        </div>
      )}
    </div>
  );
}
