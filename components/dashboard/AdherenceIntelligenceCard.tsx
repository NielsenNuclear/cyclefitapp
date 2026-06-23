"use client";

import type { AdherencePatternReport }  from "@/lib/adherence/patternEngine";
import type { MissedWorkoutAnalysis }   from "@/lib/adherence/missedWorkoutAnalysis";
import type { AdherenceRiskForecast }   from "@/lib/adherence/adherenceRiskForecast";
import type { WorkoutSizeRecommendation } from "@/lib/adherence/adaptiveWorkoutSizing";
import type { HabitStrengthScore }      from "@/lib/adherence/habitStrength";

const RISK_COLOR: Record<string, string> = {
  low:      "text-emerald-400",
  moderate: "text-amber-400",
  high:     "text-rose-400",
};

const HABIT_COLOR: Record<string, string> = {
  nascent:     "text-slate-400",
  forming:     "text-amber-400",
  established: "text-emerald-400",
  strong:      "text-emerald-300",
  automatic:   "text-violet-400",
};

interface Props {
  patterns:         AdherencePatternReport | undefined;
  missedAnalysis:   MissedWorkoutAnalysis  | undefined;
  riskForecast:     AdherenceRiskForecast  | undefined;
  workoutSize:      WorkoutSizeRecommendation | undefined;
  habitStrength:    HabitStrengthScore     | undefined;
}

export function AdherenceIntelligenceCard({
  patterns, missedAnalysis, riskForecast, workoutSize, habitStrength,
}: Props) {
  if (!patterns?.dataReady && !riskForecast?.dataReady && !habitStrength?.dataReady) return null;

  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200">Adherence Intelligence</h3>

      {/* Habit strength */}
      {habitStrength?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Habit strength</span>
          <div className="text-right">
            <span className={`text-sm font-semibold ${HABIT_COLOR[habitStrength.level]}`}>
              {habitStrength.level.charAt(0).toUpperCase() + habitStrength.level.slice(1)}
            </span>
            <span className="text-xs text-slate-500 ml-1">({habitStrength.score}/100)</span>
          </div>
        </div>
      )}

      {/* Next-session risk */}
      {riskForecast?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Next workout risk</span>
          <span className={`text-sm font-semibold ${RISK_COLOR[riskForecast.risk]}`}>
            {riskForecast.risk.charAt(0).toUpperCase() + riskForecast.risk.slice(1)}
          </span>
        </div>
      )}

      {/* Risk reasons / protective */}
      {riskForecast?.reasons && riskForecast.reasons.length > 0 && (
        <div className="space-y-1">
          {riskForecast.reasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-rose-300">• {r}</p>
          ))}
        </div>
      )}
      {riskForecast?.protectiveFactors && riskForecast.protectiveFactors.length > 0 && (
        <div className="space-y-1">
          {riskForecast.protectiveFactors.slice(0, 2).map((p, i) => (
            <p key={i} className="text-xs text-emerald-400">✓ {p}</p>
          ))}
        </div>
      )}

      {/* Best day */}
      {patterns?.dataReady && patterns.bestWeekday !== null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Best day to train</span>
          <span className="text-xs text-slate-200 font-medium">{patterns.bestWeekday}s</span>
        </div>
      )}

      {/* Adaptive sizing */}
      {workoutSize && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Recommended duration</span>
          <span className="text-xs text-slate-200 font-medium">
            {workoutSize.recommendedMinMin}–{workoutSize.recommendedMaxMin} min
          </span>
        </div>
      )}

      {/* Miss analysis */}
      {missedAnalysis?.dataReady && missedAnalysis.readinessDiff !== undefined && (
        <p className="text-xs text-slate-400">
          You miss workouts when readiness is{" "}
          <span className="text-rose-300 font-medium">
            {Math.abs(Math.round(missedAnalysis.readinessDiff))} pts lower
          </span>{" "}
          than usual.
        </p>
      )}
    </div>
  );
}
