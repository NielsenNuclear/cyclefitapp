"use client";

import type { GoalRoadmap } from "@/lib/planning/goalRoadmap";
import type { GoalFeasibility } from "@/lib/planning/goalFeasibility";
import type { TimelineUpdate } from "@/lib/planning/timelineUpdater";

interface Props {
  roadmap:    GoalRoadmap | undefined;
  feasibility: GoalFeasibility | undefined;
  timeline:   TimelineUpdate | undefined;
}

const STATUS_COLOR: Record<string, string> = {
  ahead:           "text-emerald-400",
  on_track:        "text-sky-400",
  slightly_behind: "text-amber-400",
  behind:          "text-rose-400",
};

const STATUS_LABEL: Record<string, string> = {
  ahead:           "Ahead of schedule",
  on_track:        "On track",
  slightly_behind: "Slightly behind",
  behind:          "Behind schedule",
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function GoalRoadmapCard({ roadmap, feasibility, timeline }: Props) {
  if (!roadmap || !roadmap.dataReady) return null;

  const timelineColor = timeline ? STATUS_COLOR[timeline.status] : "text-sky-400";
  const timelineLabel = timeline ? STATUS_LABEL[timeline.status] : "On track";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Goal Roadmap</h3>
        {timeline && (
          <span className={`text-xs font-semibold ${timelineColor}`}>{timelineLabel}</span>
        )}
      </div>

      {/* Progress overview */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold text-white">{roadmap.completionPercent}%</div>
          <div className="text-[10px] text-white/35 mt-0.5">
            of {roadmap.metricLabel} target
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/55">{roadmap.weeklyRate > 0 ? `+${roadmap.weeklyRate}%/wk` : "No data yet"}</div>
          <div className="text-[10px] text-white/35">
            {roadmap.estimatedWeeks > 0
              ? `Est. ${formatDate(roadmap.estimatedEndDate)}`
              : "Goal reached"}
          </div>
        </div>
      </div>

      {/* Progress bar: start → current → target */}
      <div className="space-y-1">
        <div className="w-full h-3 rounded-full bg-white/10 relative overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-sky-600 to-violet-600 transition-all"
            style={{ width: `${roadmap.completionPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-white/25">
          <span>{typeof roadmap.startValue === "number" ? roadmap.startValue.toFixed(1) : "—"}</span>
          <span className="text-white/40 font-medium">
            {typeof roadmap.currentValue === "number" ? roadmap.currentValue.toFixed(1) : "—"} now
          </span>
          <span>{typeof roadmap.targetValue === "number" ? roadmap.targetValue.toFixed(1) : "—"}</span>
        </div>
      </div>

      {/* Milestones */}
      {roadmap.milestones.length > 0 && (
        <div className="space-y-1.5">
          {roadmap.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${m.achieved ? "bg-emerald-500/30" : "bg-white/8"}`}>
                {m.achieved
                  ? <span className="text-emerald-400 text-[9px]">✓</span>
                  : <span className="text-white/20 text-[9px]">{i + 1}</span>}
              </div>
              <span className={`text-[11px] flex-1 ${m.achieved ? "text-white/60 line-through" : "text-white/50"}`}>
                {m.label}
              </span>
              {!m.achieved && (
                <span className="text-[10px] text-white/25">{formatDate(m.estimatedDate)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feasibility note */}
      {feasibility && (
        <div className="pt-1 border-t border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/35">Feasibility confidence</span>
            <span className={`text-xs font-semibold ${feasibility.confidence >= 70 ? "text-emerald-400" : feasibility.confidence >= 50 ? "text-amber-400" : "text-rose-400"}`}>
              {feasibility.confidence}%
            </span>
          </div>
          {feasibility.limitingFactors.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {feasibility.limitingFactors.slice(0, 2).map((f, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className={`text-[9px] mt-0.5 ${f.severity === "significant" ? "text-rose-400" : f.severity === "moderate" ? "text-amber-400" : "text-sky-400"}`}>▲</span>
                  <span className="text-[10px] text-white/40">{f.factor}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
