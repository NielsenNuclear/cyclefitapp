"use client";

import type { SupportingSignal } from "@/lib/evidence/recommendationEvidence";

// ── Qualitative level helpers ─────────────────────────────────────────────
// We never expose raw percentages or weights to users.
// Scores 0–100 → qualitative label + pip count.

type QLevel = 1 | 2 | 3 | 4 | 5;

function scoreToLevel(score: number): QLevel {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

const LEVEL_LABEL: Record<QLevel, string> = {
  1: "Low",
  2: "Below average",
  3: "Moderate",
  4: "Good",
  5: "Excellent",
};

const LEVEL_COLOR: Record<QLevel, string> = {
  1: "bg-danger",
  2: "bg-caution",
  3: "bg-brand",
  4: "bg-success",
  5: "bg-success",
};

function PipRow({ level, maxPips = 5 }: { level: QLevel; maxPips?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: maxPips }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-normal ${
            i < level ? LEVEL_COLOR[level] : "bg-border"
          }`}
          style={{ width: 10 }}
        />
      ))}
    </div>
  );
}

// ── SignalRow — for ReadinessContributors (0–100 scores) ──────────────────

interface SignalRowProps {
  label: string;
  score: number;       // 0–100
}

export function SignalRow({ label, score }: SignalRowProps) {
  const level = scoreToLevel(score);
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <PipRow level={level} />
        <span className={`text-[10px] font-semibold w-[90px] text-right ${
          level <= 2 ? "text-caution-text" : level >= 4 ? "text-success-text" : "text-ink-muted"
        }`}>
          {LEVEL_LABEL[level]}
        </span>
      </div>
    </div>
  );
}

// ── SignalContributions — shows ReadinessContributors as qualitative pips ──

interface ReadinessContributors {
  sleep:        number;
  stress:       number;
  energy:       number;
  cycle:        number;
  trainingLoad: number;
  adherence:    number;
}

const CONTRIBUTOR_LABELS: Record<keyof ReadinessContributors, string> = {
  sleep:        "Sleep",
  stress:       "Stress",
  energy:       "Energy",
  cycle:        "Cycle phase",
  trainingLoad: "Training load",
  adherence:    "Consistency",
};

// Stress is inverse — high score means low stress (good)
const INVERSE: Set<keyof ReadinessContributors> = new Set(["trainingLoad"]);

interface SignalContributionsProps {
  contributors: ReadinessContributors;
  className?:   string;
}

export function SignalContributions({ contributors, className = "" }: SignalContributionsProps) {
  const entries = Object.entries(contributors) as [keyof ReadinessContributors, number][];
  return (
    <div className={className}>
      <p className="type-micro text-ink-muted mb-1">Today's drivers</p>
      <div className="divide-y divide-border/60">
        {entries.map(([key, val]) => {
          const displayScore = INVERSE.has(key) ? 100 - val : val;
          return <SignalRow key={key} label={CONTRIBUTOR_LABELS[key]} score={displayScore} />;
        })}
      </div>
    </div>
  );
}

// ── EvidenceSignals — for SupportingSignal[] from RecommendationEvidence ──

const WEIGHT_LEVEL: Record<SupportingSignal["weight"], QLevel> = {
  high:   4,
  medium: 3,
  low:    2,
};

interface EvidenceSignalsProps {
  signals:    SupportingSignal[];
  className?: string;
}

export function EvidenceSignals({ signals, className = "" }: EvidenceSignalsProps) {
  return (
    <div className={className}>
      <p className="type-micro text-ink-muted mb-1">Evidence signals</p>
      <div className="space-y-1.5">
        {signals.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[12px] text-ink-secondary">{s.label}</span>
              <span className="text-[11px] text-ink-muted ml-2">{s.value}</span>
            </div>
            <PipRow level={WEIGHT_LEVEL[s.weight]} maxPips={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
