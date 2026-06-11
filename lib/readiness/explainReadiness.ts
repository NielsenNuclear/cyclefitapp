// ─── lib/readiness/explainReadiness.ts ───────────────────────────────────────
// Translates a ReadinessScore into a single user-facing sentence.
// Pure logic only — no UI, no side effects.
//
// Rules:
//   – Every output sentence maps to actual contributor values in the score.
//   – No generic wellness language ("you're doing great", "listen to your body").
//   – No unsupported claims about physiology.
//   – Positive/limiting signals are named by their contributor label, not score.

import type { ReadinessScore, ReadinessContributors } from "./calculateReadiness";

type ContributorKey = keyof ReadinessContributors;

// ─── Contributor labels ───────────────────────────────────────────────────────

const POSITIVE_LABELS: Record<ContributorKey, string> = {
  sleep:        "sleep quality",
  stress:       "low stress",
  energy:       "energy signals",
  cycle:        "cycle phase",
  trainingLoad: "recovery trend",
  adherence:    "training consistency",
};

const LIMITING_LABELS: Record<ContributorKey, string> = {
  sleep:        "sleep quality",
  stress:       "elevated stress",
  energy:       "reduced energy",
  cycle:        "current cycle phase",
  trainingLoad: "accumulated training load",
  adherence:    "low recent adherence",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listSignals(signals: string[]): string {
  if (signals.length === 0) return "";
  if (signals.length === 1) return signals[0];
  if (signals.length === 2) return `${signals[0]} and ${signals[1]}`;
  return `${signals.slice(0, -1).join(", ")}, and ${signals[signals.length - 1]}`;
}

// is / are / indicates / indicate depending on count
function inflect(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function explainReadiness(score: ReadinessScore): string {
  const entries = Object.entries(score.contributors) as [ContributorKey, number][];

  const positives = entries
    .filter(([, val]) => val >= 70)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => POSITIVE_LABELS[key]);

  const limiting = entries
    .filter(([, val]) => val <= 45)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key]) => LIMITING_LABELS[key]);

  switch (score.category) {
    case "optimal":
      if (positives.length >= 2) {
        return `${listSignals(positives)} all point to full readiness today.`;
      }
      return "All readiness signals are positive — today supports a full training stimulus.";

    case "ready":
      if (positives.length >= 2) {
        return `${listSignals(positives)} support a strong session today.`;
      }
      if (positives.length === 1) {
        return `${positives[0]} is a strong readiness signal — standard training volume is appropriate.`;
      }
      return "Readiness signals are broadly positive — standard training volume is appropriate today.";

    case "moderate":
      if (positives.length > 0 && limiting.length > 0) {
        return (
          `${listSignals(positives)} ${inflect(positives.length, "is", "are")} supportive, ` +
          `but ${listSignals(limiting)} ${inflect(limiting.length, "is", "are")} a moderating factor today.`
        );
      }
      if (limiting.length > 0) {
        return (
          `${listSignals(limiting)} ${inflect(limiting.length, "is", "are")} ` +
          `moderating today's session — reduced intensity is appropriate.`
        );
      }
      return "Readiness signals are balanced — standard volume at controlled intensity is appropriate today.";

    case "cautious":
      if (limiting.length > 0) {
        return (
          `${listSignals(limiting)} ${inflect(limiting.length, "is", "are")} ` +
          `limiting today's readiness — a conservative session is recommended.`
        );
      }
      return "Readiness is below typical levels — a conservative approach to today's session is recommended.";

    case "recover":
      if (limiting.length > 0) {
        return (
          `${listSignals(limiting)} ${inflect(limiting.length, "indicates", "indicate")} ` +
          `recovery should take priority over training output today.`
        );
      }
      return "Multiple readiness signals indicate recovery should take priority over training output today.";
  }
}
