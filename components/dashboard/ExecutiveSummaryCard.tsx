"use client";

import type { CapacityScore }     from "@/lib/unified/capacityScore";
import type { MomentumScore }     from "@/lib/unified/momentumScore";
import type { TrajectoryScore }   from "@/lib/unified/trajectoryEngine";
import type { UnifiedInsight }    from "@/lib/unified/unifiedInsightsFeed";

interface Props {
  capacity:    CapacityScore | undefined;
  momentum:    MomentumScore | undefined;
  trajectory:  TrajectoryScore | undefined;
  insights:    UnifiedInsight[] | undefined;
}

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-rose-400",
  high:     "bg-amber-400",
  medium:   "bg-sky-400",
  low:      "bg-emerald-400",
};

const TRAJ_COLOR: Record<string, string> = {
  ahead_of_pace:        "text-[#0F6E56]",
  on_pace:              "text-[#1B4FA0]",
  slightly_behind:      "text-[#854F0B]",
  significantly_behind: "text-[#C0392B]",
  insufficient_data:    "text-[#C8C5BC]",
};

export function ExecutiveSummaryCard({ capacity, momentum, trajectory, insights }: Props) {
  if (!capacity) return null;

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-[#1C1B18]">Today's Story</h3>

      {/* Three numbers */}
      <div className="grid grid-cols-3 gap-2">
        {/* Capacity */}
        <div className="bg-[#F1EFE8] rounded-xl py-3 px-2 text-center">
          <div className="text-xl font-bold text-[#1C1B18]">{capacity.score}</div>
          <div className="text-[9px] text-[#C8C5BC] mt-0.5">Capacity</div>
          <div className="text-[9px] text-[#9B9690] capitalize mt-0.5">{capacity.tier}</div>
        </div>

        {/* Momentum */}
        <div className="bg-[#F1EFE8] rounded-xl py-3 px-2 text-center">
          {momentum?.dataReady ? (
            <>
              <div className={`text-xl font-bold ${
                momentum.direction === "building" ? "text-[#0F6E56]"
                : momentum.direction === "fading"  ? "text-[#C0392B]"
                : "text-[#1B4FA0]"
              }`}>
                {momentum.delta >= 0 ? "+" : ""}{momentum.delta}
              </div>
              <div className="text-[9px] text-[#C8C5BC] mt-0.5">Momentum</div>
              <div className="text-[9px] text-[#9B9690] capitalize mt-0.5">{momentum.direction}</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-[#C8C5BC]">—</div>
              <div className="text-[9px] text-[#C8C5BC] mt-0.5">Momentum</div>
              <div className="text-[9px] text-[#C8C5BC] mt-0.5">building</div>
            </>
          )}
        </div>

        {/* Trajectory */}
        <div className="bg-[#F1EFE8] rounded-xl py-3 px-2 text-center">
          {trajectory?.dataReady ? (
            <>
              <div className={`text-sm font-bold ${TRAJ_COLOR[trajectory.status] ?? "text-[#1C1B18]"}`}>
                {trajectory.status === "ahead_of_pace" ? "Ahead"
                : trajectory.status === "on_pace" ? "On track"
                : trajectory.status === "slightly_behind" ? "Behind"
                : "Off pace"}
              </div>
              <div className="text-[9px] text-[#C8C5BC] mt-0.5">Trajectory</div>
              {trajectory.projectedEtaWeeks && (
                <div className="text-[9px] text-[#C8C5BC] mt-0.5">{trajectory.projectedEtaWeeks}w ETA</div>
              )}
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-[#C8C5BC]">—</div>
              <div className="text-[9px] text-[#C8C5BC] mt-0.5">Trajectory</div>
              <div className="text-[9px] text-[#C8C5BC] mt-0.5">loading</div>
            </>
          )}
        </div>
      </div>

      {/* Unified insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-2.5 pt-1 border-t border-[#EAE7DE]">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Priority insights</div>
          {insights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="flex gap-2.5 items-start">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[insight.priority] ?? "bg-[#EAE7DE]"}`} />
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-[#1C1B18]">{insight.headline}</div>
                <div className="text-[10px] text-[#9B9690] leading-relaxed">{insight.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
