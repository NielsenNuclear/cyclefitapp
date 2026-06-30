"use client";

import type { ReadinessScore, ReadinessCategory } from "@/lib/readiness/calculateReadiness";
import type { RecoveryScore, RecoveryCategory }   from "@/lib/recovery/recoveryTypes";
import type { PhaseData }                          from "@/types/recommendation";

interface DailyStatusProps {
  readiness: ReadinessScore | undefined;
  recovery:  RecoveryScore  | undefined;
  phase:     PhaseData;
}

const READINESS_STYLE: Record<ReadinessCategory, { score: string; bg: string; label: string }> = {
  optimal:  { score: "#0F6E56", bg: "#E1F5EE", label: "Optimal"  },
  ready:    { score: "#534AB7", bg: "#EEEDFE", label: "Ready"    },
  moderate: { score: "#1B5FA0", bg: "#E3EFFE", label: "Moderate" },
  cautious: { score: "#854F0B", bg: "#FAEEDA", label: "Cautious" },
  recover:  { score: "#6B7280", bg: "#EEF0F2", label: "Recover"  },
};

const RECOVERY_STYLE: Record<RecoveryCategory, { score: string; bg: string }> = {
  Excellent:   { score: "#0F6E56", bg: "#E1F5EE" },
  Good:        { score: "#534AB7", bg: "#EEEDFE" },
  Moderate:    { score: "#1B5FA0", bg: "#E3EFFE" },
  Compromised: { score: "#854F0B", bg: "#FAEEDA" },
  Poor:        { score: "#C0392B", bg: "#FDF3F2" },
};

const PHASE_STYLE: Record<string, { bg: string; text: string }> = {
  "Menstrual":   { bg: "#FDF3F2", text: "#C0392B" },
  "Follicular":  { bg: "#E1F5EE", text: "#085041" },
  "Ovulatory":   { bg: "#EEEDFE", text: "#3C3489" },
  "Luteal":      { bg: "#FAEEDA", text: "#633806" },
  "Late Luteal": { bg: "#EEF0F2", text: "#3D4451" },
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
      <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690] mb-1.5">
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
  const pStyle   = PHASE_STYLE[phase.name] ?? { bg: "#EEF0F2", text: "#3D4451" };

  return (
    <div className="flex gap-2.5">
      <Tile
        label="Readiness"
        value={readiness ? `${readiness.score}` : "—"}
        sub={rStyle?.label}
        bg={rStyle?.bg ?? "#F1EFE8"}
        valueColor={rStyle?.score ?? "#9B9690"}
      />
      <Tile
        label="Recovery"
        value={recovery ? `${recovery.score}` : "—"}
        sub={recovery?.category}
        bg={recStyle?.bg ?? "#F1EFE8"}
        valueColor={recStyle?.score ?? "#9B9690"}
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
