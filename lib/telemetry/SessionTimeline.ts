// ─── lib/telemetry/SessionTimeline.ts ─────────────────────────────────────────
// Phase E — reconstructs a chronological session timeline from telemetry events.

import { getEvents } from "./TelemetryCollector";
import type { TelemetryCategory, TelemetryEventName, TimelineEntry } from "./TelemetryTypes";

// ─── Human-readable summaries ──────────────────────────────────────────────────

const EVENT_SUMMARIES: Partial<Record<TelemetryEventName, (props: Record<string, string | number | boolean>) => string>> = {
  adaptive_decision_made:   p => `Adaptive decision: ${p.decisionType ?? "unknown"} (scale ${p.finalVolumeScale ?? "?"})`,
  safety_evaluated:         p => p.wasConstrained
    ? `Safety clamped volume ${p.originalScale} → ${p.constrainedScale}`
    : `Safety passed (scale ${p.constrainedScale ?? "?"})`,
  verification_registered:  p => p.isNew
    ? `Verification record created — class: ${p.recommendationClass}`
    : `Verification record reused (already registered today)`,
  verification_evaluated:   p => `Verification scored: ${p.verificationScore} (${p.samplesCollected} samples)`,
  confidence_calculated:    p => `Confidence: ${p.level} (${typeof p.compositeScore === "number" ? (p.compositeScore * 100).toFixed(1) : "?"}%)`,
  pipeline_completed:       p => `Pipeline done in ${p.totalDurationMs}ms — confidence ${p.confidenceLevel}`,
  error_recovery_triggered: p => `Error recovered: ${p.category} via ${p.strategyId} (retry ${p.retryCount})`,
  workout_started:          _ => "Workout started",
  workout_completed:        _ => "Workout completed",
  workout_abandoned:        _ => "Workout abandoned",
  recommendation_viewed:    _ => "Recommendation viewed",
  recovery_checkin_submitted: _ => "Recovery check-in submitted",
  nutrition_checkin_submitted: _ => "Nutrition check-in submitted",
  page_viewed:              p => `Page viewed: ${p.page ?? "unknown"}`,
};

function summarise(
  name:  TelemetryEventName,
  props: Record<string, string | number | boolean>,
): string {
  const fn = EVENT_SUMMARIES[name];
  if (fn) return fn(props);
  return name.replace(/_/g, " ");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SessionSummary {
  sessionId:    string;
  eventCount:   number;
  startedAt:    string;
  endedAt:      string;
  systemEvents: number;
  errorEvents:  number;
  safetyConstraints: number;
  confidenceLevels: string[];
}

export function buildSessionTimeline(sessionId: string): TimelineEntry[] {
  const events = getEvents().filter(e => e.sessionId === sessionId);
  // Sort oldest → newest for replay
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return events.map(e => ({
    eventId:    e.id,
    name:       e.name,
    category:   e.category,
    timestamp:  e.timestamp,
    durationMs: typeof e.properties.durationMs === "number" ? e.properties.durationMs : undefined,
    summary:    summarise(e.name, e.properties),
    properties: e.properties,
  }));
}

export function getAllSessions(): string[] {
  const events = getEvents();
  const seen = new Set<string>();
  for (const e of events) seen.add(e.sessionId);
  return [...seen];
}

export function getSessionSummary(sessionId: string): SessionSummary | null {
  const events = getEvents().filter(e => e.sessionId === sessionId);
  if (events.length === 0) return null;

  const sorted      = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const confidences = events
    .filter(e => e.name === "confidence_calculated")
    .map(e => String(e.properties.level ?? ""));

  return {
    sessionId,
    eventCount:          events.length,
    startedAt:           sorted[0].timestamp,
    endedAt:             sorted[sorted.length - 1].timestamp,
    systemEvents:        events.filter(e => e.category === "system").length,
    errorEvents:         events.filter(e => e.category === "error" || e.category === "health").length,
    safetyConstraints:   events.filter(e => e.name === "safety_evaluated" && e.properties.wasConstrained === true).length,
    confidenceLevels:    confidences,
  };
}

export function getLatestSessionId(): string | null {
  const events = getEvents({ limit: 1 });
  return events[0]?.sessionId ?? null;
}

export function filterTimeline(
  timeline: TimelineEntry[],
  opts: {
    category?: TelemetryCategory;
    name?:     TelemetryEventName;
    since?:    string;
  },
): TimelineEntry[] {
  let result = timeline;
  if (opts.category) result = result.filter(e => e.category === opts.category);
  if (opts.name)     result = result.filter(e => e.name     === opts.name);
  if (opts.since)    result = result.filter(e => e.timestamp >= opts.since!);
  return result;
}
