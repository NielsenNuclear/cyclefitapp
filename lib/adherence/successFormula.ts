// ─── lib/adherence/successFormula.ts ─────────────────────────────────────────
// Phase 35I — Personal Success Formula.
// Finds the combination of conditions that most reliably predicts workout
// completion for this individual. Surfaces as "Your success formula: ✓ Protein
// ✓ Sleep ✓ Home training".

import type { MotivationPatterns } from "./motivationPatterns";
import type { BehaviorPatterns }   from "./behaviorPatterns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuccessCondition {
  factor:                 string;   // machine key
  label:                  string;   // display string e.g. "7+ hours sleep"
  completionRateWhen:     number;   // 0–1 when condition is met
  completionRateWithout:  number;   // 0–1 when condition is absent
  lift:                   number;   // difference (positive = beneficial)
  sampleWhen:             number;
}

export interface SuccessFormula {
  conditions:              SuccessCondition[];   // sorted by lift desc
  topConditions:           SuccessCondition[];   // top 3
  predictedRate:           number;               // estimated rate when all top conditions met
  insight:                 string;
  readyToPersonalise:      boolean;              // true once ≥30 resolved sessions
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildSuccessFormula(
  motivationPatterns: MotivationPatterns,
  behaviorPatterns:   BehaviorPatterns,
): SuccessFormula {
  const conditions: SuccessCondition[] = [];
  const MIN_SAMPLE = 5;

  // ── Readiness condition ──────────────────────────────────────────────────
  const { readinessCorrelation: rc } = motivationPatterns;
  if (rc.highReadinessSample >= MIN_SAMPLE && rc.lowReadinessSample >= MIN_SAMPLE) {
    conditions.push({
      factor:                "high_readiness",
      label:                 "Readiness ≥ 70",
      completionRateWhen:    rc.highReadinessRate,
      completionRateWithout: rc.lowReadinessRate,
      lift:                  rc.highReadinessRate - rc.lowReadinessRate,
      sampleWhen:            rc.highReadinessSample,
    });
  }

  // ── Sleep condition ──────────────────────────────────────────────────────
  const { sleepCorrelation: sc } = motivationPatterns;
  if (sc.goodSleepSample >= MIN_SAMPLE && sc.poorSleepSample >= MIN_SAMPLE) {
    conditions.push({
      factor:                "good_sleep",
      label:                 "Good or excellent sleep",
      completionRateWhen:    sc.goodSleepRate,
      completionRateWithout: sc.poorSleepRate,
      lift:                  sc.goodSleepRate - sc.poorSleepRate,
      sampleWhen:            sc.goodSleepSample,
    });
  }

  // ── Protein condition ────────────────────────────────────────────────────
  const { nutritionCorrelation: nc } = motivationPatterns;
  if (nc.proteinHitSample >= MIN_SAMPLE && nc.proteinMissSample >= MIN_SAMPLE) {
    conditions.push({
      factor:                "protein_prior_day",
      label:                 "Protein hit the day before",
      completionRateWhen:    nc.proteinHitRate,
      completionRateWithout: nc.proteinMissRate,
      lift:                  nc.proteinHitRate - nc.proteinMissRate,
      sampleWhen:            nc.proteinHitSample,
    });
  }

  // ── Best weekday condition ────────────────────────────────────────────────
  if (behaviorPatterns.bestWeekday && behaviorPatterns.bestWeekday.sampleSize >= MIN_SAMPLE) {
    const wd = behaviorPatterns.bestWeekday;
    const avgRate = behaviorPatterns.weekdayPatterns.length > 0
      ? behaviorPatterns.weekdayPatterns.reduce((s, p) => s + p.completionRate, 0) / behaviorPatterns.weekdayPatterns.length
      : 0.5;
    conditions.push({
      factor:                "best_weekday",
      label:                 `Training on ${wd.label}`,
      completionRateWhen:    wd.completionRate,
      completionRateWithout: avgRate,
      lift:                  wd.completionRate - avgRate,
      sampleWhen:            wd.sampleSize,
    });
  }

  // Sort by lift descending; only keep positive-lift conditions
  const sorted     = conditions.filter(c => c.lift > 0.05).sort((a, b) => b.lift - a.lift);
  const topConditions = sorted.slice(0, 3);

  // Predicted rate: average of top conditions' "when" rates (rough estimate)
  const predictedRate = topConditions.length > 0
    ? topConditions.reduce((s, c) => s + c.completionRateWhen, 0) / topConditions.length
    : 0;

  // Insight
  let insight = "";
  if (topConditions.length >= 2) {
    insight = `When ${topConditions.slice(0, 2).map(c => c.label.toLowerCase()).join(" and ")} align, you're ${Math.round(predictedRate * 100)}% likely to complete your session.`;
  } else if (topConditions.length === 1) {
    insight = `${topConditions[0].label} is your single biggest predictor of a successful session.`;
  } else {
    insight = "Keep training consistently and Axis will identify your personal success conditions.";
  }

  return {
    conditions:         sorted,
    topConditions,
    predictedRate,
    insight,
    readyToPersonalise: motivationPatterns.sampleSize >= 30,
  };
}
