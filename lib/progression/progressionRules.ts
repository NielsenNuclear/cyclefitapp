// ─── lib/progression/progressionRules.ts ─────────────────────────────────────
// Translate a ProgressionProfile into a concrete coaching adjustment.
// Pure logic only — no UI, no persistence, no side effects.

import type { ProgressionProfile, RecommendedAction } from "./progressionProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplexityModifier = "increase" | "maintain" | "decrease";

export interface CoachingAdjustment {
  action:             RecommendedAction;
  volumeModifier:     number;           // multiplier applied to set counts (e.g. 1.1 = +10%)
  intensityModifier:  number;           // RPE delta (e.g. +1, -1, -2)
  complexityModifier: ComplexityModifier;
  rationale:          string;
}

// ─── Rule table ───────────────────────────────────────────────────────────────
// Each rule maps a RecommendedAction to its coaching adjustments.
// The rationale is built from actual profile scores so every output is
// traceable to observed data, not generic motivation.

interface RuleSpec {
  volumeModifier:     number;
  intensityModifier:  number;
  complexityModifier: ComplexityModifier;
  buildRationale:     (profile: ProgressionProfile) => string;
}

const RULES: Record<RecommendedAction, RuleSpec> = {
  progress: {
    volumeModifier:    1.10,
    intensityModifier: 0,
    complexityModifier: "maintain",
    buildRationale: (p) =>
      `Adherence is strong (${p.adherenceScore}/100) and recovery signals are positive ` +
      `(${p.recoveryScore}/100). Adding one working set to primary compound movements ` +
      `applies progressive overload at a point where the training system can absorb it.`,
  },

  maintain: {
    volumeModifier:    1.00,
    intensityModifier: 0,
    complexityModifier: "maintain",
    buildRationale: (p) => {
      if (p.confidence < 0.35) {
        return `Insufficient history to make a confident progression decision ` +
               `(confidence ${Math.round(p.confidence * 100)}%). Current prescription is maintained ` +
               `until more sessions are logged.`;
      }
      return `Adherence (${p.adherenceScore}/100) and recovery (${p.recoveryScore}/100) ` +
             `are balanced. Current volume and intensity are appropriate — no change applied.`;
    },
  },

  reduce: {
    volumeModifier:    0.80,
    intensityModifier: -1,
    complexityModifier: "decrease",
    buildRationale: (p) => {
      if (p.adherenceScore < 50) {
        return `Completion rate is below 50% over the last 28 days ` +
               `(adherence ${p.adherenceScore}/100). Reducing complexity and volume ` +
               `may improve consistency by lowering the session barrier.`;
      }
      return `Recovery score is below threshold (${p.recoveryScore}/100). ` +
             `Volume is reduced 20% and RPE targets are lowered by one point ` +
             `to allow physiological recovery without stopping training entirely.`;
    },
  },

  deload: {
    volumeModifier:    0.60,
    intensityModifier: -2,
    complexityModifier: "decrease",
    buildRationale: (p) =>
      `Recovery signals indicate accumulated fatigue ` +
      `(recovery score ${p.recoveryScore}/100, workload trend: ${p.workloadTrend}). ` +
      `A structured deload — 40% volume reduction and reduced intensity targets — ` +
      `is recommended to restore adaptation capacity. Deload sessions are training, not rest.`,
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function applyProgressionRules(profile: ProgressionProfile): CoachingAdjustment {
  const rule = RULES[profile.recommendedAction];
  return {
    action:             profile.recommendedAction,
    volumeModifier:     rule.volumeModifier,
    intensityModifier:  rule.intensityModifier,
    complexityModifier: rule.complexityModifier,
    rationale:          rule.buildRationale(profile),
  };
}
