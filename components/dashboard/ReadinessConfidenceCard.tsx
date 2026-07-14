"use client";

import type { ReadinessConfidence } from "@/lib/autoregulation/readinessConfidence";
import { color as tokenColor } from "@/lib/design/tokens";

interface Props {
  confidence: ReadinessConfidence | undefined;
}

const LEVEL_COLOR: Record<string, string> = {
  high:   "text-success",
  medium: "text-info",
  low:    "text-caution",
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
  const ringColor =
    level === "high" ? tokenColor.success
    : level === "medium" ? tokenColor.info
    : tokenColor.caution;
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={ringColor} strokeWidth="6"
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

  const levelColor = LEVEL_COLOR[confidence.confidenceLevel] ?? "text-ink";
  const levelLabel = LEVEL_LABEL[confidence.confidenceLevel] ?? confidence.confidenceLevel;
  const levelNote  = LEVEL_NOTE[confidence.confidenceLevel]  ?? "";

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Readiness Confidence</h3>
        <span className={`text-xs font-semibold ${levelColor}`}>{levelLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        <ConfidenceRing score={confidence.confidence} level={confidence.confidenceLevel} />
        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold text-ink">
            Readiness {confidence.readinessScore}
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">{levelNote}</p>
        </div>
      </div>

      {confidence.factors.length > 0 && (
        <div className="space-y-1">
          {confidence.factors.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className={`w-1.5 h-1.5 rounded-full ${levelColor.replace("text-", "bg-")} flex-shrink-0`} />
              <span className="text-[11px] text-ink-secondary">{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
