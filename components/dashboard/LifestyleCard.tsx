"use client";

import type { LifeContext }          from "@/lib/lifestyle/lifeContextEngine";
import type { EnergyAvailability }   from "@/lib/lifestyle/energyAvailability";
import type { DailyTimeBudget }      from "@/lib/lifestyle/timeBudget";

interface Props {
  context:  LifeContext | undefined;
  energy:   EnergyAvailability | undefined;
  budget:   DailyTimeBudget | undefined;
}

const MODE_COLOR: Record<string, string> = {
  full:               "text-emerald-400",
  condensed:          "text-sky-400",
  minimum_effective:  "text-amber-400",
  recovery:           "text-rose-400",
};

const MODE_LABEL: Record<string, string> = {
  full:               "Full Session",
  condensed:          "Condensed Session",
  minimum_effective:  "Minimum Effective Dose",
  recovery:           "Recovery Session",
};

const ENERGY_COLOR: Record<string, string> = {
  high:     "text-emerald-400",
  moderate: "text-sky-400",
  low:      "text-amber-400",
};

const ENERGY_LABEL: Record<string, string> = {
  high:     "High",
  moderate: "Moderate",
  low:      "Low",
};

function AdherenceBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : "bg-amber-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/35">
        <span>Completion likelihood</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/10">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LifestyleCard({ context, energy, budget }: Props) {
  if (!context) return null;

  const modeColor = MODE_COLOR[context.recommendedMode] ?? "text-white";
  const modeLabel = MODE_LABEL[context.recommendedMode] ?? context.recommendedMode;
  const energyColor = energy ? ENERGY_COLOR[energy.level] ?? "text-white" : "text-white/35";
  const energyLabel = energy ? ENERGY_LABEL[energy.level] ?? energy.level : "—";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Lifestyle Context</h3>
        <span className={`text-xs font-semibold ${modeColor}`}>{modeLabel}</span>
      </div>

      {/* Headline */}
      <p className="text-[12px] text-white/65 leading-relaxed">{context.headline}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl py-2.5 px-2 text-center">
          <div className={`text-sm font-semibold ${energyColor}`}>{energyLabel}</div>
          <div className="text-[9px] text-white/30 mt-0.5">Capacity</div>
        </div>
        <div className="bg-white/5 rounded-xl py-2.5 px-2 text-center">
          <div className="text-sm font-semibold text-white">{budget?.minutes ?? context.timeTarget}m</div>
          <div className="text-[9px] text-white/30 mt-0.5">Time budget</div>
        </div>
        <div className="bg-white/5 rounded-xl py-2.5 px-2 text-center">
          <div className={`text-sm font-semibold ${modeColor}`}>{context.adjustments.skipRecommended ? "Rest" : modeLabel.split(" ")[0]}</div>
          <div className="text-[9px] text-white/30 mt-0.5">Mode</div>
        </div>
      </div>

      {/* Adherence likelihood */}
      {!context.adjustments.skipRecommended && (
        <AdherenceBar pct={context.adherenceLikelihood} />
      )}

      {/* Rationale */}
      {context.rationale.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-white/8">
          {context.rationale.slice(0, 3).map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1 h-1 rounded-full bg-white/25 mt-1.5 flex-shrink-0" />
              <span className="text-[11px] text-white/45 leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Travel mode note */}
      {context.adjustments.equipmentOverride && (
        <div className="pt-1 text-[11px] text-sky-400/70">
          Travel mode active — workout adapted to available equipment.
        </div>
      )}
    </div>
  );
}
