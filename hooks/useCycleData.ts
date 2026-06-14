"use client";

import { useState } from "react";
import type { CycleAccuracyReport }       from "@/lib/cycle/cycleAccuracy";
import type { OvulationEstimate }          from "@/lib/cycle/ovulationEstimator";
import type { SymptomTimeline }            from "@/lib/cycle/symptomTimeline";
import type { SymptomCluster }             from "@/lib/cycle/symptomClusters";
import type { TrainingWindow }             from "@/lib/cycle/trainingWindows";
import type { RecoveryWindow }             from "@/lib/cycle/recoveryWindows";
import type { PersonalPerformanceProfile } from "@/lib/cycle/performanceProfile";
import type { CycleHealthReport }          from "@/lib/cycle/cycleHealth";
import type { LearnedPattern }             from "@/lib/cycleLearning/types";
import type { CycleForecast }              from "@/lib/forecasting/forecastCycle";
import type { PatternConfidence }          from "@/lib/adaptive/patternConfidence";

export function useCycleData() {
  const [cycleAccuracy,       setCycleAccuracy]       = useState<CycleAccuracyReport | null>(null);
  const [cycleHealthReport,   setCycleHealthReport]   = useState<CycleHealthReport | null>(null);
  const [ovulationEstimate,   setOvulationEstimate]   = useState<OvulationEstimate | null>(null);
  const [symptomTimeline,     setSymptomTimeline]     = useState<SymptomTimeline | null>(null);
  const [symptomClusters,     setSymptomClusters]     = useState<SymptomCluster[]>([]);
  const [primeTrainingWindow, setPrimeTrainingWindow] = useState<TrainingWindow | null>(null);
  const [recoveryWindow,      setRecoveryWindow]      = useState<RecoveryWindow | null>(null);
  const [performanceProfile,  setPerformanceProfile]  = useState<PersonalPerformanceProfile | null>(null);
  const [learnedPatterns,     setLearnedPatterns]     = useState<LearnedPattern[]>([]);
  const [cycleForecast,       setCycleForecast]       = useState<CycleForecast>({ symptomEvents: [], readinessDays: [] });
  const [patternConfidences,  setPatternConfidences]  = useState<PatternConfidence[]>([]);

  return {
    cycleAccuracy,       setCycleAccuracy,
    cycleHealthReport,   setCycleHealthReport,
    ovulationEstimate,   setOvulationEstimate,
    symptomTimeline,     setSymptomTimeline,
    symptomClusters,     setSymptomClusters,
    primeTrainingWindow, setPrimeTrainingWindow,
    recoveryWindow,      setRecoveryWindow,
    performanceProfile,  setPerformanceProfile,
    learnedPatterns,     setLearnedPatterns,
    cycleForecast,       setCycleForecast,
    patternConfidences,  setPatternConfidences,
  };
}
