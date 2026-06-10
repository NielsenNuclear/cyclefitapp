"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { OnboardingData } from "@/lib/onboarding-types";
import type { DailyRecommendation, PhaseData } from "@/types/recommendation";
import type { CheckinData } from "@/lib/checkin";
import type { DifficultyLevel, TrainingEnvironment } from "@/lib/exercises/exerciseLibrary";
import type { GeneratedWorkout } from "@/lib/exercises/generateWorkout";
import type { WorkoutHistorySummary } from "@/lib/history/workoutHistory";
import type { TrainingLoadReport } from "@/lib/analytics/trainingLoad";
import type { InsightReport } from "@/lib/insights/generateInsights";
import { calculatePhase } from "@/lib/cycle/calculatePhase";
import { generateRecommendation, deriveEnergyLevel, getTrainingState } from "@/lib/recommendations/generateRecommendation";
import { getTodayCheckin } from "@/lib/checkin";
import { generateWorkout } from "@/lib/exercises/generateWorkout";
import { recommendedSplitType, getSplitTemplate } from "@/lib/exercises/workoutSplits";
import { mapOnboardingGoalToGoalType } from "@/lib/exercises/goalBasedSelection";
import type { WorkoutCompletionStatus } from "@/lib/history/workoutHistory";
import { saveWorkout as saveWorkoutToHistory, getWorkoutHistory, getWorkoutHistorySummary, markWorkoutCompleted, markWorkoutPartiallyCompleted, markWorkoutSkipped } from "@/lib/history/workoutHistory";
import { generateTrainingLoadReport } from "@/lib/analytics/trainingLoad";
import { generateInsights } from "@/lib/insights/generateInsights";
import type { TrainingGoal } from "@/lib/exercises/volumeTracking";
import { calculateWeeklyVolumeFromHistory, generateVolumeReport } from "@/lib/exercises/volumeTracking";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyCheckIn } from "@/components/dashboard/DailyCheckIn";
import { PhaseCard } from "@/components/dashboard/PhaseCard";
import { TrainingCard, NutritionCard, RecoveryCard } from "@/components/dashboard/RecommendationCards";
import { RecommendationExplanation } from "@/components/dashboard/RecommendationExplanation";
import { WorkoutCard } from "@/components/dashboard/WorkoutCard";
import { TrainingSummaryCard } from "@/components/dashboard/TrainingSummaryCard";
import { RecoveryStatusCard } from "@/components/dashboard/RecoveryStatusCard";
import { InsightsCard } from "@/components/dashboard/InsightsCard";

function mapDifficulty(trainingLevel: string): DifficultyLevel {
  if (trainingLevel === "just_starting") return "Beginner";
  if (trainingLevel === "competitive")   return "Advanced";
  return "Intermediate";   // recreational, consistent
}

function runPipeline(user: OnboardingData): DailyRecommendation {
  const phase = calculatePhase({
    lastPeriodDate:  user.lastPeriodDate,
    cycleLength:     user.cycleLength,
    cycleRegularity: user.cycleRegularity || undefined,
  });
  return generateRecommendation(phase, user);
}

function runWorkoutPipeline(
  user: OnboardingData,
  phase: PhaseData,
  environment: TrainingEnvironment = "gym",
): GeneratedWorkout {
  const { level: energyLevel } = deriveEnergyLevel(user);
  const trainingState          = getTrainingState(user);
  const difficulty             = mapDifficulty(user.trainingLevel);
  const splitType              = recommendedSplitType(user.sessionsPerWeek);
  const template               = getSplitTemplate(splitType);
  const dayIndex               = (new Date().getDay() + 6) % template.days.length;
  const goalType               = mapOnboardingGoalToGoalType(user.goals ?? []);

  return generateWorkout({
    splitType,
    dayIndex,
    difficulty,
    energyLevel,
    trainingState,
    phase,
    sessionIndex: phase.cycleDay,
    environment,
    goalType,
  });
}

interface AnalyticsSnapshot {
  summary:     WorkoutHistorySummary;
  load:        TrainingLoadReport;
  insights:    InsightReport;
  todayStatus: WorkoutCompletionStatus;
}

function toTrainingGoal(goalType: GoalType): TrainingGoal {
  if (goalType === "strength")   return "strength";
  if (goalType === "hypertrophy") return "hypertrophy";
  return "maintenance";
}

function runAnalyticsPipeline(
  workout:   GeneratedWorkout,
  phase:     PhaseData,
  goalType?: GoalType,
): AnalyticsSnapshot {
  saveWorkoutToHistory(workout);
  const history    = getWorkoutHistory();
  const summary    = getWorkoutHistorySummary();
  const load       = generateTrainingLoadReport({
    history,
    currentTrainingState: workout.trainingState,
    currentEnergyLevel:   workout.energyLevel,
  });

  const todayStr   = new Date().toISOString().slice(0, 10);
  const day7AgoDate = new Date();
  day7AgoDate.setDate(day7AgoDate.getDate() - 7);
  const day7AgoStr = day7AgoDate.toISOString().slice(0, 10);

  const weeklyCompleted = history.filter(
    e => (e.status === "completed" || e.status === "partially_completed")
      && e.id >= day7AgoStr && e.id <= todayStr
  );
  const weeklyVolume = calculateWeeklyVolumeFromHistory(weeklyCompleted);
  const volumeReport = generateVolumeReport(
    weeklyVolume,
    goalType ? toTrainingGoal(goalType) : "maintenance",
  );

  const insights   = generateInsights({
    phase,
    energyLevel:   workout.energyLevel,
    trainingState: workout.trainingState,
    loadReport:    load,
    volumeReport,
    history,
  });
  const todayStatus: WorkoutCompletionStatus = history.find(e => e.id === todayStr)?.status ?? "pending";
  return { summary, load, insights, todayStatus };
}

const ENV_STORAGE_KEY = "axis_training_env";

export default function DashboardPage() {
  const router = useRouter();
  const [recommendation, setRecommendation]   = useState<DailyRecommendation | null>(null);
  const [workout, setWorkout]                 = useState<GeneratedWorkout | null>(null);
  const [historySummary, setHistorySummary]   = useState<WorkoutHistorySummary | null>(null);
  const [loadReport, setLoadReport]           = useState<TrainingLoadReport | null>(null);
  const [insightReport, setInsightReport]     = useState<InsightReport | null>(null);
  const [todayStatus, setTodayStatus]         = useState<WorkoutCompletionStatus>("pending");
  const [checkinComplete, setCheckinComplete] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [environment, setEnvironment]         = useState<TrainingEnvironment>("gym");
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

    const savedEnv = (localStorage.getItem(ENV_STORAGE_KEY) as TrainingEnvironment | null) ?? "gym";
    setEnvironment(savedEnv);

    const checkin = getTodayCheckin();
    const effectiveUser: OnboardingData = checkin
      ? { ...user, sleepQuality: checkin.sleepQuality, stressLevel: checkin.stressLevel }
      : user;

    const goalType = mapOnboardingGoalToGoalType(user.goals);
    const rec = runPipeline(effectiveUser);
    setRecommendation(rec);
    const wkt = runWorkoutPipeline(effectiveUser, rec.phase, savedEnv);
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, rec.phase, goalType);
    setHistorySummary(summary);
    setLoadReport(load);
    setInsightReport(insights);
    setTodayStatus(ts);
  }, [router]);

  function handleCheckinComplete(data: CheckinData) {
    setCheckinComplete(true);
    setIsRecalculating(true);
    const user = onboardingRef.current;
    if (!user) return;
    const effectiveUser = { ...user, sleepQuality: data.sleepQuality, stressLevel: data.stressLevel };
    const newRec = runPipeline(effectiveUser);
    setRecommendation(newRec);
    const goalType = mapOnboardingGoalToGoalType(user.goals);
    const wkt = runWorkoutPipeline(effectiveUser, newRec.phase, environment);
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, newRec.phase, goalType);
    setHistorySummary(summary);
    setLoadReport(load);
    setInsightReport(insights);
    setTodayStatus(ts);
    setIsRecalculating(false);
  }

  function refreshAfterMark() {
    if (!workout || !recommendation) return;
    const goalType = mapOnboardingGoalToGoalType(onboardingRef.current?.goals ?? []);
    const snap = runAnalyticsPipeline(workout, recommendation.phase, goalType);
    setHistorySummary(snap.summary);
    setLoadReport(snap.load);
    setInsightReport(snap.insights);
    setTodayStatus(snap.todayStatus);
  }

  function handleMarkComplete() {
    markWorkoutCompleted(new Date().toISOString().slice(0, 10));
    refreshAfterMark();
  }

  function handleMarkPartial() {
    markWorkoutPartiallyCompleted(new Date().toISOString().slice(0, 10));
    refreshAfterMark();
  }

  function handleMarkSkip() {
    markWorkoutSkipped(new Date().toISOString().slice(0, 10));
    refreshAfterMark();
  }

  function handleEnvironmentChange(env: TrainingEnvironment) {
    setEnvironment(env);
    localStorage.setItem(ENV_STORAGE_KEY, env);
    const user = onboardingRef.current;
    if (!user || !recommendation) return;
    const checkin = getTodayCheckin();
    const effectiveUser: OnboardingData = checkin
      ? { ...user, sleepQuality: checkin.sleepQuality, stressLevel: checkin.stressLevel }
      : user;
    const goalType = mapOnboardingGoalToGoalType(effectiveUser.goals);
    const wkt = runWorkoutPipeline(effectiveUser, recommendation.phase, env);
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, recommendation.phase, goalType);
    setHistorySummary(summary);
    setLoadReport(load);
    setInsightReport(insights);
    setTodayStatus(ts);
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
        {workout && (
          <WorkoutCard
            workout={workout}
            environment={environment}
            onEnvironmentChange={handleEnvironmentChange}
            completionStatus={todayStatus}
            onMarkComplete={handleMarkComplete}
            onMarkPartial={handleMarkPartial}
            onMarkSkip={handleMarkSkip}
          />
        )}
        <TrainingSummaryCard summary={historySummary} />
        <RecoveryStatusCard  report={loadReport} />
        <InsightsCard        report={insightReport} />
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
