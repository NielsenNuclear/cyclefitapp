"use client";

import { useState, useCallback } from "react";
import { StepHeader } from "@/components/onboarding/ProgressBar";
import { StepWrapper } from "@/components/onboarding/StepWrapper";
import { ProfileSummary } from "@/components/onboarding/ProfileSummary";
import {
  Step1Goals,
  Step2Experience,
  Step3TrainingStyle,
  Step4Recovery,
  Step5Sleep,
} from "@/components/onboarding/Steps1to5";
import {
  Step6Stress,
  Step7Energy,
  Step8Cycle,
  Step9Symptoms,
  Step10Priorities,
} from "@/components/onboarding/Steps6to10";
import { EMPTY_ONBOARDING, type OnboardingData } from "@/lib/onboarding-types";
import { buildAdaptiveProfile } from "@/lib/adaptive-profile";

const TOTAL_STEPS = 10;

// ─── Validation: what's required to continue from each step ──────────────────
function canAdvance(step: number, data: OnboardingData): boolean {
  switch (step) {
    case 1:  return data.goals.length > 0;
    case 2:  return !!data.trainingLevel;
    case 3:  return data.trainingStyles.length > 0;
    case 4:  return data.recoveryPractices.length > 0;
    case 5:  return !!data.sleepQuality;
    case 6:  return true;   // slider always has a value
    case 7:  return !!data.energyPattern;
    case 8: {
      if (!data.cycleRegularity || !data.trackingPreference) return false;
      if (data.trackingPreference !== "none" && !data.lastPeriodDate) return false;
      return true;
    }
    case 9:  return data.symptoms.length > 0;
    case 10: return data.performancePriorities.length > 0;
    default: return true;
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export function OnboardingFlow({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(EMPTY_ONBOARDING);
  const [showSummary, setShowSummary] = useState(false);

  const patch = useCallback((update: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...update }));
  }, []);

  const goNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      setShowSummary(true);
    }
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const profile = buildAdaptiveProfile(data);

  if (showSummary) {
    return (
      <ProfileSummary
        data={data}
        profile={profile}
        onComplete={() => onComplete(data)}
      />
    );
  }

  const stepProps = { data, onChange: patch };
  const isLast    = step === TOTAL_STEPS;
  const okToContinue = canAdvance(step, data);

  return (
    <div className="flex flex-col h-screen bg-white max-w-lg mx-auto">

      {/* Progress header */}
      <StepHeader
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={goBack}
      />

      {/* Step content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <StepWrapper
          step={step}
          canContinue={okToContinue}
          onContinue={goNext}
          isLast={isLast}
          continueLabel={isLast ? "Build my adaptive profile" : undefined}
        >
          {step === 1  && <Step1Goals          {...stepProps} />}
          {step === 2  && <Step2Experience     {...stepProps} />}
          {step === 3  && <Step3TrainingStyle  {...stepProps} />}
          {step === 4  && <Step4Recovery       {...stepProps} />}
          {step === 5  && <Step5Sleep          {...stepProps} />}
          {step === 6  && <Step6Stress         {...stepProps} />}
          {step === 7  && <Step7Energy         {...stepProps} />}
          {step === 8  && <Step8Cycle          {...stepProps} />}
          {step === 9  && <Step9Symptoms       {...stepProps} />}
          {step === 10 && <Step10Priorities    {...stepProps} />}
        </StepWrapper>
      </div>
    </div>
  );
}
