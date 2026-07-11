"use client";
// ─── components/dev/TelemetryDashboard.tsx ───────────────────────────────────
// Phase 75 — product analytics developer view.

import { useState, useMemo } from "react";
import {
  computeTelemetryInsights,
  computeRetentionSignal,
  type FeatureAdoptionEntry,
  type FunnelStage,
} from "@/lib/telemetry/TelemetryAnalyzer";
import { getEventCount, clearTelemetry } from "@/lib/telemetry/TelemetryCollector";
import type { TelemetryCategory } from "@/lib/telemetry/TelemetryTypes";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TelemetryCategory, string> = {
  navigation:     "Navigation",
  workout:        "Workout",
  recommendation: "Recommendation",
  checkin:        "Check-in",
  onboarding:     "Onboarding",
  feature_use:    "Feature Use",
  error:          "Error",
  performance:    "Performance",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FunnelChart({ stages, title }: { stages: FunnelStage[]; title: string }) {
  const max = stages.reduce((m, s) => Math.max(m, s.count), 0);
  return (
    <div>
      <p className="text-xs font-semibold text-ink-muted mb-2">{title}</p>
      <div className="space-y-2">
        {stages.map(stage => (
          <div key={stage.name}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-ink-base">{stage.name}</span>
              <span className="text-xs text-ink-muted">{stage.count}</span>
            </div>
            <div className="h-1.5 bg-ui-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: max > 0 ? `${(stage.count / max) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureTable({ features }: { features: FeatureAdoptionEntry[] }) {
  if (features.length === 0) {
    return <p className="text-xs text-ink-muted text-center py-3">No events recorded yet.</p>;
  }
  const max = features[0]?.totalUses ?? 1;
  return (
    <div className="space-y-2">
      {features.map(f => (
        <div key={f.name}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-mono text-ink-base truncate max-w-[60%]">{f.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-muted">{f.uniqueSessions} sess</span>
              <span className="text-xs font-semibold text-ink-base">{f.totalUses}</span>
            </div>
          </div>
          <div className="h-1 bg-ui-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand/60 rounded-full"
              style={{ width: `${(f.totalUses / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TelemetryDashboard() {
  const [count, setCount]   = useState(getEventCount);
  const insights = useMemo(() => computeTelemetryInsights(), [count]);
  const retention = useMemo(() => computeRetentionSignal(), [count]);

  function handleClear() {
    clearTelemetry();
    setCount(0);
  }

  const categories = Object.entries(insights.categoryBreakdown) as [TelemetryCategory, number][];

  return (
    <div className="space-y-4">

      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Total Events</p>
          <p className="text-2xl font-bold text-ink-base">{insights.totalEvents}</p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Sessions</p>
          <p className="text-2xl font-bold text-ink-base">{insights.sessionCount}</p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Error Rate</p>
          <p className={`text-xl font-bold ${insights.errorRate > 0.05 ? "text-red-400" : "text-green-400"}`}>
            {(insights.errorRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Retention</p>
          <p className="text-xs text-ink-base mt-1">
            D1: <span className={retention.d1 ? "text-green-400" : "text-ink-muted"}>{retention.d1 ? "yes" : "no"}</span>
            {" · "}
            D7: <span className={retention.d7 ? "text-green-400" : "text-ink-muted"}>{retention.d7 ? "yes" : "no"}</span>
            {" · "}
            D30: <span className={retention.d30 ? "text-green-400" : "text-ink-muted"}>{retention.d30 ? "yes" : "no"}</span>
          </p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-ui-surface rounded-xl p-3">
        <p className="text-xs font-semibold text-green-400 mb-1">Privacy-first telemetry</p>
        <p className="text-xs text-ink-muted">
          All events are stored locally in your browser. No data is transmitted. No PII is collected.
          Events are used only to surface product insights in this developer dashboard.
        </p>
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs font-semibold text-ink-muted mb-3">Events by Category</p>
          <div className="space-y-1.5">
            {categories.sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-xs text-ink-base">{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="text-xs text-ink-muted">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnels */}
      <div className="bg-ui-surface rounded-xl p-3 space-y-4">
        <FunnelChart stages={insights.onboardingFunnel} title="Onboarding Funnel" />
        <FunnelChart stages={insights.workoutFunnel}    title="Workout Funnel" />
      </div>

      {/* Top features */}
      <div className="bg-ui-surface rounded-xl p-3">
        <p className="text-xs font-semibold text-ink-muted mb-3">Top Feature Usage</p>
        <FeatureTable features={insights.topFeatures} />
      </div>

      {/* Controls */}
      <button
        onClick={handleClear}
        className="w-full py-2.5 rounded-xl bg-red-900/30 text-red-400 text-sm font-medium border border-red-500/20"
      >
        Clear Telemetry Data
      </button>
    </div>
  );
}
