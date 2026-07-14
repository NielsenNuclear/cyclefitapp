"use client";

import type { TrainingAge as AthleteTrainingAge } from "@/lib/athlete/trainingAge";
import type { ResilienceIndex }                    from "@/lib/athlete/resilienceIndex";
import type { ProgressionVelocity }                from "@/lib/athlete/progressionVelocity";
import type { AthleteIdentity }                    from "@/lib/athlete/athleteIdentity";
import type { MilestoneReport }                    from "@/lib/athlete/milestoneDetection";

const MATURITY_COLORS: Record<string, string> = {
  beginner:     "text-ink-muted",
  developing:   "text-caution",
  intermediate: "text-success",
  advanced:     "text-success-text",
  veteran:      "text-brand",
};

const RESILIENCE_COLORS: Record<string, string> = {
  low:      "text-danger",
  moderate: "text-caution",
  high:     "text-success",
  elite:    "text-brand",
};

const ARCHETYPE_ICON: Record<string, string> = {
  strength_focused:    "⚡",
  hypertrophy_focused: "💪",
  performance_focused: "🎯",
  lifestyle_focused:   "🌿",
};

interface Props {
  trainingAge:         AthleteTrainingAge | undefined;
  resilienceIndex:     ResilienceIndex    | undefined;
  progressionVelocity: ProgressionVelocity | undefined;
  athleteIdentity:     AthleteIdentity    | undefined;
  milestones:          MilestoneReport    | undefined;
}

export function AthleteDevelopmentCard({
  trainingAge, resilienceIndex, progressionVelocity, athleteIdentity, milestones,
}: Props) {
  const hasData = trainingAge?.dataReady || resilienceIndex?.dataReady || athleteIdentity?.dataReady;
  if (!hasData) return null;

  const recentMilestones = milestones?.recentlyAchieved ?? [];

  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <h3 className="text-[15px] font-semibold text-ink">Athlete development</h3>

      {/* Athlete identity / archetype */}
      {athleteIdentity?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Archetype</span>
          <span className="text-[12px] font-medium text-ink">
            {ARCHETYPE_ICON[athleteIdentity.archetype]} {athleteIdentity.label}
          </span>
        </div>
      )}

      {/* Training age / maturity */}
      {trainingAge?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Training maturity</span>
          <div className="text-right">
            <span className={`text-[14px] font-semibold ${MATURITY_COLORS[trainingAge.maturity]}`}>
              {trainingAge.maturity.charAt(0).toUpperCase() + trainingAge.maturity.slice(1)}
            </span>
            <span className="text-[11px] text-ink-muted ml-1">({trainingAge.estimatedAge})</span>
          </div>
        </div>
      )}

      {trainingAge?.dataReady && (
        <p className="text-[12px] text-ink-secondary">{trainingAge.headline}</p>
      )}

      {/* Resilience index */}
      {resilienceIndex?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Resilience</span>
          <span className={`text-[14px] font-semibold ${RESILIENCE_COLORS[resilienceIndex.level]}`}>
            {resilienceIndex.level.charAt(0).toUpperCase() + resilienceIndex.level.slice(1)}
            <span className="text-[11px] text-ink-muted font-normal ml-1">({resilienceIndex.score}/100)</span>
          </span>
        </div>
      )}

      {/* Progression velocity */}
      {progressionVelocity?.dataReady && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Adaptation speed</span>
          <span className="text-[12px] font-medium text-ink">{progressionVelocity.label}</span>
        </div>
      )}

      {progressionVelocity?.dataReady && (
        <p className="text-[12px] text-ink-secondary">{progressionVelocity.implication}</p>
      )}

      {/* Next milestone */}
      {milestones?.nextMilestone && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">Next milestone</span>
            <span className="text-[12px] text-ink">{milestones.nextMilestone.label}</span>
          </div>
          <div className="w-full h-[3px] bg-black/8 rounded-full overflow-hidden">
            <div
              className="bg-brand h-full rounded-full"
              style={{ width: `${milestones.nextMilestone.progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-ink-muted text-right">
            {milestones.nextMilestone.remaining} to go
          </p>
        </div>
      )}

      {/* Recent milestones */}
      {recentMilestones.length > 0 && (
        <div className="space-y-1.5">
          {recentMilestones.slice(0, 2).map(m => (
            <div key={m.type} className="flex items-center gap-2 bg-success-bg border border-success-border rounded-xl px-3 py-1.5">
              <span className="text-[12px]">🏆</span>
              <span className="text-[12px] text-success-text font-medium">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
