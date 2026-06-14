// ─── lib/adaptive/adaptiveDecisionEngine.ts ──────────────────────────────────
// Synthesises all four adaptive layers into:
//   1. AdaptiveModifier — small volume/intensity adjustments for the pipeline
//   2. AdaptiveInsight[]  — user-facing observations (no AI/ML language)

import type { PhysiologyFingerprint } from "./physiologyMemory";
import type { PatternConfidence }      from "./patternConfidence";
import type { PersonalWeights }        from "./personalWeighting";
import type { InterventionOutcome }    from "./interventionLearning";
import type { RecoveryScore }          from "@/lib/recovery/recoveryScore";
import type { RecoveryTrend }          from "@/lib/recovery/recoveryTrend";
import type { RecoveryDebt }           from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }            from "@/lib/recovery/burnoutRisk";
import type { SymptomEscalationEntry }   from "@/lib/recovery/symptomEscalation";
import type { RecoveryStrategyOutcome }   from "@/lib/recovery/recoveryLearning";

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
  // Phase 21I — recovery intelligence signals (optional; existing callers unaffected)
  recoveryScore?:       RecoveryScore | null;
  recoveryTrend?:       RecoveryTrend | null;
  recoveryDebt?:        RecoveryDebt | null;
  burnoutRisk?:         BurnoutRisk | null;
  symptomEscalations?:  SymptomEscalationEntry[];
  // Phase 23D — recovery strategy learning outcomes
  strategyOutcomes?:    RecoveryStrategyOutcome[];
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

  // Layer 5 — recovery intelligence: sustained debt or high strain overrides
  const bl = input.burnoutRisk?.level;
  if (bl === "severe") {
    volume    = Math.min(volume, 0.80);
    intensity = Math.min(intensity, 0.85);
    rationale.push("Severe recovery strain — volume and intensity capped");
  } else if (bl === "high") {
    volume = Math.min(volume, 0.85);
    rationale.push("High recovery strain — volume capped");
  }

  const dc = input.recoveryDebt?.category;
  const dt = input.recoveryDebt?.trend;
  if ((dc === "critical") || (dc === "high" && dt === "accumulating")) {
    volume = Math.min(volume, 0.85);
    rationale.push("Recovery debt critical or high/accumulating — volume capped");
  }

  // Layer 6 — recovery strategy learning: adjust based on what actually restores this user.
  // Early learning: partial-weight signals fire from the first scored entry so new users
  // are not locked out of this layer for weeks. earlyWeight ramps 0 → 1 over 3 entries.
  for (const s of (input.strategyOutcomes ?? [])) {
    if (s.sampleSize === 0) continue;
    const earlyWeight = Math.min(1.0, s.sampleSize / 3);

    if (s.strategy === "deload_week" && s.successRate <= 0.35) {
      // Deload weeks haven't improved this user's recovery — raise volume floor.
      // Full floor (0.85) at verdict=ineffective; partial floor during early learning.
      if (volume < 0.90) {
        const floor = s.verdict === "ineffective" ? 0.85 : 0.70 + earlyWeight * 0.15;
        volume = Math.max(volume, floor);
        rationale.push(
          s.verdict === "ineffective"
            ? "Deload weeks have not improved recovery — volume floor raised"
            : "Deload weeks showing limited recovery benefit (early data)",
        );
      }
    }

    if (s.strategy === "rest_day" && s.successRate >= 0.65 && volume < 1.0) {
      // Rest days reliably help this user — apply a small additional volume reduction.
      // Full effect at verdict=effective; partial during early learning.
      const reduction = s.verdict === "effective" ? 0.03 : 0.03 * earlyWeight;
      if (reduction > 0) {
        volume = Math.max(volume - reduction, 0.70);
        rationale.push(
          s.verdict === "effective"
            ? "Rest days reliably support this user's recovery"
            : "Rest days showing recovery benefit (early data)",
        );
      }
    }
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

  // ── Recovery trend (Phase 21I) ────────────────────────────────────────────
  const rt = input.recoveryTrend;
  if (rt && rt.dataPoints >= 5) {
    if (rt.status7d === "rapidly_declining") {
      insights.push({
        id:         "recovery_trend_rapid",
        text:       "Your recovery scores have dropped noticeably over the past 7 days. Lighter sessions right now will likely be more productive than pushing through at full intensity.",
        confidence: 0.80,
        category:   "recovery",
      });
    } else if (rt.status7d === "declining" && rt.status14d === "declining") {
      insights.push({
        id:         "recovery_trend_decline",
        text:       "Recovery scores have been drifting down over the past two weeks. Avoiding progressive load increases until the trend stabilises may help.",
        confidence: 0.65,
        category:   "recovery",
      });
    }
  }

  // ── Recovery debt (Phase 21I) ─────────────────────────────────────────────
  const rd = input.recoveryDebt;
  if (rd) {
    const daysEl = rd.daysElevated;
    if (rd.category === "critical" && daysEl >= 7) {
      insights.push({
        id:         "recovery_debt_critical",
        text:       `Recovery debt has been elevated for ${daysEl} days. Your body is signalling it needs more recovery time than it's currently getting — additional rest days are likely to pay off.`,
        confidence: 0.88,
        category:   "recovery",
      });
    } else if (rd.category === "high" && rd.trend === "accumulating") {
      insights.push({
        id:         "recovery_debt_high",
        text:       `Recovery debt is high and still building after ${daysEl} day(s). Reducing training load this week can prevent a more significant dip in readiness.`,
        confidence: 0.75,
        category:   "recovery",
      });
    } else if (rd.category === "elevated" && daysEl >= 5) {
      insights.push({
        id:         "recovery_debt_elevated",
        text:       `Recovery debt has been elevated for ${daysEl} consecutive days. One additional rest or active-recovery day each week tends to help clear this pattern.`,
        confidence: 0.60,
        category:   "recovery",
      });
    }
  }

  // ── Burnout / strain indicators (Phase 21I) ───────────────────────────────
  const bk = input.burnoutRisk;
  if (bk) {
    if (bk.level === "severe") {
      const topFactor = bk.factors.sort((a, b) => b.score - a.score)[0];
      insights.push({
        id:         "strain_severe",
        text:       `Multiple recovery indicators are elevated${topFactor ? ` (${topFactor.detail.toLowerCase()})` : ""}. A recovery-focused week — lower intensity, consistent sleep — is likely to restore training capacity faster than continuing at pace.`,
        confidence: 0.85,
        category:   "recovery",
      });
    } else if (bk.level === "high") {
      insights.push({
        id:         "strain_high",
        text:       "Several recovery indicators suggest your system is under elevated strain. Scheduling lighter training days before they feel necessary tends to preserve long-term performance.",
        confidence: 0.70,
        category:   "recovery",
      });
    }
  }

  // ── Symptom escalation (Phase 21I) ───────────────────────────────────────
  const escalating = (input.symptomEscalations ?? []).filter(e => e.status === "escalating");
  if (escalating.length > 0) {
    const top = escalating[0];
    const cycleCount = top.cycleMeans.length;
    insights.push({
      id:         `escalation_${top.symptomId}`,
      text:       `${top.symptomName} symptoms have increased in each of your last ${cycleCount} cycles. Tracking intensity during affected phases can help identify whether training load is a contributing factor.`,
      confidence: 0.68,
      category:   "symptoms",
    });
  }

  return insights
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
