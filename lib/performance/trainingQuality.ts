// ─── lib/performance/trainingQuality.ts ──────────────────────────────────────
// Phase 36F — Training quality score.
// Evaluates how well planned vs actual volume aligns, and RPE execution quality.

import { getWorkoutLog } from "@/lib/workoutExecution/workoutLogging";
import { getMaturityStage, type MaturityStage } from "@/lib/intelligence/dataMaturity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingQualityTier = "Poor" | "Fair" | "Good" | "Excellent";

export interface TrainingQualityBreakdown {
  completionRate:     number;   // 0–100: sessions completed / planned
  volumeAccuracy:     number;   // 0–100: actual sets / prescribed sets
  rpeAccuracy:        number;   // 0–100: (1 - mean RPE deviation / 3) × 100
  consistencyScore:   number;   // 0–100: regularity over the window
}

export interface TrainingQualityScore {
  score:     number;             // 0–100 composite
  tier:      TrainingQualityTier;
  breakdown: TrainingQualityBreakdown;
  insight:   string;
  sessionsAnalysed: number;
  // UX Stabilization Batch 9 — computed here, not by the card.
  maturityStage: MaturityStage;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tier(score: number): TrainingQualityTier {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

function insight(t: TrainingQualityTier, breakdown: TrainingQualityBreakdown): string {
  if (t === "Excellent") return "Your execution quality is exceptional — sessions are consistent, volume is on target, and effort is well-calibrated.";
  if (t === "Good") {
    if (breakdown.rpeAccuracy < 60) return "Good consistency overall. Focus on dialling in your effort levels — RPE accuracy has room to improve.";
    if (breakdown.completionRate < 70) return "Solid quality when you train. Increasing session frequency will amplify your results.";
    return "Solid training quality. Small consistency gains will push you into Excellent.";
  }
  if (t === "Fair") {
    if (breakdown.completionRate < 50) return "Low session completion rate is the main limiter. Even shorter sessions count — aim to show up more.";
    return "Quality is building. Match your planned sets more closely and calibrate effort to prescribed RPE.";
  }
  return "Start by completing at least 2 sessions per week consistently — everything else will follow.";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeTrainingQuality(lookbackDays = 30): TrainingQualityScore {
  const log     = getWorkoutLog();
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = log.filter(w => w.date >= cutoffStr);

  if (recent.length === 0) {
    return {
      score: 0, tier: "Poor",
      breakdown: { completionRate: 0, volumeAccuracy: 0, rpeAccuracy: 0, consistencyScore: 0 },
      insight: "No workout data yet. Start logging sessions to track training quality.",
      sessionsAnalysed: 0,
      maturityStage: getMaturityStage(0),
    };
  }

  const completed = recent.filter(w => w.completionStatus !== "skipped");

  // Completion rate (40% weight)
  const completionRate = Math.round((completed.length / recent.length) * 100);

  // Volume accuracy: actual vs prescribed sets (30% weight)
  let totalPrescribed = 0;
  let totalActual     = 0;
  for (const w of completed) {
    for (const ex of w.exercises) {
      totalPrescribed += ex.prescribedSets;
      totalActual     += ex.completedSets;
    }
  }
  const volumeAccuracy = totalPrescribed > 0
    ? Math.min(100, Math.round((totalActual / totalPrescribed) * 100))
    : 100;

  // RPE accuracy: mean |actual - prescribed| deviation (30% weight)
  const rpeDeviations: number[] = [];
  for (const w of completed) {
    for (const ex of w.exercises) {
      if (ex.prescribedRPE > 0 && ex.actualRPE > 0) {
        rpeDeviations.push(Math.abs(ex.actualRPE - ex.prescribedRPE));
      }
    }
  }
  const meanDeviation = rpeDeviations.length > 0
    ? rpeDeviations.reduce((s, d) => s + d, 0) / rpeDeviations.length
    : 0;
  const rpeAccuracy = rpeDeviations.length > 0
    ? Math.max(0, Math.round((1 - meanDeviation / 3) * 100))
    : 100;

  // Consistency: sessions per week regularity
  const weeksInWindow = Math.max(1, lookbackDays / 7);
  const sessionsPerWeek = completed.length / weeksInWindow;
  const consistencyScore = Math.min(100, Math.round((sessionsPerWeek / 4) * 100));

  const breakdown: TrainingQualityBreakdown = {
    completionRate,
    volumeAccuracy,
    rpeAccuracy,
    consistencyScore,
  };

  const score = Math.round(
    completionRate  * 0.40 +
    volumeAccuracy  * 0.30 +
    rpeAccuracy     * 0.30,
  );

  const t = tier(score);

  return {
    score,
    tier: t,
    breakdown,
    insight: insight(t, breakdown),
    sessionsAnalysed: recent.length,
    maturityStage: getMaturityStage(recent.length),
  };
}
