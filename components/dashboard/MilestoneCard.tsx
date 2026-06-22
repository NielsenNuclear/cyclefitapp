"use client";

import type { MilestoneStatus, MilestoneCategory } from "@/lib/planning/milestoneEngine";

interface Props {
  milestones: MilestoneStatus | undefined;
}

const CAT_COLOR: Record<MilestoneCategory, string> = {
  consistency:  "bg-sky-500/20 text-sky-400",
  strength:     "bg-violet-500/20 text-violet-400",
  data:         "bg-teal-500/20 text-teal-400",
  training_age: "bg-amber-500/20 text-amber-400",
};

function formatDate(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function MilestoneCard({ milestones }: Props) {
  if (!milestones || milestones.totalCount === 0) return null;

  const next     = milestones.nextMilestone;
  const achieved = milestones.achieved.slice(-4).reverse();   // last 4, newest first

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Milestones</h3>
        <span className="text-xs text-white/40">
          {milestones.achievedCount} / {milestones.totalCount}
        </span>
      </div>

      {/* Overall progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-white/35">
          <span>Overall progress</span>
          <span>{milestones.completionPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-amber-500 transition-all"
            style={{ width: `${milestones.completionPercent}%` }}
          />
        </div>
      </div>

      {/* Next milestone */}
      {next && (
        <div className="bg-white/5 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${CAT_COLOR[next.category]}`}>
                {next.category.replace("_", " ")}
              </span>
              <span className="text-xs font-semibold text-white">{next.label}</span>
            </div>
            <span className="text-xs font-semibold text-amber-400">{next.progress}%</span>
          </div>
          <p className="text-[11px] text-white/45">{next.description}</p>
          <div className="w-full h-1.5 rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-amber-500 transition-all"
              style={{ width: `${next.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Recently achieved */}
      {achieved.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-white/30 uppercase tracking-widest">Recently achieved</div>
          {achieved.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-emerald-400 text-xs">✓</span>
              <span className="text-[11px] text-white/60 flex-1">{m.label}</span>
              {m.achievedDate && (
                <span className="text-[10px] text-white/30">{formatDate(m.achievedDate)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
