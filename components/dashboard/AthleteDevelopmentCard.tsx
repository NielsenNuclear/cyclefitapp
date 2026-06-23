"use client";

import type { TrainingAge as AthleteTrainingAge } from "@/lib/athlete/trainingAge";
import type { ResilienceIndex }                    from "@/lib/athlete/resilienceIndex";
import type { ProgressionVelocity }                from "@/lib/athlete/progressionVelocity";
import type { AthleteIdentity }                    from "@/lib/athlete/athleteIdentity";
import type { MilestoneReport }                    from "@/lib/athlete/milestoneDetection";

const MATURITY_COLOR: Record<string, string> = {
  beginner:     "text-slate-400",
  developing:   "text-amber-400",
  intermediate: "text-emerald-400",
  advanced:     "text-emerald-300",
  veteran:      "text-violet-400",
};

const RESILIENCE_COLOR: Record<string, string> = {
  low:      "text-rose-400",
  moderate: "text-amber-400",
  high:     "text-emerald-400",
  elite:    "text-violet-400",
};

const ARCHETYPE_ICON: Record<string, string> = {
  strength_focused:    "⚡",
  hypertrophy_focused: "💪",
  performance_focused: "🎯",
  lifestyle_focused:   "🌿",
};

interface Props {
  trainingAge:       AthleteTrainingAge | undefined;
  resilienceIndex:   ResilienceIndex    | undefined;
  progressionVelocity: ProgressionVelocity | undefined;
  athleteIdentity:   AthleteIdentity    | undefined;
  milestones:        MilestoneReport    | undefined;
}

export function AthleteDevelopmentCard({
  trainingAge, resilienceIndex, progressionVelocity, athleteIdentity, milestones,
}: Props) {
  const hasData = trainingAge?.dataReady || resilienceIndex?.dataReady || athleteIdentity?.dataReady;
  if (!hasData) return null;

  const recentMilestones = milestones?.recentlyAchieved ?? [];

  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200">Athlete Development</h3>

      {/* Athlete identity */}
      {athleteIdentity?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Archetype</span>
          <span className="text-xs text-slate-200 font-medium">
            {ARCHETYPE_ICON[athleteIdentity.archetype]} {athleteIdentity.label}
          </span>
        </div>
      )}

      {/* Training age / maturity */}
      {trainingAge?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Training maturity</span>
          <div className="text-right">
            <span className={`text-sm font-semibold ${MATURITY_COLOR[trainingAge.maturity]}`}>
              {trainingAge.maturity.charAt(0).toUpperCase() + trainingAge.maturity.slice(1)}
            </span>
            <span className="text-xs text-slate-500 ml-1">({trainingAge.estimatedAge})</span>
          </div>
        </div>
      )}

      {trainingAge?.dataReady && (
        <p className="text-xs text-slate-400">{trainingAge.headline}</p>
      )}

      {/* Resilience */}
      {resilienceIndex?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Resilience</span>
          <span className={`text-sm font-semibold ${RESILIENCE_COLOR[resilienceIndex.level]}`}>
            {resilienceIndex.level.charAt(0).toUpperCase() + resilienceIndex.level.slice(1)}
            <span className="text-xs text-slate-500 font-normal ml-1">({resilienceIndex.score}/100)</span>
          </span>
        </div>
      )}

      {/* Response class */}
      {progressionVelocity?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Adaptation speed</span>
          <span className="text-xs text-slate-200 font-medium">{progressionVelocity.label}</span>
        </div>
      )}

      {progressionVelocity?.dataReady && (
        <p className="text-xs text-slate-400">{progressionVelocity.implication}</p>
      )}

      {/* Next milestone */}
      {milestones?.nextMilestone && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Next milestone</span>
            <span className="text-xs text-slate-300">{milestones.nextMilestone.label}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${milestones.nextMilestone.progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">
            {milestones.nextMilestone.remaining} to go
          </p>
        </div>
      )}

      {/* Recent milestones */}
      {recentMilestones.length > 0 && (
        <div className="space-y-1">
          {recentMilestones.slice(0, 2).map(m => (
            <div key={m.type} className="flex items-center gap-2 bg-emerald-900/20 rounded-lg px-3 py-1.5">
              <span className="text-emerald-400 text-xs">🏆</span>
              <span className="text-xs text-emerald-300">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
