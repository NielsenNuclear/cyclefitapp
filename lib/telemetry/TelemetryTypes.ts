// ─── lib/telemetry/TelemetryTypes.ts ─────────────────────────────────────────
// Phase 75 — privacy-first telemetry event types.
// No PII is ever stored. All data stays in localStorage.

export type TelemetryCategory =
  | "navigation"
  | "workout"
  | "recommendation"
  | "checkin"
  | "onboarding"
  | "feature_use"
  | "error"
  | "performance";

export type TelemetryEventName =
  // Onboarding
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_abandoned"
  // Workout
  | "workout_started"
  | "workout_set_logged"
  | "workout_completed"
  | "workout_abandoned"
  // Recommendation
  | "recommendation_viewed"
  | "recommendation_accepted"
  | "recommendation_modified"
  | "recommendation_skipped"
  // Check-ins
  | "recovery_checkin_submitted"
  | "nutrition_checkin_submitted"
  // Navigation
  | "page_viewed"
  | "tab_switched"
  // Feature adoption
  | "feature_first_use"
  | "card_expanded"
  | "export_triggered"
  | "delete_triggered"
  // Performance
  | "performance_budget_exceeded"
  // Errors
  | "error_boundary_triggered"
  | "storage_error";

export interface TelemetryEvent {
  id:         string;
  name:       TelemetryEventName;
  category:   TelemetryCategory;
  timestamp:  string;
  sessionId:  string;
  properties: Record<string, string | number | boolean>;
}

export interface TelemetrySession {
  sessionId:  string;
  startedAt:  string;
  endedAt?:   string;
  eventCount: number;
}
