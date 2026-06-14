"use client";

import { useState } from "react";
import type { FuelTargets }             from "@/lib/nutrition/fuelTargets";
import type { WorkoutFuelingPlan }      from "@/lib/nutrition/workoutFueling";
import type { NutritionAdjustment }     from "@/lib/nutrition/symptomNutritionMap";
import type { NutritionOutcome }        from "@/lib/nutrition/nutritionLearning";

export function useNutritionData() {
  const [fuelTargets,          setFuelTargets]          = useState<FuelTargets | null>(null);
  const [workoutFueling,       setWorkoutFueling]       = useState<WorkoutFuelingPlan | null>(null);
  const [nutritionAdjustments, setNutritionAdjustments] = useState<NutritionAdjustment[]>([]);
  const [nutritionOutcomes,    setNutritionOutcomes]    = useState<NutritionOutcome[]>([]);

  return {
    fuelTargets,          setFuelTargets,
    workoutFueling,       setWorkoutFueling,
    nutritionAdjustments, setNutritionAdjustments,
    nutritionOutcomes,    setNutritionOutcomes,
  };
}
