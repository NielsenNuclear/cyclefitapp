// ─── lib/telemetry/TelemetryTypes.ts ─────────────────────────────────────────
// Phase 75 — privacy-first telemetry event types.
// Phase E  — system observability event types added.
// No PII is ever stored. All data stays in localStorage.

export type TelemetryCategory =
  | "navigation"
  | "workout"
  | "recommendation"
  | "checkin"
  | "onboarding"
  | "feature_use"
  | "error"
  | "performance"
  // Phase E: system observability categories
  | "system"        // adaptive pipeline events (safety, verification, confidence)
  | "health";       // app health — storage, error recovery

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
  | "storage_error"
  // Phase E: system observability events
  | "adaptive_decision_made"      // Adaptive Engine produced a training decision
  | "safety_evaluated"            // Safety Engine gate completed
  | "verification_registered"     // Verification Registry gate — record created or reused
  | "verification_evaluated"      // A pending verification was scored (outcome known)
  | "confidence_calculated"       // Confidence Engine gate completed
  | "calibration_updated"         // Phase 57 calibration profile updated
  | "pipeline_completed"          // Full recommendation pipeline finished for session
  | "error_recovery_triggered"    // Phase B error boundary caught + recovered an error
  | "storage_quota_warning"       // localStorage nearing cap for a key
  | "session_restored";           // Phase B session snapshot restored after crash

export interface TelemetryEvent {
  id:          string;
  name:        TelemetryEventName;
  category:    TelemetryCategory;
  timestamp:   string;
  sessionId:   string;
  properties:  Record<string, string | number | boolean>;
  durationMs?: number;  // Phase E: optional per-event latency
}

export interface TelemetrySession {
  sessionId:  string;
  startedAt:  string;
  endedAt?:   string;
  eventCount: number;
}

// Phase E: one entry in a reconstructed session timeline
export interface TimelineEntry {
  eventId:    string;
  name:       TelemetryEventName;
  category:   TelemetryCategory;
  timestamp:  string;
  durationMs?: number;
  summary:    string;    // human-readable one-liner for dev inspector
  properties: Record<string, string | number | boolean>;
}
