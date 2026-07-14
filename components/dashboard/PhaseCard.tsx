"use client";

import type { PhaseData, PhaseName, EnergyTrend } from "@/types/recommendation";
import { color as tokenColor } from "@/lib/design/tokens";

interface PhaseCardProps {
  phase: PhaseData;
}

// "Late Luteal" has no matching design token — it's a 5th, visually-distinct
// phase accent (distinguishing it from Follicular's brand-purple is a real
// product requirement, not decoration), so its hex stays a documented
// exception rather than being forced onto an existing token.
const PHASE_CONFIG: Record<PhaseName, any> = {
  Menstrual: {
    accent: tokenColor.danger,
    bg: "bg-danger-bg",
    border: "border-danger-border",
    textAccent: "text-danger",
    icon: "◎",
    cycleDayRange: "Days 1–5",
  },
  Follicular: {
    accent: tokenColor.brand,
    bg: "bg-brand-bg-mid",
    border: "border-brand-border",
    textAccent: "text-brand-dark",
    icon: "◐",
    cycleDayRange: "Days 6–13",
  },
  Ovulatory: {
    accent: tokenColor.success,
    bg: "bg-success-bg",
    border: "border-success-border",
    textAccent: "text-success-text",
    icon: "●",
    cycleDayRange: "Days 14–16",
  },
  Luteal: {
    accent: tokenColor.caution,
    bg: "bg-caution-bg",
    border: "border-caution-border",
    textAccent: "text-caution-text",
    icon: "◑",
    cycleDayRange: "Days 17–28",
  },
  "Late Luteal": {
    accent: "#6B4F8C",
    bg: "bg-[#F5F0FA]",
    border: "border-[#C9AEDC]",
    textAccent: "text-[#4A2E70]",
    icon: "◕",
    cycleDayRange: "Final days",
  },
};

const ENERGY_LABELS: Record<EnergyTrend, any> = {
  Rising: { label: "Rising", color: "bg-brand", bar: 65 },
  Peak: { label: "Peak", color: "bg-success", bar: 90 },
  Variable: { label: "Variable", color: "bg-caution", bar: 50 },
  Declining: { label: "Declining", color: "bg-caution", bar: 35 },
  Low: { label: "Low", color: "bg-danger", bar: 25 },
};

function CycleArc({
  cycleDay,
  cycleLength,
  accent,
}: {
  cycleDay: number;
  cycleLength: number;
  accent: string;
}) {
  const pct = cycleDay / cycleLength;
  const size = 64;
  const r = 26;

  const cx = size / 2;
  const cy = size / 2;

  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold text-ink">{cycleDay}</span>
        <span className="text-[8px] text-ink-muted font-medium uppercase tracking-wider">
          of {cycleLength}
        </span>
      </div>
    </div>
  );
}

export function PhaseCard({ phase }: PhaseCardProps) {
  const config = PHASE_CONFIG[phase.name];
  const energy = ENERGY_LABELS[phase.energyTrend];

  return (
    <div className={`rounded-2xl border ${config.bg} ${config.border} p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${config.textAccent} mb-1.5`}>
            Current phase
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[1.5rem] font-light text-ink leading-none">
              {phase.name}
            </span>
            <span className="text-[12px] text-ink-muted">
              · {config.cycleDayRange}
            </span>
          </div>
        </div>

        <CycleArc
          cycleDay={phase.cycleDay}
          cycleLength={phase.cycleLength}
          accent={config.accent}
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase text-ink-muted">
            Energy trend
          </span>
          <span className={`text-[11px] font-semibold ${config.textAccent}`}>
            {energy.label}
          </span>
        </div>

        <div className="h-[3px] bg-black/8 rounded-full overflow-hidden">
          <div className={`h-full ${energy.color}`} style={{ width: `${energy.bar}%` }} />
        </div>
      </div>

      <div className="h-px bg-black/6 mb-4" />

      <p className="text-[12px] text-ink-secondary mb-3">
        {phase.physiologicalNote}
      </p>

      <div className={`text-[11px] font-medium ${config.textAccent}`}>
        {phase.daysUntilNextPhase === 1
          ? "Transitioning tomorrow"
          : `${phase.daysUntilNextPhase} days remaining`}
      </div>
    </div>
  );
}