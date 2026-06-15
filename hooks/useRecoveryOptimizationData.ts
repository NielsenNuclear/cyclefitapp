"use client";

import { useState } from "react";
import type { RecoveryEffectivenessReport } from "@/lib/recovery/recoveryEffectiveness";
import type { RecoveryForecast }            from "@/lib/recovery/recoveryForecast";

export function useRecoveryOptimizationData() {
  const [recoveryEffectiveness, setRecoveryEffectiveness] = useState<RecoveryEffectivenessReport | null>(null);
  const [recoveryForecast,      setRecoveryForecast]      = useState<RecoveryForecast | null>(null);

  return {
    recoveryEffectiveness, setRecoveryEffectiveness,
    recoveryForecast,      setRecoveryForecast,
  };
}
