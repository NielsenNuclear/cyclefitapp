// ─── lib/unified/recoverySufficiency.ts ──────────────────────────────────────
// 44E — Recovery Sufficiency
// Answers: "Can my current recovery capacity sustain my current training load?"
// Compares recovery score vs fatigue accumulation to detect over/under-training.

// ─── Types ────────────────────────────────────────────────────────────────────

export type SufficiencyStatus =
  | "over_trained"
  | "strained"
  | "balanced"
  | "under_engaged";

export interface RecoverySufficiency {
  isSufficient:     boolean;
  score:            number;            // 0–100 (100 = perfectly balanced)
  status:           SufficiencyStatus;
  recoveryCoverage: number;            // recovery score / fatigue score ratio (clamped 0–2)
  message:          string;
  recommendation:   string;
  dataReady:        boolean;
}

// ─── Status maps ──────────────────────────────────────────────────────────────

const STATUS_MESSAGE: Record<SufficiencyStatus, string> = {
  over_trained:   "Recovery cannot keep pace with current training load.",
  strained:       "Recovery is stretched — you're near your limit.",
  balanced:       "Recovery is sufficient to support current training.",
  under_engaged:  "Recovery capacity exceeds training demand — room to push.",
};

const STATUS_RECOMMENDATION: Record<SufficiencyStatus, string> = {
  over_trained:   "Reduce volume or intensity for 3–5 days and prioritise sleep and nutrition.",
  strained:       "Protect your recovery sessions; avoid adding new training stress this week.",
  balanced:       "Maintain current training rhythm — your body is adapting well.",
  under_engaged:  "Consider adding a session or increasing intensity to capitalise on recovery surplus.",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function assessRecoverySufficiency(
  recoveryScore:    number,   // 0–100 (Phase 21 score)
  fatigueScore:     number,   // 0–100 (higher = more fatigued)
  consistencyScore: number,   // 0–100
  trainingLoadScore: number,  // 0–100 contributor (higher = higher load)
): RecoverySufficiency {
  if (recoveryScore === 0 && fatigueScore === 0) {
    return {
      isSufficient: true, score: 50, status: "balanced", recoveryCoverage: 1,
      message: STATUS_MESSAGE.balanced, recommendation: STATUS_RECOMMENDATION.balanced,
      dataReady: false,
    };
  }

  // Effective training demand (fatigue + load signal, weighted)
  const demand = Math.round(fatigueScore * 0.6 + trainingLoadScore * 0.4);

  // Coverage ratio: how well recovery meets demand
  // >1 = surplus, <1 = deficit
  const raw      = demand > 0 ? recoveryScore / demand : 1.5;
  const coverage = Math.min(2, Math.max(0, Math.round(raw * 100) / 100));

  // Sufficiency score (50 = neutral, 100 = ideal surplus, 0 = severe deficit)
  const rawScore = Math.round(coverage * 50);
  const score    = Math.max(0, Math.min(100, rawScore));

  const status: SufficiencyStatus =
    coverage < 0.60 ? "over_trained"
    : coverage < 0.85 ? "strained"
    : coverage > 1.30 ? "under_engaged"
    : "balanced";

  return {
    isSufficient:     status === "balanced" || status === "under_engaged",
    score,
    status,
    recoveryCoverage: coverage,
    message:          STATUS_MESSAGE[status],
    recommendation:   STATUS_RECOMMENDATION[status],
    dataReady:        true,
  };
}
