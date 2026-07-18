// ─── lib/preferences/dashboardDensity.ts ───────────────────────────────────────
// Dashboard 3.0 — Batch 20, Phase 6. The "lightweight density toggle" the
// product owner chose over full dashboard-layout mode-switching (see the
// Dashboard 2.0 Executive Product Strategy artifact, Deliverable 7 addendum).
// Density controls only which AccordionSections default open — never which
// sections exist, their order, or what's inside them. It's explicitly
// orthogonal to Data Maturity gating (which controls whether a section has
// anything to show at all) and lives in Settings only, never asked at
// onboarding.
//
// AccordionSection's own localStorage (`axis_dashboard_sections`) records a
// user's explicit per-section toggle and always overrides `defaultOpen` once
// set — so density only affects sections a user has never manually touched.
// This is intentional: an explicit choice always outranks a global default.

export type DashboardDensity = "focused" | "standard" | "full";

const STORAGE_KEY = "axis_dashboard_density";
const DEFAULT_DENSITY: DashboardDensity = "standard";

export function getDashboardDensity(): DashboardDensity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "focused" || raw === "standard" || raw === "full") return raw;
  } catch { /* localStorage unavailable — fall through to default */ }
  return DEFAULT_DENSITY;
}

export function setDashboardDensity(density: DashboardDensity): void {
  try {
    localStorage.setItem(STORAGE_KEY, density);
  } catch { /* quota/private-browsing — density just won't persist */ }
}

// "Full" opens every Body Today section plus the new This Week umbrella —
// Standard matches today's one-open-section behavior unchanged.
const FULL_OPEN_SECTIONS = new Set(["recovery", "cycle", "nutrition", "lifestyle", "this-week"]);
const STANDARD_OPEN_SECTIONS = new Set(["recovery"]);

export function defaultOpenFor(sectionId: string, density: DashboardDensity): boolean {
  switch (density) {
    case "focused":  return false;
    case "full":     return FULL_OPEN_SECTIONS.has(sectionId);
    case "standard":
    default:         return STANDARD_OPEN_SECTIONS.has(sectionId);
  }
}
