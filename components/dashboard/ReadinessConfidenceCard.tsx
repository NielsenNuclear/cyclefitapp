"use client";

import type { ReadinessConfidence } from "@/lib/autoregulation/readinessConfidence";

interface Props {
  confidence: ReadinessConfidence | undefined;
}

const LEVEL_COLOR: Record<string, string> = {
  high:   "text-emerald-400",
  medium: "text-sky-400",
  low:    "text-amber-400",
};

const LEVEL_LABEL: Record<string, string> = {
  high:   "High Confidence",
  medium: "Moderate Confidence",
  low:    "Low Confidence",
};

const LEVEL_NOTE: Record<string, string> = {
  high:   "Axis has a clear picture of your status today — recommendations are well-calibrated.",
  medium: "Some data gaps exist — recommendations are informed but may be slightly conservative.",
  low:    "Limited data available — log a check-in and more sessions to improve accuracy.",
};

function ConfidenceRing({ score, level }: { score: number; level: string }) {
  const color =
    level === "high" ? "#34d399"
    : level === "medium" ? "#38bdf8"
    : "#fbbf24";
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
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
        fill="white" fontSize="13" fontWeight="700">{score}%</text>
    </svg>
  );
}

export function ReadinessConfidenceCard({ confidence }: Props) {
  if (!confidence) return null;

  const levelColor = LEVEL_COLOR[confidence.confidenceLevel] ?? "text-white";
  const levelLabel = LEVEL_LABEL[confidence.confidenceLevel] ?? confidence.confidenceLevel;
  const levelNote  = LEVEL_NOTE[confidence.confidenceLevel]  ?? "";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Readiness Confidence</h3>
        <span className={`text-xs font-semibold ${levelColor}`}>{levelLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        <ConfidenceRing score={confidence.confidence} level={confidence.confidenceLevel} />
        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold text-white">
            Readiness {confidence.readinessScore}
          </div>
          <p className="text-[11px] text-white/45 leading-relaxed">{levelNote}</p>
        </div>
      </div>

      {confidence.factors.length > 0 && (
        <div className="space-y-1">
          {confidence.factors.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className={`w-1.5 h-1.5 rounded-full ${levelColor.replace("text-", "bg-")} flex-shrink-0`} />
              <span className="text-[11px] text-white/50">{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
