"use client";

import type { PerformanceTrend } from "@/lib/analytics/performanceTrends";
import type { TrainingResponseProfile } from "@/lib/progression/trainingResponseProfile";

// ─── Per-exercise trend row ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { arrow: string; color: string; bg: string }> = {
  improving:         { arrow: "↑", color: "#1A7A3E", bg: "#EAF8EF" },
  stable:            { arrow: "→", color: "#6B6560", bg: "#F5F3EE" },
  plateau:           { arrow: "⏸", color: "#B35C00", bg: "#FFF3E8" },
  regressing:        { arrow: "↓", color: "#C0392B", bg: "#FEEEEE" },
  insufficient_data: { arrow: "—", color: "#9B9690", bg: "#F5F3EE" },
};

function formatPctChange(recent: number, prior: number): string {
  if (prior === 0 || recent === 0) return "";
  const pct  = ((recent - prior) / prior) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

interface TrendRowProps { trend: PerformanceTrend }

function TrendRow({ trend }: TrendRowProps) {
  const cfg = STATUS_CONFIG[trend.status] ?? STATUS_CONFIG.stable;
  const pct = trend.status !== "insufficient_data"
    ? formatPctChange(trend.recentVolume, trend.priorVolume)
    : "";

  return (
    <div className="px-4 py-2.5 flex items-center justify-between">
      <span className="text-[12px] text-[#1C1B18] font-medium truncate flex-1 mr-2">
        {trend.exerciseName}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          <span>{cfg.arrow}</span>
          {pct && <span>{pct}</span>}
        </span>
        <span className="text-[10px] text-[#9B9690]">{trend.sessionCount}s</span>
      </div>
    </div>
  );
}

// ─── Training response profile section ────────────────────────────────────────

const VOL_LABELS: Record<string, string> = {
  high_volume:     "Volume Responder",
  moderate_volume: "Balanced Volume",
  low_volume:      "Efficiency Responder",
  insufficient_data: "Learning…",
};

const INT_LABELS: Record<string, string> = {
  high_intensity:     "Intensity Responder",
  moderate_intensity: "Balanced Intensity",
  low_intensity:      "Moderate Intensity",
  insufficient_data:  "Learning…",
};

const FREQ_LABELS: Record<string, string> = {
  high_frequency:     "High Frequency",
  moderate_frequency: "Moderate Frequency",
  low_frequency:      "Low Frequency",
  insufficient_data:  "Learning…",
};

interface ResponseProfileSectionProps { profile: TrainingResponseProfile }

function ResponseProfileSection({ profile }: ResponseProfileSectionProps) {
  const chips = [
    VOL_LABELS[profile.optimalVolumeStyle],
    INT_LABELS[profile.optimalIntensityStyle],
    FREQ_LABELS[profile.optimalFrequencyStyle],
  ];

  return (
    <div className="px-4 py-3 border-t border-[#F0EDE4] space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690]">
        Training DNA · {profile.totalSessions} sessions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(label => (
          <span
            key={label}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF1FD] text-[#3C3489]"
          >
            {label}
          </span>
        ))}
      </div>
      {profile.confidence !== "early" && (
        <p className="text-[11px] text-[#6B6560] leading-relaxed">{profile.insight}</p>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseIntelligenceCardProps {
  trends:          PerformanceTrend[];
  trainingProfile?: TrainingResponseProfile;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ExerciseIntelligenceCard({ trends, trainingProfile }: ExerciseIntelligenceCardProps) {
  const withData = trends.filter(t => t.status !== "insufficient_data");

  if (withData.length === 0 && !trainingProfile) return null;

  return (
    <div className="rounded-2xl border border-[#E8E5DC] bg-white overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-4 py-3 border-b border-[#F0EDE4]">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690]">
          Exercise Intelligence
        </p>
        <p className="text-[13px] font-semibold text-[#1C1B18] mt-0.5">
          Volume Trend · Last 4 Sessions
        </p>
      </div>

      {/* Per-exercise rows */}
      {withData.length > 0 && (
        <div className="divide-y divide-[#F5F3EE]">
          {withData.slice(0, 7).map(t => (
            <TrendRow key={t.exerciseName} trend={t} />
          ))}
        </div>
      )}

      {withData.length === 0 && (
        <div className="px-4 py-3">
          <p className="text-[11px] text-[#9B9690]">
            Log 4 sessions per exercise to see volume trends.
          </p>
        </div>
      )}

      {withData.length > 7 && (
        <div className="px-4 py-2 border-t border-[#F0EDE4]">
          <p className="text-[11px] text-[#9B9690]">+{withData.length - 7} more exercises tracked</p>
        </div>
      )}

      {/* Training DNA section */}
      {trainingProfile && <ResponseProfileSection profile={trainingProfile} />}

    </div>
  );
}
