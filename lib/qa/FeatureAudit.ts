// ─── lib/qa/FeatureAudit.ts ───────────────────────────────────────────────────
// Phase 73 — comprehensive feature audit across all Axis subsystems.

import type { AuditItem } from "./AuditTypes";

// ── Feature audit items ───────────────────────────────────────────────────────
// Status reflects implementation completeness based on Phase 1–72 build.
// Items marked manual: true require human verification in a running app.

export const FEATURE_AUDIT_ITEMS: AuditItem[] = [

  // ── Onboarding ──────────────────────────────────────────────────────────────

  { id: "onb-01", category: "functionality", area: "Onboarding", manual: false, severity: "blocker",
    check: "11-step onboarding flow completes without errors",
    status: "pass", notes: "All 11 steps implemented with canAdvance() gating." },

  { id: "onb-02", category: "functionality", area: "Onboarding", manual: true, severity: "critical",
    check: "Progress is preserved if app is closed mid-onboarding",
    status: "not_tested", actionItem: "Verify localStorage persistence across browser restarts during step 5–8." },

  { id: "onb-03", category: "ux", area: "Onboarding", manual: true, severity: "major",
    check: "Step titles, subtitles, and copy are clear to a first-time user",
    status: "not_tested", actionItem: "User test with 3 participants who have not seen Axis before." },

  { id: "onb-04", category: "accessibility", area: "Onboarding", manual: true, severity: "major",
    check: "All onboarding inputs are keyboard-navigable and labelled",
    status: "not_tested", actionItem: "Tab through each step; verify focus order and aria-labels." },

  // ── Dashboard ────────────────────────────────────────────────────────────────

  { id: "dash-01", category: "functionality", area: "Dashboard", manual: false, severity: "blocker",
    check: "Dashboard renders without crash for new user (empty state)",
    status: "pass", notes: "Empty state handling exists across cards." },

  { id: "dash-02", category: "performance", area: "Dashboard", manual: true, severity: "critical",
    check: "Dashboard time-to-interactive < 200ms on mid-range mobile",
    status: "not_tested", actionItem: "Measure with Chrome DevTools on throttled 4G + 4× CPU slowdown." },

  { id: "dash-03", category: "ux", area: "Dashboard", manual: true, severity: "major",
    check: "Cards are visually consistent in sizing, spacing, and typography",
    status: "not_tested", actionItem: "Visual review across populated and empty states." },

  { id: "dash-04", category: "functionality", area: "Dashboard", manual: true, severity: "major",
    check: "All dashboard cards update when underlying data changes",
    status: "not_tested", actionItem: "Log a workout and verify dashboard reflects new state within one render cycle." },

  // ── Workout Recommendation ─────────────────────────────────────────────────

  { id: "rec-01", category: "functionality", area: "Recommendations", manual: false, severity: "blocker",
    check: "Recommendation engine produces output for all 15 regression scenarios",
    status: "pass", notes: "Regression suite covers all defined scenarios." },

  { id: "rec-02", category: "functionality", area: "Recommendations", manual: false, severity: "blocker",
    check: "Safety governance layer constrains out-of-range volume scales",
    status: "pass", notes: "9 safety rules with critical/high/moderate priority evaluated per recommendation." },

  { id: "rec-03", category: "functionality", area: "Recommendations", manual: true, severity: "critical",
    check: "Recommendation confidence badge displays correctly for new user",
    status: "not_tested", actionItem: "Verify 'Insufficient Confidence' state on fresh install." },

  { id: "rec-04", category: "ux", area: "Recommendations", manual: true, severity: "major",
    check: "Recommendation explanation is readable and non-jargon for a non-athlete",
    status: "not_tested", actionItem: "User test with someone outside fitness community." },

  // ── Workout Logging ──────────────────────────────────────────────────────────

  { id: "log-01", category: "functionality", area: "Workout Logging", manual: true, severity: "blocker",
    check: "Workout can be started, sets logged, and session completed",
    status: "not_tested", actionItem: "End-to-end test: start workout → log 3 exercises × 3 sets → complete." },

  { id: "log-02", category: "functionality", area: "Workout Logging", manual: true, severity: "critical",
    check: "Interrupted workout recovers via SessionRecovery",
    status: "not_tested", actionItem: "Start workout → force-close browser → reopen → verify session restored." },

  { id: "log-03", category: "performance", area: "Workout Logging", manual: true, severity: "critical",
    check: "Set completion interaction latency < 50ms",
    status: "not_tested", actionItem: "Measure with performance.now() wrapper around set completion handler." },

  { id: "log-04", category: "accessibility", area: "Workout Logging", manual: true, severity: "major",
    check: "Weight and reps inputs are accessible with numeric keyboard on mobile",
    status: "not_tested", actionItem: "Test on iOS Safari + Android Chrome with inputmode=numeric." },

  // ── Recovery ─────────────────────────────────────────────────────────────────

  { id: "rec-check-01", category: "functionality", area: "Recovery Check-in", manual: true, severity: "critical",
    check: "Daily recovery check-in records and persists correctly",
    status: "not_tested", actionItem: "Submit check-in, reload, verify data is preserved." },

  { id: "rec-check-02", category: "functionality", area: "Recovery Check-in", manual: true, severity: "major",
    check: "Recovery score influences next recommendation volume",
    status: "not_tested", actionItem: "Submit low recovery → verify volume decrease in next recommendation." },

  // ── Cycle Tracking ───────────────────────────────────────────────────────────

  { id: "cyc-01", category: "functionality", area: "Cycle Tracking", manual: true, severity: "critical",
    check: "Cycle phase is correctly derived from lastPeriodDate and cycleLength",
    status: "not_tested", actionItem: "Set lastPeriodDate to 14 days ago → verify ovulatory phase displayed." },

  { id: "cyc-02", category: "ux", area: "Cycle Tracking", manual: true, severity: "major",
    check: "Users can skip cycle tracking without the app breaking",
    status: "not_tested", actionItem: "Complete onboarding with trackingPreference=none → verify graceful handling." },

  // ── Body Intelligence ─────────────────────────────────────────────────────────

  { id: "body-01", category: "functionality", area: "Body Intelligence", manual: true, severity: "major",
    check: "PlaceholderBody renders when NEXT_PUBLIC_BODY_MODEL_URL is not set",
    status: "not_tested", actionItem: "Remove env var → verify fallback renders, no console errors." },

  { id: "body-02", category: "performance", area: "Body Intelligence", manual: true, severity: "major",
    check: "3D viewer maintains 60fps on mid-range hardware",
    status: "not_tested", actionItem: "Measure FPS with Chrome Performance tab on MacBook Air." },

  // ── Data Integrity ────────────────────────────────────────────────────────────

  { id: "data-01", category: "data_integrity", area: "Data Layer", manual: false, severity: "blocker",
    check: "IntegrityMonitor identifies all 6 known Axis localStorage keys",
    status: "pass", notes: "AXIS_KEYS covers all known storage keys." },

  { id: "data-02", category: "data_integrity", area: "Data Layer", manual: false, severity: "critical",
    check: "ValidationEngine catches out-of-range values (volume > 2, confidence > 1)",
    status: "pass", notes: "CrossValidator runs range checks on all known numeric fields." },

  { id: "data-03", category: "data_integrity", area: "Data Layer", manual: true, severity: "critical",
    check: "Corrupted localStorage key is handled gracefully — no crash",
    status: "not_tested", actionItem: "Manually set axis_verification_registry_v1 to '{invalid' → verify no crash." },

  // ── Privacy ────────────────────────────────────────────────────────────────────

  { id: "priv-01", category: "security_privacy", area: "Privacy", manual: false, severity: "blocker",
    check: "No data is transmitted to external servers",
    status: "pass", notes: "All storage is localStorage-only. No network calls except Crossref during research scripts." },

  { id: "priv-02", category: "security_privacy", area: "Privacy", manual: true, severity: "blocker",
    check: "Export produces valid, complete JSON of all stored data",
    status: "not_tested", actionItem: "Export → verify JSON parses correctly and contains all expected keys." },

  { id: "priv-03", category: "security_privacy", area: "Privacy", manual: true, severity: "critical",
    check: "Delete All Data clears all Axis localStorage keys",
    status: "not_tested", actionItem: "Use Delete All → open DevTools Storage → verify no axis_ keys remain." },

  // ── Accessibility ─────────────────────────────────────────────────────────────

  { id: "a11y-01", category: "accessibility", area: "Global", manual: true, severity: "critical",
    check: "All interactive elements are reachable via keyboard (Tab/Enter/Space)",
    status: "not_tested", actionItem: "Full keyboard-only navigation audit across all routes." },

  { id: "a11y-02", category: "accessibility", area: "Global", manual: true, severity: "critical",
    check: "Color contrast meets WCAG AA (4.5:1 text, 3:1 UI components)",
    status: "not_tested", actionItem: "Run axe-core or WebAIM Contrast Checker on all text colors." },

  { id: "a11y-03", category: "accessibility", area: "Global", manual: true, severity: "major",
    check: "prefers-reduced-motion is respected for all animations",
    status: "not_tested", actionItem: "Enable reduced motion in OS settings → verify no animations play." },

  { id: "a11y-04", category: "accessibility", area: "Global", manual: true, severity: "major",
    check: "All images and icons have appropriate alt text or aria-label",
    status: "not_tested", actionItem: "Screen reader test with VoiceOver (macOS) or NVDA (Windows)." },

  { id: "a11y-05", category: "accessibility", area: "Mobile", manual: true, severity: "major",
    check: "Touch targets are at minimum 44×44px",
    status: "not_tested", actionItem: "Inspect tap targets on smallest supported viewport (375px)." },

  // ── Browser Compatibility ─────────────────────────────────────────────────────

  { id: "compat-01", category: "browser_compatibility", area: "Chrome", manual: true, severity: "blocker",
    check: "Full functionality on Chrome 120+ (desktop + Android)",
    status: "not_tested", actionItem: "Smoke test all major flows on Chrome." },

  { id: "compat-02", category: "browser_compatibility", area: "Safari", manual: true, severity: "blocker",
    check: "Full functionality on Safari 17+ (desktop + iOS)",
    status: "not_tested", actionItem: "Smoke test on Safari — pay attention to localStorage limits and CSS differences." },

  { id: "compat-03", category: "browser_compatibility", area: "Firefox", manual: true, severity: "critical",
    check: "Core functionality on Firefox 120+ (desktop)",
    status: "not_tested", actionItem: "Smoke test onboarding, recommendations, and logging on Firefox." },

  { id: "compat-04", category: "browser_compatibility", area: "Edge", manual: true, severity: "major",
    check: "Core functionality on Edge 120+ (desktop)",
    status: "not_tested", actionItem: "Smoke test on Edge Chromium." },

  // ── Documentation ─────────────────────────────────────────────────────────────

  { id: "doc-01", category: "documentation", area: "Technical", manual: false, severity: "major",
    check: "Architecture documentation exists",
    status: "partial", notes: "Phase 74 creates docs/ARCHITECTURE.md." },

  { id: "doc-02", category: "documentation", area: "Developer", manual: false, severity: "major",
    check: "Developer setup guide exists",
    status: "partial", notes: "Phase 74 creates docs/DEVELOPER_GUIDE.md." },

  { id: "doc-03", category: "documentation", area: "Legal", manual: true, severity: "blocker",
    check: "Terms of Service, Privacy Policy, and Medical Disclaimer reviewed by a lawyer",
    status: "not_tested", actionItem: "Engage legal counsel before commercial launch." },

];

// ── Compute audit report ──────────────────────────────────────────────────────

import type { AuditReport } from "./AuditTypes";

export function computeAuditReport(items: AuditItem[] = FEATURE_AUDIT_ITEMS): AuditReport {
  const passed    = items.filter(i => i.status === "pass").length;
  const partial   = items.filter(i => i.status === "partial").length;
  const failed    = items.filter(i => i.status === "fail").length;
  const notTested = items.filter(i => i.status === "not_tested").length;
  const blockers  = items.filter(i => i.severity === "blocker"   && i.status !== "pass" && i.status !== "not_applicable");
  const criticals = items.filter(i => i.severity === "critical"  && i.status !== "pass" && i.status !== "not_applicable");

  // Score: passed + partial×0.5, excluding not_applicable
  const applicable = items.filter(i => i.status !== "not_applicable").length;
  const score      = applicable > 0 ? Math.round(((passed + partial * 0.5) / applicable) * 100) : 100;

  return {
    generatedAt:    new Date().toISOString(),
    totalItems:     items.length,
    passed, partial, failed, notTested,
    blockers, criticals,
    readinessScore: score,
    releaseReady:   blockers.length === 0 && criticals.filter(c => c.status === "fail").length === 0,
  };
}
