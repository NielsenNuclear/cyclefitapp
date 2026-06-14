"use client";

import type { ProgressionTarget }           from "@/lib/progression/progressionTargets";
import type { ExerciseMasteryEntry }        from "@/lib/progression/exerciseMastery";
import type { PerformanceTrend }            from "@/lib/analytics/performanceTrends";
import type { PlateauIntervention }         from "@/lib/progression/plateauIntervention";
import type { Mesocycle }                   from "@/lib/planning/mesocycleBuilder";
import type { WeeklyProgressionPrescription } from "@/lib/planning/goalProgression";

interface ProgressCardProps {
  progressionTargets:   ProgressionTarget[];
  exerciseMastery:      ExerciseMasteryEntry[];
  performanceTrends:    PerformanceTrend[];
  plateauInterventions: PlateauIntervention[];
  mesocycle:            Mesocycle | null;
  weeklyPrescription:   WeeklyProgressionPrescription | null;
}

const INTERVENTION_COLOR: Record<string, string> = {
  intensity: "bg-orange-100 text-orange-800",
  variation: "bg-purple-100 text-purple-800",
  density:   "bg-blue-100 text-blue-800",
  power:     "bg-green-100 text-green-800",
};

const TREND_LABEL: Record<string, { label: string; color: string }> = {
  improving:         { label: "improving",   color: "text-green-600" },
  stable:            { label: "stable",      color: "text-blue-600"  },
  plateau:           { label: "plateaus",    color: "text-amber-600" },
  regressing:        { label: "regressing",  color: "text-red-600"   },
  insufficient_data: { label: "tracked",     color: "text-gray-400"  },
};

const PROGRESSION_BADGE: Record<string, { label: string; color: string }> = {
  load:     { label: "Add Load",   color: "bg-green-100 text-green-800"  },
  reps:     { label: "Add Reps",   color: "bg-blue-100 text-blue-800"    },
  deload:   { label: "Deload",     color: "bg-amber-100 text-amber-800"  },
  maintain: { label: "Maintain",   color: "bg-gray-100 text-gray-600"    },
};

export function ProgressCard({
  progressionTargets,
  exerciseMastery,
  performanceTrends,
  plateauInterventions,
  mesocycle,
  weeklyPrescription,
}: ProgressCardProps) {
  // ── Derived counts ─────────────────────────────────────────────────────────
  const trendCounts = performanceTrends.reduce<Record<string, number>>(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const hasMeaningfulTrends = performanceTrends.some(
    t => t.status !== "insufficient_data"
  );

  // Mastery lookup by exercise name
  const masteryMap = new Map(exerciseMastery.map(m => [m.exerciseName, m]));

  // Targets to surface (exclude maintain)
  const actionableTargets = progressionTargets
    .filter(t => t.progressionType !== "maintain")
    .slice(0, 5);

  const allMaintain =
    progressionTargets.length > 0 &&
    progressionTargets.every(t => t.progressionType === "maintain");

  const topInterventions = plateauInterventions.slice(0, 3);

  if (!weeklyPrescription && !mesocycle && progressionTargets.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900">Training Progress</h2>
          {weeklyPrescription && (
            <div className="flex items-center gap-2 flex-wrap">
              {weeklyPrescription.isDeload ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  Deload Week
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                  {weeklyPrescription.focus}
                </span>
              )}
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                RPE {weeklyPrescription.rpeTarget}
              </span>
            </div>
          )}
        </div>
        {weeklyPrescription && (
          <p className="mt-1 text-sm text-gray-500">{weeklyPrescription.weekLabel}</p>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {/* ── Key Guidance ───────────────────────────────────────────────────── */}
        {weeklyPrescription && weeklyPrescription.keyGuidance.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              This Week
            </p>
            <ul className="space-y-1.5">
              {weeklyPrescription.keyGuidance.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Mesocycle Timeline ─────────────────────────────────────────────── */}
        {mesocycle && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Block Progress — Week {mesocycle.currentWeek} of {mesocycle.totalWeeks}
            </p>
            <div className="flex gap-2">
              {mesocycle.weeks.map(week => {
                const isPast    = week.weekNumber < mesocycle.currentWeek;
                const isCurrent = week.weekNumber === mesocycle.currentWeek;
                return (
                  <div key={week.weekNumber} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div
                      className={[
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                        week.isDeload
                          ? isCurrent
                            ? "bg-amber-400 text-white ring-2 ring-amber-400 ring-offset-2"
                            : isPast
                              ? "bg-amber-200 text-amber-700"
                              : "bg-gray-100 text-gray-400"
                          : isCurrent
                            ? "bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2"
                            : isPast
                              ? "bg-indigo-200 text-indigo-700"
                              : "bg-gray-100 text-gray-400",
                      ].join(" ")}
                    >
                      {week.weekNumber}
                    </div>
                    <span className="text-[10px] text-gray-400 truncate w-full text-center leading-tight">
                      {week.isDeload ? "Deload" : week.focus.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trend Summary ─────────────────────────────────────────────────── */}
        {hasMeaningfulTrends && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Exercise Trends
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(["improving", "stable", "plateau", "regressing"] as const).map(status => {
                const count = trendCounts[status] ?? 0;
                if (count === 0) return null;
                const { label, color } = TREND_LABEL[status];
                return (
                  <span key={status} className={`text-sm font-medium ${color}`}>
                    {count} {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Plateau Interventions ─────────────────────────────────────────── */}
        {topInterventions.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Plateau Alerts
            </p>
            <div className="space-y-3">
              {topInterventions.map(inv => {
                const chipColor =
                  INTERVENTION_COLOR[inv.interventionType] ??
                  "bg-gray-100 text-gray-600";
                return (
                  <div key={inv.exerciseName} className="bg-amber-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {inv.exerciseName}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${chipColor}`}
                      >
                        {inv.interventionType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{inv.suggestion}</p>
                    <p className="mt-1 text-xs text-gray-500">{inv.rationale}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Next Session Targets ──────────────────────────────────────────── */}
        {progressionTargets.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Next Session Targets
            </p>
            {allMaintain ? (
              <p className="text-sm text-gray-500">
                All exercises on track — maintain current loads.
              </p>
            ) : (
              <div className="space-y-2">
                {actionableTargets.map(target => {
                  const badge =
                    PROGRESSION_BADGE[target.progressionType] ??
                    PROGRESSION_BADGE.maintain;
                  const mastery = masteryMap.get(target.exerciseName);
                  return (
                    <div
                      key={target.exerciseName}
                      className="flex flex-col gap-1 py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {target.exerciseName}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {target.targetWeight > 0
                          ? `${target.targetWeight} kg × `
                          : "Bodyweight × "}
                        {target.targetReps} reps × {target.targetSets} sets
                      </p>
                      {target.note && (
                        <p className="text-xs text-indigo-600">{target.note}</p>
                      )}
                      {mastery?.advancementSuggestion && (
                        <p className="text-xs text-emerald-600">
                          Ready to progress → {mastery.advancementSuggestion}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
