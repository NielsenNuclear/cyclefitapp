"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { OnboardingData } from "@/lib/onboarding-types";
import type { DailyRecommendation, PhaseData } from "@/types/recommendation";
import type { CheckinData } from "@/lib/checkin";
import type { DifficultyLevel } from "@/lib/exercises/exerciseLibrary";
import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";
import { calculatePhase } from "@/lib/cycle/calculatePhase";
import { generateRecommendation, deriveEnergyLevel, getTrainingState } from "@/lib/recommendations/generateRecommendation";
import { getTodayCheckin } from "@/lib/checkin";
import { generateWorkout } from "@/lib/exercises/generateWorkout";
import { recommendedSplitType, getSplitTemplate } from "@/lib/exercises/workoutSplits";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyCheckIn } from "@/components/dashboard/DailyCheckIn";
import { PhaseCard } from "@/components/dashboard/PhaseCard";
import { TrainingCard, NutritionCard, RecoveryCard } from "@/components/dashboard/RecommendationCards";
import { RecommendationExplanation } from "@/components/dashboard/RecommendationExplanation";
import { WorkoutCard } from "@/components/dashboard/WorkoutCard";

function mapDifficulty(trainingLevel: string): DifficultyLevel {
  if (trainingLevel === "beginner") return "Beginner";
  if (trainingLevel === "advanced" || trainingLevel === "competitive") return "Advanced";
  return "Intermediate";
}

function runPipeline(user: OnboardingData): DailyRecommendation {
  const phase = calculatePhase({
    lastPeriodDate:  user.lastPeriodDate,
    cycleLength:     user.cycleLength,
    cycleRegularity: user.cycleRegularity || undefined,
  });
  return generateRecommendation(phase, user);
}

function runWorkoutPipeline(user: OnboardingData, phase: PhaseData): GeneratedWorkout {
  const { level: energyLevel } = deriveEnergyLevel(user);
  const trainingState          = getTrainingState(user);
  const difficulty             = mapDifficulty(user.trainingLevel);
  const splitType              = recommendedSplitType(user.sessionsPerWeek);
  const template               = getSplitTemplate(splitType);
  const dayIndex               = (new Date().getDay() + 6) % template.days.length;

  return generateWorkout({
    splitType,
    dayIndex,
    difficulty,
    energyLevel,
    trainingState,
    phase,
    sessionIndex: phase.cycleDay,
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<DailyRecommendation | null>(null);
  const [workout, setWorkout]               = useState<GeneratedWorkout | null>(null);
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

    const rec = runPipeline(effectiveUser);
    setRecommendation(rec);
    setWorkout(runWorkoutPipeline(effectiveUser, rec.phase));
  }, [router]);

  function handleCheckinComplete(data: CheckinData) {
    setCheckinComplete(true);
    setIsRecalculating(true);
    const user = onboardingRef.current;
    if (!user) return;
    const effectiveUser = { ...user, sleepQuality: data.sleepQuality, stressLevel: data.stressLevel };
    const newRec = runPipeline(effectiveUser);
    setRecommendation(newRec);
    setWorkout(runWorkoutPipeline(effectiveUser, newRec.phase));
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
        {workout && <WorkoutCard workout={workout} />}
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
