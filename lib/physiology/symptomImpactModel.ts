// ─── lib/physiology/symptomImpactModel.ts ────────────────────────────────────
// 40B — Symptom Impact Modeling
// Learns which symptoms actually drag down THIS user's readiness/performance,
// replacing generic severity-based reductions with personal history.

import type { SymptomEntry }          from "@/lib/symptoms/symptomHistory";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

const MIN_SAMPLE = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SymptomImpactLevel = "minimal" | "moderate" | "significant";

export interface SymptomImpactEntry {
  symptomId:   string;
  meanDrop:    number;       // mean readiness drop when symptom present vs global mean
  maxDrop:     number;
  sampleSize:  number;
  impactLevel: SymptomImpactLevel;
}

export interface SymptomImpactProfile {
  impacts:       SymptomImpactEntry[];
  mostImpactful: string | null;
  globalMean:    number;
  dataReady:     boolean;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeSymptomImpactProfile(
  symptomHistory:   SymptomEntry[],
  readinessHistory: ReadinessHistoryEntry[],
): SymptomImpactProfile {
  const EMPTY: SymptomImpactProfile = {
    impacts: [], mostImpactful: null, globalMean: 0, dataReady: false,
  };

  if (symptomHistory.length < 10 || readinessHistory.length < 14) return EMPTY;

  const rdxByDate = new Map<string, number>();
  for (const e of readinessHistory) rdxByDate.set(e.date, e.score);

  const allScores   = [...rdxByDate.values()];
  const globalMean  = Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length);

  // Group symptom dates by id
  const symptomDates = new Map<string, string[]>();
  for (const s of symptomHistory) {
    const arr = symptomDates.get(s.symptomId) ?? [];
    arr.push(s.date);
    symptomDates.set(s.symptomId, arr);
  }

  const impacts: SymptomImpactEntry[] = [];

  for (const [symptomId, dates] of symptomDates.entries()) {
    const scores: number[] = [];
    for (const d of dates) {
      const rdx = rdxByDate.get(d);
      if (rdx !== undefined) scores.push(rdx);
    }
    if (scores.length < MIN_SAMPLE) continue;

    const meanOnSymptom = scores.reduce((s, v) => s + v, 0) / scores.length;
    const meanDrop      = Math.round(Math.max(0, globalMean - meanOnSymptom));
    const maxDrop       = Math.round(Math.max(0, globalMean - Math.min(...scores)));

    impacts.push({
      symptomId,
      meanDrop,
      maxDrop,
      sampleSize:  scores.length,
      impactLevel: meanDrop >= 15 ? "significant" : meanDrop >= 7 ? "moderate" : "minimal",
    });
  }

  if (impacts.length === 0) return EMPTY;

  impacts.sort((a, b) => b.meanDrop - a.meanDrop);

  return {
    impacts,
    mostImpactful: impacts[0].symptomId,
    globalMean,
    dataReady: true,
  };
}
