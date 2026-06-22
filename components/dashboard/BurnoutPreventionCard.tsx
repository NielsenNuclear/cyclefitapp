"use client";

import type { LifestyleBurnoutReport, LifestyleBurnoutLevel } from "@/lib/lifestyle/burnoutDetection";

interface Props {
  report: LifestyleBurnoutReport | undefined;
}

const RISK_CONFIG: Record<LifestyleBurnoutLevel, { label: string; color: string; bar: string }> = {
  low:      { label: "Low",      color: "text-emerald-400", bar: "bg-emerald-500" },
  elevated: { label: "Elevated", color: "text-sky-400",     bar: "bg-sky-500"     },
  high:     { label: "High",     color: "text-amber-400",   bar: "bg-amber-500"   },
  critical: { label: "Critical", color: "text-rose-400",    bar: "bg-rose-500"    },
};

const RISK_NOTE: Record<LifestyleBurnoutLevel, string> = {
  low:      "No lifestyle burnout signals — you're managing life load well.",
  elevated: "Some lifestyle stress signals detected — worth monitoring.",
  high:     "Multiple stress signals are compounding — consider a lighter week.",
  critical: "Lifestyle burnout risk is critical — rest is your highest priority.",
};

export function BurnoutPreventionCard({ report }: Props) {
  if (!report || report.risk === "low") return null;

  const cfg  = RISK_CONFIG[report.risk];
  const note = RISK_NOTE[report.risk];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Lifestyle Burnout</h3>
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-white/35">
          <span>Lifestyle stress load</span>
          <span>{report.score}/100</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-white/10">
          <div className={`h-2.5 rounded-full transition-all ${cfg.bar}`} style={{ width: `${report.score}%` }} />
        </div>
      </div>

      <p className="text-[11px] text-white/45 leading-relaxed">{note}</p>

      {/* Signals */}
      {report.signals.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/8">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">Signals</div>
          {report.signals.slice(0, 3).map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className={`text-[9px] mt-0.5 ${cfg.color}`}>▲</span>
              <span className="text-[11px] text-white/45">{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/8">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">What to do</div>
          {report.recommendations.slice(0, 2).map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-emerald-400 text-[9px] mt-0.5">→</span>
              <span className="text-[11px] text-white/50">{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
