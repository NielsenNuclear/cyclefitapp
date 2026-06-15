// ─── lib/adaptive/recoveryCapacity.ts ────────────────────────────────────────
// Estimates how much training load the user can sustainably tolerate.
// Pure function — callers pass all data in; no localStorage reads here.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { WorkoutFeedback } from "@/lib/workoutExecution/feedback";
import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { RecoveryResponsePattern } from "@/lib/adaptive/recoveryLearning";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapacityLevel = "low" | "moderate" | "high";

export interface CapacityWindow {
  level: CapacityLevel;
  score: number;
}

export interface RecoveryCapacity {
  level:           CapacityLevel;
  score:           number;                              // 0–100 internal composite
  confidence:      "early" | "growing" | "established";
  rationale:       string;
  dataPoints:      number;                              // feedback entries used
  // Phase 25D: timescale breakdown — reveals whether the user recovers well
  // day-to-day but accumulates fatigue over 4 weeks, or vice versa.
  acuteCapacity?:  CapacityWindow;    // last 7 days
  weeklyCapacity?: CapacityWindow;    // 7–28 days
}

export interface RecoveryCapacityInput {
  recentHistory:    WorkoutHistoryEntry[];         // last 30 days
  recentFeedback:   WorkoutFeedback[];             // last 30 days
  recentSymptoms:   SymptomEntry[];                // last 30 days
  recoveryPatterns: RecoveryResponsePattern[];     // from Phase 15E
  today?:           string;                        // YYYY-MM-DD — defaults to now
}

// ─── Scoring constants ────────────────────────────────────────────────────────
// Four independent signals, max total = 100.

const RECOVERY_SCORE_MAP: Record<WorkoutFeedback["recoveryRating"], number> = {
  fully_recovered:      100,
  slight_fatigue:        67,
  moderate_fatigue:      33,
  significant_fatigue:    0,
};

function mean(values: number[]): number {
  if (values.length === 0) return -1;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Signal scorers ───────────────────────────────────────────────────────────

function scoreRecoveryRating(feedback: WorkoutFeedback[]): { pts: number; note: string } {
  const avg = mean(feedback.map(f => RECOVERY_SCORE_MAP[f.recoveryRating]));
  if (avg === -1) return { pts: 15, note: "" };  // neutral: no data
  if (avg >= 70)  return { pts: 30, note: "recovering well between sessions" };
  if (avg >= 45)  return { pts: 20, note: "moderate recovery between sessions" };
  return             { pts: 10, note: "slow recovery between sessions" };
}

function scoreCompliance(history: WorkoutHistoryEntry[]): { pts: number; note: string } {
  const nonPending = history.filter(e => e.status !== "pending");
  if (nonPending.length < 3) return { pts: 15, note: "" };
  const completed = nonPending.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  ).length;
  const rate = completed / nonPending.length;
  if (rate >= 0.80) return { pts: 30, note: `${Math.round(rate * 100)}% workout completion` };
  if (rate >= 0.60) return { pts: 20, note: `${Math.round(rate * 100)}% workout completion` };
  return              { pts: 10, note: `low completion rate (${Math.round(rate * 100)}%)` };
}

function scoreSymptomBurden(symptoms: SymptomEntry[], daysSpan: number): { pts: number; note: string } {
  if (symptoms.length === 0) return { pts: 12, note: "" };
  const totalBurden = symptoms.reduce((s, e) => s + e.severity, 0);
  const weeksSpan   = Math.max(1, daysSpan / 7);
  const weeklyAvg   = totalBurden / weeksSpan;
  if (weeklyAvg < 4)  return { pts: 25, note: "low symptom burden" };
  if (weeklyAvg < 8)  return { pts: 15, note: "moderate symptom burden" };
  return               { pts:  5, note: "high symptom burden" };
}

function scorePatternConsistency(patterns: RecoveryResponsePattern[]): { pts: number; note: string } {
  if (patterns.length === 0) return { pts: 10, note: "" };
  const meanDeviation = mean(patterns.map(p => Math.abs(p.deviation)));
  if (meanDeviation < 10)  return { pts: 15, note: "predictable recovery response" };
  if (meanDeviation < 20)  return { pts: 10, note: "somewhat variable recovery" };
  return                    { pts:  5, note: "highly variable recovery response" };
}

// ─── Main export ──────────────────────────────────────────────────────────────

function computeWindowScore(
  feedback:  WorkoutFeedback[],
  history:   WorkoutHistoryEntry[],
  symptoms:  SymptomEntry[],
  daysSpan:  number,
  patterns:  RecoveryResponsePattern[],
): { score: number; level: CapacityLevel } {
  const s1 = scoreRecoveryRating(feedback);
  const s2 = scoreCompliance(history);
  const s3 = scoreSymptomBurden(symptoms, daysSpan);
  const s4 = scorePatternConsistency(patterns);
  const score = s1.pts + s2.pts + s3.pts + s4.pts;
  const level: CapacityLevel = score >= 65 ? "high" : score >= 40 ? "moderate" : "low";
  return { score, level };
}

export function computeRecoveryCapacity(input: RecoveryCapacityInput): RecoveryCapacity {
  const { recentHistory, recentFeedback, recentSymptoms, recoveryPatterns } = input;

  const dataPoints = recentFeedback.length;

  const s1 = scoreRecoveryRating(recentFeedback);
  const s2 = scoreCompliance(recentHistory);
  const s3 = scoreSymptomBurden(recentSymptoms, 30);
  const s4 = scorePatternConsistency(recoveryPatterns);

  const score: number = s1.pts + s2.pts + s3.pts + s4.pts;

  const level: CapacityLevel =
    score >= 65 ? "high" :
    score >= 40 ? "moderate" :
    "low";

  const confidence: RecoveryCapacity["confidence"] =
    dataPoints >= 15 ? "established" :
    dataPoints >= 7  ? "growing" :
    "early";

  const notes = [s1.note, s2.note, s3.note, s4.note].filter(Boolean);
  const rationale = notes.length > 0
    ? notes.join("; ") + "."
    : "Insufficient data to fully characterise your capacity yet.";

  // Phase 25D: compute acute (last 7 days) and weekly (7–28 days) sub-capacities
  let acuteCapacity:  CapacityWindow | undefined;
  let weeklyCapacity: CapacityWindow | undefined;

  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const sevenAgo = (() => {
    const d = new Date(today); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  const acuteFeedback  = recentFeedback.filter(f => f.date >= sevenAgo);
  const acuteHistory   = recentHistory.filter(h => h.id  >= sevenAgo);
  const acuteSymptoms  = recentSymptoms.filter(s => s.date >= sevenAgo);
  const weeklyFeedback = recentFeedback.filter(f => f.date  < sevenAgo);
  const weeklyHistory  = recentHistory.filter(h => h.id   < sevenAgo);
  const weeklySymptoms = recentSymptoms.filter(s => s.date < sevenAgo);

  if (acuteFeedback.length >= 2 || acuteHistory.length >= 3) {
    acuteCapacity = computeWindowScore(acuteFeedback, acuteHistory, acuteSymptoms, 7, recoveryPatterns);
  }
  if (weeklyFeedback.length >= 2 || weeklyHistory.length >= 3) {
    weeklyCapacity = computeWindowScore(weeklyFeedback, weeklyHistory, weeklySymptoms, 21, recoveryPatterns);
  }

  return { level, score, confidence, rationale, dataPoints, acuteCapacity, weeklyCapacity };
}
