"use client";

import type { FatigueScoreEntry } from "@/lib/autoregulation/fatigueModel";

interface Props {
  entry: FatigueScoreEntry | undefined;
}

const ZONE_COLOR: Record<string, string> = {
  fresh:       "text-[#0F6E56]",
  normal:      "text-[#1B4FA0]",
  fatigued:    "text-[#854F0B]",
  overreached: "text-[#C0392B]",
};

const ZONE_BAR: Record<string, string> = {
  fresh:       "bg-[#0F6E56]",
  normal:      "bg-[#1B4FA0]",
  fatigued:    "bg-[#854F0B]",
  overreached: "bg-[#C0392B]",
};

const ZONE_LABEL: Record<string, string> = {
  fresh:       "Fresh",
  normal:      "Normal",
  fatigued:    "Accumulating Fatigue",
  overreached: "Overreached",
};

const ZONE_NOTE: Record<string, string> = {
  fresh:       "Ready for a demanding session — systems fully recovered.",
  normal:      "Normal fatigue level — training as planned is appropriate.",
  fatigued:    "Fatigue is building — session volume has been moderated.",
  overreached: "Overreach detected — prioritise recovery over new stimulus.",
};

export function FatigueCard({ entry }: Props) {
  if (!entry) return null;

  const zoneColor = ZONE_COLOR[entry.zone] ?? "text-[#1C1B18]";
  const zoneBar   = ZONE_BAR[entry.zone]   ?? "bg-[#C8C5BC]";
  const zoneLabel = ZONE_LABEL[entry.zone] ?? entry.zone;
  const zoneNote  = ZONE_NOTE[entry.zone]  ?? "";

  const components = [
    { label: "Training Load",  val: entry.components.trainingLoad  },
    { label: "Recovery Bank",  val: entry.components.recoveryBank  },
    { label: "Sleep",          val: entry.components.sleep         },
    { label: "Stress",         val: entry.components.stress        },
    { label: "Symptoms",       val: entry.components.symptoms      },
  ];

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Fatigue Status</h3>
        <span className={`text-xs font-semibold ${zoneColor}`}>{zoneLabel}</span>
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-[#9B9690]">Accumulated fatigue</span>
          <span className={`text-sm font-semibold ${zoneColor}`}>{entry.score}</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-black/8">
          <div
            className={`h-2.5 rounded-full transition-all ${zoneBar}`}
            style={{ width: `${entry.score}%` }}
          />
        </div>
        {/* Zone markers */}
        <div className="flex justify-between text-[9px] text-[#C8C5BC]">
          <span>Fresh</span>
          <span>Normal</span>
          <span>Fatigued</span>
          <span>Overreached</span>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="space-y-1.5">
        {components.map(({ label, val }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-[10px] text-[#9B9690] w-28 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/8">
              <div
                className={`h-1.5 rounded-full ${zoneBar} transition-all`}
                style={{ width: `${val}%` }}
              />
            </div>
            <span className="text-[10px] text-[#9B9690] w-8 text-right">{val}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#9B9690] leading-relaxed text-center">{zoneNote}</p>
    </div>
  );
}
