// ─── lib/athlete/athleteIdentity.ts ──────────────────────────────────────────
// 47E — Athlete Identity Model
// Determines the user's training archetype from BEHAVIOR, not onboarding answers.
// Looks at which splits they complete, readiness prioritisation, and recovery patterns.

import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";
import type { AdherenceEntry }      from "@/lib/adherence/adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AthleteArchetype =
  | "strength_focused"
  | "hypertrophy_focused"
  | "performance_focused"
  | "lifestyle_focused";

export interface AthleteIdentity {
  archetype:  AthleteArchetype;
  label:      string;
  confidence: "low" | "moderate" | "high";
  evidence:   string[];
  description: string;
  dataReady:  boolean;
}

// ─── Archetype profiles ───────────────────────────────────────────────────────

const LABELS: Record<AthleteArchetype, string> = {
  strength_focused:     "Strength Athlete",
  hypertrophy_focused:  "Hypertrophy Athlete",
  performance_focused:  "Performance Athlete",
  lifestyle_focused:    "Lifestyle Athlete",
};

const DESCRIPTIONS: Record<AthleteArchetype, string> = {
  strength_focused:     "You gravitate toward heavy, low-rep compound lifts and treat strength as the primary signal.",
  hypertrophy_focused:  "Volume and muscle development guide your training choices — you chase progressive overload.",
  performance_focused:  "You train for outcomes — athleticism, work capacity, and peak readiness.",
  lifestyle_focused:    "Consistency and how training makes you feel matter most. Sustainability over maximalism.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STRENGTH_SPLITS    = ["upper_lower", "push_pull_legs", "full_body"];
const HYPERTROPHY_SPLITS = ["push_pull_legs", "body_part", "bro_split"];
const PERFORMANCE_SPLITS = ["athletic", "functional", "circuit", "full_body"];

function countSplitType(history: WorkoutHistoryEntry[], types: string[]): number {
  return history.filter(
    e => (e.status === "completed" || e.status === "partially_completed") &&
      types.includes(e.splitType),
  ).length;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeAthleteIdentity(
  history:   WorkoutHistoryEntry[],
  adherence: AdherenceEntry[],
): AthleteIdentity {
  const EMPTY: AthleteIdentity = {
    archetype: "lifestyle_focused", label: LABELS.lifestyle_focused,
    confidence: "low", evidence: [], description: DESCRIPTIONS.lifestyle_focused,
    dataReady: false,
  };

  const completed = history.filter(e => e.status === "completed" || e.status === "partially_completed");
  if (completed.length < 10) return EMPTY;

  const strengthCount    = countSplitType(history, STRENGTH_SPLITS);
  const hypertrophyCount = countSplitType(history, HYPERTROPHY_SPLITS);
  const performanceCount = countSplitType(history, PERFORMANCE_SPLITS);
  const total            = completed.length;

  const scores: Record<AthleteArchetype, number> = {
    strength_focused:    strengthCount / total,
    hypertrophy_focused: hypertrophyCount / total,
    performance_focused: performanceCount / total,
    lifestyle_focused:   0.1,   // baseline — wins when no strong split signal
  };

  // Lifestyle signal: high completion rate at low readiness
  const lowRdxAdherence = adherence.filter(e => e.readinessScore < 55);
  if (lowRdxAdherence.length >= 3) {
    const lowRdxCompletion = lowRdxAdherence.filter(
      e => e.status === "completed" || e.status === "partially_completed",
    ).length / lowRdxAdherence.length;
    if (lowRdxCompletion >= 0.7) scores.lifestyle_focused += 0.3;
  }

  const archetype = (Object.entries(scores) as [AthleteArchetype, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const topScore = scores[archetype];
  const confidence: "low" | "moderate" | "high" =
    topScore >= 0.5 && total >= 30 ? "high"
    : topScore >= 0.3 && total >= 15 ? "moderate"
    : "low";

  const evidence: string[] = [];
  if (strengthCount > 0)    evidence.push(`${strengthCount} strength-focused sessions completed`);
  if (hypertrophyCount > 0) evidence.push(`${hypertrophyCount} hypertrophy-focused sessions`);
  if (performanceCount > 0) evidence.push(`${performanceCount} performance-style sessions`);

  return {
    archetype, label: LABELS[archetype], confidence, evidence,
    description: DESCRIPTIONS[archetype], dataReady: true,
  };
}
