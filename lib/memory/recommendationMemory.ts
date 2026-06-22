// ─── lib/memory/recommendationMemory.ts ──────────────────────────────────────
// 45D — Recommendation Memory
// Tracks which recommendation types produced the best next-day outcomes for
// THIS user, building a personal "what works" profile over time.

import { getSituationHistory } from "./situationMemory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendationOutcomeEntry {
  type:              string;    // recommendation type
  meanReadinessDelta: number;   // avg next-day readiness change
  completionRate:    number;    // 0–1
  sampleSize:        number;
  effective:         boolean;   // meanReadinessDelta >= 3
}

export interface RecommendationMemoryProfile {
  bestType:          string | null;
  worstType:         string | null;
  outcomes:          RecommendationOutcomeEntry[];
  dataReady:         boolean;
  insight:           string;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function buildRecommendationMemoryProfile(): RecommendationMemoryProfile {
  const EMPTY: RecommendationMemoryProfile = {
    bestType: null, worstType: null, outcomes: [], dataReady: false,
    insight: "Track more sessions to learn what recommendation types work best for you.",
  };

  const history = getSituationHistory().filter(e => e.scored && e.outcome !== undefined);
  if (history.length < 5) return EMPTY;

  const buckets = new Map<string, { deltas: number[]; completions: number[]; }>();
  for (const e of history) {
    const type = e.decision.recommendationType;
    if (!buckets.has(type)) buckets.set(type, { deltas: [], completions: [] });
    const b = buckets.get(type)!;
    b.deltas.push(e.outcome!.readinessDelta);
    b.completions.push(e.outcome!.workoutCompleted ? 1 : 0);
  }

  const outcomes: RecommendationOutcomeEntry[] = [];
  for (const [type, b] of buckets.entries()) {
    if (b.deltas.length < 2) continue;
    const mean       = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const meanDelta  = Math.round(mean(b.deltas) * 10) / 10;
    const compRate   = Math.round(mean(b.completions) * 100) / 100;
    outcomes.push({
      type, meanReadinessDelta: meanDelta, completionRate: compRate,
      sampleSize: b.deltas.length, effective: meanDelta >= 3,
    });
  }

  if (outcomes.length === 0) return EMPTY;
  outcomes.sort((a, b) => b.meanReadinessDelta - a.meanReadinessDelta);

  const bestType  = outcomes[0].type;
  const worstType = outcomes[outcomes.length - 1].type;

  const insight = outcomes[0].effective
    ? `"${bestType}" recommendations have historically improved your next-day readiness by ${outcomes[0].meanReadinessDelta > 0 ? "+" : ""}${outcomes[0].meanReadinessDelta} pts on average.`
    : "Collecting more sessions to identify which recommendation types work best for you.";

  return { bestType, worstType, outcomes, dataReady: true, insight };
}
