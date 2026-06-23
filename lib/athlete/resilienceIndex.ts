// ─── lib/athlete/resilienceIndex.ts ──────────────────────────────────────────
// 47C — Resilience Index
// Measures stress tolerance, recovery rebound speed, and the ability to maintain
// consistency through difficult periods. Uses readiness history.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { AdherenceEntry }        from "@/lib/adherence/adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResilienceLevel = "low" | "moderate" | "high" | "elite";

export interface ResilienceIndex {
  score:                  number;   // 0–100
  level:                  ResilienceLevel;
  stressTolerance:        number;   // completion rate when stress contributor is low
  recoveryRebound:        number;   // 0–100: avg pts gained 3 days after readiness drop
  hardPeriodConsistency:  number;   // completion rate when readiness < 55
  dataReady:              boolean;
  message:                string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelToMessage(l: ResilienceLevel): string {
  switch (l) {
    case "elite":    return "Elite resilience — you perform even when conditions aren't ideal.";
    case "high":     return "High resilience — tough weeks rarely derail your training.";
    case "moderate": return "Moderate resilience — building the ability to push through adversity.";
    default:         return "Resilience is still developing — protect low-readiness days.";
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeResilienceIndex(
  readinessHistory:  ReadinessHistoryEntry[],
  adherenceHistory:  AdherenceEntry[],
): ResilienceIndex {
  const EMPTY: ResilienceIndex = {
    score: 0, level: "low", stressTolerance: 0, recoveryRebound: 0,
    hardPeriodConsistency: 0, dataReady: false,
    message: levelToMessage("low"),
  };

  if (readinessHistory.length < 14 || adherenceHistory.length < 10) return EMPTY;

  // ── Stress tolerance: completion rate when stress contributor < 40 ─────────
  const highStressDays = adherenceHistory.filter(e => {
    const rdx = readinessHistory.find(r => r.date === e.date);
    return (rdx?.contributors?.stress ?? 100) < 40;
  });
  const stressTolerance = highStressDays.length >= 3
    ? Math.round(
        highStressDays.filter(e => e.status === "completed" || e.status === "partially_completed").length
        / highStressDays.length * 100,
      )
    : 50;

  // ── Recovery rebound: avg readiness gain after drops ──────────────────────
  let reboundSum = 0; let reboundCount = 0;
  for (let i = 1; i < readinessHistory.length - 3; i++) {
    const drop = readinessHistory[i].score - readinessHistory[i + 1].score;
    if (drop >= 10) {
      const rebound = readinessHistory[i - 1].score - readinessHistory[i + 1].score;
      reboundSum += Math.max(0, rebound);
      reboundCount++;
    }
  }
  const recoveryRebound = reboundCount > 0
    ? Math.min(100, Math.round((reboundSum / reboundCount) * 2))
    : 50;

  // ── Hard period consistency: completion rate when readiness < 55 ───────────
  const hardDays = adherenceHistory.filter(e => {
    const rdx = readinessHistory.find(r => r.date === e.date);
    return (rdx?.score ?? 100) < 55;
  });
  const hardPeriodConsistency = hardDays.length >= 3
    ? Math.round(
        hardDays.filter(e => e.status === "completed" || e.status === "partially_completed").length
        / hardDays.length * 100,
      )
    : 40;

  // ── Composite ─────────────────────────────────────────────────────────────
  const score = Math.round(
    stressTolerance * 0.35 +
    recoveryRebound * 0.30 +
    hardPeriodConsistency * 0.35,
  );

  const level: ResilienceLevel =
    score >= 80 ? "elite"
    : score >= 60 ? "high"
    : score >= 40 ? "moderate"
    : "low";

  return {
    score, level, stressTolerance, recoveryRebound, hardPeriodConsistency,
    dataReady: true, message: levelToMessage(level),
  };
}
