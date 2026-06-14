"use client";

import { useState } from "react";
import type { ProgressionProfile }              from "@/lib/progression/progressionProfile";
import type { CoachingAdjustment }              from "@/lib/progression/progressionRules";
import type { ProgressionTarget }               from "@/lib/progression/progressionTargets";
import type { ExerciseMasteryEntry }            from "@/lib/progression/exerciseMastery";
import type { PerformanceTrend }                from "@/lib/analytics/performanceTrends";
import type { PlateauIntervention }             from "@/lib/progression/plateauIntervention";
import type { WeeklyPlan }                      from "@/lib/planning/weeklyPlanner";
import type { TrainingBlock }                   from "@/lib/planning/trainingBlocks";
import type { OverloadRecommendation }          from "@/lib/progression/progressiveOverload";
import type { DeloadRecommendation }            from "@/lib/recovery/deloadDetection";
import type { VolumeLandmarkReport }            from "@/lib/exercises/volumeTracking";
import type { Mesocycle }                       from "@/lib/planning/mesocycleBuilder";
import type { WeeklyProgressionPrescription }   from "@/lib/planning/goalProgression";
import type { PeriodizedCalendar }              from "@/lib/planning/periodizedCalendar";
import type { CoachView }                       from "@/lib/coaching/coachView";

export function useProgressionData() {
  const [progressionProfile,   setProgressionProfile]   = useState<ProgressionProfile | null>(null);
  const [coachingAdjustment,   setCoachingAdjustment]   = useState<CoachingAdjustment | null>(null);
  const [progressionTargets,   setProgressionTargets]   = useState<ProgressionTarget[]>([]);
  const [exerciseMastery,      setExerciseMastery]      = useState<ExerciseMasteryEntry[]>([]);
  const [performanceTrends,    setPerformanceTrends]    = useState<PerformanceTrend[]>([]);
  const [plateauInterventions, setPlateauInterventions] = useState<PlateauIntervention[]>([]);
  const [weeklyPlan,           setWeeklyPlan]           = useState<WeeklyPlan | null>(null);
  const [trainingBlock,        setTrainingBlock]        = useState<TrainingBlock | null>(null);
  const [overloadRec,          setOverloadRec]          = useState<OverloadRecommendation | null>(null);
  const [deloadRec,            setDeloadRec]            = useState<DeloadRecommendation | null>(null);
  const [volumeLandmarks,      setVolumeLandmarks]      = useState<VolumeLandmarkReport | null>(null);
  const [mesocycle,            setMesocycle]            = useState<Mesocycle | null>(null);
  const [weeklyPrescription,   setWeeklyPrescription]   = useState<WeeklyProgressionPrescription | null>(null);
  const [periodizedCalendar,   setPeriodizedCalendar]   = useState<PeriodizedCalendar | null>(null);
  const [coachView,            setCoachView]            = useState<CoachView | null>(null);

  return {
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
  };
}
