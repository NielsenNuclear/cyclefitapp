// ─── lib/telemetry/TelemetryCollector.ts ─────────────────────────────────────
// Phase 75 — privacy-first local telemetry collector.
// Events are stored in localStorage only. No network calls. No PII.

import type {
  TelemetryEvent,
  TelemetryEventName,
  TelemetryCategory,
  TelemetrySession,
} from "./TelemetryTypes";

const EVENTS_KEY  = "axis_telemetry_events_v1";
const SESSION_KEY = "axis_telemetry_session_v1";
const MAX_EVENTS  = 1000;

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Session management ────────────────────────────────────────────────────────

let _sessionId: string | null = null;

function getOrCreateSession(): string {
  if (_sessionId) return _sessionId;
  if (!isClient()) return "ssr";

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const session: TelemetrySession = JSON.parse(raw);
      _sessionId = session.sessionId;
      return _sessionId;
    }
  } catch {}

  const session: TelemetrySession = {
    sessionId:  `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt:  new Date().toISOString(),
    eventCount: 0,
  };
  _sessionId = session.sessionId;

  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return _sessionId;
}

function incrementSessionCount(): void {
  if (!isClient()) return;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const session: TelemetrySession = JSON.parse(raw);
    session.eventCount = (session.eventCount ?? 0) + 1;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

// ── Storage ───────────────────────────────────────────────────────────────────

function loadEvents(): TelemetryEvent[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch { return []; }
}

function saveEvents(events: TelemetryEvent[]): void {
  if (!isClient()) return;
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<TelemetryEventName, TelemetryCategory> = {
  onboarding_started:          "onboarding",
  onboarding_step_completed:   "onboarding",
  onboarding_completed:        "onboarding",
  onboarding_abandoned:        "onboarding",
  workout_started:             "workout",
  workout_set_logged:          "workout",
  workout_completed:           "workout",
  workout_abandoned:           "workout",
  recommendation_viewed:       "recommendation",
  recommendation_accepted:     "recommendation",
  recommendation_modified:     "recommendation",
  recommendation_skipped:      "recommendation",
  recovery_checkin_submitted:  "checkin",
  nutrition_checkin_submitted: "checkin",
  page_viewed:                 "navigation",
  tab_switched:                "navigation",
  feature_first_use:           "feature_use",
  card_expanded:               "feature_use",
  export_triggered:            "feature_use",
  delete_triggered:            "feature_use",
  performance_budget_exceeded: "performance",
  error_boundary_triggered:    "error",
  storage_error:               "error",
};

export function track(
  name: TelemetryEventName,
  properties: Record<string, string | number | boolean> = {}
): void {
  if (!isClient()) return;

  const event: TelemetryEvent = {
    id:         `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    category:   CATEGORY_MAP[name] ?? "feature_use",
    timestamp:  new Date().toISOString(),
    sessionId:  getOrCreateSession(),
    properties,
  };

  const events = loadEvents();
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  saveEvents(events);
  incrementSessionCount();
}

export function getEvents(opts?: {
  category?: TelemetryCategory;
  name?: TelemetryEventName;
  limit?: number;
  since?: string;
}): TelemetryEvent[] {
  let events = loadEvents();
  if (opts?.category) events = events.filter(e => e.category === opts.category);
  if (opts?.name)     events = events.filter(e => e.name === opts.name);
  if (opts?.since)    events = events.filter(e => e.timestamp >= opts.since!);
  events.reverse();
  if (opts?.limit)    events = events.slice(0, opts.limit);
  return events;
}

export function getEventCount(): number { return loadEvents().length; }

export function clearTelemetry(): void {
  if (isClient()) localStorage.removeItem(EVENTS_KEY);
}
