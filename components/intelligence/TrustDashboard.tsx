"use client";
// ─── components/intelligence/TrustDashboard.tsx ───────────────────────────────
// Phase 67 — "How Well Axis Knows You" card for the user-facing dashboard.

import { useEffect, useState } from "react";
import {
  buildConfidenceProfile,
  getConfidenceLevelColor,
  getConfidenceLevelBg,
  type ConfidenceInputs,
} from "@/lib/intelligence/confidence/ConfidenceEngine";
import {
  explainConfidence,
  getMissingDataOpportunities,
} from "@/lib/intelligence/confidence/ConfidenceExplainer";
import { getConfidenceTimeline } from "@/lib/intelligence/confidence/ConfidenceRegistry";
import { MATURITY_STAGES }       from "@/lib/intelligence/confidence/ConfidenceTypes";
import type { ConfidenceProfile } from "@/lib/intelligence/confidence/ConfidenceTypes";
import { ConfidenceBadge }       from "./ConfidenceBadge";
import { loadVerificationRegistry }  from "@/lib/intelligence/verification/verificationRegistry";
import { computeVerificationSummary } from "@/lib/intelligence/verification/calculateRecommendationAccuracy";

// ── Maturity progress bar ─────────────────────────────────────────────────────

function MaturityBar({ completedWorkouts }: { completedWorkouts: number }) {
  const stageIndex = MATURITY_STAGES.findIndex(
    s => completedWorkouts >= s.minWorkouts && (s.maxWorkouts === null || completedWorkouts <= s.maxWorkouts)
  );
  const info = MATURITY_STAGES[stageIndex] ?? MATURITY_STAGES[MATURITY_STAGES.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-ink-base">{info.label}</p>
        <p className="text-xs text-ink-muted">{completedWorkouts} workouts</p>
      </div>
      <div className="flex gap-1">
        {MATURITY_STAGES.map((s, i) => (
          <div
            key={s.stage}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < stageIndex ? "bg-brand" :
              i === stageIndex ? "bg-brand/60" :
              "bg-ui-border"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-ink-muted">{info.description}</p>
    </div>
  );
}

// ── Dimension row ─────────────────────────────────────────────────────────────

function DimRow({ label, score, available }: { label: string; score: number; available: boolean }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-ink-muted w-40 flex-shrink-0">{label}</p>
      <div className="flex-1 bg-ui-border rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${available ? "bg-brand" : "bg-ui-border"}`}
          style={{ width: `${available ? pct : 0}%` }}
        />
      </div>
      {!available && <p className="text-xs text-ink-muted w-8">—</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  inputs: ConfidenceInputs;
  completedWorkouts: number;
}

export function TrustDashboard({ inputs, completedWorkouts }: Props) {
  const [profile, setProfile] = useState<ConfidenceProfile | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    // Also pull verification data if not provided
    const records = loadVerificationRegistry();
    const summary = computeVerificationSummary(records, today);

    const enriched: ConfidenceInputs = {
      ...inputs,
      verificationSuccessRate: inputs.verificationSuccessRate ?? summary.overallSuccessRate,
      completedEvaluations:    inputs.completedEvaluations    ?? summary.completedEvaluations,
    };
    setProfile(buildConfidenceProfile(enriched));
  }, []);

  if (!profile) return null;

  const explanation = explainConfidence(profile, completedWorkouts);
  const opportunities = getMissingDataOpportunities(profile);
  const color = getConfidenceLevelColor(profile.level);
  const bg    = getConfidenceLevelBg(profile.level);

  return (
    <div className="bg-ui-surface rounded-2xl p-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-1">
            How Well Axis Knows You
          </p>
          <ConfidenceBadge level={profile.level} size="md" />
        </div>
      </div>

      {/* Summary */}
      <div className={`rounded-xl p-3 ${bg}`}>
        <p className={`text-sm font-medium ${color}`}>{explanation.summary}</p>
        <p className="text-xs text-ink-muted mt-1">{explanation.maturityContext}</p>
      </div>

      {/* Maturity bar */}
      <MaturityBar completedWorkouts={completedWorkouts} />

      {/* Dimension bars */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Signal Sources</p>
        {Object.values(profile.dimensions).map(d => (
          <DimRow key={d.name} label={d.name} score={d.score} available={d.available} />
        ))}
      </div>

      {/* Strengths */}
      {explanation.strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">What's Working</p>
          {explanation.strengths.map(s => (
            <p key={s} className="text-xs text-green-400 flex items-start gap-1.5">
              <span className="mt-0.5">✓</span>{s}
            </p>
          ))}
        </div>
      )}

      {/* Missing data opportunities */}
      {opportunities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Confidence would improve with
          </p>
          {opportunities.map(o => (
            <p key={o} className="text-xs text-ink-muted flex items-start gap-1.5">
              <span className="mt-0.5 text-brand">•</span>{o}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
