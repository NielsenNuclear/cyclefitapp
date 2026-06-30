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
  : "bg-[#C8C5BC]";

export function SignalImportanceCard({ ranking, equation }: Props) {
  if (!ranking?.dataReady) return null;

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Signal Importance</h3>
        {equation?.applied && (
          <span className="text-[10px] text-[#534AB7] font-semibold">Personal model active</span>
        )}
      </div>

      <p className="text-[11px] text-[#9B9690] leading-relaxed">{ranking.summary}</p>

      <div className="space-y-2.5">
        {ranking.rankings.map((r, i) => (
          <div key={r.factor} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#5C5850]">{r.label}</span>
              <span className="text-[#9B9690]">{r.normalized}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/8">
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
            ? "bg-violet-500/10 text-[#3C3489]"
            : "bg-[#F1EFE8] text-[#C8C5BC]"
        }`}>
          {equation.applied
            ? `Axis is using your personal ${equation.dominantLabel?.toLowerCase()} weighting.`
            : "Using population-default weights — more data will personalise this."}
        </div>
      )}
    </div>
  );
}
