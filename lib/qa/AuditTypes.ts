// ─── lib/qa/AuditTypes.ts ────────────────────────────────────────────────────
// Phase 73 — shared types for the QA and release-readiness system.

export type AuditStatus   = "pass" | "partial" | "fail" | "not_tested" | "not_applicable";
export type AuditSeverity = "blocker" | "critical" | "major" | "minor" | "info";
export type AuditCategory =
  | "functionality"
  | "accessibility"
  | "performance"
  | "ux"
  | "browser_compatibility"
  | "data_integrity"
  | "security_privacy"
  | "documentation";

export interface AuditItem {
  id:          string;
  category:    AuditCategory;
  area:        string;           // e.g. "Dashboard", "Onboarding"
  check:       string;           // what is being checked
  status:      AuditStatus;
  severity:    AuditSeverity;
  notes?:      string;
  actionItem?: string;           // what to do if not passing
  manual:      boolean;          // requires manual human verification
}

export interface AuditSection {
  name:     string;
  category: AuditCategory;
  items:    AuditItem[];
}

export interface AuditReport {
  generatedAt:      string;
  totalItems:       number;
  passed:           number;
  partial:          number;
  failed:           number;
  notTested:        number;
  blockers:         AuditItem[];
  criticals:        AuditItem[];
  readinessScore:   number;    // 0–100
  releaseReady:     boolean;   // true when no blockers or criticals outstanding
}
