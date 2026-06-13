// ─── lib/coaching/coachView.ts ────────────────────────────────────────────────
// Synthesises all learning signals into a single coaching narrative.
// Pure function — culmination of Phases 14, 15, and 16.

import type { DailyRecommendation } from "@/types/recommendation";
import type { WeeklyPlan } from "@/lib/planning/weeklyPlanner";
import type { TrainingBlock } from "@/lib/planning/trainingBlocks";
import type { OverloadRecommendation } from "@/lib/progression/progressiveOverload";
import type { DeloadRecommendation } from "@/lib/recovery/deloadDetection";
import type { RecoveryCapacity } from "@/lib/adaptive/recoveryCapacity";
import type { CoachingMemoryItem } from "@/lib/adaptive/coachingMemory";
import type { AccuracyReport } from "@/lib/adaptive/readinessValidation";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import type { CoachingAdjustment } from "@/lib/progression/progressionRules";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachView {
  headline:  string;
  actions:   string[];   // 2–4 bullet points
  reasoning: string;     // 1–2 sentence explanation
}

export interface CoachViewInput {
  recommendation:     DailyRecommendation;
  weeklyPlan:         WeeklyPlan;
  trainingBlock:      TrainingBlock;
  overloadRec:        OverloadRecommendation;
  deloadRec:          DeloadRecommendation;
  recoveryCapacity:   RecoveryCapacity;
  coachingMemory:     CoachingMemoryItem[];
  accuracyReport:     AccuracyReport;
  exerciseSummaries:  ExerciseProgressSummary[];
  coachingAdjustment?: CoachingAdjustment;
  goalType?:           GoalType;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildCoachView(input: CoachViewInput): CoachView {
  const {
    recommendation,
    weeklyPlan,
    trainingBlock,
    overloadRec,
    deloadRec,
    recoveryCapacity,
    coachingMemory,
    accuracyReport,
    exerciseSummaries,
    coachingAdjustment,
    goalType,
  } = input;

  const badge      = recommendation.training.badge;
  const topMemory  = coachingMemory.find(m => m.confidence === "established")
                  ?? coachingMemory.find(m => m.confidence === "growing")
                  ?? null;
  const isPushing  = coachingAdjustment?.action === "progress";

  // ── Headline — highest-priority signal wins ───────────────────────────────────
  let headline: string;

  if (deloadRec.needed && deloadRec.confidence >= 0.75) {
    headline = "Recovery is falling behind — a lighter week will serve you better right now.";
  } else if (badge === "Recover") {
    headline = "Your body needs rest. Recovery is the training right now.";
  } else if (badge === "Watch") {
    headline = "Train with intention, not intensity. Signals call for caution this week.";
  } else if (overloadRec.decision === "increase" && recoveryCapacity.level === "high") {
    headline = "You're adapting well. It's time to push the training forward.";
  } else if (isPushing && goalType === "hypertrophy") {
    headline = "You're adapting well. Volume is increasing to drive hypertrophy.";
  } else if (isPushing && goalType === "strength") {
    headline = "Consistency is building strength. Time to push heavier this week.";
  } else if (isPushing) {
    headline = "You're in a strong window. Progressive overload is being applied this week.";
  } else if (badge === "Push" && recoveryCapacity.level !== "low") {
    headline = "You're in a strong training window. Make the most of it.";
  } else if (trainingBlock.currentWeek === 1) {
    headline = `Starting Week 1 of your ${trainingBlock.primaryGoal} Block — build your momentum.`;
  } else if (trainingBlock.currentWeek >= trainingBlock.totalWeeks) {
    headline = "Final week of your training block. Finish strong, then recover.";
  } else if (topMemory && topMemory.confidence === "established") {
    headline = "Axis has built a clear picture of how you train and recover.";
  } else {
    headline = "Here's what matters most for your training right now.";
  }

  // ── Actions — 2–4 concrete items ─────────────────────────────────────────────
  const actions: string[] = [];

  if (deloadRec.needed) {
    const reducedSessions = Math.max(1, weeklyPlan.targetSessions - 1);
    actions.push(`Target ${reducedSessions} session${reducedSessions !== 1 ? "s" : ""} this week — drop volume by 40–50%`);
    actions.push("Keep all sessions light to moderate — no new personal records this week");
    actions.push("Prioritise sleep, nutrition, and active recovery");
  } else {
    actions.push(overloadRec.suggestion);
    actions.push(
      `Aim for ${weeklyPlan.targetSessions} session${weeklyPlan.targetSessions !== 1 ? "s" : ""} this week at ${weeklyPlan.plannedIntensity} intensity`
    );

    // Exercise-specific coaching — one item, priority: regressing > stalled > progressing > declining RPE
    const regressing  = exerciseSummaries.filter(s => s.progressionStatus === "regressing");
    const stalled     = exerciseSummaries.filter(s => s.progressionStatus === "stalled");
    const progressing = exerciseSummaries.filter(s => s.progressionStatus === "progressing");
    const declining   = exerciseSummaries.find(s => s.trend === "declining");

    if (regressing.length > 0) {
      const names = regressing.slice(0, 2).map(s => s.exerciseName).join(" and ");
      const verb  = regressing.length > 1 ? "have" : "has";
      actions.push(`${names} ${verb} been frequently skipped and ${regressing.length > 1 ? "were" : "was"} rotated today — same movement pattern, lower barrier`);
    } else if (stalled.length > 0) {
      actions.push(`${stalled[0].exerciseName} has plateaued — try a small load increase or rep range shift next session`);
    } else if (progressing.length >= 2) {
      const names = progressing.slice(0, 2).map(s => s.exerciseName).join(" and ");
      actions.push(`${names} are progressing consistently — completion rates are strong on these lifts`);
    } else if (declining) {
      actions.push(`Monitor ${declining.exerciseName} — effort has been rising without a load increase`);
    }

    if (badge === "Watch" || badge === "Recover") {
      actions.push("Reduce session intensity and prioritise recovery time between sessions");
    }
  }

  // ── Reasoning — most informative signal available ────────────────────────────
  let reasoning: string;

  if (topMemory) {
    reasoning = topMemory.observation;
  } else if (accuracyReport.totalSamples >= 5 && accuracyReport.lifetime >= 0.75) {
    const pct = Math.round(accuracyReport.lifetime * 100);
    reasoning = `Axis has been ${pct}% accurate on readiness predictions — these recommendations reflect your actual patterns.`;
  } else if (isPushing && coachingAdjustment.rationale) {
    reasoning = coachingAdjustment.rationale;
  } else if (recoveryCapacity.level !== "moderate" && recoveryCapacity.confidence !== "early") {
    reasoning = `Your recovery capacity is ${recoveryCapacity.level}: ${recoveryCapacity.rationale}`;
  } else {
    reasoning = `Based on Week ${trainingBlock.currentWeek} of ${trainingBlock.totalWeeks} in your ${trainingBlock.primaryGoal} Block and your recent performance signals.`;
  }

  return { headline, actions: actions.slice(0, 4), reasoning };
}
