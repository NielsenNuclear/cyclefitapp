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
  high_output: "bg-[#EEEDFE] text-[#3C3489]",
  performance: "bg-[#E1F5EE] text-[#085041]",
  maintenance: "bg-[#FAEEDA] text-[#633806]",
  recovery:    "bg-[#EEF0F2] text-[#3D4451]",
};

const PRIORITY_CHIPS: Record<NutritionPriority, string> = {
  high:     "bg-[#E1F5EE]  text-[#085041]  border border-[#A8DFC8]",
  moderate: "bg-[#F1EFE8]  text-[#5C5850]  border border-[#EAE7DE]",
  low:      "bg-[#FAF9F5]  text-[#9B9690]  border border-[#EAE7DE]",
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
    <span className="text-xs px-2 py-0.5 rounded-full bg-[#FDF3F2] text-[#9B2015] border border-[#F5C5C0] font-medium">
      {label}
    </span>
  );
}

function FuelingWindow({ timing, recommendation }: { timing: string; recommendation: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[#6B6860] text-xs uppercase tracking-wide">{timing}</p>
      <p className="text-[13px] text-[#1C1B18]">{recommendation}</p>
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
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[#1C1B18]">Today's Fueling</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${levelColor}`}>
          {levelLabel}
        </span>
      </div>

      {/* ── Protein range ── */}
      <div>
        <p className="text-[#6B6860] text-xs uppercase tracking-wide mb-1">Protein target</p>
        <p className="text-[1.8rem] font-light text-[#1C1B18]">
          {proteinRange.min}–{proteinRange.max}
          <span className="text-[#6B6860] text-sm font-normal ml-1">g</span>
        </p>
        <p className="text-[#9B9690] text-xs mt-0.5">Approximate daily total</p>
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
      <p className="text-[#6B6860] text-sm leading-snug">{fuelingNote}</p>

      {/* ── Symptom-driven adjustments ── */}
      {topSymptoms.length > 0 && (
        <div className="space-y-3 pt-1 border-t border-black/6">
          <p className="text-[#6B6860] text-xs uppercase tracking-wide">Based on today's symptoms</p>
          {topSymptoms.map(adj => (
            <div key={adj.symptomId} className="space-y-0.5">
              <p className="text-[13px] font-medium text-[#1C1B18]">{adj.focus}</p>
              <p className="text-[#6B6860] text-xs">{adj.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Workout fueling windows ── */}
      {hasTiming && (
        <div className="space-y-3 pt-1 border-t border-black/6">
          <p className="text-[#6B6860] text-xs uppercase tracking-wide">Fueling windows</p>
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
        <div className="pt-1 border-t border-black/6">
          <p className="text-[#6B6860] text-xs uppercase tracking-wide mb-1">Personalised insight</p>
          <p className="text-[#0F6E56] text-sm">{outcomeNote}</p>
        </div>
      )}

    </div>
  );
}
