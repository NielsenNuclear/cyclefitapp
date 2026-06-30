"use client";

import type { TrainingMaturity, MaturityLevel } from "@/lib/planning/trainingMaturity";

interface Props {
  maturity: TrainingMaturity | undefined;
}

const LEVEL_CONFIG: Record<MaturityLevel, { label: string; color: string; bar: string }> = {
  beginner:     { label: "Beginner",     color: "text-[#1B4FA0]",     bar: "bg-sky-500"     },
  developing:   { label: "Developing",   color: "text-[#0F6E56]",    bar: "bg-teal-500"    },
  intermediate: { label: "Intermediate", color: "text-[#534AB7]",  bar: "bg-violet-500"  },
  advanced:     { label: "Advanced",     color: "text-[#854F0B]",   bar: "bg-amber-500"   },
};

function trainingAge(days: number): string {
  if (days < 14)  return `${days}d`;
  if (days < 90)  return `${Math.round(days / 7)}w`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}yr`;
}

export function TrainingMaturityCard({ maturity }: Props) {
  if (!maturity) return null;

  const cfg   = LEVEL_CONFIG[maturity.level];
  const comps = [
    { label: "Volume",      val: maturity.components.volume      },
    { label: "Consistency", val: maturity.components.consistency },
    { label: "Complexity",  val: maturity.components.complexity  },
    { label: "Progression", val: maturity.components.progression },
  ];

  const trendColor =
    maturity.trend === "improving" ? "text-[#0F6E56]"
    : maturity.trend === "stable"  ? "text-[#1B4FA0]"
    : "text-[#C0392B]";

  const trendLabel =
    maturity.trend === "improving" ? "Improving ↑"
    : maturity.trend === "stable"  ? "Stable →"
    : "Declined ↓";

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Training Maturity</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${trendColor}`}>{trendLabel}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-[#F1EFE8] ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Score + age row */}
      <div className="flex items-end gap-3">
        <div>
          <span className={`text-3xl font-bold ${cfg.color}`}>{maturity.score}</span>
          <span className="text-xs text-[#9B9690] ml-1">/ 100</span>
        </div>
        <div className="pb-1 text-xs text-[#9B9690]">
          Training age: <span className="text-[#5C5850]">{trainingAge(maturity.daysTrainingAge)}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 rounded-full bg-black/8">
        <div
          className={`h-2 rounded-full transition-all ${cfg.bar}`}
          style={{ width: `${maturity.score}%` }}
        />
      </div>

      {/* Components */}
      <div className="space-y-1.5">
        {comps.map(({ label, val }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-[10px] text-[#9B9690] w-20 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/8">
              <div className={`h-1.5 rounded-full ${cfg.bar} transition-all`} style={{ width: `${val}%` }} />
            </div>
            <span className="text-[10px] text-[#9B9690] w-7 text-right">{val}</span>
          </div>
        ))}
      </div>

      {/* Insight */}
      <p className="text-[11px] text-[#9B9690] leading-relaxed">{maturity.insight}</p>

      {/* Next level hint */}
      {maturity.nextLevel && maturity.weeksToNextLevel !== null && (
        <div className="pt-0.5 text-[11px] text-[#9B9690] text-center">
          ~{maturity.weeksToNextLevel === 0 ? "almost" : `${maturity.weeksToNextLevel}w`} to{" "}
          <span className="capitalize">{maturity.nextLevel}</span>
        </div>
      )}
    </div>
  );
}
