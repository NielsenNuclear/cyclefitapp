"use client";

import type { AdherencePatternReport }    from "@/lib/adherence/patternEngine";
import type { MissedWorkoutAnalysis }     from "@/lib/adherence/missedWorkoutAnalysis";
import type { AdherenceRiskForecast }     from "@/lib/adherence/adherenceRiskForecast";
import type { WorkoutSizeRecommendation } from "@/lib/adherence/adaptiveWorkoutSizing";
import type { HabitStrengthScore }        from "@/lib/adherence/habitStrength";

const RISK_COLORS: Record<string, string> = {
  low:      "text-success",
  moderate: "text-caution",
  high:     "text-danger",
};

const HABIT_COLORS: Record<string, string> = {
  nascent:     "text-ink-muted",
  forming:     "text-caution",
  established: "text-success",
  strong:      "text-success-text",
  automatic:   "text-brand",
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
    <div className="bg-white rounded-2xl border border-border p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <h3 className="text-[15px] font-semibold text-ink">Training consistency</h3>

      {/* Habit strength */}
      {habitStrength?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Habit strength</span>
          <div className="text-right">
            <span className={`text-[14px] font-semibold ${HABIT_COLORS[habitStrength.level]}`}>
              {habitStrength.level.charAt(0).toUpperCase() + habitStrength.level.slice(1)}
            </span>
            <span className="text-[11px] text-ink-muted ml-1">({habitStrength.score}/100)</span>
          </div>
        </div>
      )}

      {/* Next-session risk */}
      {riskForecast?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Skip risk today</span>
          <span className={`text-[14px] font-semibold ${RISK_COLORS[riskForecast.risk]}`}>
            {riskForecast.risk.charAt(0).toUpperCase() + riskForecast.risk.slice(1)}
          </span>
        </div>
      )}

      {/* Risk reasons */}
      {riskForecast?.reasons && riskForecast.reasons.length > 0 && (
        <div className="space-y-1">
          {riskForecast.reasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-[12px] text-danger">• {r}</p>
          ))}
        </div>
      )}

      {/* Protective factors */}
      {riskForecast?.protectiveFactors && riskForecast.protectiveFactors.length > 0 && (
        <div className="space-y-1">
          {riskForecast.protectiveFactors.slice(0, 2).map((p, i) => (
            <p key={i} className="text-[12px] text-success">✓ {p}</p>
          ))}
        </div>
      )}

      {/* Best day */}
      {patterns?.dataReady && patterns.bestWeekday !== null && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Best day to train</span>
          <span className="text-[12px] font-medium text-ink">{patterns.bestWeekday}s</span>
        </div>
      )}

      {/* Adaptive sizing */}
      {workoutSize && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Recommended duration</span>
          <span className="text-[12px] font-medium text-ink">
            {workoutSize.recommendedMinMin}–{workoutSize.recommendedMaxMin} min
          </span>
        </div>
      )}

      {/* Miss analysis */}
      {missedAnalysis?.dataReady && missedAnalysis.readinessDiff !== undefined && (
        <p className="text-[12px] text-ink-secondary">
          You miss workouts when readiness is{" "}
          <span className="text-danger font-medium">
            {Math.abs(Math.round(missedAnalysis.readinessDiff))} pts lower
          </span>{" "}
          than usual.
        </p>
      )}
    </div>
  );
}
