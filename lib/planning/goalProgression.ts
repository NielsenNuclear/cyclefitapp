// ─── lib/planning/goalProgression.ts ─────────────────────────────────────────
// Translates the current mesocycle week into a concrete weekly prescription.
// Integrates goal-specific intensity targets and key session guidance.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { Mesocycle } from "./mesocycleBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyProgressionPrescription {
  goalType:         GoalType;
  weekLabel:        string;
  volumeMultiplier: number;   // applies to set counts (1.0 = baseline)
  rpeTarget:        number;   // absolute RPE target for working sets (1 dp)
  focus:            string;
  isDeload:         boolean;
  keyGuidance:      string[]; // 2–3 concrete bullets for the week
}

// ─── Goal-specific base RPE ───────────────────────────────────────────────────

const BASE_RPE: Record<GoalType, number> = {
  strength:             8.5,
  hypertrophy:          7.5,
  fat_loss:             7.0,
  general_fitness:      6.5,
  athletic_performance: 8.0,
};

// ─── Goal + phase guidance ────────────────────────────────────────────────────

function buildGuidance(
  goalType: GoalType,
  focus:    string,
  isDeload: boolean,
): string[] {
  if (isDeload) {
    return [
      "Reduce all working sets by 40–50% — this is intentional, not optional",
      "Keep movement quality high; no personal records this week",
      "Prioritise sleep, nutrition, and active recovery between sessions",
    ];
  }

  const guidance: Record<GoalType, Partial<Record<string, string[]>>> = {
    strength: {
      Accumulation: [
        "Focus on technique with moderate loads — build the pattern before pushing intensity",
        "Hit prescribed rep ranges with 1–2 reps in reserve",
        "Log weights carefully — these become your baseline for intensification",
      ],
      Intensification: [
        "Load climbs this week — reduce sets if needed to maintain quality",
        "Work to true RPE targets; stop a set when form degrades",
        "Rest fully between main compound sets (3–5 minutes)",
      ],
      Peak: [
        "This is your heaviest week — trust the build-up",
        "Warm up thoroughly before each top set",
        "Keep accessory volume minimal — main lifts take priority",
      ],
    },
    hypertrophy: {
      Accumulation: [
        "Volume is the driver — hit every prescribed set with full effort",
        "Keep rest periods consistent (90–120 seconds) to maintain stimulus",
        "Focus on the muscle, not the weight — feel the target muscle work",
      ],
      Overreach: [
        "Volume peaks this week — expect higher fatigue between sessions",
        "Nutrition and sleep directly impact how you absorb this stimulus",
        "If form breaks down before the final set, stop — quality over quantity",
      ],
      "Peak Volume": [
        "Highest volume of the block — this drives the adaptation",
        "Prioritise protein intake (2g/kg+) and 8+ hours of sleep",
        "Note which exercises feel strongest — this informs the next block",
      ],
    },
    fat_loss: {
      Foundation: [
        "Establish movement patterns at moderate intensity — don't sprint the first week",
        "Track weights from each session — progressive load preserves muscle mass",
        "Keep rest periods at 60–90 seconds to maintain metabolic demand",
      ],
      Build: [
        "Add load or reps where last week felt comfortable",
        "Circuit-style finishers (5–10 min) can supplement caloric burn after strength work",
        "Protein target is non-negotiable this week — muscle retention depends on it",
      ],
      Push: [
        "Push session density — move between exercises with purpose",
        "Fatigue is expected; if energy is very low, check sleep and caloric deficit depth",
        "Maintain the load from last week before attempting increases",
      ],
      Peak: [
        "Final heavy week before deload — push intensity, not necessarily volume",
        "Log RPE carefully; this data informs the next mesocycle's starting point",
        "Active recovery on off days (walking, mobility) accelerates fat utilisation",
      ],
    },
    general_fitness: {
      Foundation: [
        "Build the habit this week — consistency matters more than intensity",
        "Focus on form over load; technique built now pays off for months",
        "Enjoy the sessions — general fitness benefits from positive association",
      ],
      Build: [
        "Add a small challenge each session — one more rep or slightly more weight",
        "Mix intensity across sessions; not every workout should feel maximal",
        "Recovery between sessions is where adaptation happens — protect sleep",
      ],
      Peak: [
        "Your strongest week of the block — notice what's improved since Week 1",
        "Keep all sessions this week; don't skip — deload follows next",
        "Note any exercises that still feel uncomfortable — address in next block",
      ],
    },
    athletic_performance: {
      Preparation: [
        "Technical precision this week — move well before moving fast",
        "Prioritise mobility and activation work before each session",
        "Establish baseline loads for all primary movements",
      ],
      Accumulation: [
        "Volume peaks here — this builds the work capacity for peak weeks",
        "Include at least one power exercise per session (jumps, throws, sprints)",
        "Sleep and nutrition are performance variables, not recovery variables",
      ],
      Intensification: [
        "Loads climb — reduce sets if needed but maintain quality of each rep",
        "Explosive work should feel fast and powerful, not grinded",
        "CNS fatigue is real; if you feel flat, take 10 extra minutes of warm-up",
      ],
      Peak: [
        "Trust the process — your body is primed from the accumulation weeks",
        "Warm up thoroughly and attack top sets with full intent",
        "Minimise non-essential activity outside of training this week",
      ],
    },
  };

  const goalMap = guidance[goalType] ?? {};
  return goalMap[focus] ?? [
    "Follow this week's prescribed volume and intensity targets",
    "Log every set — your data drives next week's prescription",
    "Prioritise recovery between sessions",
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Translates the mesocycle's current week into a concrete weekly prescription.
 * Returns the deload prescription when the current week is a deload week.
 */
export function buildWeeklyPrescription(
  mesocycle: Mesocycle,
  goalType:  GoalType,
): WeeklyProgressionPrescription {
  const week    = mesocycle.weeks[mesocycle.currentWeek - 1];
  const baseRPE = BASE_RPE[goalType];
  const rpeTarget = Math.round(baseRPE * week.intensityPercent * 10) / 10;

  return {
    goalType,
    weekLabel:        week.label,
    volumeMultiplier: week.volumePercent,
    rpeTarget:        Math.min(10, Math.max(5, rpeTarget)),
    focus:            week.focus,
    isDeload:         week.isDeload,
    keyGuidance:      buildGuidance(goalType, week.focus, week.isDeload),
  };
}
