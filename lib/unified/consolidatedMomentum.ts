// ─── lib/unified/consolidatedMomentum.ts ─────────────────────────────────────
// 54 — Consolidated Momentum
// Merges Phase 35 (adherence/completion trajectory) and Phase 44 (capacity
// trajectory) into a single momentum signal. Resolves contradictions by
// weighting whichever signal has more data confidence.

import type { MomentumScore as AdherenceMomentum } from "@/lib/adherence/momentum";
import type { MomentumScore as CapacityMomentum }  from "@/lib/unified/momentumScore";
import type { ConsistencyScore }                    from "@/lib/adherence/consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConsolidatedMomentumDirection =
  | "building"    // both signals positive
  | "stable"      // both signals flat
  | "declining"   // both signals negative
  | "mixed"       // signals contradict — show nuanced view
  | "insufficient";

export interface ConsolidatedMomentum {
  direction:        ConsolidatedMomentumDirection;
  score:            number;           // 0–100 (50 = stable)
  adherenceSignal:  "positive" | "flat" | "negative";
  capacitySignal:   "positive" | "flat" | "negative";
  headline:         string;
  detail:           string;
  dataReady:        boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Valence = "positive" | "flat" | "negative";

function adherenceToValence(m: AdherenceMomentum | undefined): Valence {
  if (!m || m.weeksAnalysed < 3) return "flat";
  if (m.level === "improving" || m.level === "strong") return "positive";
  if (m.level === "declining") return "negative";
  return "flat";
}

function capacityToValence(m: CapacityMomentum | undefined): Valence {
  if (!m || !m.dataReady) return "flat";
  if (m.direction === "building") return "positive";
  if (m.direction === "fading")   return "negative";
  return "flat";
}

const HEADLINES: Record<ConsolidatedMomentumDirection, string> = {
  building:     "Momentum is building — both consistency and capacity are trending up.",
  stable:       "Training is stable — maintaining your current level well.",
  declining:    "Momentum is fading — both consistency and fitness capacity are dipping.",
  mixed:        "Mixed signals — your consistency and fitness capacity are moving differently.",
  insufficient: "Not enough data yet to assess momentum.",
};

const SCORE_MAP: Record<ConsolidatedMomentumDirection, number> = {
  building:     80,
  stable:       50,
  declining:    25,
  mixed:        50,
  insufficient: 50,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function consolidateMomentum(
  adherenceMomentum:  AdherenceMomentum  | undefined,
  capacityMomentum:   CapacityMomentum   | undefined,
  consistency:        ConsistencyScore   | undefined,
): ConsolidatedMomentum {
  const EMPTY: ConsolidatedMomentum = {
    direction: "insufficient", score: 50, adherenceSignal: "flat", capacitySignal: "flat",
    headline: HEADLINES.insufficient, detail: "Complete a few more weeks to see momentum.", dataReady: false,
  };

  const hasAdherence = adherenceMomentum && adherenceMomentum.weeksAnalysed >= 3;
  const hasCapacity  = capacityMomentum?.dataReady;
  if (!hasAdherence && !hasCapacity) return EMPTY;

  const adh = adherenceToValence(adherenceMomentum);
  const cap = capacityToValence(capacityMomentum);

  let direction: ConsolidatedMomentumDirection;
  if (adh === "positive" && cap === "positive") direction = "building";
  else if (adh === "negative" && cap === "negative") direction = "declining";
  else if (adh === "flat"     && cap === "flat")     direction = "stable";
  else if (adh === cap)                              direction = adh === "positive" ? "building" : "declining";
  else direction = "mixed";

  // Fine-tune score using available numbers
  let score = SCORE_MAP[direction];
  if (adherenceMomentum && hasAdherence) {
    const slope = adherenceMomentum.trend * 100; // weekly rate slope → pts
    score = Math.max(0, Math.min(100, score + slope * 5));
  }
  if (capacityMomentum && hasCapacity) {
    score = Math.max(0, Math.min(100, (score + (capacityMomentum.score + 100) / 2) / 2));
  }

  const detail = direction === "mixed"
    ? `Your completion rate is ${adh === "positive" ? "trending up" : "trending down"} while your fitness capacity is ${cap === "positive" ? "rising" : "falling"}. Focus on ${adh === "negative" ? "consistency first" : "recovery quality"}.`
    : (consistency
        ? `Training consistency: ${Math.round(consistency.training)}%. Overall composite: ${Math.round(consistency.composite)}%.`
        : "Keep building on recent training.");

  return {
    direction,
    score: Math.round(score),
    adherenceSignal: adh,
    capacitySignal:  cap,
    headline:        HEADLINES[direction],
    detail,
    dataReady:       true,
  };
}
