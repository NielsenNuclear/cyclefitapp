"use client";

// ─── app/insights/page.tsx ─────────────────────────────────────────────────────
// Dashboard 3.0 — Batch 20, Phase 4. The Insights destination pulls the
// exploratory / meta-intelligence content off the daily dashboard scroll
// (Deliverable 7 of the Dashboard 2.0 Executive Product Strategy report).
// Reached via a teaser card at the base of "This Week" — not a 6th bottom-nav
// item, per the approved strategy doc. Reads a cached snapshot written by
// /dashboard rather than recomputing (see lib/insights/insightsSnapshot.ts for
// why); a missing or stale snapshot renders an explanatory empty state instead
// of silently showing wrong data.
//
// Phase 5 renders the actual 10 cards, grouped "How am I trending" /
// "Explore my data" / "How good is Axis" per the strategy report's own
// tiering — not raw inheritance of the old section names they came from.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { readInsightsSnapshot, type InsightsSnapshot } from "@/lib/insights/insightsSnapshot";
import { AxisIcon } from "@/components/ui/Icon";
import { ForecastCard }              from "@/components/dashboard/ForecastCard";
import { AdaptiveInsightsPanel }     from "@/components/intelligence/AdaptiveInsightsPanel";
import { PerformanceForecastCard }   from "@/components/dashboard/PerformanceForecastCard";
import { InsightDiscoveryCard }      from "@/components/insights/InsightDiscoveryCard";
import { ExerciseAnalyticsCard }     from "@/components/insights/ExerciseAnalyticsCard";
import { CorrelationExplorerCard }   from "@/components/insights/CorrelationExplorerCard";
import { ConfidenceAccuracyHubCard } from "@/components/dashboard/ConfidenceAccuracyHubCard";
import { WhatAxisLearnedHubCard }    from "@/components/dashboard/WhatAxisLearnedHubCard";
import { OutcomeIntelligenceHubCard } from "@/components/dashboard/OutcomeIntelligenceHubCard";
import { CapacityHubCard }           from "@/components/dashboard/CapacityHubCard";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1 mb-2">
      <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-[0.12em]">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "stale"; snapshot: InsightsSnapshot }
  | { status: "ready"; snapshot: InsightsSnapshot };

function EmptyState({ stale, router }: { stale: boolean; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-20">
      <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center mb-4">
        <AxisIcon name="compass" size={22} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h1 className="text-[17px] font-semibold text-ink mb-1.5">
        {stale ? "Your insights need a refresh" : "No insights yet"}
      </h1>
      <p className="text-[13px] text-ink-muted leading-relaxed max-w-[280px] mb-6">
        {stale
          ? "Visit Today to refresh your insights — this page shows a snapshot from your last visit there."
          : "Visit Today first — Axis builds your insights from what it learns during your daily check-in."}
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="px-5 py-2.5 rounded-full bg-brand text-white text-[13px] font-semibold hover:bg-brand-dark transition-colors"
      >
        Go to Today
      </button>
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const result = readInsightsSnapshot();
    if (!result) {
      setState({ status: "empty" });
      return;
    }
    setState(result.isStale
      ? { status: "stale", snapshot: result.snapshot }
      : { status: "ready", snapshot: result.snapshot });
  }, []);

  return (
    <DashboardShell>
      <div className="px-5 pt-6 pb-40">
        <span className="type-page-title text-ink">Insights</span>
        <p className="text-[12px] text-ink-muted mt-1 mb-6">
          How you&apos;re trending, what Axis has found in your data, and how good its predictions have been.
        </p>

        {state.status === "loading" && null}
        {state.status === "empty" && <EmptyState stale={false} router={router} />}
        {state.status === "stale" && <EmptyState stale={true} router={router} />}
        {state.status === "ready" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <GroupLabel>How am I trending</GroupLabel>
              <ForecastCard {...state.snapshot.forecast} />
              <PerformanceForecastCard {...state.snapshot.performanceForecast} />
              <AdaptiveInsightsPanel {...state.snapshot.adaptiveInsights} />
            </div>

            <div className="space-y-2">
              <GroupLabel>Explore my data</GroupLabel>
              {state.snapshot.insightDiscovery && <InsightDiscoveryCard report={state.snapshot.insightDiscovery} />}
              {state.snapshot.exerciseAnalytics && <ExerciseAnalyticsCard report={state.snapshot.exerciseAnalytics} />}
              {state.snapshot.correlationExplorer && <CorrelationExplorerCard report={state.snapshot.correlationExplorer} />}
            </div>

            <div className="space-y-2">
              <GroupLabel>How good is Axis</GroupLabel>
              <ConfidenceAccuracyHubCard {...state.snapshot.confidenceAccuracy} />
              <WhatAxisLearnedHubCard {...state.snapshot.whatAxisLearned} />
              <OutcomeIntelligenceHubCard {...state.snapshot.outcomeIntelligence} />
              <CapacityHubCard {...state.snapshot.capacity} />
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
