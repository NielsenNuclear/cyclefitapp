"use client";

import type { AnnualForecast, ForecastConfidence } from "@/lib/planning/annualForecast";
import type { MacroCyclePlan } from "@/lib/planning/macrocyclePlanner";
import type { GoalConflictReport } from "@/lib/planning/goalConflict";
import { color as tokenColor } from "@/lib/design/tokens";

interface Props {
  forecast:     AnnualForecast | undefined;
  macrocycle:   MacroCyclePlan | undefined;
  goalConflict: GoalConflictReport | undefined;
}

const CONF_COLOR: Record<ForecastConfidence, string> = {
  high:   "text-success",
  medium: "text-info",
  low:    "text-caution",
};

const CONF_LABEL: Record<ForecastConfidence, string> = {
  high:   "High confidence",
  medium: "Medium confidence",
  low:    "Low confidence",
};

const PROB_COLOR = (p: number) =>
  p >= 70 ? "text-success"
  : p >= 50 ? "text-info"
  : p >= 30 ? "text-caution"
  : "text-danger";

function ProbRing({ prob }: { prob: number }) {
  const r    = 32;
  const circ = 2 * Math.PI * r;
  const dash = (prob / 100) * circ;
  const ringColor = prob >= 70 ? tokenColor.success : prob >= 50 ? tokenColor.info : prob >= 30 ? tokenColor.caution : tokenColor.danger;
  return (
    <svg width="82" height="82" viewBox="0 0 82 82">
      <circle cx="41" cy="41" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle
        cx="41" cy="41" r={r} fill="none"
        stroke={ringColor} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 41 41)"
      />
      <text x="41" y="38" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="15" fontWeight="700">{prob}%</text>
      <text x="41" y="53" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8">success</text>
    </svg>
  );
}

export function ForecastCard({ forecast, macrocycle, goalConflict }: Props) {
  if (!forecast || forecast.dataMaturity === "early") {
    return (
      <div className="bg-white border border-border rounded-2xl p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold text-ink mb-2">Annual Forecast</h3>
        <p className="text-[11px] text-ink-muted">Log 4+ weeks of sessions to generate your annual forecast.</p>
      </div>
    );
  }

  const confColor = CONF_COLOR[forecast.confidence];
  const confLabel = CONF_LABEL[forecast.confidence];

  // Show 3-month, 6-month, 12-month strength projections
  const m3  = forecast.strengthProjection.find(p => p.month === 3);
  const m6  = forecast.strengthProjection.find(p => p.month === 6);
  const m12 = forecast.strengthProjection.find(p => p.month === 12);

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Annual Forecast</h3>
        <span className={`text-xs font-semibold ${confColor}`}>{confLabel}</span>
      </div>

      {/* Probability ring + macrocycle phase */}
      <div className="flex items-center gap-5">
        <ProbRing prob={forecast.goalCompletionProbability} />
        <div className="flex-1 space-y-2">
          {macrocycle && (
            <div>
              <div className="text-[10px] text-ink-faint uppercase tracking-widest mb-0.5">Macrocycle Phase</div>
              <div className="text-sm font-semibold text-ink">{macrocycle.currentPhase.name}</div>
              <div className="text-[11px] text-ink-muted">{macrocycle.currentPhase.focus}</div>
              <div className="text-[10px] text-ink-faint mt-0.5">
                Week {macrocycle.weekInPhase} of {macrocycle.currentPhase.durationWeeks}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Headline */}
      <p className="text-[11px] text-ink-secondary leading-relaxed">{forecast.headline}</p>

      {/* Strength projections */}
      {(m3 || m6 || m12) && (
        <div className="grid grid-cols-3 gap-2">
          {m3 && (
            <div className="bg-surface-hover rounded-xl py-2 px-1 text-center">
              <div className="text-sm font-semibold text-ink">{m3.value.toFixed(1)}</div>
              <div className="text-[9px] text-ink-muted mt-0.5">3 months</div>
            </div>
          )}
          {m6 && (
            <div className="bg-surface-hover rounded-xl py-2 px-1 text-center">
              <div className="text-sm font-semibold text-ink">{m6.value.toFixed(1)}</div>
              <div className="text-[9px] text-ink-muted mt-0.5">6 months</div>
            </div>
          )}
          {m12 && (
            <div className="bg-surface-hover rounded-xl py-2 px-1 text-center">
              <div className="text-sm font-semibold text-ink">{m12.value.toFixed(1)}</div>
              <div className="text-[9px] text-ink-muted mt-0.5">12 months</div>
            </div>
          )}
        </div>
      )}

      {/* ETA note */}
      {forecast.etaMonths !== null && (
        <div className="text-[11px] text-ink-muted text-center">
          Current trajectory: goal in ~<span className="text-ink-secondary">{forecast.etaMonths} month{forecast.etaMonths !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Goal conflict warning */}
      {goalConflict?.hasConflicts && (
        <div className="pt-1 border-t border-border space-y-1.5">
          <div className="text-[10px] text-caution font-semibold uppercase tracking-wide">Goal conflict detected</div>
          {goalConflict.conflicts.slice(0, 1).map((c, i) => (
            <div key={i}>
              <div className="text-[11px] text-ink-secondary">{c.conflict}</div>
              <div className="text-[10px] text-ink-muted">{c.resolution}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
