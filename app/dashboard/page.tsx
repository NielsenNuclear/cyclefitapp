"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { OnboardingData } from "@/lib/onboarding-types";
import type { AdaptiveProfile } from "@/lib/adaptive-profile";
import type { DailyRecommendation, PhaseData, ReadinessBadge } from "@/types/recommendation";
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
import type { ProgressionProfile } from "@/lib/progression/progressionProfile";
import { buildProgressionProfile } from "@/lib/progression/progressionProfile";
import type { CoachingAdjustment } from "@/lib/progression/progressionRules";
import { applyProgressionRules } from "@/lib/progression/progressionRules";
import type { ReadinessScore } from "@/lib/readiness/calculateReadiness";
import { calculateReadiness } from "@/lib/readiness/calculateReadiness";
import { saveReadiness, getReadinessTrend, getReadinessHistory } from "@/lib/readiness/readinessHistory";
import type { ReadinessTrend, ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import { computeReadinessFeedback } from "@/lib/readiness/adaptiveFeedback";
import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import { saveDailySymptoms, getSymptomsForDate, getSymptomHistory } from "@/lib/symptoms/symptomHistory";
import type { LearnedPattern } from "@/lib/cycleLearning/types";
import { getLearnedPatterns } from "@/lib/cycleLearning/patternDetection";
import type { CycleForecast } from "@/lib/forecasting/forecastCycle";
import { computeCycleForecast } from "@/lib/forecasting/forecastCycle";
import { applyPatternModifiers, applyTodaySymptomsModifier } from "@/lib/adaptive/recommendationModifiers";
import type { LoggedWorkout } from "@/lib/workoutExecution/workoutLogging";
import { getLoggedWorkout, getWorkoutLog } from "@/lib/workoutExecution/workoutLogging";
import { getAllFeedback, type WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import { computeWeeklyPlan, type WeeklyPlan } from "@/lib/planning/weeklyPlanner";
import { getOrCreateBlock, type TrainingBlock } from "@/lib/planning/trainingBlocks";
import { computeOverloadRecommendation, type OverloadRecommendation } from "@/lib/progression/progressiveOverload";
import { detectDeload, type DeloadRecommendation } from "@/lib/recovery/deloadDetection";
import { computeRecoveryCapacity, type RecoveryCapacity } from "@/lib/adaptive/recoveryCapacity";
import { computePeriodizedCalendar, type PeriodizedCalendar } from "@/lib/planning/periodizedCalendar";
import { buildCoachView, type CoachView } from "@/lib/coaching/coachView";
import type { AccuracyReport } from "@/lib/adaptive/readinessValidation";
import { recordValidation, getAccuracyReport } from "@/lib/adaptive/readinessValidation";
import { recordRecoveryObservation, getRecoveryResponsePatterns } from "@/lib/adaptive/recoveryLearning";
import type { CoachingMemoryItem } from "@/lib/adaptive/coachingMemory";
import { buildCoachingMemory } from "@/lib/adaptive/coachingMemory";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import { getExerciseProgress } from "@/lib/progression/exerciseProgress";

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
import { ProgressionCard } from "@/components/dashboard/ProgressionCard";
import { ReadinessCard }      from "@/components/dashboard/ReadinessCard";
import { SymptomSummaryCard }    from "@/components/dashboard/SymptomSummaryCard";
import { CyclePatternsCard }     from "@/components/dashboard/CyclePatternsCard";
import { WorkoutFeedbackCard }   from "@/components/dashboard/WorkoutFeedbackCard";
import { CoachAccuracyCard }        from "@/components/dashboard/CoachAccuracyCard";
import { PerformanceTrendsCard }    from "@/components/dashboard/PerformanceTrendsCard";
import { CoachingMemoryCard }       from "@/components/dashboard/CoachingMemoryCard";
import { UpcomingTrendsCard }  from "@/components/dashboard/UpcomingTrendsCard";
import { WeeklyPlanCard }       from "@/components/dashboard/WeeklyPlanCard";
import { TrainingBlockCard }    from "@/components/dashboard/TrainingBlockCard";
import { OverloadCard }         from "@/components/dashboard/OverloadCard";
import { DeloadAlertCard }        from "@/components/dashboard/DeloadAlertCard";
import { RecoveryCapacityCard }      from "@/components/dashboard/RecoveryCapacityCard";
import { PeriodizedCalendarCard }    from "@/components/dashboard/PeriodizedCalendarCard";
import { CoachViewCard }             from "@/components/dashboard/CoachViewCard";

function mapDifficulty(trainingLevel: string): DifficultyLevel {
  if (trainingLevel === "just_starting") return "Beginner";
  if (trainingLevel === "competitive")   return "Advanced";
  return "Intermediate";   // recreational, consistent
}

function badgeToEnergyCap(badge: ReadinessBadge): number | undefined {
  if (badge === "Recover") return 1;
  if (badge === "Watch")   return 2;
  return undefined;
}

function computePhase(user: OnboardingData): PhaseData {
  return calculatePhase({
    lastPeriodDate:  user.lastPeriodDate,
    cycleLength:     user.cycleLength,
    cycleRegularity: user.cycleRegularity || undefined,
  });
}

function runPipeline(
  user:        OnboardingData,
  phase:       PhaseData,
  profile?:    AdaptiveProfile,
  progression?: ProgressionProfile,
  readiness?:  ReadinessScore,
): DailyRecommendation {
  return generateRecommendation(phase, user, profile, progression, readiness);
}

function runWorkoutPipeline(
  user:            OnboardingData,
  phase:           PhaseData,
  environment:     TrainingEnvironment = "gym",
  profile?:        AdaptiveProfile,
  adjustment?:     CoachingAdjustment,
  readiness?:      ReadinessScore,
  maxEnergyLevel?: number,
): GeneratedWorkout {
  const weights              = profile?.readinessWeights;
  const { level: rawEnergy } = deriveEnergyLevel(user, weights);
  const energyLevel          = maxEnergyLevel !== undefined
    ? Math.min(rawEnergy, maxEnergyLevel)
    : rawEnergy;
  const trainingState          = getTrainingState(user, weights);
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
    sessionIndex:       phase.cycleDay,
    environment,
    goalType,
    coachingAdjustment: adjustment,
    readiness,
  });
}

function computeProgression(history: ReturnType<typeof getWorkoutHistory>): {
  profile:    ProgressionProfile;
  adjustment: CoachingAdjustment;
  loadReport: TrainingLoadReport;
} {
  const loadReport = generateTrainingLoadReport({ history });
  const profile    = buildProgressionProfile(history, loadReport);
  const adjustment = applyProgressionRules(profile);
  return { profile, adjustment, loadReport };
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
  workout:     GeneratedWorkout,
  phase:       PhaseData,
  goalType?:   GoalType,
  progression?: ProgressionProfile,
  readiness?:  ReadinessScore,
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
    energyLevel:        workout.energyLevel,
    trainingState:      workout.trainingState,
    loadReport:         load,
    volumeReport,
    history,
    progressionProfile: progression,
    readinessScore:     readiness,
  });
  const todayStatus: WorkoutCompletionStatus = history.find(e => e.id === todayStr)?.status ?? "pending";
  return { summary, load, insights, todayStatus };
}

const ENV_STORAGE_KEY = "axis_training_env";

export default function DashboardPage() {
  const router = useRouter();
  const [recommendation, setRecommendation]       = useState<DailyRecommendation | null>(null);
  const [workout, setWorkout]                     = useState<GeneratedWorkout | null>(null);
  const [historySummary, setHistorySummary]       = useState<WorkoutHistorySummary | null>(null);
  const [loadReport, setLoadReport]               = useState<TrainingLoadReport | null>(null);
  const [insightReport, setInsightReport]         = useState<InsightReport | null>(null);
  const [todayStatus, setTodayStatus]             = useState<WorkoutCompletionStatus>("pending");
  const [checkinComplete, setCheckinComplete]     = useState(false);
  const [isRecalculating, setIsRecalculating]     = useState(false);
  const [environment, setEnvironment]             = useState<TrainingEnvironment>("gym");
  const [progressionProfile, setProgressionProfile] = useState<ProgressionProfile | null>(null);
  const [coachingAdjustment, setCoachingAdjustment] = useState<CoachingAdjustment | null>(null);
  const [readinessScore, setReadinessScore]         = useState<ReadinessScore | null>(null);
  const [readinessTrend, setReadinessTrend]         = useState<ReadinessTrend>("insufficient_data");
  const [readinessHistory, setReadinessHistory]     = useState<ReadinessHistoryEntry[]>([]);
  const [todaySymptoms, setTodaySymptoms]           = useState<SymptomEntry[]>([]);
  const [learnedPatterns, setLearnedPatterns]       = useState<LearnedPattern[]>([]);
  const [cycleForecast, setCycleForecast]           = useState<CycleForecast>({ symptomEvents: [], readinessDays: [] });
  const [showFeedback, setShowFeedback]             = useState<boolean>(false);
  const [accuracyReport, setAccuracyReport]         = useState<AccuracyReport>({ last30Days: 0, last90Days: 0, lifetime: 0, totalSamples: 0 });
  const [exerciseSummaries, setExerciseSummaries]   = useState<ExerciseProgressSummary[]>([]);
  const [coachingMemory, setCoachingMemory]         = useState<CoachingMemoryItem[]>([]);
  const [weeklyPlan, setWeeklyPlan]                 = useState<WeeklyPlan | null>(null);
  const [trainingBlock, setTrainingBlock]           = useState<TrainingBlock | null>(null);
  const [overloadRec, setOverloadRec]               = useState<OverloadRecommendation | null>(null);
  const [deloadRec, setDeloadRec]                   = useState<DeloadRecommendation | null>(null);
  const [recoveryCapacity, setRecoveryCapacity]     = useState<RecoveryCapacity | null>(null);
  const [periodizedCalendar, setPeriodizedCalendar] = useState<PeriodizedCalendar | null>(null);
  const [coachView, setCoachView]                   = useState<CoachView | null>(null);
  const onboardingRef  = useRef<OnboardingData | null>(null);
  const profileRef     = useRef<AdaptiveProfile | null>(null);
  const adjustmentRef  = useRef<CoachingAdjustment | null>(null);

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
    const profileRaw = localStorage.getItem("axis_adaptive_profile");
    if (profileRaw) {
      try { profileRef.current = JSON.parse(profileRaw); } catch {}
    }

    const savedEnv = (localStorage.getItem(ENV_STORAGE_KEY) as TrainingEnvironment | null) ?? "gym";
    setEnvironment(savedEnv);

    const checkin = getTodayCheckin();
    const effectiveUser: OnboardingData = checkin
      ? { ...user, sleepQuality: checkin.sleepQuality, stressLevel: checkin.stressLevel }
      : user;

    // Compute progression + readiness from existing history before generating today's workout
    const rawHistory = getWorkoutHistory();
    const { profile: prog, adjustment, loadReport: prelimLoad } = computeProgression(rawHistory);
    setProgressionProfile(prog);
    setCoachingAdjustment(adjustment);
    adjustmentRef.current = adjustment;

    const todayStr  = new Date().toISOString().slice(0, 10);
    const todaySymptomsVal = getSymptomsForDate(todayStr);
    setTodaySymptoms(todaySymptomsVal);
    setShowFeedback(getLoggedWorkout(todayStr) !== null);
    setAccuracyReport(getAccuracyReport());
    const exerciseSummariesVal = getExerciseProgress(getWorkoutLog());
    setExerciseSummaries(exerciseSummariesVal);

    const goalType        = mapOnboardingGoalToGoalType(user.goals);
    const trainingBlockVal = getOrCreateBlock(goalType);
    setTrainingBlock(trainingBlockVal);
    const profile   = profileRef.current ?? undefined;
    const phase     = computePhase(effectiveUser);

    const patterns = getLearnedPatterns(getSymptomHistory(), user.lastPeriodDate, user.cycleLength);
    setLearnedPatterns(patterns);
    setCycleForecast(computeCycleForecast(patterns, phase.cycleDay, user.cycleLength));
    const coachingMemoryVal = buildCoachingMemory({
      cyclePatterns:     patterns,
      recoveryPatterns:  getRecoveryResponsePatterns(),
      exerciseSummaries: exerciseSummariesVal,
      accuracyReport:    getAccuracyReport(),
    });
    setCoachingMemory(coachingMemoryVal);
    const readiness = calculateReadiness({
      user: effectiveUser, phase, loadReport: prelimLoad,
      progressionProfile: prog, adaptiveProfile: profile,
    });
    setReadinessScore(readiness);
    saveReadiness(readiness.score, readiness.category, readiness.contributors);
    const fullRdxHistory = getReadinessHistory();
    setReadinessTrend(getReadinessTrend());
    setReadinessHistory(fullRdxHistory.slice(0, 7));

    const fourteenDaysAgoStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d.toISOString().slice(0, 10);
    })();
    const sevenDaysAgoStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    const weeklyPlanVal = computeWeeklyPlan({
      sessionsPerWeek:  user.sessionsPerWeek,
      readinessHistory: fullRdxHistory.slice(0, 7),
      recentFeedback:   getAllFeedback().filter(f => f.date >= fourteenDaysAgoStr),
      recentHistory:    rawHistory.filter(h => h.id >= fourteenDaysAgoStr),
      recentSymptoms:   getSymptomHistory().filter(s => s.date >= sevenDaysAgoStr),
      currentPhase:     phase,
    });
    setWeeklyPlan(weeklyPlanVal);

    // Refine AdaptiveProfile weights after ≥14 days (weekly cadence)
    if (profileRef.current) {
      const updatedWeights = computeReadinessFeedback(fullRdxHistory, profileRef.current);
      if (updatedWeights) {
        const refined = { ...profileRef.current, readinessWeights: updatedWeights };
        profileRef.current = refined;
        localStorage.setItem("axis_adaptive_profile", JSON.stringify(refined));
      }
    }

    const rec             = runPipeline(effectiveUser, phase, profile, prog, readiness);
    const personalizedRec = applyTodaySymptomsModifier(
      applyPatternModifiers(rec, patterns, phase.cycleDay),
      todaySymptomsVal,
    );
    setRecommendation(personalizedRec);
    const recentFeedbackVal = getAllFeedback().filter(f => f.date >= fourteenDaysAgoStr);
    const overloadRecVal = computeOverloadRecommendation({
      recentLog:         getWorkoutLog().filter(l => l.date >= fourteenDaysAgoStr),
      recentFeedback:    recentFeedbackVal,
      exerciseSummaries: exerciseSummariesVal,
      currentBadge:      personalizedRec.training.badge,
    });
    setOverloadRec(overloadRecVal);
    const deloadRecVal = detectDeload({
      recentLog:         getWorkoutLog().filter(l => l.date >= fourteenDaysAgoStr),
      recentFeedback:    recentFeedbackVal,
      recentSymptoms:    getSymptomHistory().filter(s => s.date >= sevenDaysAgoStr),
      exerciseSummaries: exerciseSummariesVal,
      readinessHistory:  fullRdxHistory.slice(0, 14),
    });
    setDeloadRec(deloadRecVal);
    const effectiveAdjustmentVal = deloadRecVal.needed
      ? applyProgressionRules({ ...prog, recommendedAction: "deload" })
      : adjustment;
    setCoachingAdjustment(effectiveAdjustmentVal);
    adjustmentRef.current = effectiveAdjustmentVal;
    const thirtyDaysAgoStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    })();
    const recoveryCapacityVal = computeRecoveryCapacity({
      recentHistory:    rawHistory.filter(h => h.id >= thirtyDaysAgoStr),
      recentFeedback:   getAllFeedback().filter(f => f.date >= thirtyDaysAgoStr),
      recentSymptoms:   getSymptomHistory().filter(s => s.date >= thirtyDaysAgoStr),
      recoveryPatterns: getRecoveryResponsePatterns(),
    });
    setRecoveryCapacity(recoveryCapacityVal);
    setPeriodizedCalendar(computePeriodizedCalendar({
      trainingBlock:    trainingBlockVal,
      weeklyPlan:       weeklyPlanVal,
      deloadRec:        deloadRecVal,
      recoveryCapacity: recoveryCapacityVal,
      learnedPatterns:  patterns,
      currentCycleDay:  phase.cycleDay,
      cycleLength:      user.cycleLength,
      sessionsPerWeek:  user.sessionsPerWeek,
    }));
    setCoachView(buildCoachView({
      recommendation:    personalizedRec,
      weeklyPlan:        weeklyPlanVal,
      trainingBlock:     trainingBlockVal,
      overloadRec:       overloadRecVal,
      deloadRec:         deloadRecVal,
      recoveryCapacity:  recoveryCapacityVal,
      coachingMemory:    coachingMemoryVal,
      accuracyReport:    getAccuracyReport(),
      exerciseSummaries: exerciseSummariesVal,
    }));
    const wkt             = runWorkoutPipeline(effectiveUser, rec.phase, savedEnv, profile, effectiveAdjustmentVal, readiness, badgeToEnergyCap(personalizedRec.training.badge));
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, rec.phase, goalType, prog, readiness);
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

    // Persist symptoms and update summary card
    if (data.symptoms && data.symptoms.length > 0) {
      const entries: SymptomEntry[] = data.symptoms.map(s => ({
        date:      data.date,
        symptomId: s.symptomId,
        severity:  s.severity,
      }));
      saveDailySymptoms(data.date, entries);
    }
    const todaySymptomsVal = getSymptomsForDate(data.date);
    setTodaySymptoms(todaySymptomsVal);
    const effectiveUser = { ...user, sleepQuality: data.sleepQuality, stressLevel: data.stressLevel };
    const profile       = profileRef.current ?? undefined;
    const adjustment    = (deloadRec?.needed && progressionProfile)
      ? applyProgressionRules({ ...progressionProfile, recommendedAction: "deload" })
      : adjustmentRef.current ?? undefined;
    const phase         = computePhase(effectiveUser);
    const newReadiness  = progressionProfile && loadReport
      ? calculateReadiness({ user: effectiveUser, phase, loadReport, progressionProfile, adaptiveProfile: profile })
      : readinessScore;
    if (newReadiness) {
      setReadinessScore(newReadiness);
      saveReadiness(newReadiness.score, newReadiness.category, newReadiness.contributors);
      setReadinessTrend(getReadinessTrend());
      setReadinessHistory(getReadinessHistory().slice(0, 7));
    }
    const newRec          = runPipeline(effectiveUser, phase, profile, progressionProfile ?? undefined, newReadiness ?? undefined);
    const personalizedRec = applyTodaySymptomsModifier(
      applyPatternModifiers(newRec, learnedPatterns, phase.cycleDay),
      todaySymptomsVal,
    );
    setRecommendation(personalizedRec);
    const goalType = mapOnboardingGoalToGoalType(user.goals);
    const wkt = runWorkoutPipeline(effectiveUser, personalizedRec.phase, environment, profile, adjustment, newReadiness ?? undefined, badgeToEnergyCap(personalizedRec.training.badge));
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, personalizedRec.phase, goalType, progressionProfile ?? undefined, newReadiness ?? undefined);
    setHistorySummary(summary);
    setLoadReport(load);
    setInsightReport(insights);
    setTodayStatus(ts);
    setIsRecalculating(false);
  }

  function refreshAfterMark() {
    if (!workout || !recommendation) return;
    const goalType    = mapOnboardingGoalToGoalType(onboardingRef.current?.goals ?? []);
    const snap        = runAnalyticsPipeline(workout, recommendation.phase, goalType, progressionProfile ?? undefined, readinessScore ?? undefined);
    setHistorySummary(snap.summary);
    setLoadReport(snap.load);
    setInsightReport(snap.insights);
    setTodayStatus(snap.todayStatus);
    // Recompute progression from updated history
    const updatedHistory = getWorkoutHistory();
    const { profile: prog, adjustment } = computeProgression(updatedHistory);
    setProgressionProfile(prog);
    setCoachingAdjustment(adjustment);
    adjustmentRef.current = adjustment;
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

  function handleWorkoutLogged(_log: LoggedWorkout) {
    setShowFeedback(true);
    refreshAfterMark();
  }

  function handleFeedbackComplete(feedback: WorkoutFeedback) {
    if (recommendation) {
      recordValidation(feedback.date, recommendation.training.badge, feedback);
      recordRecoveryObservation(feedback, recommendation.phase.name);
      const newAccuracy = getAccuracyReport();
      setAccuracyReport(newAccuracy);
      setCoachingMemory(buildCoachingMemory({
        cyclePatterns:     learnedPatterns,
        recoveryPatterns:  getRecoveryResponsePatterns(),
        exerciseSummaries,
        accuracyReport:    newAccuracy,
      }));
    }
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
    const wkt = runWorkoutPipeline(effectiveUser, recommendation.phase, env, profileRef.current ?? undefined, adjustmentRef.current ?? undefined, readinessScore ?? undefined);
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, recommendation.phase, goalType, progressionProfile ?? undefined, readinessScore ?? undefined);
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
          <DailyCheckIn
            onComplete={handleCheckinComplete}
            lowReadinessAlert={(() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              const ys = d.toISOString().slice(0, 10);
              const entry = readinessHistory.find(e => e.date === ys);
              return !!entry && entry.score <= 45;
            })()}
          />
        )}
        <PhaseCard phase={recommendation.phase} />
        <ReadinessCard score={readinessScore} trend={readinessTrend} history={readinessHistory} />
        <CoachViewCard view={coachView} />
        <WeeklyPlanCard plan={weeklyPlan} />
        <TrainingBlockCard block={trainingBlock} />
        <PeriodizedCalendarCard calendar={periodizedCalendar} />
        <OverloadCard recommendation={overloadRec} />
        <DeloadAlertCard recommendation={deloadRec} />
        <RecoveryCapacityCard capacity={recoveryCapacity} />
        <SymptomSummaryCard symptoms={todaySymptoms} />
        <CyclePatternsCard  patterns={learnedPatterns} />
        <UpcomingTrendsCard forecast={cycleForecast} />
        <TrainingCard
          training={recommendation.training}
          restDaySignal={
            readinessHistory.length >= 3 &&
            readinessHistory.slice(0, 3).every(
              e => e.category === "cautious" || e.category === "recover"
            )
          }
        />
        {workout && (
          <WorkoutCard
            workout={workout}
            environment={environment}
            onEnvironmentChange={handleEnvironmentChange}
            completionStatus={todayStatus}
            onMarkComplete={handleMarkComplete}
            onMarkPartial={handleMarkPartial}
            onMarkSkip={handleMarkSkip}
            onWorkoutLogged={handleWorkoutLogged}
          />
        )}
        {showFeedback && (
          <WorkoutFeedbackCard
            date={new Date().toISOString().slice(0, 10)}
            onComplete={handleFeedbackComplete}
          />
        )}
        <CoachAccuracyCard      report={accuracyReport} />
        <PerformanceTrendsCard  summaries={exerciseSummaries} />
        <CoachingMemoryCard     items={coachingMemory} />
        <TrainingSummaryCard    summary={historySummary} />
        <RecoveryStatusCard  report={loadReport} />
        <ProgressionCard     profile={progressionProfile} adjustment={coachingAdjustment} />
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
