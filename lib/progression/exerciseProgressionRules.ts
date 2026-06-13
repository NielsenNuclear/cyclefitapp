// ─── lib/progression/exerciseProgressionRules.ts ─────────────────────────────
// Converts per-exercise ProgressionState distributions into a CoachingAdjustment.
// Pure logic only — no UI, no persistence, no side effects.

import type { ExerciseProgressSummary, ProgressionState } from "./exerciseProgress";
import type { CoachingAdjustment, ComplexityModifier } from "./progressionRules";
import type { RecommendedAction } from "./progressionProfile";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_QUALIFIED_EXERCISES = 3;
const DOMINANT_THRESHOLD      = 0.5; // fraction of qualified exercises needed for a clear signal

// ─── Rule table ───────────────────────────────────────────────────────────────

interface ExerciseRuleSpec {
  action:             RecommendedAction;
  volumeModifier:     number;
  intensityModifier:  number;
  complexityModifier: ComplexityModifier;
  rationale:          string;
}

const EXERCISE_RULES: Record<Exclude<ProgressionState, "new">, ExerciseRuleSpec> = {
  progressing: {
    action:             "progress",
    volumeModifier:     1.05,
    intensityModifier:  1,
    complexityModifier: "increase",
    rationale:
      "Most tracked exercises are being completed consistently (≥75% completion rate). " +
      "A modest volume increase and one additional RPE point applies progressive overload " +
      "where the training system has demonstrated readiness to absorb it.",
  },
  stalled: {
    action:             "maintain",
    volumeModifier:     1.00,
    intensityModifier:  0,
    complexityModifier: "maintain",
    rationale:
      "Exercise completion is inconsistent (50–74% across tracked exercises). " +
      "Holding current volume and intensity to prioritise consistency before adding load. " +
      "Build the habit before building the workload.",
  },
  regressing: {
    action:             "reduce",
    volumeModifier:     0.90,
    intensityModifier:  -1,
    complexityModifier: "decrease",
    rationale:
      "Repeated skips detected across multiple exercises (>50% skip rate). " +
      "Reducing volume 10% and simplifying movements to lower the session barrier. " +
      "Consistency is more important than load at this stage.",
  },
};

// ─── Priority helpers (higher index = more conservative) ─────────────────────

const ACTION_PRIORITY: Record<RecommendedAction, number> = {
  progress: 0,
  maintain: 1,
  reduce:   2,
  deload:   3,
};

const COMPLEXITY_PRIORITY: Record<ComplexityModifier, number> = {
  increase: 0,
  maintain: 1,
  decrease: 2,
};

// ─── applyExerciseProgressionRules ───────────────────────────────────────────

/**
 * Returns a CoachingAdjustment based on the distribution of progressionStatus
 * values across exercises with enough data (appearances ≥ 3).
 *
 * Returns null when:
 *  - Fewer than MIN_QUALIFIED_EXERCISES exercises have ≥ 3 appearances, or
 *  - No single state is dominant (> 50% of qualified exercises)
 */
export function applyExerciseProgressionRules(
  summaries: ExerciseProgressSummary[],
): CoachingAdjustment | null {
  const qualified = summaries.filter(s => s.appearances >= 3);
  if (qualified.length < MIN_QUALIFIED_EXERCISES) return null;

  const counts: Record<Exclude<ProgressionState, "new">, number> = {
    progressing: 0,
    stalled:     0,
    regressing:  0,
  };
  for (const s of qualified) {
    if (s.progressionStatus !== "new") {
      counts[s.progressionStatus]++;
    }
  }

  // Check in conservative → aggressive order so the most cautious dominant state wins ties
  const total = qualified.length;
  for (const state of ["regressing", "stalled", "progressing"] as const) {
    if (counts[state] / total > DOMINANT_THRESHOLD) {
      const spec = EXERCISE_RULES[state];
      return {
        action:             spec.action,
        volumeModifier:     spec.volumeModifier,
        intensityModifier:  spec.intensityModifier,
        complexityModifier: spec.complexityModifier,
        rationale:          spec.rationale,
      };
    }
  }

  return null;
}

// ─── mergeCoachingAdjustments ─────────────────────────────────────────────────

/**
 * Merges a session-level (base) and exercise-level (exercise) CoachingAdjustment
 * conservatively — the more cautious value always wins per dimension.
 *
 * - action:             higher priority (deload > reduce > maintain > progress) wins
 * - volumeModifier:     Math.min (lower = fewer sets)
 * - intensityModifier:  Math.min (lower = lower RPE target)
 * - complexityModifier: decrease > maintain > increase
 * - rationale:          taken from whichever action won
 */
export function mergeCoachingAdjustments(
  base:     CoachingAdjustment,
  exercise: CoachingAdjustment,
): CoachingAdjustment {
  const basePriority     = ACTION_PRIORITY[base.action];
  const exercisePriority = ACTION_PRIORITY[exercise.action];
  const winner           = exercisePriority >= basePriority ? exercise : base;

  const complexityWinner =
    COMPLEXITY_PRIORITY[exercise.complexityModifier] >= COMPLEXITY_PRIORITY[base.complexityModifier]
      ? exercise.complexityModifier
      : base.complexityModifier;

  return {
    action:             winner.action,
    volumeModifier:     Math.min(base.volumeModifier, exercise.volumeModifier),
    intensityModifier:  Math.min(base.intensityModifier, exercise.intensityModifier),
    complexityModifier: complexityWinner,
    rationale:          winner.rationale,
  };
}
