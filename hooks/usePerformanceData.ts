"use client";

import { useState } from "react";
import type { PerformancePotential }     from "@/lib/performance/performancePotential";
import type { TrainingRisk }             from "@/lib/performance/riskPrediction";
import type { ReadinessForecastResult }  from "@/lib/performance/readinessForecast";
import type { StrategyPredictionReport } from "@/lib/performance/strategyPrediction";
import type { PerformanceOpportunity }   from "@/lib/performance/opportunityDetection";

export function usePerformanceData() {
  const [performancePotential,  setPerformancePotential]  = useState<PerformancePotential | null>(null);
  const [trainingRisk,          setTrainingRisk]          = useState<TrainingRisk | null>(null);
  const [readinessForecast,     setReadinessForecast]     = useState<ReadinessForecastResult | null>(null);
  const [strategyPrediction,    setStrategyPrediction]    = useState<StrategyPredictionReport | null>(null);
  const [performanceOpportunity, setPerformanceOpportunity] = useState<PerformanceOpportunity | null>(null);

  return {
    performancePotential,   setPerformancePotential,
    trainingRisk,           setTrainingRisk,
    readinessForecast,      setReadinessForecast,
    strategyPrediction,     setStrategyPrediction,
    performanceOpportunity, setPerformanceOpportunity,
  };
}
