"use client";

import type { PerformancePotential }     from "@/lib/performance/performancePotential";
import type { TrainingRisk, RiskLevel }  from "@/lib/performance/riskPrediction";
import type { ReadinessForecastResult }  from "@/lib/performance/readinessForecast";
import type { StrategyPredictionReport } from "@/lib/performance/strategyPrediction";
import type { PerformanceOpportunity }   from "@/lib/performance/opportunityDetection";
import type { TrainingWindow }           from "@/lib/cycle/trainingWindows";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  potential:         PerformancePotential | null;
  trainingRisk:      TrainingRisk | null;
  readinessForecast: ReadinessForecastResult | null;
  strategyPrediction: StrategyPredictionReport | null;
  opportunity:       PerformanceOpportunity | null;
  primeWindow:       TrainingWindow | null;
  currentCycleDay:   number;
}

// ─── Risk chip ────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, string> = {
  low:      "text-[#0F6E56]  bg-[#E1F5EE]  border-[#A8DFC8]",
  moderate: "text-[#854F0B] bg-[#FAEEDA] border-[#E4C88A]",
  high:     "text-[#C0392B]  bg-[#FDF3F2]  border-[#F5C5C0]",
};

function RiskChip({ level, name }: { level: RiskLevel; name: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${RISK_COLORS[level]}`}>
      <span className="text-xs font-medium capitalize">{name}</span>
      <span className="text-xs opacity-70 capitalize">{level}</span>
    </div>
  );
}

// ─── Readiness forecast bar ───────────────────────────────────────────────────

function ForecastDayBar({ estimated, direction }: { estimated: number; direction: string }) {
  const color =
    estimated >= 75 ? "bg-[#0F6E56]" :
    estimated >= 55 ? "bg-[#854F0B]" :
    "bg-[#C0392B]";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-semibold ${
        estimated >= 75 ? "text-[#0F6E56]" :
        estimated >= 55 ? "text-[#854F0B]" : "text-[#C0392B]"
      }`}>
        {estimated}
      </span>
      <div className="w-6 bg-[#F1EFE8] rounded-full h-12 flex flex-col-reverse overflow-hidden">
        <div
          className={`${color} rounded-full w-full transition-all duration-500`}
          style={{ height: `${estimated}%` }}
        />
      </div>
      <span className="text-[#9B9690] text-xs">
        {direction === "up" ? "↑" : direction === "down" ? "↓" : "—"}
      </span>
    </div>
  );
}

// ─── Strategy probability bar ─────────────────────────────────────────────────

function StrategyBar({ label, prob }: { label: string; prob: number }) {
  const color =
    prob >= 75 ? "bg-[#0F6E56]" :
    prob >= 55 ? "bg-[#854F0B]" :
    "bg-[#C8C5BC]";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[#5C5850] text-xs">{label}</span>
        <span className={`text-xs font-medium ${
          prob >= 75 ? "text-[#0F6E56]" : prob >= 55 ? "text-[#854F0B]" : "text-[#9B9690]"
        }`}>{prob}%</span>
      </div>
      <div className="w-full bg-black/8 rounded-full h-[2px] overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${prob}%` }} />
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function PerformanceForecastCard({
  potential,
  trainingRisk,
  readinessForecast,
  strategyPrediction,
  opportunity,
  primeWindow,
  currentCycleDay,
}: Props) {
  if (!potential) return null;

  // Prime window countdown
  let primeWindowLabel: string | null = null;
  if (primeWindow) {
    if (currentCycleDay >= primeWindow.startDay && currentCycleDay <= primeWindow.endDay) {
      primeWindowLabel = "Active now";
    } else if (currentCycleDay < primeWindow.startDay) {
      const days = primeWindow.startDay - currentCycleDay;
      primeWindowLabel = `Starts in ${days} day${days !== 1 ? "s" : ""}`;
    }
  }

  const forecastDays = readinessForecast?.days.slice(0, 5) ?? [];

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[#1C1B18]">Performance Outlook</h2>
        {readinessForecast && (
          <span className={`text-xs font-medium ${
            readinessForecast.confidence === "high" ? "text-[#0F6E56]" :
            readinessForecast.confidence === "moderate" ? "text-[#854F0B]" : "text-[#9B9690]"
          }`}>
            {readinessForecast.confidence === "high" ? "High confidence" :
             readinessForecast.confidence === "moderate" ? "Moderate confidence" : "Early data"}
          </span>
        )}
      </div>

      {/* ── Opportunity alert ── */}
      {opportunity?.detected && (
        <div className="bg-[#E1F5EE] border border-[#A8DFC8] rounded-xl p-3 space-y-1">
          <p className="text-[#085041] text-xs font-semibold uppercase tracking-wide">
            Opportunity Detected
          </p>
          <p className="text-[13px] text-[#1C1B18]">{opportunity.recommendation}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {opportunity.signals.slice(0, 3).map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#0F6E56] border border-[#A8DFC8]">
                {s}
              </span>
            ))}
          </div>
          <p className="text-[#085041] text-xs">{opportunity.confidence}% confidence · {opportunity.windowLengthDays} day window</p>
        </div>
      )}

      {/* ── Today's potential ── */}
      <div>
        <p className="text-[#6B6860] text-xs uppercase tracking-wide mb-1">Today's potential</p>
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-bold ${
            potential.score >= 80 ? "text-[#0F6E56]" :
            potential.score >= 65 ? "text-[#1C1B18]" :
            potential.score >= 45 ? "text-[#854F0B]" :
            "text-[#9B9690]"
          }`}>{potential.score}</span>
          <span className="text-[#6B6860] text-sm pb-1">{potential.label}</span>
        </div>
        {potential.drivingFactors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {potential.drivingFactors.slice(0, 3).map(f => (
              <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-[#F1EFE8] text-[#6B6860] border border-[#EAE7DE]">{f}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Prime window ── */}
      {primeWindowLabel && (
        <div className="flex items-center justify-between py-2 border-t border-black/6">
          <div>
            <p className="text-[#6B6860] text-xs uppercase tracking-wide">Prime training window</p>
            <p className="text-[13px] text-[#1C1B18] mt-0.5">Days {primeWindow!.startDay}–{primeWindow!.endDay} of your cycle</p>
          </div>
          <span className={`text-sm font-semibold ${
            primeWindowLabel === "Active now" ? "text-[#0F6E56]" : "text-[#854F0B]"
          }`}>{primeWindowLabel}</span>
        </div>
      )}

      {/* ── Top risk ── */}
      {trainingRisk?.topRisk && trainingRisk.topRisk.level !== "low" && (
        <div className="space-y-1.5 pt-1 border-t border-black/6">
          <p className="text-[#6B6860] text-xs uppercase tracking-wide">Top risk</p>
          <RiskChip level={trainingRisk.topRisk.level} name={trainingRisk.topRisk.name} />
          <p className="text-[#9B9690] text-xs">{trainingRisk.topRisk.reason}</p>
        </div>
      )}

      {/* ── 5-day readiness forecast ── */}
      {forecastDays.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-black/6">
          <div className="flex items-center justify-between">
            <p className="text-[#6B6860] text-xs uppercase tracking-wide">Readiness forecast</p>
            {readinessForecast && (
              <span className={`text-xs font-medium ${
                readinessForecast.trendLabel === "Improving" ? "text-[#0F6E56]" :
                readinessForecast.trendLabel === "Declining" ? "text-[#C0392B]" : "text-[#6B6860]"
              }`}>{readinessForecast.trendLabel}</span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2">
            {forecastDays.map(d => (
              <div key={d.daysFromNow} className="flex flex-col items-center gap-1 flex-1">
                <ForecastDayBar estimated={d.estimated} direction={d.direction} />
                <span className="text-[#9B9690] text-xs">
                  {d.daysFromNow === 1 ? "Tmw" : `+${d.daysFromNow}d`}
                </span>
              </div>
            ))}
          </div>
          {readinessForecast?.recoveryday !== null && readinessForecast?.recoveryday !== undefined && (
            <p className="text-[#085041] text-xs">
              Readiness expected to recover above 70 in {readinessForecast.recoveryday} day{readinessForecast.recoveryday !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Strategy success probabilities (top 4) ── */}
      {strategyPrediction && (
        <div className="space-y-2 pt-1 border-t border-black/6">
          <p className="text-[#6B6860] text-xs uppercase tracking-wide">Expected training success</p>
          {strategyPrediction.predictions.slice(0, 4).map(p => (
            <StrategyBar key={p.modality} label={p.label} prob={p.prob} />
          ))}
        </div>
      )}

    </div>
  );
}
