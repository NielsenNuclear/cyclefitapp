// ─── lib/intelligence/verification/calculateRecommendationAccuracy.ts ──────────
// Phase 64 — Accuracy calculator
// Aggregates verification records into accuracy metrics and distributions.

import type { VerificationRecord, VerificationScore, VerificationSummary } from "./verificationTypes";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_SCORES: VerificationScore[] = [
  "successful",
  "partially_successful",
  "neutral",
  "unsuccessful",
  "insufficient_data",
];

function emptyDist(): Record<VerificationScore, number> {
  return Object.fromEntries(ALL_SCORES.map(s => [s, 0])) as Record<VerificationScore, number>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeVerificationSummary(
  records: VerificationRecord[],
  today:   string,
): VerificationSummary {
  const completed  = records.filter(r => r.evaluated);
  const pending    = records.filter(r => !r.evaluated && r.evaluationDueDate <= today);
  const active     = records.filter(r => !r.evaluated && r.evaluationDueDate > today);
  const dist       = emptyDist();

  for (const r of completed) {
    if (r.verificationScore) dist[r.verificationScore]++;
  }

  const actionable = completed.filter(
    r => r.verificationScore && r.verificationScore !== "insufficient_data",
  );

  const successes = actionable.filter(
    r => r.verificationScore === "successful" || r.verificationScore === "partially_successful",
  ).length;

  const successRate = actionable.length > 0 ? successes / actionable.length : 0;

  return {
    totalRecords:         records.length,
    pendingEvaluations:   pending.length + active.length,
    completedEvaluations: completed.length,
    scoreDistribution:    dist,
    overallSuccessRate:   successRate,
    dataReady:            records.length >= 3,
  };
}

// ── Per-class breakdown ───────────────────────────────────────────────────────

export interface ClassAccuracy {
  recommendationClass: string;
  total:               number;
  successRate:         number;
  distribution:        Record<VerificationScore, number>;
}

export function computeClassAccuracy(records: VerificationRecord[]): ClassAccuracy[] {
  const byClass = new Map<string, VerificationRecord[]>();
  for (const r of records.filter(r => r.evaluated)) {
    const k = r.recommendationClass;
    if (!byClass.has(k)) byClass.set(k, []);
    byClass.get(k)!.push(r);
  }

  const result: ClassAccuracy[] = [];
  for (const [cls, recs] of byClass) {
    const dist = emptyDist();
    for (const r of recs) if (r.verificationScore) dist[r.verificationScore]++;
    const actionable = recs.filter(r => r.verificationScore !== "insufficient_data").length;
    const successes  = recs.filter(
      r => r.verificationScore === "successful" || r.verificationScore === "partially_successful",
    ).length;
    result.push({
      recommendationClass: cls,
      total:               recs.length,
      successRate:         actionable > 0 ? successes / actionable : 0,
      distribution:        dist,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

// ── Confidence feedback signal ────────────────────────────────────────────────
// Returns a scalar [0, 1] that Phase 57 calibration can consume.
// 1.0 = verification fully confirms recommendation quality.
// 0.5 = neutral signal; 0.0 = recommendations consistently unhelpful.

export function computeConfidenceFeedback(
  records: VerificationRecord[],
): number | null {
  const actionable = records.filter(
    r => r.evaluated && r.verificationScore && r.verificationScore !== "insufficient_data",
  );
  if (actionable.length < 5) return null;

  const weighted = actionable.reduce((sum, r) => {
    const w =
      r.verificationScore === "successful"          ? 1.0 :
      r.verificationScore === "partially_successful" ? 0.7 :
      r.verificationScore === "neutral"             ? 0.5 :
      0.1; // unsuccessful
    return sum + w;
  }, 0);

  return weighted / actionable.length;
}
