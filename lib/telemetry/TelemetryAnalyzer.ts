// ─── lib/telemetry/TelemetryAnalyzer.ts ──────────────────────────────────────
// Phase 75 — derive product analytics from collected telemetry events.

import { getEvents } from "./TelemetryCollector";
import type { TelemetryCategory, TelemetryEventName } from "./TelemetryTypes";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeatureAdoptionEntry {
  name:          TelemetryEventName;
  totalUses:     number;
  uniqueSessions: number;
  lastUsed?:     string;
}

export interface FunnelStage {
  name:       string;
  count:      number;
  dropOffPct: number;
}

export interface TelemetryInsights {
  totalEvents:     number;
  sessionCount:    number;
  categoryBreakdown: Record<TelemetryCategory, number>;
  topFeatures:     FeatureAdoptionEntry[];
  onboardingFunnel: FunnelStage[];
  workoutFunnel:   FunnelStage[];
  errorRate:       number;   // errors / total events
  generatedAt:     string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── Analysis functions ────────────────────────────────────────────────────────

export function computeCategoryBreakdown(): Record<TelemetryCategory, number> {
  const events = getEvents();
  const result: Partial<Record<TelemetryCategory, number>> = {};
  for (const e of events) {
    result[e.category] = (result[e.category] ?? 0) + 1;
  }
  return result as Record<TelemetryCategory, number>;
}

export function computeFeatureAdoption(limit = 10): FeatureAdoptionEntry[] {
  const events = getEvents();
  const byName = new Map<TelemetryEventName, { count: number; sessions: Set<string>; last: string }>();

  for (const e of events) {
    const entry = byName.get(e.name) ?? { count: 0, sessions: new Set(), last: e.timestamp };
    entry.count++;
    entry.sessions.add(e.sessionId);
    if (e.timestamp > entry.last) entry.last = e.timestamp;
    byName.set(e.name, entry);
  }

  return [...byName.entries()]
    .map(([name, v]) => ({
      name,
      totalUses:      v.count,
      uniqueSessions: v.sessions.size,
      lastUsed:       v.last,
    }))
    .sort((a, b) => b.totalUses - a.totalUses)
    .slice(0, limit);
}

export function computeOnboardingFunnel(): FunnelStage[] {
  const started    = getEvents({ name: "onboarding_started" }).length;
  const completed  = getEvents({ name: "onboarding_completed" }).length;
  const abandoned  = getEvents({ name: "onboarding_abandoned" }).length;

  const stages = [
    { name: "Started",   count: started },
    { name: "Completed", count: completed },
    { name: "Abandoned", count: abandoned },
  ];

  return stages.map((s, i) => ({
    name:       s.name,
    count:      s.count,
    dropOffPct: i === 0 || started === 0 ? 0 : Math.round(((stages[i - 1].count - s.count) / started) * 100),
  }));
}

export function computeWorkoutFunnel(): FunnelStage[] {
  const started   = getEvents({ name: "workout_started" }).length;
  const completed = getEvents({ name: "workout_completed" }).length;
  const abandoned = getEvents({ name: "workout_abandoned" }).length;

  const stages = [
    { name: "Started",   count: started },
    { name: "Completed", count: completed },
    { name: "Abandoned", count: abandoned },
  ];

  return stages.map((s, i) => ({
    name:       s.name,
    count:      s.count,
    dropOffPct: i === 0 || started === 0 ? 0 : Math.round(((stages[i - 1].count - s.count) / started) * 100),
  }));
}

export function computeTelemetryInsights(): TelemetryInsights {
  const all = getEvents();
  const uniqueSessions = new Set(all.map(e => e.sessionId)).size;
  const errors = all.filter(e => e.category === "error").length;

  return {
    totalEvents:       all.length,
    sessionCount:      uniqueSessions,
    categoryBreakdown: computeCategoryBreakdown(),
    topFeatures:       computeFeatureAdoption(),
    onboardingFunnel:  computeOnboardingFunnel(),
    workoutFunnel:     computeWorkoutFunnel(),
    errorRate:         all.length > 0 ? Math.round((errors / all.length) * 1000) / 1000 : 0,
    generatedAt:       new Date().toISOString(),
  };
}

export function computeRetentionSignal(): { d1: number; d7: number; d30: number } {
  const firstEvent = getEvents().at(-1); // oldest (reversed)
  if (!firstEvent) return { d1: 0, d7: 0, d30: 0 };

  const hasActivity = (since: string) =>
    getEvents({ since }).length > 0;

  return {
    d1:  hasActivity(daysAgoIso(1))  ? 1 : 0,
    d7:  hasActivity(daysAgoIso(7))  ? 1 : 0,
    d30: hasActivity(daysAgoIso(30)) ? 1 : 0,
  };
}
