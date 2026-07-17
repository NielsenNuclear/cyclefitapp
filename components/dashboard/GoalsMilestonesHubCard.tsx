"use client";

// ─── components/dashboard/GoalsMilestonesHubCard.tsx ──────────────────────────
// Dashboard 2.0 — Layer 3. Merges GoalProgressCard (anchor — richer of the two
// goal-tracking cards: has ETA, 4-week projection, coaching message),
// GoalRoadmapCard, MilestoneCard, and LongitudinalTimelineCard into one card.
// GoalRoadmapCard is a confirmed duplicate of GoalProgressCard from a second,
// independent goal-tracking engine (lib/planning/goalRoadmap.ts vs
// lib/goals/*) — flagged as tech debt, only one copy renders here.
// AthleteDevelopmentCard's milestone content also redirects here (see
// AthleteProfileHubCard) to avoid a 5th milestone surface — four independent
// milestone engines existed before this pass (lib/planning/milestoneEngine,
// lib/athlete/milestoneDetection, lib/athlete/athleteTimeline,
// GoalRoadmapCard's embedded array); LongitudinalTimelineCard's timeline
// visualization is the richest presentation and anchors that section.
// See docs/ux/UXStabilizationAudit.md Batch 17.

import { useState } from "react";
import { useMemo } from "react";
import { computeGoalSnapshot } from "@/lib/goals/goalTracking";
import { computeGoalProgress } from "@/lib/goals/goalProgress";
import { computeGoalForecast } from "@/lib/goals/goalForecast";
import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { MilestoneStatus } from "@/lib/planning/milestoneEngine";
import type { MilestoneReport } from "@/lib/athlete/milestoneDetection";
import type { TimelineEvent } from "@/lib/athlete/athleteTimeline";
import { AxisIcon } from "@/components/ui/Icon";

const STATUS_STYLES: Record<string, string> = {
  complete: "bg-success-bg text-success-text", ahead: "bg-brand-bg-mid text-brand-dark",
  on_track: "bg-brand-bg-mid text-brand", behind: "bg-caution-bg text-caution-text", stalled: "bg-danger-bg text-danger",
};
const STATUS_LABELS: Record<string, string> = {
  complete: "Goal reached", ahead: "Ahead of pace", on_track: "On track", behind: "Behind pace", stalled: "Stalled",
};
const GOAL_LABELS: Record<GoalType, string> = {
  strength: "Build Strength", hypertrophy: "Build Muscle", fat_loss: "Fat Loss",
  general_fitness: "General Fitness", athletic_performance: "Athletic Performance",
};
const EVENT_STYLE: Record<string, { dot: string; label: string }> = {
  started: { dot: "bg-brand", label: "Start" }, consistency: { dot: "bg-success", label: "Streak" },
  volume_increase: { dot: "bg-success", label: "Volume ↑" }, volume_reduction: { dot: "bg-caution", label: "Volume ↓" },
  readiness_peak: { dot: "bg-brand", label: "Peak" }, readiness_low: { dot: "bg-caution", label: "Low" },
  recovery_peak: { dot: "bg-success", label: "Peak" }, recovery_trend: { dot: "bg-success", label: "Trend" },
  session_milestone: { dot: "bg-brand", label: "Milestone" }, program_change: { dot: "bg-neutral", label: "Change" },
};
const EVENT_BADGE: Record<string, string> = {
  "bg-brand": "bg-brand-bg-mid text-brand-text", "bg-success": "bg-success-bg text-success-text",
  "bg-caution": "bg-caution-bg text-caution-text", "bg-neutral": "bg-neutral-bg text-neutral-text",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}
function Divider() { return <div className="h-px bg-surface-hover my-3" />; }
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}

interface GoalsMilestonesHubCardProps {
  goalType:         GoalType;
  sessionsPerWeek:  number;
  milestones?:      MilestoneStatus;
  athleteMilestones?: MilestoneReport;
  timelineEvents:   TimelineEvent[];
}

export function GoalsMilestonesHubCard({ goalType, sessionsPerWeek, milestones, athleteMilestones, timelineEvents }: GoalsMilestonesHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const snapshot = useMemo(() => computeGoalSnapshot(goalType, sessionsPerWeek), [goalType, sessionsPerWeek]);
  const progress = useMemo(() => computeGoalProgress(snapshot), [snapshot]);
  const forecast = useMemo(() => computeGoalForecast(progress, {
    targetValue: snapshot.targetValue, currentValue: snapshot.currentValue,
    unit: snapshot.unit, baselineValue: snapshot.baselineValue,
  }), [progress, snapshot]);

  const nextMilestone = milestones?.nextMilestone ?? null;
  const recentMilestones = [
    ...(milestones?.achieved.slice(-4).reverse() ?? []).map(m => ({ id: m.id, label: m.label, date: m.achievedDate })),
    ...(athleteMilestones?.recentlyAchieved.slice(0, 2) ?? []).map(m => ({ id: m.type, label: m.label, date: null as string | null })),
  ].slice(0, 4);
  const displayEvents = [...timelineEvents].reverse().slice(0, 8);

  const hasDetails = recentMilestones.length > 0 || displayEvents.length > 0;

  if (!snapshot.hasEnoughData) {
    return (
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
        <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
          <h2 className="text-[15px] font-semibold text-ink">Goals & Milestones · {GOAL_LABELS[goalType]}</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">Am I making progress toward my goal?</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12px] text-ink-muted leading-relaxed">{progress.coachingMessage}</p>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, progress.percentComplete));

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Goals & Milestones</h2>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[forecast.status] ?? STATUS_STYLES.on_track}`}>
            {STATUS_LABELS[forecast.status] ?? forecast.status}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">{GOAL_LABELS[goalType]}</p>
      </div>

      <div className="px-5 py-4">
        <div className="mb-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-ink-muted">{snapshot.metricLabel}</span>
            <span className="text-[11px] font-semibold text-brand">{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${Math.round(pct)}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-ink-muted">{snapshot.baselineValue} {snapshot.unit}</span>
            <span className="text-[10px] text-ink-muted">{snapshot.targetValue} {snapshot.unit}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 my-3">
          <div className="text-center">
            <div className="text-[13px] font-bold text-ink">{snapshot.currentValue} <span className="text-[10px] font-normal text-ink-muted">{snapshot.unit}</span></div>
            <div className="text-[9px] text-ink-muted uppercase tracking-wide mt-0.5">Current</div>
          </div>
          <div className="text-center">
            <div className={`text-[13px] font-bold ${progress.changeFromBase >= 0 ? "text-success-text" : "text-danger"}`}>
              {progress.changeFromBase >= 0 ? "+" : ""}{progress.changeFromBase}
            </div>
            <div className="text-[9px] text-ink-muted uppercase tracking-wide mt-0.5">vs Baseline</div>
          </div>
          <div className="text-center">
            <div className="text-[13px] font-bold text-ink">{progress.etaWeeks ? `${progress.etaWeeks}w` : "—"}</div>
            <div className="text-[9px] text-ink-muted uppercase tracking-wide mt-0.5">ETA</div>
          </div>
        </div>

        <p className="text-[12px] text-ink-secondary leading-relaxed">{forecast.summaryLine}</p>

        {nextMilestone && (
          <div className="bg-surface-hover rounded-xl p-3 space-y-2 mt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-ink">{nextMilestone.label}</span>
              <span className="text-[12px] font-semibold text-caution">{nextMilestone.progress}%</span>
            </div>
            <p className="text-[11px] text-ink-muted">{nextMilestone.description}</p>
            <div className="w-full h-1.5 rounded-full bg-surface-subtle overflow-hidden">
              <div className="h-1.5 rounded-full bg-caution" style={{ width: `${nextMilestone.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px]"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Achievements & timeline"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 border-t border-border">
          {recentMilestones.length > 0 && (
            <div>
              <SectionLabel>Recently achieved</SectionLabel>
              <div className="space-y-1.5">
                {recentMilestones.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-success text-[12px]">✓</span>
                    <span className="text-[11px] text-ink-secondary flex-1">{m.label}</span>
                    {m.date && <span className="text-[10px] text-ink-faint">{formatDate(m.date)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayEvents.length > 0 && (
            <>
              {recentMilestones.length > 0 && <Divider />}
              <div>
                <SectionLabel>Training timeline · {timelineEvents.length} tracked</SectionLabel>
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
                  <div className="space-y-4">
                    {displayEvents.map(event => {
                      const style = EVENT_STYLE[event.type] ?? { dot: "bg-neutral", label: event.type };
                      return (
                        <div key={event.id} className="flex items-start gap-3 pl-6 relative">
                          <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-surface ${style.dot} flex-shrink-0`} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${EVENT_BADGE[style.dot] ?? "bg-neutral-bg text-neutral-text"}`}>{style.label}</span>
                              <span className="text-[10px] text-ink-muted">{formatDate(event.date)}</span>
                            </div>
                            <p className="text-[12px] font-semibold text-ink mt-0.5">{event.label}</p>
                            <p className="text-[11px] text-ink-secondary leading-snug">{event.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
