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
  full:               "text-success",
  condensed:          "text-info",
  minimum_effective:  "text-caution",
  recovery:           "text-danger",
};

const MODE_LABEL: Record<string, string> = {
  full:               "Full Session",
  condensed:          "Condensed Session",
  minimum_effective:  "Minimum Effective Dose",
  recovery:           "Recovery Session",
};

const ENERGY_COLOR: Record<string, string> = {
  high:     "text-success",
  moderate: "text-info",
  low:      "text-caution",
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
      <div className="flex justify-between text-[10px] text-ink-muted">
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

  const modeColor = MODE_COLOR[context.recommendedMode] ?? "text-ink";
  const modeLabel = MODE_LABEL[context.recommendedMode] ?? context.recommendedMode;
  const energyColor = energy ? ENERGY_COLOR[energy.level] ?? "text-ink" : "text-ink-muted";
  const energyLabel = energy ? ENERGY_LABEL[energy.level] ?? energy.level : "—";

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Lifestyle Context</h3>
        <span className={`text-xs font-semibold ${modeColor}`}>{modeLabel}</span>
      </div>

      {/* Headline */}
      <p className="text-[12px] text-ink-secondary leading-relaxed">{context.headline}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-hover rounded-xl py-2.5 px-2 text-center">
          <div className={`text-sm font-semibold ${energyColor}`}>{energyLabel}</div>
          <div className="text-[9px] text-ink-faint mt-0.5">Capacity</div>
        </div>
        <div className="bg-surface-hover rounded-xl py-2.5 px-2 text-center">
          <div className="text-sm font-semibold text-ink">{budget?.minutes ?? context.timeTarget}m</div>
          <div className="text-[9px] text-ink-faint mt-0.5">Time budget</div>
        </div>
        <div className="bg-surface-hover rounded-xl py-2.5 px-2 text-center">
          <div className={`text-sm font-semibold ${modeColor}`}>{context.adjustments.skipRecommended ? "Rest" : modeLabel.split(" ")[0]}</div>
          <div className="text-[9px] text-ink-faint mt-0.5">Mode</div>
        </div>
      </div>

      {/* Adherence likelihood */}
      {!context.adjustments.skipRecommended && (
        <AdherenceBar pct={context.adherenceLikelihood} />
      )}

      {/* Rationale */}
      {context.rationale.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          {context.rationale.slice(0, 3).map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1 h-1 rounded-full bg-ink-muted mt-1.5 flex-shrink-0" />
              <span className="text-[11px] text-ink-muted leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Travel mode note */}
      {context.adjustments.equipmentOverride && (
        <div className="pt-1 text-[11px] text-info/70">
          Travel mode active — workout adapted to available equipment.
        </div>
      )}
    </div>
  );
}
