"use client";

import { useState } from "react";
import type { GeneratedWorkout }        from "@/lib/exercises/generateWorkout";
import type { WorkoutHistorySummary, WorkoutCompletionStatus } from "@/lib/history/workoutHistory";
import type { TrainingLoadReport }      from "@/lib/analytics/trainingLoad";
import type { InsightReport }           from "@/lib/insights/generateInsights";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";

export function useWorkoutData() {
  const [workout,          setWorkout]          = useState<GeneratedWorkout | null>(null);
  const [historySummary,   setHistorySummary]   = useState<WorkoutHistorySummary | null>(null);
  const [loadReport,       setLoadReport]       = useState<TrainingLoadReport | null>(null);
  const [insightReport,    setInsightReport]    = useState<InsightReport | null>(null);
  const [todayStatus,      setTodayStatus]      = useState<WorkoutCompletionStatus>("pending");
  const [exerciseSummaries,setExerciseSummaries]= useState<ExerciseProgressSummary[]>([]);

  return {
    workout,           setWorkout,
    historySummary,    setHistorySummary,
    loadReport,        setLoadReport,
    insightReport,     setInsightReport,
    todayStatus,       setTodayStatus,
    exerciseSummaries, setExerciseSummaries,
  };
}
