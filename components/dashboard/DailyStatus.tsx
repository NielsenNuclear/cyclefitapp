"use client";

import type { ReadinessScore, ReadinessCategory } from "@/lib/readiness/calculateReadiness";
import type { RecoveryScore, RecoveryCategory }   from "@/lib/recovery/recoveryTypes";
import type { PhaseData }                          from "@/types/recommendation";
import { color as tokenColor } from "@/lib/design/tokens";

interface DailyStatusProps {
  readiness: ReadinessScore | undefined;
  recovery:  RecoveryScore  | undefined;
  phase:     PhaseData;
}

// Plain JS color values (not className strings) feeding inline styles below —
// the documented use case for lib/design/tokens.ts. Category *keys* are the
// app's status vocabulary (data model, not styling) and are unchanged.
const READINESS_STYLE: Record<ReadinessCategory, { score: string; bg: string; label: string }> = {
  optimal:  { score: tokenColor.success, bg: tokenColor.successBg, label: "Optimal"  },
  ready:    { score: tokenColor.brand,   bg: tokenColor.brandBgMid, label: "Ready"    },
  moderate: { score: tokenColor.info,    bg: tokenColor.infoBg,     label: "Moderate" },
  cautious: { score: tokenColor.caution, bg: tokenColor.cautionBg,  label: "Cautious" },
  recover:  { score: tokenColor.neutral, bg: tokenColor.neutralBg,  label: "Recover"  },
};

const RECOVERY_STYLE: Record<RecoveryCategory, { score: string; bg: string }> = {
  Excellent:   { score: tokenColor.success, bg: tokenColor.successBg },
  Good:        { score: tokenColor.brand,   bg: tokenColor.brandBgMid },
  Moderate:    { score: tokenColor.info,    bg: tokenColor.infoBg },
  Compromised: { score: tokenColor.caution, bg: tokenColor.cautionBg },
  Poor:        { score: tokenColor.danger,  bg: tokenColor.dangerBg },
};

const PHASE_STYLE: Record<string, { bg: string; text: string }> = {
  "Menstrual":   { bg: tokenColor.dangerBg,   text: tokenColor.danger },
  "Follicular":  { bg: tokenColor.successBg,  text: tokenColor.successText },
  "Ovulatory":   { bg: tokenColor.brandBgMid, text: tokenColor.brandText },
  "Luteal":      { bg: tokenColor.cautionBg,  text: tokenColor.cautionText },
  "Late Luteal": { bg: tokenColor.neutralBg,  text: tokenColor.neutralText },
};

function Tile({
  label,
  value,
  sub,
  bg,
  valueColor,
}: {
  label:      string;
  value:      string;
  sub?:       string;
  bg:         string;
  valueColor: string;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl text-center"
      style={{ backgroundColor: bg }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-ink-muted mb-1.5">
        {label}
      </div>
      <div
        className="text-[1.75rem] font-light leading-none tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] mt-1.5" style={{ color: valueColor, opacity: 0.75 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function DailyStatus({ readiness, recovery, phase }: DailyStatusProps) {
  const rStyle   = readiness ? (READINESS_STYLE[readiness.category] ?? READINESS_STYLE.moderate) : null;
  const recStyle = recovery  ? (RECOVERY_STYLE[recovery.category]   ?? RECOVERY_STYLE.Moderate)  : null;
  const pStyle   = PHASE_STYLE[phase.name] ?? { bg: tokenColor.neutralBg, text: tokenColor.neutralText };

  return (
    <div className="flex gap-2.5">
      <Tile
        label="Readiness"
        value={readiness ? `${readiness.score}` : "—"}
        sub={rStyle?.label}
        bg={rStyle?.bg ?? tokenColor.surfaceHover}
        valueColor={rStyle?.score ?? tokenColor.inkMuted}
      />
      <Tile
        label="Recovery"
        value={recovery ? `${recovery.score}` : "—"}
        sub={recovery?.category}
        bg={recStyle?.bg ?? tokenColor.surfaceHover}
        valueColor={recStyle?.score ?? tokenColor.inkMuted}
      />
      <Tile
        label={`Day ${phase.cycleDay}`}
        value={phase.name}
        sub={`${phase.daysUntilNextPhase}d to next`}
        bg={pStyle.bg}
        valueColor={pStyle.text}
      />
    </div>
  );
}
