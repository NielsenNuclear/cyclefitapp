// ─── lib/planning/goalConflict.ts ─────────────────────────────────────────────
// Phase 38H — Goal conflict detection.
// Detects contradictory training goals and explains trade-offs.
// Pure function — no storage, no React.

import { mapOnboardingGoalToGoalType } from "@/lib/exercises/goalBasedSelection";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConflictSeverity = "none" | "minor" | "moderate" | "significant";

export interface GoalConflict {
  conflict:    string;
  severity:    "minor" | "moderate" | "significant";
  explanation: string;
  resolution:  string;
}

export interface GoalConflictReport {
  hasConflicts:   boolean;
  conflicts:      GoalConflict[];
  severity:       ConflictSeverity;
  recommendation: string;
}

// ─── Conflict definitions ─────────────────────────────────────────────────────

type GoalPair = [GoalType, GoalType];

interface ConflictDef {
  pair:        GoalPair;
  severity:    "minor" | "moderate" | "significant";
  conflict:    string;
  explanation: string;
  resolution:  string;
}

const CONFLICT_TABLE: ConflictDef[] = [
  {
    pair:        ["strength", "fat_loss"],
    severity:    "moderate",
    conflict:    "Strength vs Fat Loss",
    explanation: "Building maximal strength requires a caloric surplus; fat loss requires a deficit. Pursuing both simultaneously limits progress on each front.",
    resolution:  "Prioritise one for 8–12 weeks before switching. In a deficit, focus on maintaining strength rather than setting new PRs.",
  },
  {
    pair:        ["hypertrophy", "fat_loss"],
    severity:    "significant",
    conflict:    "Muscle Building vs Fat Loss",
    explanation: "Hypertrophy requires adequate protein and a near-maintenance or surplus intake. Significant fat loss requires a sustained deficit that suppresses muscle protein synthesis.",
    resolution:  "Run a dedicated muscle-building phase, then a cutting phase. If time is limited, a gentle recomposition at maintenance calories is possible but slower.",
  },
  {
    pair:        ["strength", "hypertrophy"],
    severity:    "minor",
    conflict:    "Strength vs Hypertrophy",
    explanation: "Strength training (1–5 rep ranges) and hypertrophy training (6–15 rep ranges) use different rep schemes, volume loads, and recovery demands. Overlapping them leads to suboptimal stimulus for each.",
    resolution:  "Use a concurrent periodization approach — block your training so one quality is emphasised each week, or alternate phases every 4–6 weeks.",
  },
];

function goalTypesFromGoals(goals: string[]): GoalType[] {
  if (!goals || goals.length === 0) return [];
  const types = new Set<GoalType>();
  for (const g of goals) {
    types.add(mapOnboardingGoalToGoalType([g]));
  }
  return [...types];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectGoalConflicts(userGoals: string[]): GoalConflictReport {
  const types = goalTypesFromGoals(userGoals);

  if (types.length <= 1) {
    return {
      hasConflicts:   false,
      conflicts:      [],
      severity:       "none",
      recommendation: "Your goal is focused — Axis can optimise fully for it.",
    };
  }

  const found: GoalConflict[] = [];
  for (const def of CONFLICT_TABLE) {
    const [a, b] = def.pair;
    if (types.includes(a) && types.includes(b)) {
      found.push({ conflict: def.conflict, severity: def.severity, explanation: def.explanation, resolution: def.resolution });
    }
  }

  if (found.length === 0) {
    return {
      hasConflicts:   false,
      conflicts:      [],
      severity:       "none",
      recommendation: "Your current goals are compatible — you can pursue them together.",
    };
  }

  const severityRank: Record<string, number> = { minor: 1, moderate: 2, significant: 3 };
  const worst = found.reduce((mx, c) => severityRank[c.severity] > severityRank[mx.severity] ? c : mx, found[0]);

  const recommendation =
    worst.severity === "significant"
      ? "Consider focusing on one goal at a time to maximise results. Run dedicated phases (8–12 weeks each) for conflicting objectives."
      : worst.severity === "moderate"
        ? "Be aware of the trade-offs between your goals. Axis will balance them, but progress on each may be slower than if focused on one."
        : "Your goals have minor overlap. Concurrent periodization can address both with careful programming.";

  return {
    hasConflicts:   true,
    conflicts:      found,
    severity:       worst.severity as ConflictSeverity,
    recommendation,
  };
}
