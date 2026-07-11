// ─── lib/qa/ReleaseChecklist.ts ───────────────────────────────────────────────
// Phase 73 — production release checklist with localStorage persistence.

const STORAGE_KEY = "axis_release_checklist_v1";

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChecklistStatus = "pending" | "complete" | "blocked" | "skipped";

export interface ChecklistItem {
  id:          string;
  section:     string;
  item:        string;
  required:    boolean;    // must be complete before release
  status:      ChecklistStatus;
  notes?:      string;
  updatedAt?:  string;
}

export interface ChecklistSection {
  name:   string;
  items:  ChecklistItem[];
}

// ── Canonical checklist ───────────────────────────────────────────────────────

const DEFAULT_ITEMS: ChecklistItem[] = [

  // ── Core functionality ─────────────────────────────────────────────────────

  { id: "func-01", section: "Core Functionality", required: true, status: "pending",
    item: "Onboarding completes successfully on fresh install" },
  { id: "func-02", section: "Core Functionality", required: true, status: "pending",
    item: "Workout recommendation is generated after onboarding" },
  { id: "func-03", section: "Core Functionality", required: true, status: "pending",
    item: "Workout can be started, logged, and completed end-to-end" },
  { id: "func-04", section: "Core Functionality", required: true, status: "pending",
    item: "Recovery check-in records and persists" },
  { id: "func-05", section: "Core Functionality", required: true, status: "pending",
    item: "Adaptive recommendations update after 3+ completed workouts" },
  { id: "func-06", section: "Core Functionality", required: true, status: "pending",
    item: "Dashboard cards render correctly for new, intermediate, and power users" },

  // ── Data & resilience ──────────────────────────────────────────────────────

  { id: "data-01", section: "Data & Resilience", required: true, status: "pending",
    item: "Interrupted workout recovers on app reopen" },
  { id: "data-02", section: "Data & Resilience", required: true, status: "pending",
    item: "Corrupted localStorage key does not crash the application" },
  { id: "data-03", section: "Data & Resilience", required: true, status: "pending",
    item: "IntegrityMonitor reports 100% health on clean install" },
  { id: "data-04", section: "Data & Resilience", required: true, status: "pending",
    item: "Data export produces valid, parseable JSON" },
  { id: "data-05", section: "Data & Resilience", required: true, status: "pending",
    item: "Delete All clears all axis_ localStorage keys" },

  // ── Performance ─────────────────────────────────────────────────────────────

  { id: "perf-01", section: "Performance", required: true, status: "pending",
    item: "Dashboard time-to-interactive < 200ms on mid-range mobile" },
  { id: "perf-02", section: "Performance", required: true, status: "pending",
    item: "Recommendation computation < 100ms" },
  { id: "perf-03", section: "Performance", required: false, status: "pending",
    item: "App remains responsive with 500+ workout history (scalability benchmark passes)" },
  { id: "perf-04", section: "Performance", required: false, status: "pending",
    item: "3D body viewer maintains 30fps minimum on supported devices" },

  // ── Accessibility ──────────────────────────────────────────────────────────

  { id: "a11y-01", section: "Accessibility", required: true, status: "pending",
    item: "All routes pass axe-core automated accessibility scan with 0 critical violations" },
  { id: "a11y-02", section: "Accessibility", required: true, status: "pending",
    item: "Full onboarding completable with keyboard only" },
  { id: "a11y-03", section: "Accessibility", required: true, status: "pending",
    item: "Color contrast meets WCAG AA across all text and UI elements" },
  { id: "a11y-04", section: "Accessibility", required: false, status: "pending",
    item: "Screen reader test with VoiceOver (iOS) passes for core workflows" },
  { id: "a11y-05", section: "Accessibility", required: true, status: "pending",
    item: "prefers-reduced-motion: no animations play in reduced-motion mode" },

  // ── Browser compatibility ──────────────────────────────────────────────────

  { id: "compat-01", section: "Browser Compatibility", required: true, status: "pending",
    item: "Full smoke test passes on Chrome 120+ (desktop)" },
  { id: "compat-02", section: "Browser Compatibility", required: true, status: "pending",
    item: "Full smoke test passes on Safari 17+ (iOS)" },
  { id: "compat-03", section: "Browser Compatibility", required: true, status: "pending",
    item: "Core functionality passes on Firefox 120+ (desktop)" },
  { id: "compat-04", section: "Browser Compatibility", required: false, status: "pending",
    item: "Core functionality passes on Edge 120+ (desktop)" },

  // ── Privacy & security ─────────────────────────────────────────────────────

  { id: "sec-01", section: "Privacy & Security", required: true, status: "pending",
    item: "Network tab shows no outbound requests during normal app use" },
  { id: "sec-02", section: "Privacy & Security", required: true, status: "pending",
    item: "Privacy dashboard is reachable and functional" },
  { id: "sec-03", section: "Privacy & Security", required: true, status: "pending",
    item: "All consent flags default to off" },

  // ── Legal ─────────────────────────────────────────────────────────────────

  { id: "legal-01", section: "Legal", required: true, status: "pending",
    item: "Terms of Service drafted and reviewed by legal counsel" },
  { id: "legal-02", section: "Legal", required: true, status: "pending",
    item: "Privacy Policy drafted and reviewed by legal counsel" },
  { id: "legal-03", section: "Legal", required: true, status: "pending",
    item: "Medical disclaimer reviewed — Axis is not medical advice" },
  { id: "legal-04", section: "Legal", required: true, status: "pending",
    item: "GDPR/consumer data compliance reviewed for target markets" },

  // ── Documentation ─────────────────────────────────────────────────────────

  { id: "doc-01", section: "Documentation", required: false, status: "pending",
    item: "Architecture guide available at /docs/ARCHITECTURE.md" },
  { id: "doc-02", section: "Documentation", required: false, status: "pending",
    item: "Developer setup guide available at /docs/DEVELOPER_GUIDE.md" },
  { id: "doc-03", section: "Documentation", required: true, status: "pending",
    item: "Help/FAQ content written and accessible to users" },

  // ── Launch infrastructure ──────────────────────────────────────────────────

  { id: "launch-01", section: "Launch Infrastructure", required: true, status: "pending",
    item: "Error boundary covers all routes — no white-screen crashes" },
  { id: "launch-02", section: "Launch Infrastructure", required: true, status: "pending",
    item: "404 and error pages are styled and informative" },
  { id: "launch-03", section: "Launch Infrastructure", required: true, status: "pending",
    item: "Release notes / changelog page exists" },
  { id: "launch-04", section: "Launch Infrastructure", required: false, status: "pending",
    item: "Feedback mechanism reachable from within the app" },
];

// ── Storage ───────────────────────────────────────────────────────────────────

function load(): ChecklistItem[] {
  if (!isClient()) return DEFAULT_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const saved: ChecklistItem[] = JSON.parse(raw);
    // Merge: use saved status for known IDs, add any new DEFAULT items
    const savedMap = new Map(saved.map(i => [i.id, i]));
    return DEFAULT_ITEMS.map(d => savedMap.has(d.id) ? { ...d, ...savedMap.get(d.id) } : d);
  } catch { return DEFAULT_ITEMS; }
}

function save(items: ChecklistItem[]): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function loadChecklist(): ChecklistItem[] { return load(); }

export function updateItem(id: string, status: ChecklistStatus, notes?: string): void {
  const items = load();
  const idx   = items.findIndex(i => i.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], status, notes, updatedAt: new Date().toISOString() };
    save(items);
  }
}

export function resetChecklist(): void {
  if (isClient()) localStorage.removeItem(STORAGE_KEY);
}

// ── Aggregate stats ───────────────────────────────────────────────────────────

export interface ChecklistStats {
  total:     number;
  complete:  number;
  pending:   number;
  blocked:   number;
  required:  number;
  requiredComplete: number;
  readyToLaunch: boolean;
}

export function getChecklistStats(items: ChecklistItem[]): ChecklistStats {
  const total    = items.length;
  const complete = items.filter(i => i.status === "complete" || i.status === "skipped").length;
  const pending  = items.filter(i => i.status === "pending").length;
  const blocked  = items.filter(i => i.status === "blocked").length;
  const required = items.filter(i => i.required).length;
  const requiredComplete = items.filter(i => i.required && (i.status === "complete" || i.status === "skipped")).length;

  return {
    total, complete, pending, blocked, required, requiredComplete,
    readyToLaunch: required > 0 && requiredComplete === required && blocked === 0,
  };
}

// ── Group by section ──────────────────────────────────────────────────────────

export function groupBySection(items: ChecklistItem[]): ChecklistSection[] {
  const sections = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }
  return [...sections.entries()].map(([name, items]) => ({ name, items }));
}
