"use client";

import type { FuelTargets, FuelingLevel, NutritionPriority } from "@/lib/nutrition/fuelTargets";
import type { WorkoutFuelingPlan }      from "@/lib/nutrition/workoutFueling";
import type { NutritionAdjustment }     from "@/lib/nutrition/symptomNutritionMap";
import type { NutritionOutcome }        from "@/lib/nutrition/nutritionLearning";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  fuelTargets:          FuelTargets | null;
  workoutFueling:       WorkoutFuelingPlan | null;
  nutritionAdjustments: NutritionAdjustment[];
  nutritionOutcomes:    NutritionOutcome[];
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<FuelingLevel, string> = {
  high_output: "High Output",
  performance: "Performance",
  maintenance: "Maintenance",
  recovery:    "Recovery",
};

const LEVEL_COLORS: Record<FuelingLevel, string> = {
  high_output: "bg-violet-500 text-white",
  performance: "bg-teal-600  text-white",
  maintenance: "bg-amber-600 text-white",
  recovery:    "bg-zinc-600  text-white",
};

const PRIORITY_CHIPS: Record<NutritionPriority, string> = {
  high:     "bg-teal-900  text-teal-300  border border-teal-700",
  moderate: "bg-zinc-800  text-zinc-300  border border-zinc-700",
  low:      "bg-zinc-900  text-zinc-500  border border-zinc-800",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityChip({ label, priority }: { label: string; priority: NutritionPriority }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CHIPS[priority]}`}>
      {label} — {priority}
    </span>
  );
}

function FocusTag({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900 text-rose-300 border border-rose-700 font-medium">
      {label}
    </span>
  );
}

function FuelingWindow({ timing, recommendation }: { timing: string; recommendation: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-zinc-400 text-xs uppercase tracking-wide">{timing}</p>
      <p className="text-white text-sm">{recommendation}</p>
    </div>
  );
}

// ─── Outcome insight ──────────────────────────────────────────────────────────

function bestOutcomeNote(outcomes: NutritionOutcome[], currentLevel: FuelingLevel): string | null {
  if (outcomes.length === 0) return null;
  const best = outcomes[0];
  if (best.fuelingLevel === currentLevel) {
    return `Your readiness has averaged ${best.meanNextDayScore} the day after ${LEVEL_LABELS[best.fuelingLevel].toLowerCase()} fueling days (${best.sampleSize} logged).`;
  }
  return `Your best next-day readiness (${best.meanNextDayScore}) follows ${LEVEL_LABELS[best.fuelingLevel].toLowerCase()} fueling days.`;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function FuelingCard({
  fuelTargets,
  workoutFueling,
  nutritionAdjustments,
  nutritionOutcomes,
}: Props) {
  if (!fuelTargets) return null;

  const {
    fuelingLevel,
    proteinRange,
    carbPriority,
    fatPriority,
    hydrationPriority,
    ironFocus,
    magnesiumFocus,
    electrolyteFocus,
    fuelingNote,
  } = fuelTargets;

  const levelLabel  = LEVEL_LABELS[fuelingLevel];
  const levelColor  = LEVEL_COLORS[fuelingLevel];
  const outcomeNote = bestOutcomeNote(nutritionOutcomes, fuelingLevel);
  const topSymptoms = nutritionAdjustments.slice(0, 3);
  const hasFocus    = ironFocus || magnesiumFocus || electrolyteFocus;
  const hasTiming   = workoutFueling && (
    workoutFueling.preWorkout || workoutFueling.postWorkout || workoutFueling.evening
  );

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-base">Today's Fueling</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${levelColor}`}>
          {levelLabel}
        </span>
      </div>

      {/* ── Protein range ── */}
      <div>
        <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Protein target</p>
        <p className="text-white text-2xl font-bold">
          {proteinRange.min}–{proteinRange.max}
          <span className="text-zinc-400 text-sm font-normal ml-1">g</span>
        </p>
        <p className="text-zinc-500 text-xs mt-0.5">Approximate daily total</p>
      </div>

      {/* ── Macro & hydration priorities ── */}
      <div className="flex flex-wrap gap-2">
        <PriorityChip label="Carbs"      priority={carbPriority} />
        <PriorityChip label="Hydration"  priority={hydrationPriority} />
        <PriorityChip label="Fat"        priority={fatPriority} />
      </div>

      {/* ── Micro-nutrient focus tags ── */}
      {hasFocus && (
        <div className="flex flex-wrap gap-2">
          {ironFocus        && <FocusTag label="Iron focus" />}
          {magnesiumFocus   && <FocusTag label="Magnesium focus" />}
          {electrolyteFocus && <FocusTag label="Electrolyte focus" />}
        </div>
      )}

      {/* ── Phase note ── */}
      <p className="text-zinc-400 text-sm leading-snug">{fuelingNote}</p>

      {/* ── Symptom-driven adjustments ── */}
      {topSymptoms.length > 0 && (
        <div className="space-y-3 pt-1 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">Based on today's symptoms</p>
          {topSymptoms.map(adj => (
            <div key={adj.symptomId} className="space-y-0.5">
              <p className="text-white text-sm font-medium">{adj.focus}</p>
              <p className="text-zinc-400 text-xs">{adj.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Workout fueling windows ── */}
      {hasTiming && (
        <div className="space-y-3 pt-1 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">Fueling windows</p>
          {workoutFueling!.preWorkout && (
            <FuelingWindow
              timing={`Pre-workout · ${workoutFueling!.preWorkout.timing}`}
              recommendation={workoutFueling!.preWorkout.recommendation}
            />
          )}
          {workoutFueling!.postWorkout && (
            <FuelingWindow
              timing={`Post-workout · ${workoutFueling!.postWorkout.timing}`}
              recommendation={workoutFueling!.postWorkout.recommendation}
            />
          )}
          {workoutFueling!.evening && (
            <FuelingWindow
              timing="This evening"
              recommendation={workoutFueling!.evening.recommendation}
            />
          )}
        </div>
      )}

      {/* ── Personalized outcome note ── */}
      {outcomeNote && (
        <div className="pt-1 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Personalised insight</p>
          <p className="text-teal-400 text-sm">{outcomeNote}</p>
        </div>
      )}

    </div>
  );
}
