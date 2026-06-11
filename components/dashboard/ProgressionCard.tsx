"use client";

import type { ProgressionProfile, RecommendedAction } from "@/lib/progression/progressionProfile";
import type { CoachingAdjustment } from "@/lib/progression/progressionRules";

// ─── Style maps ───────────────────────────────────────────────────────────────

const ACTION_STYLES: Record<RecommendedAction, {
  badge: string; bar: string; dot: string; label: string;
}> = {
  progress: {
    badge: "bg-[#E1F5EE] text-[#085041] border-[#A8DFC8]",
    bar:   "#0F6E56",
    dot:   "bg-[#0F6E56]",
    label: "Progress",
  },
  maintain: {
    badge: "bg-[#EEEDFE] text-[#3C3489] border-[#C4C0EE]",
    bar:   "#534AB7",
    dot:   "bg-[#534AB7]",
    label: "Maintain",
  },
  reduce: {
    badge: "bg-[#FAEEDA] text-[#633806] border-[#E4C88A]",
    bar:   "#854F0B",
    dot:   "bg-[#854F0B]",
    label: "Reduce",
  },
  deload: {
    badge: "bg-[#EEF0F2] text-[#3D4451] border-[#CBD0D8]",
    bar:   "#6B7280",
    dot:   "bg-[#6B7280]",
    label: "Deload",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
      {children}
    </div>
  );
}

function ScoreBar({ label, score, barColor }: { label: string; score: number; barColor: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#6B6860]">{label}</span>
        <span className="text-[11px] font-semibold text-[#1C1B18]">{score}/100</span>
      </div>
      <div className="h-1.5 bg-[#F0EDE4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const TOTAL = 8;
  const filled = Math.round(confidence * TOTAL);
  const pct    = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i < filled ? "bg-[#534AB7]" : "bg-[#E0DDD4]"}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-[#9B9690]">{pct}% data confidence</span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ProgressionCardProps {
  profile:    ProgressionProfile | null;
  adjustment: CoachingAdjustment | null;
}

export function ProgressionCard({ profile, adjustment }: ProgressionCardProps) {
  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <CardLabel>Adaptive Coaching</CardLabel>
        <p className="text-[12px] text-[#9B9690] leading-relaxed">
          Log your first workout to activate the progression engine.
        </p>
      </div>
    );
  }

  const style = ACTION_STYLES[profile.recommendedAction];

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DC] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <CardLabel>Adaptive Coaching</CardLabel>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Score bars */}
      <div className="space-y-3 mb-4">
        <ScoreBar label="Adherence"   score={profile.adherenceScore}   barColor={style.bar} />
        <ScoreBar label="Recovery"    score={profile.recoveryScore}    barColor={style.bar} />
        <ScoreBar label="Progression" score={profile.progressionScore} barColor={style.bar} />
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <ConfidenceDots confidence={profile.confidence} />
      </div>

      {/* Rationale */}
      {adjustment && (
        <div className="pt-3 border-t border-[#F0EDE4]">
          <p className="text-[11px] text-[#6B6860] leading-relaxed">{adjustment.rationale}</p>
        </div>
      )}
    </div>
  );
}
