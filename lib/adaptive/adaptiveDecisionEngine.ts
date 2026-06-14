// ─── lib/adaptive/adaptiveDecisionEngine.ts ──────────────────────────────────
// Synthesises all four adaptive layers into:
//   1. AdaptiveModifier — small volume/intensity adjustments for the pipeline
//   2. AdaptiveInsight[]  — user-facing observations (no AI/ML language)

import type { PhysiologyFingerprint } from "./physiologyMemory";
import type { PatternConfidence }      from "./patternConfidence";
import type { PersonalWeights }        from "./personalWeighting";
import type { InterventionOutcome }    from "./interventionLearning";

// ─── Shared input ─────────────────────────────────────────────────────────────

export interface AdaptiveEngineInput {
  fingerprint:          PhysiologyFingerprint | null;
  patternConfidences:   PatternConfidence[];
  personalWeights:      PersonalWeights | null;
  interventionOutcomes: InterventionOutcome[];
  todayCycleDay:        number | null;
  todaySymptoms:        string[];           // symptomIds present today
  todayPhase:           string | null;      // e.g. "Pre-Menstrual Phase"
  cycleLength:          number;
}

// ─── Modifier types ───────────────────────────────────────────────────────────

export interface AdaptiveModifier {
  volumeMultiplier:    number;    // clamped [0.70, 1.15]
  intensityMultiplier: number;    // clamped [0.80, 1.10]
  rationale:           string[];  // internal notes; not shown to user
}

// ─── Insight types ────────────────────────────────────────────────────────────

export type InsightCategory =
  | "strength"
  | "recovery"
  | "symptoms"
  | "adherence"
  | "intervention"
  | "weighting";

export interface AdaptiveInsight {
  id:         string;
  text:       string;          // user-facing copy — no AI / neural / ML language
  confidence: number;          // 0–1
  category:   InsightCategory;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRIENDLY_INTERVENTION: Record<string, string> = {
  deload:             "Reducing training volume",
  increase_load:      "Increasing training load",
  reduce_volume:      "Reducing session volume",
  plateau_intensity:  "Intensity-based progression",
  plateau_variation:  "Exercise variation",
  plateau_density:    "Density-based training",
  plateau_power:      "Power-focused training",
};

function friendlyType(type: string): string {
  return FRIENDLY_INTERVENTION[type] ?? type.replace(/_/g, " ");
}

function formatDays(days: number[]): string {
  if (days.length === 0) return "";
  if (days.length === 1) return `day ${days[0]}`;
  const sorted = [...days].sort((a, b) => a - b);
  // Try to compress into a range if consecutive
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  return isRange && sorted.length > 2 ? `days ${min}–${max}` : `days ${sorted.join(", ")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── 1. Adaptive Modifier ─────────────────────────────────────────────────────

/**
 * Returns small volume/intensity multipliers derived from personal patterns.
 * Adjustments are intentionally conservative — the goal is refinement, not
 * overriding the base recommendation.
 */
export function computeAdaptiveModifier(input: AdaptiveEngineInput): AdaptiveModifier {
  let volume    = 1.0;
  let intensity = 1.0;
  const rationale: string[] = [];

  const { fingerprint, patternConfidences, personalWeights, interventionOutcomes,
          todayCycleDay, todaySymptoms, todayPhase } = input;

  // Layer 1 — fingerprint: worst/best cycle days
  if (fingerprint && todayCycleDay !== null) {
    if (fingerprint.worstRecoveryDays.includes(todayCycleDay)) {
      volume -= 0.10;
      rationale.push(`Day ${todayCycleDay} is historically low-readiness`);
    }
    if (fingerprint.bestStrengthDays.includes(todayCycleDay)) {
      intensity += 0.05;
      rationale.push(`Day ${todayCycleDay} is historically high-performance`);
    }
  }

  // Layer 2 — pattern confidence: reliable symptoms active today
  if (todayPhase && todaySymptoms.length > 0) {
    const active = patternConfidences.filter(
      p => p.isReliable && p.phase === todayPhase && todaySymptoms.includes(p.symptomId),
    );
    const reduction = Math.min(0.20, active.length * 0.10);
    if (reduction > 0) {
      volume -= reduction;
      rationale.push(`${active.length} reliable symptom pattern(s) active today`);
    }
  }

  // Layer 3 — intervention learning: adjust based on what actually works
  for (const outcome of interventionOutcomes) {
    if (outcome.verdict === "ineffective" && outcome.interventionType === "deload") {
      // Deload hasn't helped — raise volume floor so we don't over-reduce
      if (volume < 0.85) {
        volume = Math.max(volume, 0.85);
        rationale.push("Deload interventions have been ineffective — volume floor raised");
      }
    }
    if (outcome.verdict === "effective" && outcome.interventionType === "plateau_intensity") {
      intensity = Math.min(intensity + 0.05, 1.10);
      rationale.push("Intensity interventions have been effective");
    }
  }

  // Layer 4 — personal weights: symptom-dominant user with symptoms today
  if (personalWeights?.isCalibrated && personalWeights.symptoms > 0.50 && todaySymptoms.length > 0) {
    volume -= 0.05;
    rationale.push("Symptoms are this user's strongest readiness predictor");
  }

  return {
    volumeMultiplier:    Math.round(clamp(volume,    0.70, 1.15) * 100) / 100,
    intensityMultiplier: Math.round(clamp(intensity, 0.80, 1.10) * 100) / 100,
    rationale,
  };
}

// ─── 2. Adaptive Insights ─────────────────────────────────────────────────────

const FINGERPRINT_MIN_ENTRIES = 30;  // observations needed before surfacing day-based insights

/**
 * Generates user-facing observations from personal training history.
 * Surfaces at most 5 insights. Only shows patterns that are data-backed
 * and exceed their respective confidence thresholds.
 * No AI / neural / machine learning language anywhere in output.
 */
export function generateAdaptiveInsights(input: AdaptiveEngineInput): AdaptiveInsight[] {
  const { fingerprint, patternConfidences, personalWeights, interventionOutcomes } = input;
  const insights: AdaptiveInsight[] = [];

  // ── Best strength days ────────────────────────────────────────────────────
  if (
    fingerprint &&
    fingerprint.bestStrengthDays.length > 0 &&
    fingerprint.entryCount >= FINGERPRINT_MIN_ENTRIES
  ) {
    const days       = fingerprint.bestStrengthDays;
    const confidence = Math.round(Math.min(fingerprint.entryCount / 90, 1) * 80) / 100;
    insights.push({
      id:         "strength_days",
      text:       `Your strongest training sessions tend to occur on cycle ${formatDays(days)} — these are your highest-readiness windows.`,
      confidence,
      category:   "strength",
    });
  }

  // ── Worst recovery days ───────────────────────────────────────────────────
  if (
    fingerprint &&
    fingerprint.worstRecoveryDays.length > 0 &&
    fingerprint.entryCount >= FINGERPRINT_MIN_ENTRIES
  ) {
    const days       = fingerprint.worstRecoveryDays;
    const confidence = Math.round(Math.min(fingerprint.entryCount / 90, 1) * 75) / 100;
    insights.push({
      id:         "recovery_days",
      text:       `Recovery tends to be more challenging around cycle ${formatDays(days)}. Lighter sessions on these days support better overall consistency.`,
      confidence,
      category:   "recovery",
    });
  }

  // ── Reliable symptom patterns (up to 2) ──────────────────────────────────
  const reliablePatterns = patternConfidences.filter(p => p.isReliable).slice(0, 2);
  for (const p of reliablePatterns) {
    const phaseName = p.phase.replace(" Phase", "").toLowerCase();
    insights.push({
      id:         `symptom_${p.patternId}`,
      text:       `Over your last ${p.cyclesTotal} cycles, ${p.symptomName.toLowerCase()} has appeared during your ${phaseName} phase ${Math.round(p.confidence * 100)}% of the time.`,
      confidence: p.confidence,
      category:   "symptoms",
    });
  }

  // ── Intervention outcomes ─────────────────────────────────────────────────
  for (const outcome of interventionOutcomes.filter(o => o.verdict !== "uncertain").slice(0, 2)) {
    const label = friendlyType(outcome.interventionType);
    if (outcome.verdict === "effective") {
      insights.push({
        id:         `intervention_${outcome.interventionType}`,
        text:       `${label} has consistently improved your readiness the following day, based on ${outcome.sampleSize} observations.`,
        confidence: outcome.successRate,
        category:   "intervention",
      });
    } else {
      insights.push({
        id:         `intervention_${outcome.interventionType}`,
        text:       `${label} hasn't improved your recovery outcomes over ${outcome.sampleSize} observations — the system adjusts recommendations accordingly.`,
        confidence: 1 - outcome.successRate,
        category:   "intervention",
      });
    }
  }

  // ── Personal weighting ────────────────────────────────────────────────────
  if (personalWeights?.isCalibrated) {
    const { sleep, stress, symptoms } = personalWeights;
    const dominant =
      sleep >= stress && sleep >= symptoms
        ? { factor: "Sleep quality", weight: sleep }
        : stress >= sleep && stress >= symptoms
          ? { factor: "Stress levels", weight: stress }
          : { factor: "Symptom patterns", weight: symptoms };

    if (dominant.weight > 0.45) {
      const others =
        dominant.factor === "Sleep quality"
          ? "stress levels or symptoms"
          : dominant.factor === "Stress levels"
            ? "sleep quality or symptoms"
            : "sleep quality or stress levels";

      insights.push({
        id:         "weighting",
        text:       `${dominant.factor} appear to have a stronger influence on your daily readiness than ${others}.`,
        confidence: Math.round(Math.min(dominant.weight / 0.70, 1) * 80) / 100,
        category:   "weighting",
      });
    }
  }

  return insights
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
