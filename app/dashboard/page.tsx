"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { OnboardingData } from "@/lib/onboarding-types";
import type { DailyRecommendation } from "@/types/recommendation";
import type { CheckinData } from "@/lib/checkin";
import { calculatePhase } from "@/lib/cycle/calculatePhase";
import { generateRecommendation } from "@/lib/recommendations/generateRecommendation";
import { getTodayCheckin } from "@/lib/checkin";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyCheckIn } from "@/components/dashboard/DailyCheckIn";
import { PhaseCard } from "@/components/dashboard/PhaseCard";
import { TrainingCard, NutritionCard, RecoveryCard } from "@/components/dashboard/RecommendationCards";
import { RecommendationExplanation } from "@/components/dashboard/RecommendationExplanation";

function runPipeline(user: OnboardingData): DailyRecommendation {
  const phase = calculatePhase({
    lastPeriodDate:  user.lastPeriodDate,
    cycleLength:     user.cycleLength,
    cycleRegularity: user.cycleRegularity || undefined,
  });
  return generateRecommendation(phase, user);
}

export default function DashboardPage() {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<DailyRecommendation | null>(null);
  const [checkinComplete, setCheckinComplete] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const onboardingRef = useRef<OnboardingData | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("axis_onboarding");
    if (!raw) {
      router.push("/onboarding");
      return;
    }

    let user: OnboardingData;
    try {
      user = JSON.parse(raw);
    } catch {
      router.push("/onboarding");
      return;
    }
    onboardingRef.current = user;

    const checkin = getTodayCheckin();

    const effectiveUser: OnboardingData = checkin
      ? { ...user, sleepQuality: checkin.sleepQuality, stressLevel: checkin.stressLevel }
      : user;

    setRecommendation(runPipeline(effectiveUser));
  }, [router]);

  function handleCheckinComplete(data: CheckinData) {
    setCheckinComplete(true);
    setIsRecalculating(true);
    const user = onboardingRef.current;
    if (!user) return;
    const newRec = runPipeline({ ...user, sleepQuality: data.sleepQuality, stressLevel: data.stressLevel });
    setRecommendation(newRec);
    setIsRecalculating(false);
  }

  if (!recommendation) return null;

  return (
    <DashboardShell isRecalculating={isRecalculating}>
      <DashboardHeader recommendation={recommendation} />

      <div className="px-5 space-y-4 pb-6">
        {!checkinComplete && (
          <DailyCheckIn onComplete={handleCheckinComplete} />
        )}
        <PhaseCard phase={recommendation.phase} />
        <TrainingCard training={recommendation.training} />
        <NutritionCard nutrition={recommendation.nutrition} />
        <RecoveryCard recovery={recommendation.recovery} />
        <RecommendationExplanation
          points={recommendation.explanationPoints}
          disclaimer={recommendation.disclaimer}
        />
      </div>
    </DashboardShell>
  );
}
