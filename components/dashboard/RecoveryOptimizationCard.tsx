"use client";

import type { RecoveryEffectivenessReport, EffectivenessTier } from "@/lib/recovery/recoveryEffectiveness";
import type { RecoveryForecast }                                from "@/lib/recovery/recoveryForecast";
import type { RecoveryCapacity }                                from "@/lib/adaptive/recoveryCapacity";
import type { RecoveryDebt }                                    from "@/lib/recovery/recoveryDebt";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  effectiveness: RecoveryEffectivenessReport | null;
  forecast:      RecoveryForecast | null;
  capacity:      RecoveryCapacity | null;
  debt:          RecoveryDebt | null;
}

// ─── Tier styling ─────────────────────────────────────────────────────────────

const TIER_ICON: Record<EffectivenessTier, string> = {
  most_effective:  "✓",
  moderate:        "·",
  least_effective: "○",
};

const TIER_COLOR: Record<EffectivenessTier, string> = {
  most_effective:  "text-teal-400",
  moderate:        "text-zinc-400",
  least_effective: "text-zinc-600",
};

// ─── Forecast bar ─────────────────────────────────────────────────────────────

function ForecastBar({ probability }: { probability: number }) {
  const color =
    probability >= 70 ? "bg-rose-500" :
    probability >= 45 ? "bg-amber-500" :
    "bg-teal-500";
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${color} h-full rounded-full transition-all duration-500`}
        style={{ width: `${probability}%` }}
      />
    </div>
  );
}

// ─── Capacity timescale ───────────────────────────────────────────────────────

function CapacityBadge({ level }: { level: "low" | "moderate" | "high" }) {
  const colors = {
    high:     "bg-teal-900 text-teal-300 border border-teal-700",
    moderate: "bg-zinc-800 text-zinc-300 border border-zinc-700",
    low:      "bg-rose-900 text-rose-300 border border-rose-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[level]}`}>
      {level}
    </span>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function RecoveryOptimizationCard({ effectiveness, forecast, capacity, debt }: Props) {
  const hasEffectiveness = effectiveness?.hasGranular && (effectiveness.ranked.length > 0);
  const hasForecast      = forecast !== null;
  const hasCapacity      = capacity !== null && (capacity.acuteCapacity || capacity.weeklyCapacity);
  const hasDebt          = debt !== null;

  if (!hasForecast && !hasEffectiveness && !hasCapacity) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-base">Recovery Intelligence</h2>
        {hasForecast && (
          <span className={`text-xs font-medium ${
            forecast!.confidence === "high" ? "text-teal-400" :
            forecast!.confidence === "moderate" ? "text-amber-400" : "text-zinc-500"
          }`}>
            {forecast!.confidence === "high" ? "High confidence" : forecast!.confidence === "moderate" ? "Moderate confidence" : "Early data"}
          </span>
        )}
      </div>

      {/* ── Recovery effectiveness ranking ── */}
      {hasEffectiveness && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">What works for you</p>
          {effectiveness!.ranked.map(m => (
            <div key={m.modality} className="flex items-center gap-3">
              <span className={`text-sm font-mono w-4 text-center ${TIER_COLOR[m.tier]}`}>
                {TIER_ICON[m.tier]}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">{m.label}</span>
                  <span className={`text-xs ${
                    m.score > 0 ? "text-teal-400" : m.score < 0 ? "text-rose-400" : "text-zinc-500"
                  }`}>
                    {m.score > 0 ? `+${m.score}` : m.score} avg readiness
                  </span>
                </div>
                <p className="text-zinc-600 text-xs">{m.sampleSize} session{m.sampleSize !== 1 ? "s" : ""} tracked · {m.confidence}</p>
              </div>
            </div>
          ))}
          {/* Strategy hints when granular data is thin */}
          {!hasEffectiveness && effectiveness?.strategyHints.filter(s => s.verdict !== "uncertain").map(s => (
            <div key={s.strategy} className="flex items-center gap-3">
              <span className={`text-sm font-mono w-4 text-center ${
                s.verdict === "effective" ? "text-teal-400" : "text-zinc-600"
              }`}>
                {s.verdict === "effective" ? "✓" : "○"}
              </span>
              <span className="text-white text-sm capitalize">{s.strategy.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cold start — no ranked data yet */}
      {!hasEffectiveness && (
        <div className="space-y-1">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">What works for you</p>
          <p className="text-zinc-500 text-sm">
            Axis will learn which recovery actions improve your next-day readiness as you track sessions.
          </p>
          {effectiveness?.strategyHints && effectiveness.strategyHints.filter(s => s.verdict !== "uncertain").length > 0 && (
            <div className="mt-2 space-y-1.5">
              {effectiveness.strategyHints.filter(s => s.verdict !== "uncertain").slice(0, 3).map(s => (
                <div key={s.strategy} className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${s.verdict === "effective" ? "text-teal-400" : "text-zinc-600"}`}>
                    {s.verdict === "effective" ? "✓" : "○"}
                  </span>
                  <span className="text-zinc-300 text-sm capitalize">
                    {s.strategy.replace(/_/g, " ")}
                    <span className="text-zinc-500 ml-1">
                      ({Math.round(s.successRate * 100)}% success · {s.sampleSize} logged)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recovery Capacity timescale breakdown ── */}
      {hasCapacity && (
        <div className="space-y-2 pt-1 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">Recovery capacity</p>
          <div className="flex gap-4">
            {capacity!.acuteCapacity && (
              <div className="flex-1 space-y-1">
                <p className="text-zinc-500 text-xs">Last 7 days</p>
                <CapacityBadge level={capacity!.acuteCapacity.level} />
              </div>
            )}
            {capacity!.weeklyCapacity && (
              <div className="flex-1 space-y-1">
                <p className="text-zinc-500 text-xs">7–28 days</p>
                <CapacityBadge level={capacity!.weeklyCapacity.level} />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="text-zinc-500 text-xs">Overall</p>
              <CapacityBadge level={capacity!.level} />
            </div>
          </div>
          {capacity!.acuteCapacity && capacity!.weeklyCapacity &&
           capacity!.acuteCapacity.level !== capacity!.weeklyCapacity.level && (
            <p className="text-zinc-500 text-xs mt-1">
              {capacity!.acuteCapacity.level === "low" && capacity!.weeklyCapacity.level !== "low"
                ? "Short-term capacity is lower than your monthly baseline — a temporary dip."
                : "Your recent capacity is higher than your monthly baseline — good momentum."}
            </p>
          )}
        </div>
      )}

      {/* ── Fatigue forecast ── */}
      {hasForecast && (
        <div className="space-y-2 pt-1 border-t border-zinc-800">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">Fatigue forecast · next 4 days</p>
          <div className="flex items-center gap-4">
            <span className={`text-2xl font-bold ${
              forecast!.fatigueProbability >= 70 ? "text-rose-400" :
              forecast!.fatigueProbability >= 45 ? "text-amber-400" :
              "text-teal-400"
            }`}>
              {forecast!.fatigueProbability}%
            </span>
            <div className="flex-1">
              <ForecastBar probability={forecast!.fatigueProbability} />
              <p className="text-zinc-500 text-xs mt-1">
                {forecast!.daysUntilRisk === null && forecast!.fatigueProbability >= 50
                  ? "Fatigue risk is present now"
                  : forecast!.daysUntilRisk !== null
                    ? `Risk onset estimated within ${forecast!.daysUntilRisk} day${forecast!.daysUntilRisk !== 1 ? "s" : ""}`
                    : "No significant fatigue risk in the next 4 days"}
              </p>
            </div>
          </div>
          {forecast!.drivingFactors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {forecast!.drivingFactors.slice(0, 3).map(f => (
                <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {f}
                </span>
              ))}
            </div>
          )}
          <p className="text-zinc-400 text-sm">{forecast!.recommendation}</p>
        </div>
      )}

      {/* ── Recovery Debt summary ── */}
      {hasDebt && (
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-wide">Recovery debt</p>
            <p className={`text-lg font-bold mt-0.5 ${
              debt!.category === "critical" || debt!.category === "high" ? "text-rose-400" :
              debt!.category === "elevated" ? "text-amber-400" : "text-teal-400"
            }`}>
              {debt!.debtScore}
            </p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-xs capitalize">{debt!.category}</p>
            <p className="text-zinc-600 text-xs">{debt!.trend}</p>
          </div>
        </div>
      )}

    </div>
  );
}
