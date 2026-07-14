"use client";

import type { ProgressionProfile, RecommendedAction } from "@/lib/progression/progressionProfile";
import type { CoachingAdjustment } from "@/lib/progression/progressionRules";
import { color as tokenColor } from "@/lib/design/tokens";

// ─── Style maps ───────────────────────────────────────────────────────────────

const ACTION_STYLES: Record<RecommendedAction, {
  badge: string; bar: string; dot: string; label: string;
}> = {
  progress: {
    badge: "bg-success-bg text-success-text border-success-border",
    bar:   tokenColor.success,
    dot:   "bg-success",
    label: "Progress",
  },
  maintain: {
    badge: "bg-brand-bg-mid text-brand-dark border-brand-border",
    bar:   tokenColor.brand,
    dot:   "bg-brand",
    label: "Maintain",
  },
  reduce: {
    badge: "bg-caution-bg text-caution-text border-caution-border",
    bar:   tokenColor.caution,
    dot:   "bg-caution",
    label: "Reduce",
  },
  deload: {
    badge: "bg-neutral-bg text-neutral-text border-neutral-border",
    bar:   tokenColor.neutral,
    dot:   "bg-neutral",
    label: "Deload",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

function ScoreBar({ label, score, barColor }: { label: string; score: number; barColor: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-secondary">{label}</span>
        <span className="text-[11px] font-semibold text-ink">{score}/100</span>
      </div>
      <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
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
            className={`w-1.5 h-1.5 rounded-full ${i < filled ? "bg-brand" : "bg-border-strong"}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-ink-muted">{pct}% data confidence</span>
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
      <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <CardLabel>Adaptive Coaching</CardLabel>
        <p className="text-[12px] text-ink-muted leading-relaxed">
          Log your first workout to activate the progression engine.
        </p>
      </div>
    );
  }

  const style = ACTION_STYLES[profile.recommendedAction];

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
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
        <div className="pt-3 border-t border-surface-hover">
          <p className="text-[11px] text-ink-secondary leading-relaxed">{adjustment.rationale}</p>
        </div>
      )}
    </div>
  );
}
