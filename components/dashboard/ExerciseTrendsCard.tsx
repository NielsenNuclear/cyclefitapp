"use client";

// ─── components/dashboard/ExerciseTrendsCard.tsx ──────────────────────────────
// Dashboard 2.0 — Layer 3. Merges PerformanceTrendsCard and
// ExerciseIntelligenceCard's trend rows — both answered "is this exercise
// progressing" from overlapping/identical PerformanceTrend[] data, rendered
// as two separate cards. One row per exercise now: volume trend (from
// ExerciseIntelligenceCard) + completion/RPE detail (from PerformanceTrendsCard).
// ExerciseIntelligenceCard's "Training DNA" section survives as its own
// sub-section. See docs/ux/UXStabilizationAudit.md Batch 17.

import type { PerformanceTrend } from "@/lib/analytics/performanceTrends";
import type { TrainingResponseProfile } from "@/lib/progression/trainingResponseProfile";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import { color, statusColors } from "@/lib/design/tokens";

const STATUS_CONFIG: Record<string, { arrow: string; color: string; bg: string }> = {
  improving: { arrow: "↑", color: statusColors.success.text, bg: statusColors.success.bg },
  stable:    { arrow: "→", color: color.inkSecondary, bg: color.surfaceSubtle },
  plateau:   { arrow: "⏸", color: statusColors.caution.text, bg: statusColors.caution.bg },
  regressing: { arrow: "↓", color: statusColors.danger.text, bg: statusColors.danger.bg },
  insufficient_data: { arrow: "—", color: color.inkMuted, bg: color.surfaceSubtle },
};
const VOL_LABELS: Record<string, string> = {
  high_volume: "Volume Responder", moderate_volume: "Balanced Volume",
  low_volume: "Efficiency Responder", insufficient_data: "Learning…",
};
const INT_LABELS: Record<string, string> = {
  high_intensity: "Intensity Responder", moderate_intensity: "Balanced Intensity",
  low_intensity: "Moderate Intensity", insufficient_data: "Learning…",
};
const FREQ_LABELS: Record<string, string> = {
  high_frequency: "High Frequency", moderate_frequency: "Moderate Frequency",
  low_frequency: "Low Frequency", insufficient_data: "Learning…",
};

function formatPctChange(recent: number, prior: number): string {
  if (prior === 0 || recent === 0) return "";
  const pct = ((recent - prior) / prior) * 100;
  return `${pct > 0 ? "+" : ""}${Math.round(pct)}%`;
}

interface ExerciseTrendsCardProps {
  trends:          PerformanceTrend[];
  summaries:       ExerciseProgressSummary[];
  trainingProfile?: TrainingResponseProfile;
}

export function ExerciseTrendsCard({ trends, summaries, trainingProfile }: ExerciseTrendsCardProps) {
  const withData = trends.filter(t => t.status !== "insufficient_data");
  const summaryMap = new Map(summaries.map(s => [s.exerciseName, s]));

  if (withData.length === 0 && !trainingProfile) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <h2 className="text-[15px] font-semibold text-ink">Exercise Trends</h2>
        <p className="text-[11px] text-ink-muted mt-0.5">Is each exercise progressing?</p>
      </div>

      {withData.length > 0 ? (
        <div className="divide-y divide-surface-subtle">
          {withData.slice(0, 7).map(t => {
            const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.stable;
            const pct = t.status !== "insufficient_data" ? formatPctChange(t.recentVolume, t.priorVolume) : "";
            const summary = summaryMap.get(t.exerciseName);
            return (
              <div key={t.exerciseName} className="px-5 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-ink font-medium truncate flex-1 mr-2">{t.exerciseName}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      <span>{cfg.arrow}</span>{pct && <span>{pct}</span>}
                    </span>
                    <span className="text-[10px] text-ink-muted">{t.sessionCount}s</span>
                  </div>
                </div>
                {summary && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <span className="text-[10px] text-ink-muted">{summary.completedCount} session{summary.completedCount !== 1 ? "s" : ""}</span>
                    {summary.skippedCount > 0 && <span className="text-[10px] text-danger">· {summary.skippedCount} skipped</span>}
                    {summary.averageRPE > 0 && <span className="text-[10px] text-ink-muted">· Avg effort {summary.averageRPE}/10</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-3">
          <p className="text-[11px] text-ink-muted">Log 4 sessions per exercise to see volume trends.</p>
        </div>
      )}

      {withData.length > 7 && (
        <div className="px-5 py-2 border-t border-surface-hover">
          <p className="text-[11px] text-ink-muted">+{withData.length - 7} more exercises tracked</p>
        </div>
      )}

      {trainingProfile && (
        <div className="px-5 py-3 border-t border-surface-hover space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Training DNA · {trainingProfile.totalSessions} sessions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[VOL_LABELS[trainingProfile.optimalVolumeStyle], INT_LABELS[trainingProfile.optimalIntensityStyle], FREQ_LABELS[trainingProfile.optimalFrequencyStyle]].map((label, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-bg-mid text-brand-dark">{label}</span>
            ))}
          </div>
          {trainingProfile.confidence !== "early" && (
            <p className="text-[11px] text-ink-secondary leading-relaxed">{trainingProfile.insight}</p>
          )}
        </div>
      )}
    </div>
  );
}
