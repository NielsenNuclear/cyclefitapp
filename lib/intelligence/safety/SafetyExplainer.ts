// ─── lib/intelligence/safety/SafetyExplainer.ts ──────────────────────────────
// Phase 68 — user-facing explanations when safety rules intervene.

import type { SafetyEvaluation } from "./SafetyEvaluator";

export interface SafetyExplanation {
  hasConstraints: boolean;
  headline:       string | null;
  detail:         string | null;
  messages:       string[];
}

export function explainSafetyEvaluation(evaluation: SafetyEvaluation): SafetyExplanation {
  if (!evaluation.wasConstrained || evaluation.userMessages.length === 0) {
    return { hasConstraints: false, headline: null, detail: null, messages: [] };
  }

  const critCount = evaluation.criticalActivations.length;
  const highCount = evaluation.highActivations.length;

  let headline: string;
  let detail: string;

  if (critCount > 0) {
    headline = "Today's recommendation has been adjusted for safety.";
    detail   = "One or more critical safety thresholds were reached. Axis has applied conservative limits to protect your long-term progress.";
  } else if (highCount > 0) {
    headline = "Workout intensity has been held conservative.";
    detail   = "Your current training signals suggest a more controlled session today.";
  } else {
    headline = "A minor adjustment was applied to your recommendation.";
    detail   = "Axis applied a precautionary limit based on current training context.";
  }

  return {
    hasConstraints: true,
    headline,
    detail,
    messages: evaluation.userMessages,
  };
}
