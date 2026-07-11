// ─── lib/launch/LaunchChecklist.ts ───────────────────────────────────────────
// Phase 76 — comprehensive launch readiness checklist.

export type LaunchGateStatus = "green" | "yellow" | "red" | "unknown";

export interface LaunchGate {
  id:          string;
  category:    string;
  name:        string;
  description: string;
  critical:    boolean;   // blocks launch if not green
  status:      LaunchGateStatus;
  notes?:      string;
}

export const LAUNCH_GATES: LaunchGate[] = [

  // ── Feature completeness ──────────────────────────────────────────────────

  { id: "feat-01", category: "Feature Completeness", critical: true,
    name: "Onboarding flow",
    description: "11-step onboarding completes without errors for all user types.",
    status: "green", notes: "All steps implemented and tested in regression suite." },

  { id: "feat-02", category: "Feature Completeness", critical: true,
    name: "Workout recommendation",
    description: "Adaptive recommendation generates a valid workout for every phase and profile.",
    status: "green", notes: "15-scenario regression suite all passing." },

  { id: "feat-03", category: "Feature Completeness", critical: true,
    name: "Workout logging",
    description: "Users can start, log sets, and complete a workout end-to-end.",
    status: "yellow", notes: "Requires manual end-to-end test." },

  { id: "feat-04", category: "Feature Completeness", critical: false,
    name: "Body Intelligence (3D viewer)",
    description: "GltfBody renders muscle activation map. PlaceholderBody fallback works.",
    status: "yellow", notes: "Requires NEXT_PUBLIC_BODY_MODEL_URL env var in production." },

  // ── Quality assurance ─────────────────────────────────────────────────────

  { id: "qa-01", category: "Quality Assurance", critical: true,
    name: "Feature audit zero blockers",
    description: "QA feature audit has zero blocker-severity items outstanding.",
    status: "yellow", notes: "Multiple manual items not yet tested." },

  { id: "qa-02", category: "Quality Assurance", critical: true,
    name: "Error boundary coverage",
    description: "ErrorBoundary wraps all routes — no white-screen crashes.",
    status: "green", notes: "ErrorBoundary implemented in Phase 69." },

  { id: "qa-03", category: "Quality Assurance", critical: false,
    name: "Browser compatibility",
    description: "Smoke tests pass on Chrome, Safari, Firefox.",
    status: "unknown", notes: "Not yet verified in all browsers." },

  // ── Accessibility ─────────────────────────────────────────────────────────

  { id: "a11y-01", category: "Accessibility", critical: true,
    name: "WCAG AA baseline",
    description: "Zero critical violations on axe-core scan. Color contrast passes.",
    status: "unknown", notes: "Requires axe-core scan on all routes." },

  { id: "a11y-02", category: "Accessibility", critical: false,
    name: "Keyboard navigation",
    description: "All major user flows completable via keyboard only.",
    status: "unknown", notes: "Requires manual keyboard audit." },

  // ── Performance ───────────────────────────────────────────────────────────

  { id: "perf-01", category: "Performance", critical: true,
    name: "Dashboard TTI < 200ms",
    description: "Time-to-interactive meets budget on mid-range mobile.",
    status: "unknown", notes: "Requires measurement on throttled device." },

  { id: "perf-02", category: "Performance", critical: false,
    name: "Scalability benchmark",
    description: "App stays responsive with 500+ workout history.",
    status: "green", notes: "Scalability benchmarks pass in Phase 71." },

  // ── Privacy & security ────────────────────────────────────────────────────

  { id: "sec-01", category: "Privacy & Security", critical: true,
    name: "Zero network calls",
    description: "No user data leaves the device during normal app use.",
    status: "green", notes: "All storage is localStorage-only." },

  { id: "sec-02", category: "Privacy & Security", critical: true,
    name: "Consent defaults off",
    description: "All 5 consent flags default to false.",
    status: "green", notes: "ConsentRegistry defaults verified in Phase 72." },

  { id: "sec-03", category: "Privacy & Security", critical: true,
    name: "Data deletion works",
    description: "Delete All removes every axis_ key from localStorage.",
    status: "yellow", notes: "Requires manual verification with DevTools." },

  // ── Legal ─────────────────────────────────────────────────────────────────

  { id: "legal-01", category: "Legal", critical: true,
    name: "Terms of Service",
    description: "ToS drafted, reviewed by legal, linked from app.",
    status: "red", notes: "Legal review not yet commissioned." },

  { id: "legal-02", category: "Legal", critical: true,
    name: "Privacy Policy",
    description: "Privacy Policy drafted, reviewed by legal, linked from app.",
    status: "red", notes: "Legal review not yet commissioned." },

  { id: "legal-03", category: "Legal", critical: true,
    name: "Medical Disclaimer",
    description: "Disclaimer confirms Axis is not medical advice, linked from app.",
    status: "yellow", notes: "Stub page exists; legal review required." },

  // ── Infrastructure ────────────────────────────────────────────────────────

  { id: "infra-01", category: "Infrastructure", critical: true,
    name: "Production build clean",
    description: "npm run build succeeds with zero TypeScript errors.",
    status: "green", notes: "Build passes as of Phase 76." },

  { id: "infra-02", category: "Infrastructure", critical: false,
    name: "404 and error pages",
    description: "Custom 404 and error pages are styled and informative.",
    status: "unknown", notes: "Requires implementation." },

  { id: "infra-03", category: "Infrastructure", critical: false,
    name: "Analytics (telemetry)",
    description: "Privacy-first local telemetry collecting events for product insights.",
    status: "green", notes: "TelemetryCollector implemented in Phase 75." },
];

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface LaunchReadiness {
  totalGates:     number;
  greenCount:     number;
  yellowCount:    number;
  redCount:       number;
  unknownCount:   number;
  criticalBlocks: LaunchGate[];  // critical gates that are not green
  readinessScore: number;        // 0–100
  launchReady:    boolean;
}

export function computeLaunchReadiness(gates: LaunchGate[] = LAUNCH_GATES): LaunchReadiness {
  const total   = gates.length;
  const green   = gates.filter(g => g.status === "green").length;
  const yellow  = gates.filter(g => g.status === "yellow").length;
  const red     = gates.filter(g => g.status === "red").length;
  const unknown = gates.filter(g => g.status === "unknown").length;

  const criticalBlocks = gates.filter(g => g.critical && g.status !== "green");
  const score = total > 0 ? Math.round(((green + yellow * 0.5) / total) * 100) : 0;

  return {
    totalGates:     total,
    greenCount:     green,
    yellowCount:    yellow,
    redCount:       red,
    unknownCount:   unknown,
    criticalBlocks,
    readinessScore: score,
    launchReady:    criticalBlocks.length === 0,
  };
}
