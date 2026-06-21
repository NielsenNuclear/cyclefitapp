"use client";

import { useState } from "react";
import type { ConsistencyScore }        from "@/lib/adherence/consistency";
import type { AdherenceRiskReport }     from "@/lib/adherence/riskDetection";
import type { MultiDomainStreaks }      from "@/lib/adherence/streaks";
import type { SuccessFormula }          from "@/lib/adherence/successFormula";
import type { MomentumScore }           from "@/lib/adherence/momentum";
import type { ActiveLifeEvent, LifeEventType } from "@/lib/adherence/lifeEvents";
import { LIFE_EVENT_TYPES, LIFE_EVENT_LABELS } from "@/lib/adherence/lifeEvents";

interface Props {
  consistency:   ConsistencyScore   | undefined;
  risk:          AdherenceRiskReport | undefined;
  streaks:       MultiDomainStreaks  | undefined;
  formula:       SuccessFormula      | undefined;
  momentum:      MomentumScore       | undefined;
  lifeEvent:     ActiveLifeEvent     | null;
  onLifeEvent:   (type: LifeEventType, days: number) => void;
  onClearLifeEvent: () => void;
}

const TIER_COLOR: Record<string, string> = {
  consistent:   "text-emerald-400",
  building:     "text-sky-400",
  inconsistent: "text-amber-400",
  at_risk:      "text-rose-400",
};

const TIER_LABEL: Record<string, string> = {
  consistent:   "Consistent",
  building:     "Building",
  inconsistent: "Inconsistent",
  at_risk:      "At Risk",
};

const RISK_COLOR: Record<string, string> = {
  low:    "text-emerald-400",
  medium: "text-amber-400",
  high:   "text-rose-400",
};

const MOMENTUM_ICON: Record<string, string> = {
  strong:    "↑↑",
  improving: "↑",
  flat:      "→",
  declining: "↓",
};

const MOMENTUM_COLOR: Record<string, string> = {
  strong:    "text-emerald-400",
  improving: "text-sky-400",
  flat:      "text-white/50",
  declining: "text-rose-400",
};

const DURATION_OPTIONS = [3, 7, 14] as const;

function ScoreRing({ value }: { value: number }) {
  const color =
    value >= 80 ? "#34d399"
    : value >= 60 ? "#38bdf8"
    : value >= 40 ? "#fbbf24"
    : "#f87171";
  const r   = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="14" fontWeight="700">{value}</text>
    </svg>
  );
}

export function AdherenceCard({
  consistency, risk, streaks, formula, momentum, lifeEvent, onLifeEvent, onClearLifeEvent,
}: Props) {
  const [showLifePicker, setShowLifePicker] = useState(false);
  const [selectedEvent, setSelectedEvent]   = useState<LifeEventType | null>(null);
  const [selectedDays, setSelectedDays]     = useState<number>(7);

  if (!consistency) return null;

  const tierColor = TIER_COLOR[consistency.tier];
  const tierLabel = TIER_LABEL[consistency.tier];

  function handleSubmitLife() {
    if (!selectedEvent) return;
    onLifeEvent(selectedEvent, selectedDays);
    setShowLifePicker(false);
    setSelectedEvent(null);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Adherence Intelligence</h3>
        <button
          onClick={() => setShowLifePicker(v => !v)}
          className="text-[11px] text-white/40 hover:text-white/70 border border-white/10 rounded-full px-3 py-1 transition-colors"
        >
          Life happened
        </button>
      </div>

      {/* Life event picker */}
      {showLifePicker && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-xs text-white/60">What's going on?</p>
          <div className="flex flex-wrap gap-2">
            {LIFE_EVENT_TYPES.map(t => (
              <button key={t} onClick={() => setSelectedEvent(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedEvent === t
                    ? "bg-violet-500/30 border-violet-400/60 text-violet-200"
                    : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
                }`}>
                {LIFE_EVENT_LABELS[t]}
              </button>
            ))}
          </div>
          {selectedEvent && (
            <>
              <p className="text-[11px] text-white/50">For how long?</p>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button key={d} onClick={() => setSelectedDays(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      selectedDays === d
                        ? "bg-violet-500/30 border-violet-400/60 text-violet-200"
                        : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
                    }`}>
                    {d} days
                  </button>
                ))}
              </div>
              <button onClick={handleSubmitLife}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors">
                Adjust my plan
              </button>
            </>
          )}
        </div>
      )}

      {/* Active life event banner */}
      {lifeEvent && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-start gap-3">
          <div className="flex-1">
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-widest mb-0.5">
              {LIFE_EVENT_LABELS[lifeEvent.type]} Mode
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              {lifeEvent.adjustments.expectationNote}
            </p>
            <div className="text-[10px] text-white/30 mt-1">
              {lifeEvent.daysRemaining} day{lifeEvent.daysRemaining !== 1 ? "s" : ""} remaining
            </div>
          </div>
          <button onClick={onClearLifeEvent}
            className="text-white/30 hover:text-white/60 text-lg leading-none">×</button>
        </div>
      )}

      {/* Score + tier + momentum */}
      <div className="flex items-center gap-4">
        <ScoreRing value={consistency.composite} />
        <div className="flex-1 space-y-1">
          <div className={`text-sm font-semibold ${tierColor}`}>{tierLabel}</div>
          {momentum && (
            <div className={`text-xs font-medium ${MOMENTUM_COLOR[momentum.level]}`}>
              Momentum: {momentum.level.charAt(0).toUpperCase() + momentum.level.slice(1)}&nbsp;
              {MOMENTUM_ICON[momentum.level]}
            </div>
          )}
          {risk && (
            <div className={`text-[11px] ${RISK_COLOR[risk.level]}`}>
              Risk: {risk.level.charAt(0).toUpperCase() + risk.level.slice(1)}
              {risk.level !== "low" && risk.reasons[0] && (
                <span className="text-white/35 ml-1">— {risk.reasons[0]}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pillar breakdown */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Training",  val: consistency.training  },
          { label: "Nutrition", val: consistency.nutrition  },
          { label: "Recovery",  val: consistency.recovery   },
          { label: "Check-ins", val: consistency.checkins   },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white/5 rounded-xl py-2 px-1">
            <div className="text-sm font-semibold text-white">{val}</div>
            <div className="text-[9px] text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Streaks */}
      {streaks && (
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: "Training streak",  d: streaks.training  },
            { label: "Check-in streak",  d: streaks.checkins  },
            { label: "Recovery streak",  d: streaks.recovery  },
            { label: "Nutrition streak", d: streaks.nutrition },
          ] as Array<{ label: string; d: { current: number; longest: number } }>)
            .filter(s => s.d.current > 0 || s.d.longest > 0)
            .slice(0, 4)
            .map(({ label, d }) => (
              <div key={label} className="bg-white/5 rounded-xl px-3 py-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-white/40">{label}</span>
                  <span className="text-[10px] text-white/25">best {d.longest}</span>
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">{d.current} days</div>
              </div>
            ))}
        </div>
      )}

      {/* Success formula */}
      {formula && formula.readyToPersonalise && formula.topConditions.length > 0 && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 space-y-2">
          <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-widest">
            Your success formula
          </div>
          <div className="space-y-1">
            {formula.topConditions.map(c => (
              <div key={c.factor} className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs">✓</span>
                <span className="text-xs text-white/70">{c.label}</span>
                <span className="text-[10px] text-white/30 ml-auto">
                  {Math.round(c.completionRateWhen * 100)}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed">{formula.insight}</p>
        </div>
      )}

      {/* Focus this week */}
      {consistency && (
        <div className="text-[11px] text-white/40 text-center pt-1">
          {consistency.tier === "at_risk"
            ? "Focus: show up at least twice this week, no matter the session length."
            : consistency.tier === "inconsistent"
            ? "Focus: build to 3 sessions this week and log your nutrition."
            : consistency.tier === "building"
            ? "Focus: maintain momentum and recover intentionally between sessions."
            : "Focus: stay the course. Your consistency is your competitive advantage."}
        </div>
      )}
    </div>
  );
}
