// ─── lib/insights/insightsSnapshot.ts ──────────────────────────────────────────
// Dashboard 3.0 — Batch 20, Phase 4. The Insights destination (/insights) reads
// state that is otherwise 100% local to DashboardPage's mount effect, with no
// shared context anywhere in the app. Rather than a context-provider refactor
// or an independent recompute on /insights (which would risk double-firing
// side-effecting calls like logNutritionDay() — confirmed during planning as
// the reason this path was rejected), /dashboard keeps computing everything
// exactly as today and additionally writes a serializable snapshot of the
// Insights-relevant values here after computing them. /insights reads the
// cache and never recomputes.
//
// Each field's shape is derived from the real component's props via
// ComponentProps<typeof X> rather than hand-duplicated, so the snapshot type
// can never silently drift from what the card actually renders.

import type { ComponentProps } from "react";
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

const STORAGE_KEY = "axis_insights_snapshot";

export interface InsightsSnapshot {
  date:                string; // YYYY-MM-DD, the day the snapshot was written
  forecast:            ComponentProps<typeof ForecastCard>;
  adaptiveInsights:    ComponentProps<typeof AdaptiveInsightsPanel>;
  performanceForecast: ComponentProps<typeof PerformanceForecastCard>;
  insightDiscovery:    ComponentProps<typeof InsightDiscoveryCard>["report"] | null;
  exerciseAnalytics:   ComponentProps<typeof ExerciseAnalyticsCard>["report"] | null;
  correlationExplorer: ComponentProps<typeof CorrelationExplorerCard>["report"] | null;
  confidenceAccuracy:  ComponentProps<typeof ConfidenceAccuracyHubCard>;
  whatAxisLearned:     ComponentProps<typeof WhatAxisLearnedHubCard>;
  outcomeIntelligence: ComponentProps<typeof OutcomeIntelligenceHubCard>;
  capacity:            ComponentProps<typeof CapacityHubCard>;
}

export function writeInsightsSnapshot(data: Omit<InsightsSnapshot, "date">, dateStr: string): void {
  const snapshot: InsightsSnapshot = { ...data, date: dateStr };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage can throw (quota, private browsing) — snapshot is a cache,
    // not a source of truth, so a failed write just means /insights shows
    // its empty state until the next successful /dashboard visit.
  }
}

export function readInsightsSnapshot(): { snapshot: InsightsSnapshot; isStale: boolean } | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const snapshot = JSON.parse(raw) as InsightsSnapshot;
    const today = new Date().toISOString().slice(0, 10);
    return { snapshot, isStale: snapshot.date !== today };
  } catch {
    return null;
  }
}
