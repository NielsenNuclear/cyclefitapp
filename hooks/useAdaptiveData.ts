"use client";

import { useState } from "react";
import type { DailyRecommendation }  from "@/types/recommendation";
import type { AdaptiveModifier, AdaptiveInsight } from "@/lib/adaptive/adaptiveDecisionEngine";
import type { InterventionOutcome }  from "@/lib/adaptive/interventionLearning";
import type { CalibrationFactors }   from "@/lib/adaptive/accuracyCalibration";
import type { CoachingMemoryItem }   from "@/lib/adaptive/coachingMemory";
import type { PersonalizationProgress } from "@/lib/adaptive/personalizationProgress";

export function useAdaptiveData() {
  const [recommendation,          setRecommendation]          = useState<DailyRecommendation | null>(null);
  const [adaptiveModifier,        setAdaptiveModifier]        = useState<AdaptiveModifier | null>(null);
  const [adaptiveInsights,        setAdaptiveInsights]        = useState<AdaptiveInsight[]>([]);
  const [interventionOutcomes,    setInterventionOutcomes]    = useState<InterventionOutcome[]>([]);
  const [calibrationFactors,      setCalibrationFactors]      = useState<CalibrationFactors | null>(null);
  const [coachingMemory,          setCoachingMemory]          = useState<CoachingMemoryItem[]>([]);
  const [personalizationProgress, setPersonalizationProgress] = useState<PersonalizationProgress | null>(null);

  return {
    recommendation,          setRecommendation,
    adaptiveModifier,        setAdaptiveModifier,
    adaptiveInsights,        setAdaptiveInsights,
    interventionOutcomes,    setInterventionOutcomes,
    calibrationFactors,      setCalibrationFactors,
    coachingMemory,          setCoachingMemory,
    personalizationProgress, setPersonalizationProgress,
  };
}
