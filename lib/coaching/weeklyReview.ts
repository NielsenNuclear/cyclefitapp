// ─── lib/coaching/weeklyReview.ts ─────────────────────────────────────────────
// Computes a weekly coaching review: wins, misses, and a next-week focus.
// Pure function — all inputs passed in; no localStorage reads.

import type { GoalProgress } from "@/lib/goals/goalProgress";
import type { GoalType }     from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyReview {
  weekNumber:       number;     // approximate weeks since first logged session
  sessionCount:     number;
  targetSessions:   number;
  completionRate:   number;     // 0–1
  wins:             string[];
  misses:           string[];
  nextWeekFocus:    string;
  volumeChange:     number;     // % change vs prior week (positive = more)
  isAvailable:      boolean;    // false when < 7 days of history
}

// ─── History shape ────────────────────────────────────────────────────────────
// Accepts a minimal subset of the workout history entries (status + date).

export interface WorkoutHistoryEntry {
  id:     string;   // YYYY-MM-DD
  status: "completed" | "partially_completed" | "skipped" | "pending";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeWeeklyReview(input: {
  history:         WorkoutHistoryEntry[];
  targetSessions:  number;
  goalType:        GoalType;
  goalProgress?:   GoalProgress;
  weeklyVolume?:   number;      // this week's set count (from TrainingLoadReport)
  prevWeekVolume?: number;      // prior week's set count
}): WeeklyReview {
  const { history, targetSessions, goalType, goalProgress, weeklyVolume = 0, prevWeekVolume = 0 } = input;

  const thisWeekStart = daysAgoStr(7);
  const prevWeekStart = daysAgoStr(14);

  const thisWeek = history.filter(h => h.id >= thisWeekStart);
  const prevWeek = history.filter(h => h.id >= prevWeekStart && h.id < thisWeekStart);

  const done = (h: WorkoutHistoryEntry) =>
    h.status === "completed" || h.status === "partially_completed";

  const sessionCount  = thisWeek.filter(done).length;
  const prevCount     = prevWeek.filter(done).length;
  const completionRate = Math.min(1, sessionCount / Math.max(1, targetSessions));

  // Need at least 7 days in total history to produce a useful review
  const totalDays = new Set(history.map(h => h.id)).size;
  if (totalDays < 7) {
    return {
      weekNumber: 1, sessionCount, targetSessions, completionRate: 0,
      wins: [], misses: [], nextWeekFocus: "Build your first full week of training.",
      volumeChange: 0, isAvailable: false,
    };
  }

  const firstDate  = [...history].sort((a, b) => a.id.localeCompare(b.id))[0]?.id ?? thisWeekStart;
  const elapsedMs  = Date.now() - new Date(firstDate).getTime();
  const weekNumber = Math.max(1, Math.round(elapsedMs / (7 * 24 * 60 * 60 * 1000)));

  // Volume change
  const volumeChange = prevWeekVolume > 0
    ? Math.round(((weeklyVolume - prevWeekVolume) / prevWeekVolume) * 100)
    : 0;

  // ── Wins ──
  const wins: string[] = [];
  if (sessionCount >= targetSessions) {
    wins.push(`Hit your ${targetSessions}-session target — consistency is your edge.`);
  }
  if (sessionCount > prevCount && prevCount > 0) {
    wins.push(`More sessions than last week (${sessionCount} vs ${prevCount}).`);
  }
  if (volumeChange > 5) {
    wins.push(`Volume up ${volumeChange}% vs last week — progressive overload in action.`);
  }
  if (goalProgress?.percentComplete && goalProgress.percentComplete > 0) {
    const pct = Math.round(goalProgress.percentComplete);
    if (pct >= 10) {
      wins.push(`${pct}% of your ${goalType.replace("_", " ")} goal reached.`);
    }
  }

  // ── Misses ──
  const misses: string[] = [];
  if (sessionCount < targetSessions) {
    const gap = targetSessions - sessionCount;
    misses.push(`Missed ${gap} session${gap > 1 ? "s" : ""} this week. Even a short session counts.`);
  }
  if (volumeChange < -10) {
    misses.push(`Volume dropped ${Math.abs(volumeChange)}% vs last week.`);
  }
  if (goalProgress && !goalProgress.isComplete && goalProgress.weeklyVelocity <= 0) {
    misses.push("Goal progress has stalled. Review exercise selection or add intensity.");
  }

  // ── Next week focus ──
  const focusMap: Record<GoalType, string> = {
    strength:             "Pick 2 main lifts and push for a small weight or rep PR.",
    hypertrophy:          "Add one set to your highest-effort exercises.",
    fat_loss:             "Aim for an extra 10-minute walk on rest days.",
    general_fitness:      "Keep the consistency streak going — 3 sessions is the target.",
    athletic_performance: "Include one power or speed session alongside your strength work.",
  };

  const nextWeekFocus = sessionCount < targetSessions
    ? `Close the gap: aim for ${targetSessions} sessions next week, even if shorter than usual.`
    : (focusMap[goalType] ?? "Build on this week's momentum.");

  return {
    weekNumber,
    sessionCount,
    targetSessions,
    completionRate,
    wins:          wins.slice(0, 3),
    misses:        misses.slice(0, 2),
    nextWeekFocus,
    volumeChange,
    isAvailable:   true,
  };
}
