"use client";

import type { PersonalizationProgress } from "@/lib/adaptive/personalizationProgress";

interface Props {
  progress: PersonalizationProgress | null;
}

const TIER_COLORS: Record<string, string> = {
  "Starting":           "bg-zinc-500",
  "Learning":           "bg-amber-500",
  "Personalized":       "bg-teal-500",
  "Highly Personalized":"bg-violet-500",
};

const TIER_TEXT: Record<string, string> = {
  "Starting":           "text-zinc-400",
  "Learning":           "text-amber-400",
  "Personalized":       "text-teal-400",
  "Highly Personalized":"text-violet-400",
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
    pct >= 70 ? "bg-teal-500" :
    pct >= 30 ? "bg-amber-500" :
    "bg-zinc-600";

  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
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
  const tierColor = TIER_COLORS[tier] ?? "bg-zinc-500";
  const tierText  = TIER_TEXT[tier]  ?? "text-zinc-400";

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-base">Your Adaptive Profile</h2>
          <p className={`text-sm font-medium mt-0.5 ${tierText}`}>{tier}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${tierColor} rounded-full px-3 py-1`}>
            <span className="text-white text-sm font-bold">{overallProgress}%</span>
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
                <span className="text-zinc-400 text-xs">{label}</span>
                <span className="text-zinc-500 text-xs">{Math.round(value)}%</span>
              </div>
              <ProgressBar value={value} />
            </div>
          );
        })}
      </div>

      {/* Signal summary */}
      {(strongSignals.length > 0 || learningSignals.length > 0 || needsDataSignals.length > 0) && (
        <div className="border-t border-zinc-800 pt-3 space-y-2">
          {strongSignals.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {strongSignals.map(s => (
                <span key={s} className="text-xs text-teal-400 flex items-center gap-1">
                  <span className="text-teal-500">✓</span> {s}
                </span>
              ))}
            </div>
          )}
          {learningSignals.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {learningSignals.map(s => (
                <span key={s} className="text-xs text-amber-400 flex items-center gap-1">
                  <span>·</span> {s}
                </span>
              ))}
            </div>
          )}
          {needsDataSignals.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {needsDataSignals.map(s => (
                <span key={s} className="text-xs text-zinc-600 flex items-center gap-1">
                  <span>○</span> {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {overallProgress < 26 && (
        <p className="text-zinc-500 text-xs leading-relaxed border-t border-zinc-800 pt-3">
          Axis is collecting data to personalize your recommendations. Check back after a few weeks of check-ins and workouts.
        </p>
      )}
    </div>
  );
}
