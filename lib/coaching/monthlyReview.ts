// ─── lib/coaching/monthlyReview.ts ────────────────────────────────────────────
// Computes a monthly coaching summary: top insight, trajectory grade, momentum.
// Pure function — all inputs passed in; no localStorage reads.

import type { GoalProgress }    from "@/lib/goals/goalProgress";
import type { GoalType }        from "@/lib/exercises/goalBasedSelection";
import type { WorkoutHistoryEntry } from "./weeklyReview";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrajectoryGrade = "A" | "B" | "C" | "D";

export interface MonthlyReview {
  monthNumber:    number;       // months since first session
  topInsight:     string;       // most impactful observation
  grade:          TrajectoryGrade;
  gradeRationale: string;
  sessionCount:   number;       // sessions in the last 28 days
  targetSessions: number;       // 4 × weekly target
  bestStreak:     number;       // longest weekly completion streak
  momentum:       "building" | "steady" | "fading";
  isAvailable:    boolean;      // false when < 28 days of history
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function done(h: WorkoutHistoryEntry): boolean {
  return h.status === "completed" || h.status === "partially_completed";
}

function computeWeeklyStreaks(history: WorkoutHistoryEntry[], targetSessions: number): number {
  // Count consecutive weeks where sessionCount >= targetSessions
  let bestStreak = 0;
  let streak     = 0;
  for (let w = 0; w < 8; w++) {
    const end   = daysAgoStr(w * 7);
    const start = daysAgoStr((w + 1) * 7);
    const count = history.filter(h => h.id >= start && h.id < end && done(h)).length;
    if (count >= targetSessions) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }
  return bestStreak;
}

function gradeFromRate(rate: number): TrajectoryGrade {
  if (rate >= 0.90) return "A";
  if (rate >= 0.75) return "B";
  if (rate >= 0.55) return "C";
  return "D";
}

function buildTopInsight(
  completionRate: number,
  goalProgress:   GoalProgress | undefined,
  goalType:       GoalType,
  bestStreak:     number,
): string {
  if (goalProgress?.isComplete) {
    return `You reached your ${goalType.replace("_", " ")} goal this month — a significant achievement.`;
  }
  if (completionRate >= 0.90) {
    return `Near-perfect consistency this month (${Math.round(completionRate * 100)}%). This is the foundation of long-term progress.`;
  }
  if (bestStreak >= 3) {
    return `Your ${bestStreak}-week consistency streak is a strong signal — keep protecting your schedule.`;
  }
  if (goalProgress && goalProgress.percentComplete > 50) {
    return `Over halfway to your ${goalType.replace("_", " ")} goal (${Math.round(goalProgress.percentComplete)}%). You're in the compound-interest phase.`;
  }
  if (completionRate < 0.50) {
    return "Consistency was the main challenge this month. Even 2 sessions per week compounds significantly over 3 months.";
  }
  return `${Math.round(completionRate * 100)}% session completion this month — solid foundation for next month.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeMonthlyReview(input: {
  history:        WorkoutHistoryEntry[];
  targetSessions: number;
  goalType:       GoalType;
  goalProgress?:  GoalProgress;
}): MonthlyReview {
  const { history, targetSessions, goalType, goalProgress } = input;

  const monthStart     = daysAgoStr(28);
  const totalDays      = new Set(history.map(h => h.id)).size;
  const firstDate      = [...history].sort((a, b) => a.id.localeCompare(b.id))[0]?.id;
  const elapsedMs      = firstDate ? Date.now() - new Date(firstDate).getTime() : 0;
  const monthNumber    = Math.max(1, Math.round(elapsedMs / (28 * 24 * 60 * 60 * 1000)));

  if (totalDays < 28) {
    return {
      monthNumber: 1, topInsight: "Build your first full month to unlock your monthly review.",
      grade: "C", gradeRationale: "Insufficient data for grading.",
      sessionCount: 0, targetSessions: targetSessions * 4, bestStreak: 0,
      momentum: "building", isAvailable: false,
    };
  }

  const monthHistory   = history.filter(h => h.id >= monthStart);
  const sessionCount   = monthHistory.filter(done).length;
  const targetMonthly  = targetSessions * 4;
  const completionRate = Math.min(1, sessionCount / Math.max(1, targetMonthly));

  const bestStreak     = computeWeeklyStreaks(history, targetSessions);
  const grade          = gradeFromRate(completionRate);
  const topInsight     = buildTopInsight(completionRate, goalProgress, goalType, bestStreak);

  // Momentum: compare first half vs second half of the month
  const midpoint       = daysAgoStr(14);
  const first2Wks      = history.filter(h => h.id >= monthStart && h.id < midpoint).filter(done).length;
  const last2Wks       = history.filter(h => h.id >= midpoint).filter(done).length;
  const momentum: MonthlyReview["momentum"] =
    last2Wks > first2Wks + 1 ? "building" :
    last2Wks < first2Wks - 1 ? "fading"   :
    "steady";

  const gradeRationale: Record<TrajectoryGrade, string> = {
    A: `${sessionCount}/${targetMonthly} sessions completed — outstanding consistency.`,
    B: `${sessionCount}/${targetMonthly} sessions — strong month with a few gaps.`,
    C: `${sessionCount}/${targetMonthly} sessions — room to improve consistency next month.`,
    D: `${sessionCount}/${targetMonthly} sessions — significant gaps this month. Focus on showing up, even briefly.`,
  };

  return {
    monthNumber,
    topInsight,
    grade,
    gradeRationale: gradeRationale[grade],
    sessionCount,
    targetSessions:  targetMonthly,
    bestStreak,
    momentum,
    isAvailable:     true,
  };
}
