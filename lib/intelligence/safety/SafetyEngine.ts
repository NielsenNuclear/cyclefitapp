// ─── lib/intelligence/safety/SafetyEngine.ts ─────────────────────────────────
// Phase 68 — public API for the safety governance system.

export type { SafetyContext, SafetyRuleResult, SafetyRule, RulePriority } from "./SafetyRule";
export { BUILT_IN_RULES } from "./SafetyRule";
export { registerRule, deregisterRule, getAllRules, getRulesByPriority } from "./SafetyRegistry";
export { evaluateSafety, loadSafetyAudit, type SafetyEvaluation, type SafetyAuditEntry } from "./SafetyEvaluator";
export { explainSafetyEvaluation, type SafetyExplanation } from "./SafetyExplainer";

// ── Convenience: run safety + return constrained volume ──────────────────────

import { evaluateSafety, type SafetyEvaluation }  from "./SafetyEvaluator";
import { explainSafetyEvaluation }                 from "./SafetyExplainer";
import type { SafetyContext }                       from "./SafetyRule";

export interface SafetyResult {
  volumeScale:  number;
  evaluation:   SafetyEvaluation;
  explanation:  ReturnType<typeof explainSafetyEvaluation>;
}

export function applySafetyGovernance(ctx: SafetyContext): SafetyResult {
  const evaluation  = evaluateSafety(ctx);
  const explanation = explainSafetyEvaluation(evaluation);
  return {
    volumeScale: evaluation.constrainedVolumeScale,
    evaluation,
    explanation,
  };
}
