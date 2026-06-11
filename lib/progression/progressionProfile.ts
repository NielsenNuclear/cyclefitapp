// ─── lib/progression/progressionProfile.ts ───────────────────────────────────
// Adaptive progression profile engine.
// Pure logic only — no localStorage, no React, no side effects.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { TrainingLoadReport }  from "@/lib/analytics/trainingLoad";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkloadTrendLower = "increasing" | "stable" | "decreasing";
export type RecommendedAction  = "progress" | "maintain" | "reduce" | "deload";

export interface ProgressionProfile {
  adherenceScore:    number;          // 0–100: completed/partial/skipped ratio over 28 days
  recoveryScore:     number;          // 0–100: recovery status + workload + recent energy
  progressionScore:  number;          // 0–100: weighted composite of adherence + quality + recovery
  workloadTrend:     WorkloadTrendLower;
  recommendedAction: RecommendedAction;
  confidence:        number;          // 0–1: data quality — rises with completed workout count
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WINDOW_DAYS = 28;
const MIN_CONFIDENCE_TO_ACT = 0.35;   // below this, always "maintain"

// ─── Date utilities ───────────────────────────────────────────────────────────

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Adherence Score (0–100) ──────────────────────────────────────────────────
// Weighted: completed = 1.0, partially_completed = 0.5, skipped = 0.
// Measured over the 28-day rolling window.

function calcAdherenceScore(history: WorkoutHistoryEntry[]): number {
  const cutoff   = daysAgoStr(WINDOW_DAYS);
  const today    = todayStr();
  const inWindow = history.filter(
    e => e.id >= cutoff && e.id <= today && e.status !== "pending"
  );
  if (inWindow.length === 0) return 0;

  const weighted = inWindow.reduce((sum, e) => {
    if (e.status === "completed")           return sum + 1.0;
    if (e.status === "partially_completed") return sum + 0.5;
    return sum; // skipped → 0
  }, 0);

  return Math.round((weighted / inWindow.length) * 100);
}

// ─── Recovery Score (0–100) ───────────────────────────────────────────────────
// Base from recovery status tier, adjusted by workload trend and average
// session energy level over the last 14 days.

const RECOVERY_STATUS_BASE: Record<string, number> = {
  "Recovered":        90,
  "Normal":           70,
  "Elevated Fatigue": 45,
  "High Fatigue":     20,
};

function calcRecoveryScore(
  loadReport: TrainingLoadReport,
  history:    WorkoutHistoryEntry[],
): number {
  let score = RECOVERY_STATUS_BASE[loadReport.recoveryStatus] ?? 60;

  // Workload trend: decreasing load → improving recovery; increasing → accumulating
  if (loadReport.workloadTrend === "Decreasing") score += 10;
  if (loadReport.workloadTrend === "Increasing") score -= 10;

  // Average energyLevel at completed sessions over last 14 days
  const cutoff14  = daysAgoStr(14);
  const today     = todayStr();
  const recent    = history.filter(
    e => e.id >= cutoff14 && e.id <= today &&
    (e.status === "completed" || e.status === "partially_completed")
  );
  if (recent.length > 0) {
    const avgEnergy = recent.reduce((s, e) => s + e.energyLevel, 0) / recent.length;
    // avgEnergy 0–4 maps to adjustment −15 → +15 (midpoint 2 = 0)
    score += Math.round((avgEnergy - 2) * 7.5);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Completion Quality (0–100) ───────────────────────────────────────────────
// Of the sessions that were "done" (completed or partial), what fraction were
// fully completed? Neutral (50) when there is no history to assess.

function calcCompletionQuality(history: WorkoutHistoryEntry[]): number {
  const cutoff = daysAgoStr(WINDOW_DAYS);
  const today  = todayStr();
  const done   = history.filter(
    e => e.id >= cutoff && e.id <= today &&
    (e.status === "completed" || e.status === "partially_completed")
  );
  if (done.length === 0) return 50;
  const full = done.filter(e => e.status === "completed").length;
  return Math.round((full / done.length) * 100);
}

// ─── Progression Score (0–100) ────────────────────────────────────────────────
// Weighted composite:
//   45% adherence  (showing up and completing sessions)
//   25% quality    (fully completed vs. partial)
//   30% recovery   (physiological readiness trend)

function calcProgressionScore(
  adherenceScore:   number,
  completionQuality: number,
  recoveryScore:    number,
): number {
  const raw = adherenceScore * 0.45 + completionQuality * 0.25 + recoveryScore * 0.30;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ─── Confidence (0–1) ─────────────────────────────────────────────────────────
// Rises with total completed/partially-completed workout count across all history.
// Low confidence suppresses strong recommendations regardless of scores.

function calcConfidence(history: WorkoutHistoryEntry[]): number {
  const n = history.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  ).length;

  if (n === 0)   return 0.00;
  if (n <= 2)    return 0.10;
  if (n <= 5)    return 0.20;
  if (n <= 9)    return 0.40;
  if (n <= 14)   return 0.55;
  if (n <= 21)   return 0.70;
  if (n <= 28)   return 0.80;
  if (n <= 41)   return 0.87;
  if (n <= 55)   return 0.92;
  return 0.95;
}

// ─── Workload trend mapping ───────────────────────────────────────────────────
// TrainingLoadReport uses title-case; ProgressionProfile uses lower-case.

function mapTrend(trend: TrainingLoadReport["workloadTrend"]): WorkloadTrendLower {
  return trend.toLowerCase() as WorkloadTrendLower;
}

// ─── Recommended Action ───────────────────────────────────────────────────────

function calcRecommendedAction(
  adherenceScore: number,
  recoveryScore:  number,
  confidence:     number,
  loadReport:     TrainingLoadReport,
): RecommendedAction {
  // Insufficient data: never make a strong call
  if (confidence < MIN_CONFIDENCE_TO_ACT) return "maintain";

  const { recoveryStatus, workloadTrend } = loadReport;

  // Deload: severe physiological fatigue signals
  if (
    recoveryStatus === "High Fatigue" ||
    (recoveryStatus === "Elevated Fatigue" && workloadTrend === "Increasing")
  ) return "deload";

  // Reduce: poor adherence or recovery state
  if (adherenceScore < 50 || recoveryScore < 40) return "reduce";

  // Progress: high adherence + good recovery + confidence threshold met
  if (adherenceScore > 85 && recoveryScore > 75 && confidence >= 0.40) return "progress";

  return "maintain";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildProgressionProfile(
  history:    WorkoutHistoryEntry[],
  loadReport: TrainingLoadReport,
): ProgressionProfile {
  const adherenceScore    = calcAdherenceScore(history);
  const recoveryScore     = calcRecoveryScore(loadReport, history);
  const completionQuality = calcCompletionQuality(history);
  const progressionScore  = calcProgressionScore(adherenceScore, completionQuality, recoveryScore);
  const confidence        = calcConfidence(history);
  const workloadTrend     = mapTrend(loadReport.workloadTrend);
  const recommendedAction = calcRecommendedAction(
    adherenceScore, recoveryScore, confidence, loadReport
  );

  return {
    adherenceScore,
    recoveryScore,
    progressionScore,
    workloadTrend,
    recommendedAction,
    confidence,
  };
}
