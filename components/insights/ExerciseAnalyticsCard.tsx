"use client";

import type { ExerciseAnalyticsReport, ExerciseMetrics } from "@/lib/insights/exerciseAnalytics";

// ── Exercise row ───────────────────────────────────────────────────────────

function ExerciseRow({ ex, rank }: { ex: ExerciseMetrics; rank: number }) {
  const completionPct = Math.round(ex.completionRate * 100);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-bold text-ink-faint w-4 flex-shrink-0">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-ink truncate">{ex.name}</p>
        <p className="text-[10px] text-ink-muted">
          {ex.timesAppeared}× · {ex.avgSetsLogged} sets avg
          {ex.avgRpe !== null ? ` · RPE ${ex.avgRpe}` : ""}
        </p>
      </div>
      {/* Completion bar */}
      <div className="flex-shrink-0 text-right">
        <p className="text-[11px] font-semibold text-ink-secondary">{completionPct}%</p>
        <p className="type-micro text-ink-muted">done</p>
      </div>
    </div>
  );
}

// ── Fatigue bar ────────────────────────────────────────────────────────────

function FatigueRow({ ex }: { ex: ExerciseMetrics }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-ink-secondary truncate pr-2">{ex.name}</span>
        <span className={`text-[10px] font-semibold ${
          ex.estimatedFatigue >= 70 ? "text-caution-text" :
          ex.estimatedFatigue >= 40 ? "text-brand-text" :
          "text-success-text"
        }`}>
          {ex.estimatedFatigue >= 70 ? "High" : ex.estimatedFatigue >= 40 ? "Moderate" : "Low"}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-subtle overflow-hidden">
        <div
          className={`h-full rounded-full ${
            ex.estimatedFatigue >= 70 ? "bg-caution" :
            ex.estimatedFatigue >= 40 ? "bg-brand" :
            "bg-success"
          }`}
          style={{ width: `${ex.estimatedFatigue}%` }}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface ExerciseAnalyticsCardProps {
  report:     ExerciseAnalyticsReport;
  className?: string;
}

export function ExerciseAnalyticsCard({ report, className = "" }: ExerciseAnalyticsCardProps) {
  if (!report.dataReady) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">Exercise Analytics</p>
        <p className="text-[12px] text-ink-muted">Complete more sessions to unlock exercise analytics.</p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <p className="type-micro text-ink-muted mb-0.5">Exercise Analytics</p>
        <p className="text-[11px] text-ink-muted">{report.totalExercisesTracked} exercises tracked</p>
      </div>

      {/* Top performers */}
      {report.topPerformers.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <p className="type-micro text-ink-muted mb-2">Top performers</p>
          {report.topPerformers.map((ex, i) => (
            <ExerciseRow key={ex.name} ex={ex} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Fatigue cost */}
      {report.highFatigue.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <p className="type-micro text-ink-muted mb-2">Highest fatigue cost</p>
          {report.highFatigue.map(ex => (
            <FatigueRow key={ex.name} ex={ex} />
          ))}
          <p className="text-[10px] text-ink-muted mt-2">
            Estimated from sets × avg RPE. Higher-cost exercises need more recovery time.
          </p>
        </div>
      )}

      {/* Best adherence */}
      {report.highAdherence.length > 0 && (
        <div className="px-5 py-4">
          <p className="type-micro text-ink-muted mb-2">Most consistently completed</p>
          {report.highAdherence.map((ex, i) => (
            <ExerciseRow key={ex.name} ex={ex} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
