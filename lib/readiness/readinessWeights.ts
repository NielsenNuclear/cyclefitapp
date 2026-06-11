// ─── lib/readiness/readinessWeights.ts ───────────────────────────────────────
// Canonical weight constants for the readiness scoring model.
// Pure constants — no logic, no side effects.
//
// Evidence basis for ordering:
//   Sleep (25%)        — single largest acute performance lever; poor sleep impairs
//                        force production, reaction time, and hormonal recovery within
//                        one night. Most weighted in AdaptiveProfile too.
//   Stress (20%)       — chronic cortisol load directly impairs muscle protein synthesis
//                        and HPA-axis recovery; acutely suppresses output at levels ≥7/10.
//   Energy (20%)       — immediate perceived readiness; already modulated by sleep + stress
//                        upstream, so captures residual daily variance.
//   Training load (15%)— lagging indicator (7–14 day window); real but slower-moving.
//   Cycle phase (10%)  — advisory signal; individual variance too high to weight higher.
//                        Lower for users with trackingPreference = "none".
//   Adherence (10%)    — 28-day behavioral trend; motivationally informative but should
//                        not outweigh acute physiological signals.
//
// Weights sum to exactly 1.0.
// All values are fractions (0–1), not percentages.

export const READINESS_WEIGHTS = {
  sleep:        0.25,
  stress:       0.20,
  energy:       0.20,
  trainingLoad: 0.15,
  cycle:        0.10,
  adherence:    0.10,
} as const;

export type ReadinessWeightKey = keyof typeof READINESS_WEIGHTS;

// ─── Per-signal raw score maps (0–100) ────────────────────────────────────────
// These are the canonical values used by calculateReadiness.ts.
// Defined here so they can be audited alongside the weights without
// hunting through the scoring logic.

export const SLEEP_RAW: Record<string, number> = {
  excellent: 100,
  good:       75,
  variable:   40,
  poor:       15,
};

export const LOAD_RAW: Record<string, number> = {
  "Recovered":        90,
  "Normal":           70,
  "Elevated Fatigue": 40,
  "High Fatigue":     15,
};

export const CYCLE_RAW: Record<string, number> = {
  "Follicular":  80,
  "Ovulatory":   80,
  "Luteal":      60,
  "Late Luteal": 40,
  "Menstrual":   50,
};

// Stress: 1-10 numeric → raw score
// 1–3 = low stress, manageable physiological load
// 4–5 = moderate, within normal adaptive range
// 6–7 = elevated, beginning to suppress recovery
// 8–10 = high, meaningful HPA-axis disruption
export function stressRaw(level: number): number {
  if (level <= 3) return 90;
  if (level <= 5) return 70;
  if (level <= 7) return 45;
  return 20;
}

// Energy level 0–4 (from deriveEnergyLevel) → raw score
export const ENERGY_RAW: Record<number, number> = {
  0: 20,
  1: 40,
  2: 60,
  3: 80,
  4: 100,
};
