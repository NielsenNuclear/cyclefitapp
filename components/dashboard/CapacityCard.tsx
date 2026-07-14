"use client";

import type { CapacityScore }        from "@/lib/unified/capacityScore";
import type { MomentumScore }        from "@/lib/unified/momentumScore";
import type { CapacityForecast }     from "@/lib/unified/capacityForecast";
import type { LifeBalanceReport }    from "@/lib/unified/lifeBalanceDetection";
import type { RecoverySufficiency }  from "@/lib/unified/recoverySufficiency";

interface Props {
  capacity:    CapacityScore | undefined;
  momentum:    MomentumScore | undefined;
  forecast:    CapacityForecast | undefined;
  balance:     LifeBalanceReport | undefined;
  sufficiency: RecoverySufficiency | undefined;
}

const SUFFICIENCY_BOX: Record<string, string> = {
  over_trained:   "bg-rose-500/10 border-rose-500/20 text-danger",
  strained:       "bg-amber-500/10 border-amber-500/20 text-caution",
  balanced:       "bg-emerald-500/10 border-emerald-500/20 text-success",
  under_engaged:  "bg-sky-500/10 border-sky-500/20 text-info",
};

const TIER_RING: Record<string, string> = {
  peak:     "stroke-emerald-400",
  ready:    "stroke-sky-400",
  moderate: "stroke-amber-400",
  limited:  "stroke-orange-400",
  rest:     "stroke-rose-400",
};

const TIER_TEXT: Record<string, string> = {
  peak:     "text-success",
  ready:    "text-info",
  moderate: "text-caution",
  limited:  "text-orange-400",
  rest:     "text-danger",
};

const PILLAR_BAR = (score: number) =>
  score >= 75 ? "bg-emerald-500" : score >= 55 ? "bg-sky-500" : score >= 35 ? "bg-amber-500" : "bg-rose-500";

const MOMENTUM_ICON: Record<string, string> = { building: "↑", stable: "→", fading: "↓", insufficient: "—" };
const MOMENTUM_COLOR: Record<string, string> = { building: "text-success", stable: "text-info", fading: "text-danger", insufficient: "text-ink-faint" };

export function CapacityCard({ capacity, momentum, forecast, balance, sufficiency }: Props) {
  if (!capacity) return null;

  const CIRCUMFERENCE = 2 * Math.PI * 36;
  const dashOffset    = CIRCUMFERENCE * (1 - capacity.score / 100);
  const ringColor     = TIER_RING[capacity.tier] ?? "stroke-white/30";
  const textColor     = TIER_TEXT[capacity.tier] ?? "text-ink";

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-ink">Performance Capacity</h3>

      {/* Ring + score */}
      <div className="flex items-center gap-5">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle cx="44" cy="44" r="36" fill="none" className={ringColor} strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 44 44)" />
          <text x="44" y="44" textAnchor="middle" dominantBaseline="central" className="fill-white text-lg font-bold" fontSize="18" fontWeight="700">
            {capacity.score}
          </text>
        </svg>
        <div className="flex-1 space-y-1">
          <div className={`text-base font-semibold capitalize ${textColor}`}>{capacity.tier.replace("_", " ")}</div>
          <p className="text-[11px] text-ink-muted leading-relaxed">{capacity.headline}</p>
          {momentum?.dataReady && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className={`text-sm font-semibold ${MOMENTUM_COLOR[momentum.direction] ?? "text-ink-faint"}`}>
                {MOMENTUM_ICON[momentum.direction]}
              </span>
              <span className="text-[10px] text-ink-muted">{momentum.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Components */}
      <div className="space-y-2">
        {[
          { label: "Readiness",  value: capacity.components.readiness  },
          { label: "Recovery",   value: capacity.components.recovery   },
          { label: "Fatigue",    value: capacity.components.fatigue    },
          { label: "Lifestyle",  value: capacity.components.lifestyle  },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-[10px] text-ink-muted w-16 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/8">
              <div className={`h-1.5 rounded-full ${PILLAR_BAR(value)}`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-[10px] text-ink-faint w-6 text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Forecast */}
      {forecast?.dataReady && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
          {[forecast.day3, forecast.day7].map(d => (
            <div key={d.daysAhead} className="bg-surface-hover rounded-xl py-2.5 px-2 text-center">
              <div className="text-sm font-semibold text-ink">{d.projected}</div>
              <div className="text-[9px] text-ink-faint mt-0.5">{d.daysAhead === 3 ? "3-day" : "7-day"} forecast</div>
            </div>
          ))}
        </div>
      )}

      {/* Balance warning */}
      {balance && !balance.isBalanced && balance.weakestPillar && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <div className="text-[10px] text-caution font-semibold">{balance.message}</div>
        </div>
      )}

      {/* Recovery sufficiency (44E) */}
      {sufficiency?.dataReady && (
        <div className={`border rounded-xl px-3 py-2 ${SUFFICIENCY_BOX[sufficiency.status] ?? "bg-surface-hover border-border text-ink-muted"}`}>
          <div className="text-[10px] font-semibold capitalize">
            Recovery: {sufficiency.status.replace("_", " ")}
          </div>
          <div className="text-[9px] opacity-70 mt-0.5">{sufficiency.recommendation}</div>
        </div>
      )}
    </div>
  );
}
