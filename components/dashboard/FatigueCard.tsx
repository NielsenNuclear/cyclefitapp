"use client";

import type { FatigueScoreEntry } from "@/lib/autoregulation/fatigueModel";

interface Props {
  entry: FatigueScoreEntry | undefined;
}

const ZONE_COLOR: Record<string, string> = {
  fresh:       "text-emerald-400",
  normal:      "text-sky-400",
  fatigued:    "text-amber-400",
  overreached: "text-rose-400",
};

const ZONE_BAR: Record<string, string> = {
  fresh:       "bg-emerald-500",
  normal:      "bg-sky-500",
  fatigued:    "bg-amber-500",
  overreached: "bg-rose-500",
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

  const zoneColor = ZONE_COLOR[entry.zone] ?? "text-white";
  const zoneBar   = ZONE_BAR[entry.zone]   ?? "bg-white/40";
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Fatigue Status</h3>
        <span className={`text-xs font-semibold ${zoneColor}`}>{zoneLabel}</span>
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-white/40">Accumulated fatigue</span>
          <span className={`text-sm font-semibold ${zoneColor}`}>{entry.score}</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-white/10">
          <div
            className={`h-2.5 rounded-full transition-all ${zoneBar}`}
            style={{ width: `${entry.score}%` }}
          />
        </div>
        {/* Zone markers */}
        <div className="flex justify-between text-[9px] text-white/25">
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
            <span className="text-[10px] text-white/40 w-28 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-white/30 transition-all"
                style={{ width: `${val}%` }}
              />
            </div>
            <span className="text-[10px] text-white/35 w-8 text-right">{val}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-white/45 leading-relaxed text-center">{zoneNote}</p>
    </div>
  );
}
