"use client";

import { useState } from "react";
import type { ReadinessScore }        from "@/lib/readiness/calculateReadiness";
import type { ReadinessTrend, ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { SymptomEntry }          from "@/lib/symptoms/symptomHistory";
import type { AccuracyReport }        from "@/lib/adaptive/readinessValidation";
import type { PhysiologyFingerprint } from "@/lib/adaptive/physiologyMemory";
import type { PersonalWeights }       from "@/lib/adaptive/personalWeighting";

export function useReadinessData() {
  const [readinessScore,        setReadinessScore]        = useState<ReadinessScore | null>(null);
  const [readinessTrend,        setReadinessTrend]        = useState<ReadinessTrend>("insufficient_data");
  const [readinessHistory,      setReadinessHistory]      = useState<ReadinessHistoryEntry[]>([]);
  const [todaySymptoms,         setTodaySymptoms]         = useState<SymptomEntry[]>([]);
  const [accuracyReport,        setAccuracyReport]        = useState<AccuracyReport>({ last30Days: 0, last90Days: 0, lifetime: 0, totalSamples: 0 });
  const [physiologyFingerprint, setPhysiologyFingerprint] = useState<PhysiologyFingerprint | null>(null);
  const [personalWeights,       setPersonalWeights]       = useState<PersonalWeights | null>(null);

  return {
    readinessScore,        setReadinessScore,
    readinessTrend,        setReadinessTrend,
    readinessHistory,      setReadinessHistory,
    todaySymptoms,         setTodaySymptoms,
    accuracyReport,        setAccuracyReport,
    physiologyFingerprint, setPhysiologyFingerprint,
    personalWeights,       setPersonalWeights,
  };
}
