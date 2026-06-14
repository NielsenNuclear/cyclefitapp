// ─── lib/nutrition/fuelTargets.ts ────────────────────────────────────────────
// Computes daily fueling targets from training and physiological signals.
// Pure function — callers pass all data in; no localStorage reads here.
//
// Protein ranges are calibrated for an active adult (~55–75 kg) and are
// intentionally approximate — the intent is directional guidance, not
// precision tracking.

import type { PhaseData }          from "@/types/recommendation";
import type { ReadinessScore }     from "@/lib/readiness/calculateReadiness";
import type { GeneratedWorkout }   from "@/lib/exercises/generateWorkout";
import type { RecoveryCapacity }   from "@/lib/adaptive/recoveryCapacity";
import type { SymptomEntry }       from "@/lib/symptoms/symptomHistory";
import type { GoalType }           from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelingLevel = "recovery" | "maintenance" | "performance" | "high_output";
export type NutritionPriority = "low" | "moderate" | "high";

export interface FuelTargets {
  fuelingLevel:      FuelingLevel;
  proteinRange:      { min: number; max: number };  // approximate grams
  carbPriority:      NutritionPriority;
  fatPriority:       NutritionPriority;
  hydrationPriority: NutritionPriority;
  ironFocus:         boolean;
  magnesiumFocus:    boolean;
  electrolyteFocus:  boolean;
  fuelingNote:       string;
}

// ─── Fueling level ────────────────────────────────────────────────────────────

const HIGH_PHASES = new Set(["Follicular", "Ovulatory"]);
const LOW_PHASES  = new Set(["Late Luteal", "Menstrual"]);

function deriveFuelingLevel(
  phase:            PhaseData,
  readinessScore:   ReadinessScore | null,
  workout:          GeneratedWorkout | null,
): FuelingLevel {
  const score       = readinessScore?.score ?? 50;
  const isHighPhase = HIGH_PHASES.has(phase.name);
  const isLowPhase  = LOW_PHASES.has(phase.name);
  const energy      = workout?.energyLevel ?? 0;

  if (score < 40)                                                  return "recovery";
  if (isLowPhase && score < 60)                                    return "recovery";
  if (!workout)                                                     return score >= 60 ? "maintenance" : "recovery";
  if (score >= 75 && isHighPhase && energy >= 3)                   return "high_output";
  if (score >= 60)                                                  return "performance";
  return "maintenance";
}

// ─── Protein ranges ───────────────────────────────────────────────────────────

const BASE_PROTEIN: Record<FuelingLevel, { min: number; max: number }> = {
  high_output: { min: 115, max: 140 },
  performance: { min: 100, max: 125 },
  maintenance: { min:  85, max: 110 },
  recovery:    { min:  75, max: 100 },
};

function proteinRange(level: FuelingLevel, goalType: GoalType): { min: number; max: number } {
  const base  = BASE_PROTEIN[level];
  const boost = (goalType === "strength" || goalType === "hypertrophy") ? 10 : 0;
  return { min: base.min + boost, max: base.max + boost };
}

// ─── Fueling notes ────────────────────────────────────────────────────────────

const FUELING_NOTES: Record<FuelingLevel, string> = {
  high_output: "Peak output day — prioritise carbohydrate availability before and protein recovery after training.",
  performance: "Training day — consistent protein distribution and carbohydrate timing around your session.",
  maintenance: "Moderate demand day — balanced intake supports training quality without excess digestive load.",
  recovery:    "Recovery-focused — prioritise protein, hydration, and easily digestible anti-inflammatory foods.",
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes daily fuel targets from physiology, training, and symptom signals.
 * Protein ranges are approximate for a 55–75 kg active adult; strength/hypertrophy
 * goals add ~10 g to both bounds.
 */
export function computeFuelTargets(
  phase:            PhaseData,
  readinessScore:   ReadinessScore | null,
  workout:          GeneratedWorkout | null,
  recoveryCapacity: RecoveryCapacity | null,
  todaySymptoms:    SymptomEntry[],
  goalType:         GoalType,
): FuelTargets {
  const fuelingLevel = deriveFuelingLevel(phase, readinessScore, workout);

  // ── Macro priorities — phase-driven ────────────────────────────────────────

  const carbPriority: NutritionPriority =
    (phase.name === "Follicular" || phase.name === "Ovulatory") ? "high" :
    (phase.name === "Luteal"     || phase.name === "Late Luteal") ? "moderate" :
    (fuelingLevel === "high_output" || fuelingLevel === "performance") ? "high" :
    "moderate";

  const fatPriority: NutritionPriority =
    (phase.name === "Luteal" || phase.name === "Late Luteal") ? "high" : "moderate";

  const hydrationPriority: NutritionPriority =
    (phase.name === "Menstrual" || phase.name === "Ovulatory" || fuelingLevel === "high_output")
      ? "high" : "moderate";

  // ── Micro-nutrient flags — phase baseline ──────────────────────────────────

  let ironFocus        = phase.name === "Menstrual";
  let magnesiumFocus   = phase.name === "Luteal" || phase.name === "Late Luteal";
  let electrolyteFocus = phase.name === "Ovulatory" || fuelingLevel === "high_output";

  // ── Symptom overrides ──────────────────────────────────────────────────────

  const symptomIds = new Set(
    todaySymptoms.filter(s => s.severity > 0).map(s => s.symptomId),
  );
  if (symptomIds.has("fatigue") || symptomIds.has("energy")) ironFocus        = true;
  if (symptomIds.has("headache"))                             electrolyteFocus = true;
  if (symptomIds.has("sleep-quality") || symptomIds.has("cramps")) magnesiumFocus = true;

  // Low recovery capacity nudges toward higher protein for tissue repair
  if (recoveryCapacity?.level === "low") {
    // Already handled by fuelingLevel staying at recovery/maintenance — no extra change needed
  }

  return {
    fuelingLevel,
    proteinRange:      proteinRange(fuelingLevel, goalType),
    carbPriority,
    fatPriority,
    hydrationPriority,
    ironFocus,
    magnesiumFocus,
    electrolyteFocus,
    fuelingNote:       FUELING_NOTES[fuelingLevel],
  };
}
