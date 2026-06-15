// ─── lib/performance/performancePotential.ts ─────────────────────────────────
// Synthesises today's performance potential from readiness, cycle phase,
// recovery debt, and burnout signals. Outputs a 0–100 score and label.
// Pure function — all inputs passed in.

import type { CapacityLevel } from "@/lib/adaptive/recoveryCapacity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PotentialLabel =
  | "High-output day"
  | "Solid session"
  | "Moderate output"
  | "Recovery day";

export interface PerformancePotential {
  score:          number;         // 0–100
  label:          PotentialLabel;
  drivingFactors: string[];
}

// ─── Phase modifiers ──────────────────────────────────────────────────────────

const PHASE_BONUS: Record<string, number> = {
  Follicular:   10,
  Ovulatory:    12,
  Luteal:       -3,
  "Late Luteal": -8,
  Menstrual:    -6,
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes today's performance potential.
 * Readiness is the primary driver (~60% weight); phase, debt, and burnout
 * are modifiers that shift the score up or down by at most ±25 points combined.
 */
export function computePerformancePotential(
  readinessScore:  number,
  phaseName:       string,
  debtScore:       number,
  burnoutScore:    number,
  capacityLevel:   CapacityLevel,
): PerformancePotential {
  const factors: string[] = [];

  // Readiness (primary driver, 60% weight)
  let score = Math.round(readinessScore * 0.60);

  // Phase modifier (+/- up to 12)
  const phaseBonus = PHASE_BONUS[phaseName] ?? 0;
  if (phaseBonus > 0) factors.push(`${phaseName} phase — hormonal peak`);
  if (phaseBonus < 0) factors.push(`${phaseName} phase — reduced hormonal support`);
  score += phaseBonus;

  // Recovery debt penalty (0–100 debt → 0–20 penalty)
  const debtPenalty = Math.round(debtScore * 0.20);
  if (debtScore >= 30) factors.push(`Recovery debt (${debtScore})`);
  score -= debtPenalty;

  // Burnout penalty (0–100 burnout → 0–10 penalty)
  const burnoutPenalty = Math.round(burnoutScore * 0.10);
  if (burnoutScore >= 50) factors.push("Elevated burnout markers");
  score -= burnoutPenalty;

  // Capacity modifier
  if (capacityLevel === "high")   { score += 5;  factors.push("High recovery capacity"); }
  if (capacityLevel === "low")    { score -= 5; }

  score = Math.min(100, Math.max(0, Math.round(score)));

  const label: PotentialLabel =
    score >= 80 ? "High-output day" :
    score >= 65 ? "Solid session"   :
    score >= 45 ? "Moderate output" :
    "Recovery day";

  return { score, label, drivingFactors: factors };
}
