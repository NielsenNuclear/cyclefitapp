"use client";

import { useState, useEffect } from "react";
import type { MuscleRecord }   from "@/lib/bodyIntelligence/BodyStateEngine";
import { getMuscleGroupById }  from "@/lib/bodyIntelligence/muscleGroups";
import { getUserEquipment }    from "@/lib/equipment/equipmentProfile";
import { getWorkoutHistory }   from "@/lib/history/workoutHistory";
import {
  groupExercisesForMuscle,
  getTodayExercisesForMuscle,
  generateMuscleInsights,
  type ExerciseIntelligenceGroup,
  type TodayScheduledExercise,
  type MuscleInsight,
} from "@/lib/bodyIntelligence/exerciseIntelligence";

// ─── Output contract ──────────────────────────────────────────────────────────

export interface ExerciseIntelligenceState {
  groups:          ExerciseIntelligenceGroup[];
  todayExercises:  TodayScheduledExercise[];
  scheduledNames:  Set<string>;
  insights:        MuscleInsight[];
  userEquipment:   string[];
  isLoading:       boolean;
}

const EMPTY: ExerciseIntelligenceState = {
  groups: [], todayExercises: [], scheduledNames: new Set(),
  insights: [], userEquipment: [], isLoading: true,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExerciseIntelligence(muscle: MuscleRecord | null): ExerciseIntelligenceState {
  const [state, setState] = useState<ExerciseIntelligenceState>(EMPTY);

  useEffect(() => {
    if (!muscle) {
      setState({ ...EMPTY, isLoading: false });
      return;
    }

    const muscleId  = muscle.id.replace(/_(?:left|right)$/, "");
    const muscleDef = getMuscleGroupById(muscleId);

    const userEquipment = getUserEquipment();

    // Find today's workout entry
    const today      = new Date().toISOString().slice(0, 10);
    const todayEntry = getWorkoutHistory().find(e => e.id === today) ?? null;

    const todayExercises = getTodayExercisesForMuscle(
      muscleDef,
      todayEntry?.exercises ?? [],
    );

    // Scheduled names includes ALL exercises from today's workout, not just
    // those that target this specific muscle — for cross-session context.
    const scheduledNames = new Set<string>();
    for (const ex of todayEntry?.exercises ?? []) {
      scheduledNames.add(ex.name.toLowerCase());
    }

    const groups   = muscleDef
      ? groupExercisesForMuscle(muscleDef, userEquipment, scheduledNames, todayExercises)
      : [];

    const insights = generateMuscleInsights(muscle);

    setState({ groups, todayExercises, scheduledNames, insights, userEquipment, isLoading: false });
  }, [muscle?.id, muscle?.status, muscle?.recoveryPct]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
