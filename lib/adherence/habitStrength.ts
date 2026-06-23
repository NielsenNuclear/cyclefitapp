// ─── lib/adherence/habitStrength.ts ──────────────────────────────────────────
// 46F/46G — Habit Strength Score
// Composite score measuring how deeply ingrained the training habit is.
// Uses streak + consistency + training history depth.
// Distinct from Phase 35's momentum.ts which measures recent trajectory.

import type { MultiDomainStreaks } from "./streaks";
import type { ConsistencyScore }   from "./consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HabitStrengthLevel = "nascent" | "forming" | "established" | "strong" | "automatic";

export interface HabitStrengthScore {
  score:                   number;          // 0–100
  level:                   HabitStrengthLevel;
  streakContribution:      number;          // 0–40 pts
  consistencyContribution: number;          // 0–35 pts
  longevityContribution:   number;          // 0–25 pts (based on total sessions)
  dataReady:               boolean;
  message:                 string;
}

// ─── Tier map ─────────────────────────────────────────────────────────────────

function scoreToLevel(s: number): HabitStrengthLevel {
  if (s >= 85) return "automatic";
  if (s >= 68) return "strong";
  if (s >= 50) return "established";
  if (s >= 30) return "forming";
  return "nascent";
}

const LEVEL_MESSAGE: Record<HabitStrengthLevel, string> = {
  automatic:   "Training is deeply ingrained — you show up even in tough weeks.",
  strong:      "A strong habit — consistency is your default mode.",
  established: "The habit is established; keep protecting your training windows.",
  forming:     "Habit is forming — every completed session reinforces the pattern.",
  nascent:     "Early days — the most important thing is showing up consistently.",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeHabitStrength(
  streaks:          MultiDomainStreaks | undefined,
  consistency:      ConsistencyScore | undefined,
  totalSessions:    number,
): HabitStrengthScore {
  if (!streaks && !consistency && totalSessions < 3) {
    return {
      score: 0, level: "nascent", streakContribution: 0,
      consistencyContribution: 0, longevityContribution: 0,
      dataReady: false, message: LEVEL_MESSAGE.nascent,
    };
  }

  // Streak contribution: current streak up to 40 pts (cap at 60-day streak)
  const currentStreak     = streaks?.training.current ?? 0;
  const longestStreak     = streaks?.training.longest ?? 0;
  const bestStreak        = Math.max(currentStreak, longestStreak);
  const streakContrib     = Math.min(40, Math.round((bestStreak / 60) * 40));

  // Consistency contribution: composite 0–35 pts
  const consistencyComposite = consistency?.composite ?? 0;
  const consistencyContrib   = Math.round((consistencyComposite / 100) * 35);

  // Longevity contribution: total sessions 0–25 pts (cap at 200 sessions)
  const longevityContrib = Math.min(25, Math.round((totalSessions / 200) * 25));

  const score = streakContrib + consistencyContrib + longevityContrib;
  const level = scoreToLevel(score);

  return {
    score,
    level,
    streakContribution:      streakContrib,
    consistencyContribution: consistencyContrib,
    longevityContribution:   longevityContrib,
    dataReady:               totalSessions >= 5,
    message:                 LEVEL_MESSAGE[level],
  };
}
