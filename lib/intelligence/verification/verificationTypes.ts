// ─── lib/intelligence/verification/verificationTypes.ts ───────────────────────
// Phase 64 — Recommendation Verification Framework
// Types for recording recommendations, capturing athlete state snapshots,
// evaluating outcomes, and scoring verification results.

// ── Verification score (qualitative, not binary) ──────────────────────────────

export type VerificationScore =
  | "successful"
  | "partially_successful"
  | "neutral"
  | "unsuccessful"
  | "insufficient_data";

export type RecommendationClass =
  | "volume_increase"
  | "volume_decrease"
  | "volume_maintain"
  | "deload"
  | "recovery_focus"
  | "intensity_up"
  | "intensity_down"
  | "workout_type_change";

// ── Athlete state at the moment a recommendation is generated ─────────────────

export interface AthleteStateSnapshot {
  readinessScore:   number;       // 0–100
  recoveryScore:    number;       // 0–100
  cyclePhase:       string;
  cycleDay:         number | null;
  adherenceRate:    number;       // 0–1, trailing 14 days
  weeklyVolumeSets: number;
  streakDays:       number;
  fatigueEstimate:  number;       // 0–100
  timestamp:        string;       // YYYY-MM-DD
}

// ── What the recommendation predicted would happen ────────────────────────────

export interface ExpectedOutcome {
  readinessDelta:   number;    // positive = improvement expected
  recoveryDelta:    number;
  adherenceTarget:  number;   // 0–1, target completion rate
  rationale:        string;
  horizonDays:      number;   // evaluation window
}

// ── What actually happened after the window expired ───────────────────────────

export interface ActualOutcome {
  readinessMean:     number | null;   // mean during evaluation window
  recoveryMean:      number | null;
  completionRate:    number | null;   // 0–1
  adherenceDelta:    number | null;   // vs same-length prior window
  workoutsCompleted: number;
  samplesCollected:  number;
  evaluationDate:    string;
}

// ── Full verification record ──────────────────────────────────────────────────

export interface VerificationRecord {
  id:                      string;
  recommendationId:        string;   // ties back to effectiveness registry
  timestamp:               string;   // YYYY-MM-DD when recommendation was made
  evaluationDueDate:       string;   // YYYY-MM-DD
  recommendationClass:     RecommendationClass;
  recommendationSummary:   string;
  supportingSignals:       string[];
  expectedOutcome:         ExpectedOutcome;
  athleteState:            AthleteStateSnapshot;
  algorithmVersion:        string;
  confidenceAtGeneration:  number;   // 0–1
  evaluated:               boolean;
  actualOutcome?:          ActualOutcome;
  verificationScore?:      VerificationScore;
  scoreRationale?:         string;
}

// ── Aggregate summary ─────────────────────────────────────────────────────────

export interface VerificationSummary {
  totalRecords:         number;
  pendingEvaluations:   number;
  completedEvaluations: number;
  scoreDistribution:    Record<VerificationScore, number>;
  overallSuccessRate:   number;   // (successful + partially_successful) / completed
  dataReady:            boolean;
}
