// ─── lib/intelligence/safety/buildSafetyContext.ts ────────────────────────────
// Phase A — Assembles a SafetyContext from live pipeline data.
// Pure function; no side effects. All compute helpers are local.

import type { SafetyContext } from "./SafetyRule";

// ── Minimal structural contracts (avoids circular deps) ───────────────────────

interface WorkoutHistoryLike {
  id:     string;   // YYYY-MM-DD
  status: string;
}

interface RecoveryScoreLike {
  date:  string;   // YYYY-MM-DD
  score: number;
}

export interface BuildSafetyContextInput {
  proposedVolumeScale:   number;
  currentVolumeScale:    number;
  readinessScore:        number;
  recoveryScore:         number;
  fatigueEstimate:       number;
  hasSymptoms:           boolean;
  isDeload:              boolean;
  confidenceScore:       number;           // 0–1
  weeklyVolumeSets:      number;
  prevWeekVolumeSets:    number;
  workoutHistory:        WorkoutHistoryLike[];
  recoveryScores:        RecoveryScoreLike[];
  trainingDecisionType:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeStreakDays(history: WorkoutHistoryLike[]): number {
  const today = new Date();
  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    const entry = history.find(h => h.id === dateStr);
    if (entry && (entry.status === "completed" || entry.status === "partially_completed")) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeLowRecoveryDays(scores: RecoveryScoreLike[]): number {
  const sorted = [...scores].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const entry of sorted) {
    if (entry.score < 40) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function decisionTypeToIntensity(type: string): string {
  switch (type) {
    case "recover":    return "Low";
    case "scale_down": return "Light to Moderate";
    case "swap":       return "Light to Moderate";
    case "proceed":    return "Moderate";
    case "scale_up":   return "Moderate to High";
    default:           return "Moderate";
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildSafetyContext(input: BuildSafetyContextInput): SafetyContext {
  return {
    proposedVolumeScale:  input.proposedVolumeScale,
    currentVolumeScale:   input.currentVolumeScale,
    readinessScore:       input.readinessScore,
    recoveryScore:        input.recoveryScore,
    fatigueEstimate:      input.fatigueEstimate,
    hasSymptoms:          input.hasSymptoms,
    isDeload:             input.isDeload,
    confidenceScore:      input.confidenceScore,
    streakDays:           computeStreakDays(input.workoutHistory),
    weeklyVolumeSets:     input.weeklyVolumeSets,
    prevWeekVolumeSets:   input.prevWeekVolumeSets,
    lowRecoveryDays:      computeLowRecoveryDays(input.recoveryScores),
    proposedIntensity:    decisionTypeToIntensity(input.trainingDecisionType),
    currentIntensity:     "Moderate",
  };
}
