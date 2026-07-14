"use client";

import type { PersonalizationProgress } from "@/lib/adaptive/personalizationProgress";

interface Props {
  progress: PersonalizationProgress | null;
}

const TIER_COLORS: Record<string, string> = {
  "Starting":           "bg-surface-hover border border-border",
  "Learning":           "bg-caution-bg border border-caution-border",
  "Personalized":       "bg-success-bg border border-success-border",
  "Highly Personalized":"bg-brand-bg-mid border border-brand-border",
};

const TIER_TEXT: Record<string, string> = {
  "Starting":           "text-ink-secondary",
  "Learning":           "text-caution",
  "Personalized":       "text-success",
  "Highly Personalized":"text-brand",
};

interface Dimension {
  label: string;
  key:   keyof Pick<
    PersonalizationProgress,
    "cycleLearning" | "symptomLearning" | "strategyLearning" | "readinessLearning" | "recoveryLearning"
  >;
}

const DIMENSIONS: Dimension[] = [
  { label: "Cycle timing",          key: "cycleLearning" },
  { label: "Readiness calibration", key: "readinessLearning" },
  { label: "Recovery response",     key: "recoveryLearning" },
  { label: "Symptom patterns",      key: "symptomLearning" },
  { label: "Recovery strategies",   key: "strategyLearning" },
];

function ProgressBar({ value }: { value: number }) {
  const pct   = Math.round(value);
  const color =
    pct >= 70 ? "bg-success" :
    pct >= 30 ? "bg-caution" :
    "bg-ink-faint";

  return (
    <div className="w-full bg-black/8 rounded-full h-[3px] overflow-hidden">
      <div
        className={`${color} h-full rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PersonalizationCard({ progress }: Props) {
  if (!progress) return null;

  const { tier, overallProgress, strongSignals, learningSignals, needsDataSignals } = progress;
  const tierColor = TIER_COLORS[tier] ?? "bg-border-strong";
  const tierText  = TIER_TEXT[tier]  ?? "text-ink-secondary";

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Your Adaptive Profile</h2>
          <p className={`text-sm font-medium mt-0.5 ${tierText}`}>{tier}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${tierColor} rounded-full px-3 py-1`}>
            <span className="text-[13px] font-bold text-ink">{overallProgress}%</span>
          </div>
        </div>
      </div>

      {/* Sub-dimension bars */}
      <div className="space-y-2.5">
        {DIMENSIONS.map(({ label, key }) => {
          const value = progress[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary text-xs">{label}</span>
                <span className="text-ink-muted text-xs">{Math.round(value)}%</span>
              </div>
              <ProgressBar value={value} />
            </div>
          );
        })}
      </div>

      {/* Signal summary */}
      {(strongSignals.length > 0 || learningSignals.length > 0 || needsDataSignals.length > 0) && (
        <div className="border-t border-border pt-3 space-y-2">
          {strongSignals.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {strongSignals.map(s => (
                <span key={s} className="text-xs text-success flex items-center gap-1">
                  <span className="text-success-text">✓</span> {s}
                </span>
              ))}
            </div>
          )}
          {learningSignals.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {learningSignals.map(s => (
                <span key={s} className="text-xs text-caution flex items-center gap-1">
                  <span>·</span> {s}
                </span>
              ))}
            </div>
          )}
          {needsDataSignals.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {needsDataSignals.map(s => (
                <span key={s} className="text-xs text-ink-muted flex items-center gap-1">
                  <span>○</span> {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {overallProgress < 26 && (
        <p className="text-ink-muted text-xs leading-relaxed border-t border-black/6 pt-3">
          Axis is collecting data to personalize your recommendations. Check back after a few weeks of check-ins and workouts.
        </p>
      )}
    </div>
  );
}
