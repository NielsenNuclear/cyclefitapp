// ─── lib/memory/coachingNarrative.ts ─────────────────────────────────────────
// 45E — Adaptive Coaching Narrative
// Generates personalized coaching text by citing THIS user's own history.
// "Last month during a similar late luteal phase with elevated stress,
//  mobility work improved readiness by 14%." — that's coaching, not AI output.

import type { SimilarSituation }           from "./situationMemory";
import type { RecommendationMemoryProfile } from "./recommendationMemory";
import type { PhaseResponseProfile }        from "@/lib/physiology/phaseResponseModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachingNarrative {
  lines:        string[];
  headline:     string;
  hasMemory:    boolean;   // true when at least one line is history-based
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildCoachingNarrative(
  similarSituations:   SimilarSituation[],
  recommendationMemory: RecommendationMemoryProfile,
  phaseResponse:       PhaseResponseProfile | undefined,
  todayReadiness:      number,
  cyclePhase:          string,
): CoachingNarrative {
  const lines: string[] = [];
  let hasMemory = false;

  // 45B: cite similar historical situations
  const scored = similarSituations.filter(s => s.entry.outcome !== undefined);
  if (scored.length > 0) {
    const best = scored[0];
    const daysAgo = best.daysAgo === 1 ? "yesterday" : `${best.daysAgo} days ago`;
    const delta   = best.entry.outcome!.readinessDelta;
    const rec     = best.entry.decision.recommendationType;
    if (Math.abs(delta) >= 3) {
      hasMemory = true;
      lines.push(
        `${daysAgo.charAt(0).toUpperCase() + daysAgo.slice(1)}, in a similar ${best.entry.context.cyclePhase} with comparable readiness, ` +
        `a "${rec}" day resulted in ${delta >= 0 ? "+" : ""}${delta} pts readiness the next morning.`,
      );
    }

    // Aggregate over multiple similar sessions
    const avgDelta = Math.round(
      scored.slice(0, 5).reduce((s, x) => s + (x.entry.outcome?.readinessDelta ?? 0), 0) / Math.min(5, scored.length),
    );
    if (scored.length >= 3 && Math.abs(avgDelta) >= 3) {
      hasMemory = true;
      lines.push(
        `Across ${scored.length} similar situations, you averaged ${avgDelta >= 0 ? "+" : ""}${avgDelta} pts readiness change the following day.`,
      );
    }
  }

  // 45D: recommendation memory
  if (recommendationMemory.dataReady && recommendationMemory.bestType) {
    hasMemory = true;
    lines.push(recommendationMemory.insight);
  }

  // Phase-based memory
  if (phaseResponse?.dataReady && phaseResponse.worstPhase && cyclePhase === phaseResponse.worstPhase) {
    hasMemory = true;
    lines.push(
      `You're in ${cyclePhase} — historically your lowest-readiness phase. Conservative volume is already applied.`,
    );
  } else if (phaseResponse?.dataReady && phaseResponse.bestPhase && cyclePhase === phaseResponse.bestPhase) {
    hasMemory = true;
    lines.push(`You're in ${cyclePhase} — your personal peak phase. Your data supports pushing today.`);
  }

  const headline = hasMemory
    ? "Axis is drawing on your history to shape this recommendation."
    : todayReadiness >= 75
      ? "Your signals are strong — the plan reflects that."
      : "Building your history so future recommendations get even sharper.";

  return { lines: lines.slice(0, 3), headline, hasMemory };
}
