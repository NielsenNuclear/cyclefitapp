"use client";

import type { PredictorRankingProfile } from "@/lib/physiology/readinessPredictorRanking";
import type { PersonalReadinessEquation } from "@/lib/physiology/personalReadinessEquation";

interface Props {
  ranking:  PredictorRankingProfile | undefined;
  equation: PersonalReadinessEquation | undefined;
}

const BAR_COLOR = (idx: number) =>
  idx === 0 ? "bg-violet-500"
  : idx === 1 ? "bg-sky-500"
  : idx === 2 ? "bg-emerald-500"
  : idx === 3 ? "bg-amber-500"
  : "bg-white/30";

export function SignalImportanceCard({ ranking, equation }: Props) {
  if (!ranking?.dataReady) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Signal Importance</h3>
        {equation?.applied && (
          <span className="text-[10px] text-violet-400 font-semibold">Personal model active</span>
        )}
      </div>

      <p className="text-[11px] text-white/40 leading-relaxed">{ranking.summary}</p>

      <div className="space-y-2.5">
        {ranking.rankings.map((r, i) => (
          <div key={r.factor} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/55">{r.label}</span>
              <span className="text-white/35">{r.normalized}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/8">
              <div
                className={`h-2 rounded-full transition-all ${BAR_COLOR(i)}`}
                style={{ width: `${r.normalized}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {equation && (
        <div className={`pt-1 text-[10px] rounded-lg px-3 py-2 ${
          equation.applied
            ? "bg-violet-500/10 text-violet-300"
            : "bg-white/5 text-white/30"
        }`}>
          {equation.applied
            ? `Axis is using your personal ${equation.dominantLabel?.toLowerCase()} weighting.`
            : "Using population-default weights — more data will personalise this."}
        </div>
      )}
    </div>
  );
}
