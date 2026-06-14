"use client";

import { useState } from "react";
import type { RecoveryScore }            from "@/lib/recovery/recoveryScore";
import type { RecoveryTrend }            from "@/lib/recovery/recoveryTrend";
import type { RecoveryDebt }             from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }              from "@/lib/recovery/burnoutRisk";
import type { RecoveryCapacity }         from "@/lib/adaptive/recoveryCapacity";
import type { HealthTrend }              from "@/lib/recovery/healthTrendAnalysis";
import type { RecoveryPlan }             from "@/lib/recovery/recoveryPlanning";
import type { RecoveryStrategyOutcome }  from "@/lib/recovery/recoveryLearning";
import type { SymptomEscalationEntry }   from "@/lib/recovery/symptomEscalation";

export function useRecoveryData() {
  const [recoveryScore,      setRecoveryScore]      = useState<RecoveryScore | null>(null);
  const [recoveryTrend,      setRecoveryTrend]      = useState<RecoveryTrend | null>(null);
  const [recoveryDebt,       setRecoveryDebt]       = useState<RecoveryDebt | null>(null);
  const [burnoutRisk,        setBurnoutRisk]        = useState<BurnoutRisk | null>(null);
  const [recoveryCapacity,   setRecoveryCapacity]   = useState<RecoveryCapacity | null>(null);
  const [healthTrend,        setHealthTrend]        = useState<HealthTrend | null>(null);
  const [recoveryPlan,       setRecoveryPlan]       = useState<RecoveryPlan | null>(null);
  const [strategyOutcomes,   setStrategyOutcomes]   = useState<RecoveryStrategyOutcome[]>([]);
  const [symptomEscalations, setSymptomEscalations] = useState<SymptomEscalationEntry[]>([]);

  return {
    recoveryScore,      setRecoveryScore,
    recoveryTrend,      setRecoveryTrend,
    recoveryDebt,       setRecoveryDebt,
    burnoutRisk,        setBurnoutRisk,
    recoveryCapacity,   setRecoveryCapacity,
    healthTrend,        setHealthTrend,
    recoveryPlan,       setRecoveryPlan,
    strategyOutcomes,   setStrategyOutcomes,
    symptomEscalations, setSymptomEscalations,
  };
}
