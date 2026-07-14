"use client";

import type { PeriodizationStatus } from "@/lib/periodization/periodizationState";
import type { CycleSynergySignal }  from "@/lib/periodization/cycleSynergy";
import type { AdaptiveDeloadDecision } from "@/lib/periodization/adaptiveDeload";
import type { AchievementForecast }  from "@/lib/periodization/achievementForecast";
import type { PeriodizationInsight } from "@/lib/periodization/periodizationLearning";
import { PHASE_COLORS }             from "@/lib/periodization/goalProfiles";
import { color as tokenColor, statusColors } from "@/lib/design/tokens";

// ─── Phase badge ──────────────────────────────────────────────────────────────
// PHASE_COLORS (accumulation/intensification/peak/deload) is a categorical
// per-phase identity palette, not a status scale — left as-is (see
// goalProfiles.ts), same reasoning as PhaseCard's cycle-phase colors.

function PhaseBadge({ phase, label }: { phase: string; label: string }) {
  const color = PHASE_COLORS[phase as keyof typeof PHASE_COLORS] ?? tokenColor.inkMuted;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function BlockProgressBar({ progress, phase }: { progress: number; phase: string }) {
  const color = PHASE_COLORS[phase as keyof typeof PHASE_COLORS] ?? tokenColor.brand;
  const pct   = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="relative h-2 bg-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Trajectory chip ─────────────────────────────────────────────────────────

const TRAJECTORY_CONFIG = {
  ahead:    { label: "Ahead",    bg: statusColors.success.bg, text: statusColors.success.text },
  on_track: { label: "On Track", bg: statusColors.brand.bg,   text: statusColors.brand.text },
  behind:   { label: "Behind",   bg: statusColors.caution.bg, text: statusColors.caution.text },
  stalled:  { label: "Stalled",  bg: statusColors.danger.bg,  text: statusColors.danger.text },
};

function TrajectoryChip({ trajectory }: { trajectory: AchievementForecast["trajectory"] }) {
  const cfg = TRAJECTORY_CONFIG[trajectory];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Synergy label chip ───────────────────────────────────────────────────────

const SYNERGY_CONFIG = {
  Optimal:   { bg: statusColors.success.bg, text: statusColors.success.text },
  Favorable: { bg: statusColors.brand.bg,   text: statusColors.brand.text },
  Neutral:   { bg: tokenColor.surfaceSubtle, text: tokenColor.inkSecondary },
  Protect:   { bg: statusColors.caution.bg, text: statusColors.caution.text },
};

function AlignmentChip({ label }: { label: CycleSynergySignal["alignmentLabel"] }) {
  const cfg = SYNERGY_CONFIG[label];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PeriodizationCardProps {
  status:            PeriodizationStatus;
  goalLabel:         string;
  cycleSynergy?:     CycleSynergySignal;
  deloadDecision?:   AdaptiveDeloadDecision;
  forecast?:         AchievementForecast;
  insight?:          PeriodizationInsight;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function PeriodizationCard({
  status,
  goalLabel,
  cycleSynergy,
  deloadDecision,
  forecast,
  insight,
}: PeriodizationCardProps) {
  const phaseColor = PHASE_COLORS[status.phase];

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${phaseColor}14` }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Goal Periodization
          </p>
          <p className="text-[13px] font-semibold text-ink mt-0.5">{goalLabel}</p>
        </div>
        <PhaseBadge phase={status.phase} label={status.label} />
      </div>

      <div className="px-4 py-3 space-y-3">

        {/* Deload alert */}
        {(deloadDecision?.triggerEarly || status.forcedEarly) && (
          <div className="px-3 py-2 bg-caution-bg rounded-xl border border-caution-border">
            <p className="text-[11px] font-semibold text-caution">Early Deload Triggered</p>
            <p className="text-[11px] text-caution-text mt-0.5 leading-relaxed">
              {deloadDecision?.reason ?? "Fatigue signals suggest taking a recovery week now."}
            </p>
          </div>
        )}

        {/* Delayed deload note */}
        {deloadDecision?.delay && !deloadDecision.triggerEarly && (
          <div className="px-3 py-2 bg-success-bg rounded-xl border border-success-border">
            <p className="text-[11px] font-semibold text-success">Deload Delayed</p>
            <p className="text-[11px] text-success-text mt-0.5 leading-relaxed">
              {deloadDecision.reason}
            </p>
          </div>
        )}

        {/* Block progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-ink-secondary">
              Week {status.mesocycleWeek} of {status.blockLengthWeeks}
            </span>
            <span className="text-[11px] text-ink-secondary">
              {Math.round(status.blockProgress * 100)}% complete
            </span>
          </div>
          <BlockProgressBar progress={status.blockProgress} phase={status.phase} />
        </div>

        {/* Phase description */}
        <p className="text-[11px] text-ink-secondary leading-relaxed">{status.description}</p>

        {/* Next phase */}
        {status.weeksUntilNextPhase > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
            <span>Next:</span>
            <PhaseBadge phase={status.nextPhase} label={status.nextPhaseLabel} />
            <span>in {status.weeksUntilNextPhase} week{status.weeksUntilNextPhase !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Cycle synergy */}
        {cycleSynergy && (
          <div className="pt-2 border-t border-surface-hover">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                Cycle Alignment
              </span>
              <AlignmentChip label={cycleSynergy.alignmentLabel} />
            </div>
            <p className="text-[11px] text-ink-secondary leading-relaxed">
              {cycleSynergy.alignmentNote}
            </p>
          </div>
        )}

        {/* Achievement forecast */}
        {forecast && (
          <div className="pt-2 border-t border-surface-hover">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                Goal Progress
              </span>
              <TrajectoryChip trajectory={forecast.trajectory} />
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-border rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${forecast.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-brand font-semibold">
                {forecast.progressPercent}%
              </span>
              {forecast.estimatedWeeksToMilestone !== null && (
                <span className="text-[11px] text-ink-secondary">
                  ~{forecast.estimatedWeeksToMilestone} weeks to milestone
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-secondary leading-relaxed">{forecast.coachingNote}</p>

            {/* Current phase contribution */}
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed italic">
              {forecast.currentPhaseContribution}
            </p>
          </div>
        )}

        {/* Learning insight */}
        {insight && insight.confidence !== "early" && (
          <div className="pt-2 border-t border-surface-hover">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1">
              What Axis Has Learned
            </p>
            <p className="text-[11px] text-ink-secondary leading-relaxed">{insight.insight}</p>
          </div>
        )}

      </div>
    </div>
  );
}
