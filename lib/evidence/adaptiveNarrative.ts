// ─── lib/evidence/adaptiveNarrative.ts ───────────────────────────────────────
// 42H — Adaptive Coaching Narrative
// Generates personalized insight text grounded in the user's own patterns,
// replacing generic "AI says..." text with evidence-based personal statements.

import type { PhaseResponseProfile }     from "@/lib/physiology/phaseResponseModel";
import type { SymptomImpactProfile }     from "@/lib/physiology/symptomImpactModel";
import type { PredictorRankingProfile }  from "@/lib/physiology/readinessPredictorRanking";
import type { RecoveryResponseProfile }  from "@/lib/physiology/recoveryResponseModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdaptiveNarrative {
  lines:    string[];
  headline: string;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildAdaptiveNarrative(
  phaseResponse:    PhaseResponseProfile,
  symptomImpact:    SymptomImpactProfile,
  predictorRanking: PredictorRankingProfile,
  recoveryModel:    RecoveryResponseProfile,
): AdaptiveNarrative {
  const lines: string[] = [];

  // Phase response insight
  if (phaseResponse.dataReady && phaseResponse.bestPhase) {
    if (phaseResponse.deviatesFromPopulation) {
      lines.push(`Your peak is ${phaseResponse.bestPhase} — not ovulation, as most research assumes. Axis trusts your data.`);
    } else {
      lines.push(`Your readiness peaks during ${phaseResponse.bestPhase}, consistent with the population pattern.`);
    }
    if (phaseResponse.worstPhase) {
      lines.push(`Your readiness dips during ${phaseResponse.worstPhase} — volume is automatically scaled back.`);
    }
  }

  // Dominant readiness predictor
  if (predictorRanking.dataReady && predictorRanking.rankings.length > 0) {
    const top = predictorRanking.rankings[0];
    lines.push(`${top.label} explains ~${top.normalized}% of your readiness variance — your strongest personal signal.`);
  }

  // Symptom impact
  if (symptomImpact.dataReady && symptomImpact.impacts.length > 0) {
    const top = symptomImpact.impacts[0];
    if (top.meanDrop >= 5) {
      lines.push(`${top.symptomId} reduces your readiness by ~${top.meanDrop} pts on average — Axis accounts for this.`);
    }
  }

  // Recovery strategy
  if (recoveryModel.dataReady && recoveryModel.bestModality) {
    const m = recoveryModel.modalities.find(m => m.modality === recoveryModel.bestModality);
    if (m?.effective) {
      lines.push(`${m.label} is your most effective recovery tool (+${m.meanLift} pts next-day readiness).`);
    }
  }

  const headline =
    lines.length >= 2
      ? "These recommendations are shaped by your personal patterns."
      : "Logging daily accelerates how quickly Axis learns your physiology.";

  return { lines: lines.slice(0, 4), headline };
}
