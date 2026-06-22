// ─── lib/unified/trajectoryEngine.ts ─────────────────────────────────────────
// 44C — Trajectory Engine
// Monthly view of goal attainment. Answers: "Am I on the right long-term path?"

import type { GoalVelocity } from "@/lib/performance/goalVelocity";
import { getCapacityHistory } from "./capacityScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrajectoryStatus =
  | "ahead_of_pace"
  | "on_pace"
  | "slightly_behind"
  | "significantly_behind"
  | "insufficient_data";

export interface TrajectoryScore {
  status:              TrajectoryStatus;
  currentVelocity:     number;     // weeklyRatePercent
  requiredVelocity:    number;     // what's needed to hit goal on time
  monthlyCapacityAvg:  number;     // avg capacity score over last 30 days
  projectedEtaWeeks:   number | null;
  onTrack:             boolean;
  message:             string;
  dataReady:           boolean;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeTrajectoryScore(velocity: GoalVelocity): TrajectoryScore {
  const history = getCapacityHistory(30);
  const EMPTY: TrajectoryScore = {
    status: "insufficient_data", currentVelocity: 0, requiredVelocity: 0,
    monthlyCapacityAvg: 0, projectedEtaWeeks: null, onTrack: false,
    message: "Not enough data yet.", dataReady: false,
  };

  if (history.length < 7) return EMPTY;

  const monthlyCapacityAvg = Math.round(
    history.reduce((s, e) => s + e.score, 0) / history.length,
  );

  const currentVelocity  = velocity.weeklyRatePercent;
  const requiredVelocity = velocity.etaWeeks !== null && velocity.etaWeeks > 0
    ? velocity.targetPercent / velocity.etaWeeks
    : 0.5;

  const ratio  = requiredVelocity > 0 ? currentVelocity / requiredVelocity : 1;

  const status: TrajectoryStatus =
    ratio >= 1.15 ? "ahead_of_pace"
    : ratio >= 0.90 ? "on_pace"
    : ratio >= 0.65 ? "slightly_behind"
    : "significantly_behind";

  const message: Record<TrajectoryStatus, string> = {
    ahead_of_pace:        `You're progressing ${Math.round((ratio - 1) * 100)}% faster than needed — exceptional.`,
    on_pace:              `You're on pace to hit your goal${velocity.etaWeeks ? ` in ~${velocity.etaWeeks}w` : ""}.`,
    slightly_behind:      "Progress is slightly behind target — one focused week can close the gap.",
    significantly_behind: "You're behind target pace. Focus on the highest-leverage behavior first.",
    insufficient_data:    "Track more sessions to see your trajectory.",
  };

  return {
    status,
    currentVelocity,
    requiredVelocity:   Math.round(requiredVelocity * 100) / 100,
    monthlyCapacityAvg,
    projectedEtaWeeks:  velocity.etaWeeks,
    onTrack:            status === "ahead_of_pace" || status === "on_pace",
    message:            message[status],
    dataReady:          true,
  };
}
