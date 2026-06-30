"use client";

/**
 * useBodyState
 *
 * Async hook that pulls data from every relevant intelligence engine and
 * returns a BodySnapshot.  No rendering code lives here.
 *
 * Refresh by calling `refresh()` — e.g. after a workout is completed.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { computeBodyIntelligenceSnapshot } from "@/lib/bodyIntelligence/muscleStateEngine";
import { adaptToMuscleRecord }             from "@/lib/bodyIntelligence/BodyStateEngine";
import type { BodySnapshot, MuscleRecord }  from "@/lib/bodyIntelligence/BodyStateEngine";

async function loadRawSnapshot(): Promise<ReturnType<typeof computeBodyIntelligenceSnapshot>> {
  // Today's workout (localStorage — best-effort)
  let todayWorkout: unknown;
  try {
    const raw = localStorage.getItem("axis_today_workout");
    if (raw) todayWorkout = JSON.parse(raw);
  } catch {}

  // Recovery score
  let recoveryScore = null;
  try {
    const { getRecoveryScores } = await import("@/lib/recovery/recoveryScore");
    const scores = getRecoveryScores();
    recoveryScore = scores[scores.length - 1] ?? null;
  } catch {}

  // Fatigue
  let fatigueEntry = null;
  try {
    const { getFatigueScoreHistory } = await import("@/lib/autoregulation/fatigueModel");
    const fh = getFatigueScoreHistory();
    fatigueEntry = fh[fh.length - 1] ?? null;
  } catch {}

  // Symptoms
  let todaySymptoms: unknown[] = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { getSymptomsForDate } = await import("@/lib/symptoms/symptomHistory");
    todaySymptoms = getSymptomsForDate(today);
  } catch {}

  // Cycle phase
  let cyclePhase: string | undefined;
  try {
    const raw = localStorage.getItem("axis_onboarding");
    if (raw) {
      const { calculatePhase } = await import("@/lib/cycle/calculatePhase");
      const user = JSON.parse(raw);
      const phase = calculatePhase({
        lastPeriodDate: user.lastPeriodDate,
        cycleLength:    user.cycleLength,
      });
      cyclePhase = phase.name;
    }
  } catch {}

  return computeBodyIntelligenceSnapshot(
    {
      todayWorkout:  todayWorkout as never,
      recoveryScore: recoveryScore as never,
      fatigueEntry:  fatigueEntry as never,
      todaySymptoms: todaySymptoms as never,
      cyclePhase,
    },
    "today",
    "today",
  );
}

export interface UseBodyStateResult {
  snapshot:    BodySnapshot | null;
  isLoading:   boolean;
  refresh:     () => void;
}

export function useBodyState(): UseBodyStateResult {
  const [raw,       setRaw]       = useState<ReturnType<typeof computeBodyIntelligenceSnapshot> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick,      setTick]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadRawSnapshot()
      .then(result => { if (!cancelled) { setRaw(result); setIsLoading(false); } })
      .catch(()    => { if (!cancelled) { setIsLoading(false); } });

    return () => { cancelled = true; };
  }, [tick]);

  const refresh = useCallback(() => setTick(n => n + 1), []);

  const snapshot = useMemo<BodySnapshot | null>(() => {
    if (!raw) return null;
    const muscles: MuscleRecord[] = raw.muscles.map(m => adaptToMuscleRecord(m as never));
    return {
      date:    raw.date,
      muscles,
      isReady: raw.dataReady,
    };
  }, [raw]);

  return { snapshot, isLoading, refresh };
}
