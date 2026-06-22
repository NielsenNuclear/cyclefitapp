// ─── lib/physiology/physiologyConfidence.ts ──────────────────────────────────
// 40F — Physiology Confidence
// Composite score of how well Axis understands THIS user's physiology.
// Four sub-models (phase, symptom, recovery, readiness) weighted into one score.

import type { ReadinessHistoryEntry }  from "@/lib/readiness/readinessHistory";
import type { SymptomEntry }           from "@/lib/symptoms/symptomHistory";
import type { RecoveryResponseEntry }  from "@/lib/recovery/recoveryResponse";
import type { AdherenceEntry }         from "@/lib/adherence/adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhysiologyMaturityLevel = "early" | "building" | "established" | "mature";

export interface PhysiologyConfidence {
  overall:        number;   // 0–100 weighted composite
  phaseModel:     number;   // 0–100
  symptomModel:   number;
  recoveryModel:  number;
  readinessModel: number;
  level:          PhysiologyMaturityLevel;
  summary:        string;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computePhysiologyConfidence(
  readinessHistory: ReadinessHistoryEntry[],
  symptomHistory:   SymptomEntry[],
  recoveryLog:      RecoveryResponseEntry[],
  adherenceHistory: AdherenceEntry[],
): PhysiologyConfidence {
  // Phase model: days with known cycle phase in adherence log (target: 60 days)
  const withPhase    = adherenceHistory.filter(e => e.cyclePhase && e.cyclePhase !== "").length;
  const phaseModel   = Math.min(100, Math.round((withPhase / 60) * 100));

  // Symptom model: unique days with symptoms vs readiness overlap (target: 30 days)
  const symptomDays  = new Set(symptomHistory.map(s => s.date)).size;
  const symptomModel = Math.min(100, Math.round((symptomDays / 30) * 100));

  // Recovery model: scored response entries (target: 20 entries)
  const scoredLog    = recoveryLog.filter(e => e.scored).length;
  const recoveryModel = Math.min(100, Math.round((scoredLog / 20) * 100));

  // Readiness model: entries with contributor breakdown (target: 30 entries)
  const withCont      = readinessHistory.filter(e => e.contributors !== undefined).length;
  const readinessModel = Math.min(100, Math.round((withCont / 30) * 100));

  const overall = Math.round(
    phaseModel    * 0.30 +
    symptomModel  * 0.25 +
    recoveryModel * 0.20 +
    readinessModel * 0.25,
  );

  const level: PhysiologyMaturityLevel =
    overall >= 75 ? "mature"
    : overall >= 50 ? "established"
    : overall >= 25 ? "building"
    : "early";

  const SUMMARIES: Record<PhysiologyMaturityLevel, string> = {
    early:       "Axis is just getting to know your physiology. Keep logging daily to accelerate personalization.",
    building:    "Your personal model is taking shape. Several patterns are now visible in your data.",
    established: "Axis has a strong picture of how your body responds. Recommendations are highly personalized.",
    mature:      "Your physiology model is mature. Axis understands your patterns at a deep individual level.",
  };

  return { overall, phaseModel, symptomModel, recoveryModel, readinessModel, level, summary: SUMMARIES[level] };
}
