"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCycleData }       from "@/hooks/useCycleData";
import { useReadinessData }   from "@/hooks/useReadinessData";
import { useRecoveryData }    from "@/hooks/useRecoveryData";
import { useProgressionData } from "@/hooks/useProgressionData";
import { useAdaptiveData }    from "@/hooks/useAdaptiveData";
import { useWorkoutData }     from "@/hooks/useWorkoutData";

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
import type { TrainingGoal, WeeklyVolume, VolumeLandmarkReport } from "@/lib/exercises/volumeTracking";
import { calculateWeeklyVolumeFromHistory, generateVolumeReport } from "@/lib/exercises/volumeTracking";
import { computeVolumeLandmarks } from "@/lib/progression/volumeLandmarks";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { ProgressionProfile } from "@/lib/progression/progressionProfile";
import { buildProgressionProfile, applyCapacityModifier } from "@/lib/progression/progressionProfile";
import type { CoachingAdjustment } from "@/lib/progression/progressionRules";
import { applyProgressionRules, applyGoalModifiers } from "@/lib/progression/progressionRules";
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
import { computeRecoveryCapacity, type RecoveryCapacity, type CapacityLevel } from "@/lib/adaptive/recoveryCapacity";
import { computePeriodizedCalendar, type PeriodizedCalendar } from "@/lib/planning/periodizedCalendar";
import { buildCoachView, type CoachView } from "@/lib/coaching/coachView";
import type { AccuracyReport } from "@/lib/adaptive/readinessValidation";
import { recordValidation, getAccuracyReport, getAllValidations } from "@/lib/adaptive/readinessValidation";
import { recordRecoveryObservation, getRecoveryResponsePatterns } from "@/lib/adaptive/recoveryLearning";
import type { CoachingMemoryItem } from "@/lib/adaptive/coachingMemory";
import { buildCoachingMemory } from "@/lib/adaptive/coachingMemory";
import type { CalibrationFactors } from "@/lib/adaptive/accuracyCalibration";
import { computeCalibration, applyAccuracyCalibration } from "@/lib/adaptive/accuracyCalibration";
import { computeForecastBurden, applyForecastModifier } from "@/lib/adaptive/forecastModifier";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import { getExerciseProgress } from "@/lib/progression/exerciseProgress";
import { applyExerciseProgressionRules, mergeCoachingAdjustments } from "@/lib/progression/exerciseProgressionRules";
import { getExercisePerformanceHistory } from "@/lib/progression/exercisePerformanceLog";
import { computeProgressionTargets, type ProgressionTarget } from "@/lib/progression/progressionTargets";
import { computeExerciseMastery, type ExerciseMasteryEntry } from "@/lib/progression/exerciseMastery";
import { detectPerformanceTrends, type PerformanceTrend } from "@/lib/analytics/performanceTrends";
import { generatePlateauInterventions, type PlateauIntervention } from "@/lib/progression/plateauIntervention";
import { buildMesocycle, type Mesocycle } from "@/lib/planning/mesocycleBuilder";
import { buildWeeklyPrescription, type WeeklyProgressionPrescription } from "@/lib/planning/goalProgression";
import { logPeriod, getPeriodHistory, computeCycleAccuracy, type CycleAccuracyReport } from "@/lib/cycle/cycleAccuracy";
import { deriveEffectiveCycleLength } from "@/lib/cycle/effectiveCycleLength";
import { estimateOvulation, type OvulationEstimate } from "@/lib/cycle/ovulationEstimator";
import { buildSymptomTimeline, type SymptomTimeline } from "@/lib/cycle/symptomTimeline";
import { buildSymptomClusters } from "@/lib/cycle/symptomClusters";
import { detectPrimeTrainingWindow, type TrainingWindow } from "@/lib/cycle/trainingWindows";
import { detectRecoveryWindow, type RecoveryWindow } from "@/lib/cycle/recoveryWindows";
import { buildPerformanceProfile, type PersonalPerformanceProfile } from "@/lib/cycle/performanceProfile";
import { buildCycleHealthReport, type CycleHealthReport } from "@/lib/cycle/cycleHealth";

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
import { CycleIntelligenceCard }    from "@/components/dashboard/CycleIntelligenceCard";
import { OvulationEstimateCard }   from "@/components/dashboard/OvulationEstimateCard";
import { TrainingWindowCard }      from "@/components/dashboard/TrainingWindowCard";
import { RecoveryWindowCard }      from "@/components/dashboard/RecoveryWindowCard";
import { ProgressCard }             from "@/components/dashboard/ProgressCard";
import {
  computeRecoveryScore,
  getRecoveryScores,
  type RecoveryScore,
} from "@/lib/recovery/recoveryScore";
import {
  computeRecoveryTrend,
  type RecoveryTrend,
} from "@/lib/recovery/recoveryTrend";
import {
  updateRecoveryDebt,
  type RecoveryDebt,
} from "@/lib/recovery/recoveryDebt";
import {
  computeBurnoutRisk,
  type BurnoutRisk,
} from "@/lib/recovery/burnoutRisk";
import {
  recordPhysiologyEntry,
  getPhysiologyHistory,
  buildPhysiologyFingerprint,
  type PhysiologyFingerprint,
} from "@/lib/adaptive/physiologyMemory";
import { getWorkoutFeedback }       from "@/lib/workoutExecution/feedback";
import { toCyclePhaseName }         from "@/lib/cycle/cycleUtils";
import {
  buildPatternConfidences,
  type PatternConfidence,
} from "@/lib/adaptive/patternConfidence";
import {
  buildPersonalWeights,
  type PersonalWeights,
} from "@/lib/adaptive/personalWeighting";
import {
  logIntervention,
  scoreInterventions,
  getInterventionOutcomes,
  type InterventionOutcome,
} from "@/lib/adaptive/interventionLearning";
import {
  computeAdaptiveModifier,
  generateAdaptiveInsights,
  type AdaptiveModifier,
  type AdaptiveInsight,
} from "@/lib/adaptive/adaptiveDecisionEngine";
import { AdaptiveInsightsCard }         from "@/components/dashboard/AdaptiveInsightsCard";
import { RecoveryIntelligenceCard }     from "@/components/dashboard/RecoveryIntelligenceCard";
import {
  detectSymptomEscalation,
  type SymptomEscalationEntry,
} from "@/lib/recovery/symptomEscalation";
import {
  buildHealthTrend,
  type HealthTrend,
} from "@/lib/recovery/healthTrendAnalysis";
import {
  buildRecoveryPlan,
  type RecoveryPlan,
} from "@/lib/recovery/recoveryPlanning";
import {
  logRecoveryStrategy,
  scoreRecoveryStrategies,
  getRecoveryStrategyOutcomes,
  type RecoveryStrategyOutcome,
} from "@/lib/recovery/recoveryLearning";

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

function computePhase(user: OnboardingData, cycleLength?: number): PhaseData {
  return calculatePhase({
    lastPeriodDate:  user.lastPeriodDate,
    cycleLength:     cycleLength ?? user.cycleLength,
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
  user:               OnboardingData,
  phase:              PhaseData,
  environment:        TrainingEnvironment = "gym",
  profile?:           AdaptiveProfile,
  adjustment?:        CoachingAdjustment,
  readiness?:         ReadinessScore,
  maxEnergyLevel?:    number,
  capacityLevel?:     CapacityLevel,
  exerciseSummaries?: ExerciseProgressSummary[],
  adaptiveModifier?:  AdaptiveModifier,
): GeneratedWorkout {
  const weights              = profile?.readinessWeights;
  const { level: rawEnergy } = deriveEnergyLevel(user, weights);
  const capacityCap          = capacityLevel === "low" ? Math.max(0, rawEnergy - 1) : undefined;
  const finalCap             = (maxEnergyLevel !== undefined || capacityCap !== undefined)
    ? Math.min(maxEnergyLevel ?? 4, capacityCap ?? 4)
    : undefined;
  const energyLevel          = finalCap !== undefined ? Math.min(rawEnergy, finalCap) : rawEnergy;
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
    sessionIndex:                phase.cycleDay,
    environment,
    goalType,
    coachingAdjustment:          adjustment,
    readiness,
    exerciseSummaries,
    adaptiveVolumeMultiplier:    adaptiveModifier?.volumeMultiplier,
    adaptiveIntensityMultiplier: adaptiveModifier?.intensityMultiplier,
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

function groupHistoryIntoWeeks(
  history:  ReturnType<typeof getWorkoutHistory>,
  numWeeks: number,
): WeeklyVolume[] {
  const result: WeeklyVolume[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let w = 0; w < numWeeks; w++) {
    const weekEnd   = new Date(today);
    weekEnd.setDate(today.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);

    const endStr   = weekEnd.toISOString().slice(0, 10);
    const startStr = weekStart.toISOString().slice(0, 10);

    const entries = history.filter(
      h => h.id > startStr && h.id <= endStr &&
           (h.status === "completed" || h.status === "partially_completed"),
    );
    if (entries.length > 0) {
      result.push(calculateWeeklyVolumeFromHistory(entries));
    }
  }

  return result;
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
  landmarks?:  VolumeLandmarkReport,
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
    landmarks,
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

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [checkinComplete, setCheckinComplete] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [environment, setEnvironment]         = useState<TrainingEnvironment>("gym");

  // ── Mutable refs (not reactive) ───────────────────────────────────────────────
  const onboardingRef = useRef<OnboardingData | null>(null);
  const profileRef    = useRef<AdaptiveProfile | null>(null);
  const adjustmentRef = useRef<CoachingAdjustment | null>(null);

  // ── Domain state hooks ────────────────────────────────────────────────────────
  const {
    cycleAccuracy,       setCycleAccuracy,
    cycleHealthReport,   setCycleHealthReport,
    ovulationEstimate,   setOvulationEstimate,
    symptomTimeline,     setSymptomTimeline,
    primeTrainingWindow, setPrimeTrainingWindow,
    recoveryWindow,      setRecoveryWindow,
    performanceProfile,  setPerformanceProfile,
    learnedPatterns,     setLearnedPatterns,
    cycleForecast,       setCycleForecast,
    patternConfidences,  setPatternConfidences,
  } = useCycleData();

  const {
    readinessScore,        setReadinessScore,
    readinessTrend,        setReadinessTrend,
    readinessHistory,      setReadinessHistory,
    todaySymptoms,         setTodaySymptoms,
    showFeedback,          setShowFeedback,
    accuracyReport,        setAccuracyReport,
    physiologyFingerprint, setPhysiologyFingerprint,
    personalWeights,       setPersonalWeights,
  } = useReadinessData();

  const {
    recoveryScore,      setRecoveryScore,
    recoveryTrend,      setRecoveryTrend,
    recoveryDebt,       setRecoveryDebt,
    burnoutRisk,        setBurnoutRisk,
    recoveryCapacity,   setRecoveryCapacity,
    healthTrend,        setHealthTrend,
    recoveryPlan,       setRecoveryPlan,
    strategyOutcomes,   setStrategyOutcomes,
    symptomEscalations, setSymptomEscalations,
  } = useRecoveryData();

  const {
    progressionProfile,   setProgressionProfile,
    coachingAdjustment,   setCoachingAdjustment,
    progressionTargets,   setProgressionTargets,
    exerciseMastery,      setExerciseMastery,
    performanceTrends,    setPerformanceTrends,
    plateauInterventions, setPlateauInterventions,
    weeklyPlan,           setWeeklyPlan,
    trainingBlock,        setTrainingBlock,
    overloadRec,          setOverloadRec,
    deloadRec,            setDeloadRec,
    volumeLandmarks,      setVolumeLandmarks,
    mesocycle,            setMesocycle,
    weeklyPrescription,   setWeeklyPrescription,
    periodizedCalendar,   setPeriodizedCalendar,
    coachView,            setCoachView,
  } = useProgressionData();

  const {
    recommendation,       setRecommendation,
    adaptiveModifier,     setAdaptiveModifier,
    adaptiveInsights,     setAdaptiveInsights,
    interventionOutcomes, setInterventionOutcomes,
    calibrationFactors,   setCalibrationFactors,
    coachingMemory,       setCoachingMemory,
  } = useAdaptiveData();

  const {
    workout,           setWorkout,
    historySummary,    setHistorySummary,
    loadReport,        setLoadReport,
    insightReport,     setInsightReport,
    todayStatus,       setTodayStatus,
    exerciseSummaries, setExerciseSummaries,
  } = useWorkoutData();

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

    // Seed period history from onboarding if no entries recorded yet
    if (getPeriodHistory().length === 0 && user.lastPeriodDate) {
      logPeriod(user.lastPeriodDate);
    }
    const periodHistoryVal  = getPeriodHistory();
    const cycleAccuracyVal  = computeCycleAccuracy(periodHistoryVal, user.cycleLength);
    setCycleAccuracy(cycleAccuracyVal);
    if (cycleAccuracyVal) setCycleHealthReport(buildCycleHealthReport(cycleAccuracyVal));
    // Adaptive cycle length: weighted average of last 6 observed cycles
    const effectiveCycleLength = deriveEffectiveCycleLength(periodHistoryVal, user.cycleLength);

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
    const perfHistoryVal = getExercisePerformanceHistory();
    const goalType       = mapOnboardingGoalToGoalType(user.goals);
    setProgressionTargets(computeProgressionTargets(perfHistoryVal, goalType));
    setExerciseMastery(computeExerciseMastery(perfHistoryVal, savedEnv));
    const trendsVal = detectPerformanceTrends(perfHistoryVal);
    setPerformanceTrends(trendsVal);
    const plateauInterventionVals = generatePlateauInterventions(trendsVal, goalType);
    setPlateauInterventions(plateauInterventionVals);
    for (const inv of plateauInterventionVals) {
      logIntervention(`plateau_${inv.interventionType}`, inv.suggestion, todayStr);
    }
    const weeklyVolumesVal = groupHistoryIntoWeeks(rawHistory, 8);
    const landmarksVal     = computeVolumeLandmarks(weeklyVolumesVal, toTrainingGoal(goalType));
    setVolumeLandmarks(landmarksVal);
    const trainingBlockVal = getOrCreateBlock(goalType);
    setTrainingBlock(trainingBlockVal);
    const mesocycleVal = buildMesocycle(goalType, trainingBlockVal.currentWeek);
    setMesocycle(mesocycleVal);
    setWeeklyPrescription(buildWeeklyPrescription(mesocycleVal, goalType));
    const profile   = profileRef.current ?? undefined;
    const phase     = computePhase(effectiveUser, effectiveCycleLength);

    const patterns = getLearnedPatterns(getSymptomHistory(), user.lastPeriodDate, effectiveCycleLength);
    setLearnedPatterns(patterns);
    const cycleForecastVal = computeCycleForecast(patterns, phase.cycleDay, effectiveCycleLength);
    setCycleForecast(cycleForecastVal);
    const coachingMemoryVal = buildCoachingMemory({
      cyclePatterns:     patterns,
      recoveryPatterns:  getRecoveryResponsePatterns(),
      exerciseSummaries: exerciseSummariesVal,
      accuracyReport:    getAccuracyReport(),
    });
    setCoachingMemory(coachingMemoryVal);
    const recoveryScoreVal = computeRecoveryScore({
      date:         todayStr,
      sleepQuality: effectiveUser.sleepQuality as "excellent" | "good" | "variable" | "poor",
      stressLevel:  effectiveUser.stressLevel,
      symptoms:     todaySymptomsVal,
      loadReport:   prelimLoad,
      cyclePhase:   toCyclePhaseName(phase.cycleDay, effectiveCycleLength),
    });
    setRecoveryScore(recoveryScoreVal);
    setRecoveryTrend(computeRecoveryTrend(getRecoveryScores()));

    const readiness = calculateReadiness({
      user: effectiveUser, phase, loadReport: prelimLoad,
      progressionProfile: prog, adaptiveProfile: profile,
    });
    setReadinessScore(readiness);
    saveReadiness(readiness.score, readiness.category, readiness.contributors);

    // Record today's physiology snapshot for adaptive memory
    const todayWorkoutStatus = rawHistory.find(e => e.id === todayStr)?.status ?? "pending";
    const todayFeedback      = getWorkoutFeedback(todayStr);
    const recoveryStateVal   =
      readiness.category === "optimal" || readiness.category === "ready"
        ? ("optimal" as const)
        : readiness.category === "moderate"
          ? ("adequate" as const)
          : ("compromised" as const);
    recordPhysiologyEntry({
      date:             todayStr,
      cycleDay:         phase.cycleDay,
      phase:            toCyclePhaseName(phase.cycleDay, effectiveCycleLength),
      readiness:        readiness.score,
      energy:           readiness.contributors?.energy ?? null,
      symptoms:         todaySymptomsVal.map(s => s.symptomId),
      workoutCompleted: todayWorkoutStatus === "completed" || todayWorkoutStatus === "partially_completed",
      workoutQuality:   todayFeedback?.sessionRPE ?? null,
      recoveryState:    recoveryStateVal,
    });

    const fullRdxHistory = getReadinessHistory();
    setReadinessTrend(getReadinessTrend());
    setReadinessHistory(fullRdxHistory.slice(0, 7));
    const physiologyHistoryVal     = getPhysiologyHistory();
    const physiologyFingerprintVal = buildPhysiologyFingerprint(physiologyHistoryVal);
    setPhysiologyFingerprint(physiologyFingerprintVal);
    const personalWeightsVal = buildPersonalWeights(fullRdxHistory, getSymptomHistory());
    setPersonalWeights(personalWeightsVal);

    // Score yesterday's interventions + recovery strategies now that today's data is known
    const yesterdayReadiness = fullRdxHistory[1]?.score;
    if (yesterdayReadiness !== undefined) {
      const yesterdayStr = (() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
      })();
      const yStatus = rawHistory.find(e => e.id === yesterdayStr)?.status;
      scoreInterventions(
        yesterdayStr,
        readiness.score,
        yesterdayReadiness,
        yStatus === "completed" || yStatus === "partially_completed",
        todayStr,
      );
      const allScores = getRecoveryScores().sort((a, b) => a.date.localeCompare(b.date));
      const yesterdayRecovery = allScores.find(s => s.date === yesterdayStr)?.score ?? recoveryScoreVal.score;
      scoreRecoveryStrategies(
        yesterdayStr,
        recoveryScoreVal.score,
        yesterdayRecovery,
        readiness.score,
        yesterdayReadiness,
        todayStr,
      );
    }

    const ovulationEstimateVal = estimateOvulation(periodHistoryVal, fullRdxHistory, effectiveCycleLength);
    setOvulationEstimate(ovulationEstimateVal);
    const primeWindowVal = detectPrimeTrainingWindow(fullRdxHistory, periodHistoryVal, effectiveCycleLength);
    setPrimeTrainingWindow(primeWindowVal);
    const recoveryWindowVal = detectRecoveryWindow(fullRdxHistory, periodHistoryVal, effectiveCycleLength);
    setRecoveryWindow(recoveryWindowVal);
    const timelineVal  = buildSymptomTimeline(getSymptomHistory(), periodHistoryVal, effectiveCycleLength);
    setSymptomTimeline(timelineVal);
    const clustersVal  = buildSymptomClusters(timelineVal, effectiveCycleLength);
    const patternConfidencesVal = buildPatternConfidences(
      getSymptomHistory(), periodHistoryVal, effectiveCycleLength,
    );
    setPatternConfidences(patternConfidencesVal);
    const symptomEscalationsVal = detectSymptomEscalation({
      symptomHistory: getSymptomHistory(),
      periodHistory:  periodHistoryVal,
      cycleLength:    effectiveCycleLength,
    });
    setSymptomEscalations(symptomEscalationsVal);
    setPerformanceProfile(buildPerformanceProfile({
      readinessHistory:  fullRdxHistory,
      periodHistory:     periodHistoryVal,
      cycleLength:       effectiveCycleLength,
      primeWindow:       primeWindowVal,
      recoveryWindow:    recoveryWindowVal,
      ovulationEstimate: ovulationEstimateVal,
      symptomClusters:   clustersVal,
    }));

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
    const weeklyPlanVal = computeWeeklyPlan({
      sessionsPerWeek:  user.sessionsPerWeek,
      readinessHistory: fullRdxHistory.slice(0, 7),
      recentFeedback:   getAllFeedback().filter(f => f.date >= fourteenDaysAgoStr),
      recentHistory:    rawHistory.filter(h => h.id >= fourteenDaysAgoStr),
      recentSymptoms:   getSymptomHistory().filter(s => s.date >= sevenDaysAgoStr),
      currentPhase:     phase,
      recoveryCapacity: recoveryCapacityVal,
    });
    setWeeklyPlan(weeklyPlanVal);

    // Refine AdaptiveProfile weights ≥14 entries, at most once per 7 days
    if (profileRef.current) {
      const updatedWeights = computeReadinessFeedback(fullRdxHistory, profileRef.current, todayStr);
      if (updatedWeights) {
        const refined = { ...profileRef.current, readinessWeights: updatedWeights, lastRefinedAt: todayStr };
        profileRef.current = refined;
        localStorage.setItem("axis_adaptive_profile", JSON.stringify(refined));
      }
    }

    const rec                   = runPipeline(effectiveUser, phase, profile, prog, readiness);
    const forecastBurden        = computeForecastBurden(cycleForecastVal.symptomEvents);
    const calibrationFactorsVal = computeCalibration(getAllValidations(), getSymptomHistory());
    setCalibrationFactors(calibrationFactorsVal);
    const personalizedRec = applyAccuracyCalibration(
      applyForecastModifier(
        applyTodaySymptomsModifier(
          applyPatternModifiers(rec, patterns, phase.cycleDay),
          todaySymptomsVal,
        ),
        forecastBurden,
      ),
      calibrationFactorsVal,
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
      recoveryCapacity:  recoveryCapacityVal,
    });
    setDeloadRec(deloadRecVal);
    const todayWorkoutDone =
      rawHistory.find(e => e.id === todayStr)?.status === "completed" ||
      rawHistory.find(e => e.id === todayStr)?.status === "partially_completed";
    const recoveryDebtVal = updateRecoveryDebt({
      date:             todayStr,
      sleepQuality:     effectiveUser.sleepQuality as "excellent" | "good" | "variable" | "poor",
      stressLevel:      effectiveUser.stressLevel,
      symptoms:         todaySymptomsVal,
      loadReport:       prelimLoad,
      workoutCompleted: todayWorkoutDone,
      isDeloadWeek:     deloadRecVal.needed,
    });
    setRecoveryDebt(recoveryDebtVal);
    const burnoutRiskVal = computeBurnoutRisk({
      readinessHistory: fullRdxHistory.slice(0, 28),
      workoutHistory:   rawHistory,
      symptomHistory:   getSymptomHistory(),
      recoveryDebt:     recoveryDebtVal,
      loadReport:       prelimLoad,
    });
    setBurnoutRisk(burnoutRiskVal);
    const recoveryScoresNow  = getRecoveryScores();
    const recoveryTrendNow   = computeRecoveryTrend(recoveryScoresNow);
    const healthTrendVal     = buildHealthTrend({
      recoveryTrend:      recoveryTrendNow,
      recoveryDebt:       recoveryDebtVal,
      burnoutRisk:        burnoutRiskVal,
      symptomEscalations: symptomEscalationsVal,
    });
    setHealthTrend(healthTrendVal);
    setRecoveryPlan(buildRecoveryPlan({
      recoveryScore:      recoveryScoreVal,
      recoveryTrend:      recoveryTrendNow,
      recoveryDebt:       recoveryDebtVal,
      burnoutRisk:        burnoutRiskVal,
      healthTrend:        healthTrendVal,
      symptomEscalations: symptomEscalationsVal,
    }));
    if (deloadRecVal.needed) {
      logIntervention("deload", deloadRecVal.rationale, todayStr);
      logRecoveryStrategy("deload_week", todayStr);
    }
    if (effectiveUser.sleepQuality === "excellent") {
      logRecoveryStrategy("sleep_focus", todayStr);
    }
    if (effectiveUser.stressLevel <= 3) {
      logRecoveryStrategy("stress_reduction", todayStr);
    }
    if (!todayWorkoutDone && !deloadRecVal.needed) {
      logRecoveryStrategy("rest_day", todayStr);
    }
    if (overloadRecVal.decision !== "maintain") {
      logIntervention(
        overloadRecVal.decision === "increase" ? "increase_load" : "reduce_volume",
        overloadRecVal.suggestion,
        todayStr,
      );
    }
    const capacityProfile = (recoveryCapacityVal.confidence !== "early")
      ? applyCapacityModifier(prog, recoveryCapacityVal)
      : prog;
    const effectiveAdjustmentVal = deloadRecVal.needed
      ? applyProgressionRules({ ...capacityProfile, recommendedAction: "deload" })
      : applyProgressionRules(capacityProfile);
    const exerciseAdjVal = applyExerciseProgressionRules(exerciseSummariesVal);
    const mergedAdjVal = exerciseAdjVal
      ? mergeCoachingAdjustments(effectiveAdjustmentVal, exerciseAdjVal)
      : effectiveAdjustmentVal;
    const finalAdjustmentVal = applyGoalModifiers(mergedAdjVal, goalType);
    setCoachingAdjustment(finalAdjustmentVal);
    adjustmentRef.current = finalAdjustmentVal;
    setPeriodizedCalendar(computePeriodizedCalendar({
      trainingBlock:    trainingBlockVal,
      weeklyPlan:       weeklyPlanVal,
      deloadRec:        deloadRecVal,
      recoveryCapacity: recoveryCapacityVal,
      learnedPatterns:  patterns,
      currentCycleDay:  phase.cycleDay,
      cycleLength:      effectiveCycleLength,
      sessionsPerWeek:  user.sessionsPerWeek,
    }));
    setCoachView(buildCoachView({
      recommendation:     personalizedRec,
      weeklyPlan:         weeklyPlanVal,
      trainingBlock:      trainingBlockVal,
      overloadRec:        overloadRecVal,
      deloadRec:          deloadRecVal,
      recoveryCapacity:   recoveryCapacityVal,
      coachingMemory:     coachingMemoryVal,
      accuracyReport:     getAccuracyReport(),
      exerciseSummaries:  exerciseSummariesVal,
      coachingAdjustment: finalAdjustmentVal,
      goalType,
    }));
    // Hoist intervention outcomes and adaptive modifier BEFORE workout generation
    // so the modifier is actually applied to set counts and RPE targets.
    const interventionOutcomesVal = getInterventionOutcomes();
    setInterventionOutcomes(interventionOutcomesVal);
    setStrategyOutcomes(getRecoveryStrategyOutcomes());

    // Adaptive Decision Engine — synthesise all layers + recovery intelligence
    const adaptiveInput = {
      fingerprint:          physiologyFingerprintVal,
      patternConfidences:   patternConfidencesVal,
      personalWeights:      personalWeightsVal,
      interventionOutcomes: interventionOutcomesVal,
      todayCycleDay:        phase.cycleDay,
      todaySymptoms:        todaySymptomsVal.map(s => s.symptomId),
      todayPhase:           toCyclePhaseName(phase.cycleDay, effectiveCycleLength),
      cycleLength:          effectiveCycleLength,
      recoveryScore:        recoveryScoreVal,
      recoveryTrend:        recoveryTrendNow,
      recoveryDebt:         recoveryDebtVal,
      burnoutRisk:          burnoutRiskVal,
      symptomEscalations:   symptomEscalationsVal,
    };
    const adaptiveModifierVal = computeAdaptiveModifier(adaptiveInput);
    setAdaptiveModifier(adaptiveModifierVal);
    setAdaptiveInsights(generateAdaptiveInsights(adaptiveInput));

    const wkt = runWorkoutPipeline(
      effectiveUser, rec.phase, savedEnv, profile, finalAdjustmentVal, readiness,
      badgeToEnergyCap(personalizedRec.training.badge), recoveryCapacityVal.level,
      exerciseSummariesVal, adaptiveModifierVal,
    );
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, rec.phase, goalType, prog, readiness, landmarksVal);
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
    const ph = getPeriodHistory();
    const cl = deriveEffectiveCycleLength(ph, user.cycleLength);
    const updatedTimeline = buildSymptomTimeline(getSymptomHistory(), ph, cl);
    setSymptomTimeline(updatedTimeline);
    const effectiveUser = { ...user, sleepQuality: data.sleepQuality, stressLevel: data.stressLevel };
    const profile       = profileRef.current ?? undefined;
    const baseAdj = (deloadRec?.needed && progressionProfile)
      ? applyProgressionRules({ ...progressionProfile, recommendedAction: "deload" })
      : adjustmentRef.current ?? undefined;
    const exerciseAdjCheckin = applyExerciseProgressionRules(exerciseSummaries);
    const mergedAdj = (baseAdj && exerciseAdjCheckin)
      ? mergeCoachingAdjustments(baseAdj, exerciseAdjCheckin)
      : baseAdj;
    const adjustment = mergedAdj
      ? applyGoalModifiers(mergedAdj, mapOnboardingGoalToGoalType(user.goals))
      : mergedAdj;
    const phase         = computePhase(effectiveUser, deriveEffectiveCycleLength(getPeriodHistory(), user.cycleLength));
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
    const forecastBurden  = computeForecastBurden(cycleForecast.symptomEvents);
    const personalizedRec = applyAccuracyCalibration(
      applyForecastModifier(
        applyTodaySymptomsModifier(
          applyPatternModifiers(newRec, learnedPatterns, phase.cycleDay),
          todaySymptomsVal,
        ),
        forecastBurden,
      ),
      calibrationFactors,
      todaySymptomsVal,
    );
    setRecommendation(personalizedRec);
    const goalType = mapOnboardingGoalToGoalType(user.goals);
    const wkt = runWorkoutPipeline(effectiveUser, personalizedRec.phase, environment, profile, adjustment, newReadiness ?? undefined, badgeToEnergyCap(personalizedRec.training.badge), recoveryCapacity?.level ?? undefined, exerciseSummaries, adaptiveModifier ?? undefined);
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, personalizedRec.phase, goalType, progressionProfile ?? undefined, newReadiness ?? undefined, volumeLandmarks ?? undefined);
    setHistorySummary(summary);
    setLoadReport(load);
    setInsightReport(insights);
    setTodayStatus(ts);
    setIsRecalculating(false);
  }

  function refreshAfterMark() {
    if (!workout || !recommendation) return;
    const goalType    = mapOnboardingGoalToGoalType(onboardingRef.current?.goals ?? []);
    const snap        = runAnalyticsPipeline(workout, recommendation.phase, goalType, progressionProfile ?? undefined, readinessScore ?? undefined, volumeLandmarks ?? undefined);
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
    const freshPerfHistory = getExercisePerformanceHistory();
    setProgressionTargets(computeProgressionTargets(freshPerfHistory, goalType));
    setExerciseMastery(computeExerciseMastery(freshPerfHistory, environment));
    const freshTrends = detectPerformanceTrends(freshPerfHistory);
    setPerformanceTrends(freshTrends);
    setPlateauInterventions(generatePlateauInterventions(freshTrends, goalType));
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
    const wkt = runWorkoutPipeline(effectiveUser, recommendation.phase, env, profileRef.current ?? undefined, adjustmentRef.current ?? undefined, readinessScore ?? undefined, undefined, undefined, exerciseSummaries, adaptiveModifier ?? undefined);
    setWorkout(wkt);
    const { summary, load, insights, todayStatus: ts } = runAnalyticsPipeline(wkt, recommendation.phase, goalType, progressionProfile ?? undefined, readinessScore ?? undefined, volumeLandmarks ?? undefined);
    setHistorySummary(summary);
    setLoadReport(load);
    setInsightReport(insights);
    setTodayStatus(ts);
    setExerciseMastery(computeExerciseMastery(getExercisePerformanceHistory(), env));
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
        <CycleIntelligenceCard
          cycleAccuracy={cycleAccuracy}
          performanceProfile={performanceProfile}
          symptomTimeline={symptomTimeline}
          ovulationEstimate={ovulationEstimate}
          cycleHealthReport={cycleHealthReport}
        />
        <OvulationEstimateCard estimate={ovulationEstimate} />
        <TrainingWindowCard    window={primeTrainingWindow} />
        <RecoveryWindowCard    window={recoveryWindow} />
        <AdaptiveInsightsCard insights={adaptiveInsights} />
        <RecoveryIntelligenceCard
          recoveryScore={recoveryScore}
          recoveryTrend={recoveryTrend}
          recoveryDebt={recoveryDebt}
          burnoutRisk={burnoutRisk}
          healthTrend={healthTrend}
          recoveryPlan={recoveryPlan}
          symptomEscalations={symptomEscalations}
          strategyOutcomes={strategyOutcomes}
        />
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
        <ProgressCard
          progressionTargets={progressionTargets}
          exerciseMastery={exerciseMastery}
          performanceTrends={performanceTrends}
          plateauInterventions={plateauInterventions}
          mesocycle={mesocycle}
          weeklyPrescription={weeklyPrescription}
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
