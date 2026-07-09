"use client";
// ─── components/dev/ConfidenceInspector.tsx ──────────────────────────────────
// Phase 67 — developer tool to inspect the live confidence profile.

import { useEffect, useState } from "react";
import {
  buildConfidenceProfile,
  getConfidenceLevelColor,
  type ConfidenceInputs,
} from "@/lib/intelligence/confidence/ConfidenceEngine";
import { explainConfidence, getMissingDataOpportunities } from "@/lib/intelligence/confidence/ConfidenceExplainer";
import { getConfidenceTimeline }  from "@/lib/intelligence/confidence/ConfidenceRegistry";
import { loadVerificationRegistry }   from "@/lib/intelligence/verification/verificationRegistry";
import { computeVerificationSummary } from "@/lib/intelligence/verification/calculateRecommendationAccuracy";
import type { ConfidenceProfile, ConfidenceSnapshot } from "@/lib/intelligence/confidence/ConfidenceTypes";

// ── Confidence timeline chart (simple bar) ────────────────────────────────────

function TimelineChart({ snaps }: { snaps: ConfidenceSnapshot[] }) {
  if (snaps.length === 0)
    return <p className="text-xs text-ink-muted italic">No timeline data yet.</p>;

  const recent = snaps.slice(-30);
  const LEVEL_HEIGHT: Record<string, number> = {
    High: 100, Moderate: 78, Building: 55, Limited: 33, Insufficient: 12,
  };

  return (
    <div className="flex items-end gap-0.5 h-12">
      {recent.map(s => (
        <div
          key={s.date}
          title={`${s.date}: ${s.level}`}
          className={`flex-1 rounded-sm ${getConfidenceLevelColor(s.level).replace("text-", "bg-")}`}
          style={{ height: `${LEVEL_HEIGHT[s.level] ?? 20}%` }}
        />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ConfidenceInspector() {
  const [profile, setProfile] = useState<ConfidenceProfile | null>(null);
  const [timeline, setTimeline] = useState<ConfidenceSnapshot[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const records = loadVerificationRegistry();
    const summary = computeVerificationSummary(records, today);

    const inputs: ConfidenceInputs = {
      calibrationFactor:       undefined,     // TODO: wire Phase 57
      verificationSuccessRate: summary.overallSuccessRate,
      completedEvaluations:    summary.completedEvaluations,
      completedWorkouts:       records.length,
      weeksTracked:            Math.floor(records.length / 3),
      hasRecoveryData:         records.length > 0,
      hasNutritionData:        false,
      hasCycleData:            false,
      hasSleepData:            false,
      checkInStreak:           0,
    };

    setProfile(buildConfidenceProfile(inputs));
    setTimeline(getConfidenceTimeline());
  }, []);

  if (!profile) return <p className="text-sm text-ink-muted">Computing…</p>;

  const explanation   = explainConfidence(profile, profile.dimensions.personalizationMaturity.score * 100 | 0);
  const opportunities = getMissingDataOpportunities(profile);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${getConfidenceLevelColor(profile.level)}`}>
          {profile.level}
        </span>
        <span className="text-sm text-ink-muted font-mono">
          composite {(profile.compositeScore * 100).toFixed(1)}%
        </span>
        <span className="text-xs text-ink-muted ml-auto">{profile.maturityStage.replace(/_/g," ")}</span>
      </div>

      {/* Dimension table */}
      <div className="bg-ui-surface rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ui-border">
              <th className="text-left py-2 px-3 text-ink-muted font-medium">Dimension</th>
              <th className="text-right py-2 px-3 text-ink-muted font-medium">Score</th>
              <th className="text-right py-2 px-3 text-ink-muted font-medium">Weight</th>
              <th className="text-right py-2 px-3 text-ink-muted font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(profile.dimensions).map(d => (
              <tr key={d.name} className="border-b border-ui-border/40">
                <td className="py-1.5 px-3 text-ink-base">{d.name}</td>
                <td className={`py-1.5 px-3 text-right font-mono ${getConfidenceLevelColor(
                  d.score >= 0.75 ? "High" : d.score >= 0.50 ? "Moderate" : d.score >= 0.25 ? "Building" : "Limited"
                )}`}>
                  {(d.score * 100).toFixed(0)}%
                </td>
                <td className="py-1.5 px-3 text-right text-ink-muted font-mono">{(d.weight * 100).toFixed(0)}%</td>
                <td className={`py-1.5 px-3 text-right ${d.available ? "text-green-400" : "text-red-400"}`}>
                  {d.available ? "✓" : "✗"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">30-Day Timeline</p>
        <TimelineChart snaps={timeline} />
      </div>

      {/* Gaps */}
      {explanation.gaps.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">Gaps</p>
          {explanation.gaps.map(g => (
            <p key={g} className="text-xs text-red-400">✗ {g}</p>
          ))}
        </div>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">Opportunities</p>
          {opportunities.map(o => (
            <p key={o} className="text-xs text-ink-muted">• {o}</p>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-muted">Generated {new Date(profile.generatedAt).toLocaleString()}</p>
    </div>
  );
}
