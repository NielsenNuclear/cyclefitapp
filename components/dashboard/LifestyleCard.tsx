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
  full:               "text-[#0F6E56]",
  condensed:          "text-[#1B4FA0]",
  minimum_effective:  "text-[#854F0B]",
  recovery:           "text-[#C0392B]",
};

const MODE_LABEL: Record<string, string> = {
  full:               "Full Session",
  condensed:          "Condensed Session",
  minimum_effective:  "Minimum Effective Dose",
  recovery:           "Recovery Session",
};

const ENERGY_COLOR: Record<string, string> = {
  high:     "text-[#0F6E56]",
  moderate: "text-[#1B4FA0]",
  low:      "text-[#854F0B]",
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
      <div className="flex justify-between text-[10px] text-[#9B9690]">
        <span>Completion likelihood</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/8">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LifestyleCard({ context, energy, budget }: Props) {
  if (!context) return null;

  const modeColor = MODE_COLOR[context.recommendedMode] ?? "text-[#1C1B18]";
  const modeLabel = MODE_LABEL[context.recommendedMode] ?? context.recommendedMode;
  const energyColor = energy ? ENERGY_COLOR[energy.level] ?? "text-[#1C1B18]" : "text-[#9B9690]";
  const energyLabel = energy ? ENERGY_LABEL[energy.level] ?? energy.level : "—";

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Lifestyle Context</h3>
        <span className={`text-xs font-semibold ${modeColor}`}>{modeLabel}</span>
      </div>

      {/* Headline */}
      <p className="text-[12px] text-[#5C5850] leading-relaxed">{context.headline}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#F1EFE8] rounded-xl py-2.5 px-2 text-center">
          <div className={`text-sm font-semibold ${energyColor}`}>{energyLabel}</div>
          <div className="text-[9px] text-[#C8C5BC] mt-0.5">Capacity</div>
        </div>
        <div className="bg-[#F1EFE8] rounded-xl py-2.5 px-2 text-center">
          <div className="text-sm font-semibold text-[#1C1B18]">{budget?.minutes ?? context.timeTarget}m</div>
          <div className="text-[9px] text-[#C8C5BC] mt-0.5">Time budget</div>
        </div>
        <div className="bg-[#F1EFE8] rounded-xl py-2.5 px-2 text-center">
          <div className={`text-sm font-semibold ${modeColor}`}>{context.adjustments.skipRecommended ? "Rest" : modeLabel.split(" ")[0]}</div>
          <div className="text-[9px] text-[#C8C5BC] mt-0.5">Mode</div>
        </div>
      </div>

      {/* Adherence likelihood */}
      {!context.adjustments.skipRecommended && (
        <AdherenceBar pct={context.adherenceLikelihood} />
      )}

      {/* Rationale */}
      {context.rationale.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[#EAE7DE]">
          {context.rationale.slice(0, 3).map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1 h-1 rounded-full bg-[#9B9690] mt-1.5 flex-shrink-0" />
              <span className="text-[11px] text-[#9B9690] leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Travel mode note */}
      {context.adjustments.equipmentOverride && (
        <div className="pt-1 text-[11px] text-[#1B4FA0]/70">
          Travel mode active — workout adapted to available equipment.
        </div>
      )}
    </div>
  );
}
