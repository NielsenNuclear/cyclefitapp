// ─── lib/unified/momentumScore.ts ────────────────────────────────────────────
// 44B — Momentum Score
// Measures training momentum as the rate of change in capacity over the past
// 7 days vs the 7 days before that. Answers: "Am I gaining or losing ground?"

import { getCapacityHistory } from "./capacityScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentumDirection = "building" | "stable" | "fading" | "insufficient";

export interface MomentumScore {
  score:         number;            // -100 to +100
  direction:     MomentumDirection;
  weeklyAvg:     number;            // avg capacity this week (0–100)
  priorWeekAvg:  number;            // avg capacity prior week
  delta:         number;            // weeklyAvg – priorWeekAvg
  description:   string;
  dataReady:     boolean;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeMomentumScore(): MomentumScore {
  const EMPTY: MomentumScore = {
    score: 0, direction: "insufficient", weeklyAvg: 0,
    priorWeekAvg: 0, delta: 0, description: "Not enough data yet.", dataReady: false,
  };

  const history = getCapacityHistory(14);
  if (history.length < 7) return EMPTY;

  const sorted     = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const thisWeek   = sorted.slice(0, 7).map(e => e.score);
  const priorWeek  = sorted.slice(7, 14).map(e => e.score);

  if (priorWeek.length < 4) return EMPTY;

  const mean       = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const weeklyAvg  = Math.round(mean(thisWeek));
  const priorAvg   = Math.round(mean(priorWeek));
  const delta      = weeklyAvg - priorAvg;

  // Score: delta mapped to -100..+100 (cap at ±20 pts change)
  const score      = Math.round(Math.max(-100, Math.min(100, delta * 5)));

  const direction: MomentumDirection =
    delta > 4 ? "building"
    : delta < -4 ? "fading"
    : "stable";

  const description =
    direction === "building" ? `Weekly capacity up ${delta} pts — momentum is building.`
    : direction === "fading"  ? `Weekly capacity down ${Math.abs(delta)} pts — recovery focus recommended.`
    : `Capacity stable week-over-week (avg ${weeklyAvg}/100).`;

  return { score, direction, weeklyAvg, priorWeekAvg: priorAvg, delta, description, dataReady: true };
}
