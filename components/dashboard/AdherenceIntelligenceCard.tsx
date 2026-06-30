"use client";

import type { AdherencePatternReport }    from "@/lib/adherence/patternEngine";
import type { MissedWorkoutAnalysis }     from "@/lib/adherence/missedWorkoutAnalysis";
import type { AdherenceRiskForecast }     from "@/lib/adherence/adherenceRiskForecast";
import type { WorkoutSizeRecommendation } from "@/lib/adherence/adaptiveWorkoutSizing";
import type { HabitStrengthScore }        from "@/lib/adherence/habitStrength";

const RISK_COLORS: Record<string, string> = {
  low:      "text-[#0F6E56]",
  moderate: "text-[#854F0B]",
  high:     "text-[#C0392B]",
};

const HABIT_COLORS: Record<string, string> = {
  nascent:     "text-[#9B9690]",
  forming:     "text-[#854F0B]",
  established: "text-[#0F6E56]",
  strong:      "text-[#085041]",
  automatic:   "text-[#534AB7]",
};

interface Props {
  patterns:       AdherencePatternReport   | undefined;
  missedAnalysis: MissedWorkoutAnalysis    | undefined;
  riskForecast:   AdherenceRiskForecast    | undefined;
  workoutSize:    WorkoutSizeRecommendation | undefined;
  habitStrength:  HabitStrengthScore       | undefined;
}

export function AdherenceIntelligenceCard({
  patterns, missedAnalysis, riskForecast, workoutSize, habitStrength,
}: Props) {
  if (!patterns?.dataReady && !riskForecast?.dataReady && !habitStrength?.dataReady) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <h3 className="text-[15px] font-semibold text-[#1C1B18]">Training consistency</h3>

      {/* Habit strength */}
      {habitStrength?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#9B9690]">Habit strength</span>
          <div className="text-right">
            <span className={`text-[14px] font-semibold ${HABIT_COLORS[habitStrength.level]}`}>
              {habitStrength.level.charAt(0).toUpperCase() + habitStrength.level.slice(1)}
            </span>
            <span className="text-[11px] text-[#9B9690] ml-1">({habitStrength.score}/100)</span>
          </div>
        </div>
      )}

      {/* Next-session risk */}
      {riskForecast?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#9B9690]">Skip risk today</span>
          <span className={`text-[14px] font-semibold ${RISK_COLORS[riskForecast.risk]}`}>
            {riskForecast.risk.charAt(0).toUpperCase() + riskForecast.risk.slice(1)}
          </span>
        </div>
      )}

      {/* Risk reasons */}
      {riskForecast?.reasons && riskForecast.reasons.length > 0 && (
        <div className="space-y-1">
          {riskForecast.reasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-[12px] text-[#C0392B]">• {r}</p>
          ))}
        </div>
      )}

      {/* Protective factors */}
      {riskForecast?.protectiveFactors && riskForecast.protectiveFactors.length > 0 && (
        <div className="space-y-1">
          {riskForecast.protectiveFactors.slice(0, 2).map((p, i) => (
            <p key={i} className="text-[12px] text-[#0F6E56]">✓ {p}</p>
          ))}
        </div>
      )}

      {/* Best day */}
      {patterns?.dataReady && patterns.bestWeekday !== null && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#9B9690]">Best day to train</span>
          <span className="text-[12px] font-medium text-[#1C1B18]">{patterns.bestWeekday}s</span>
        </div>
      )}

      {/* Adaptive sizing */}
      {workoutSize && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#9B9690]">Recommended duration</span>
          <span className="text-[12px] font-medium text-[#1C1B18]">
            {workoutSize.recommendedMinMin}–{workoutSize.recommendedMaxMin} min
          </span>
        </div>
      )}

      {/* Miss analysis */}
      {missedAnalysis?.dataReady && missedAnalysis.readinessDiff !== undefined && (
        <p className="text-[12px] text-[#6B6860]">
          You miss workouts when readiness is{" "}
          <span className="text-[#C0392B] font-medium">
            {Math.abs(Math.round(missedAnalysis.readinessDiff))} pts lower
          </span>{" "}
          than usual.
        </p>
      )}
    </div>
  );
}
