// ─── lib/dev/FeatureFlags.ts ──────────────────────────────────────────────────
// Phase 74 — runtime feature flag system backed by localStorage.
// All flags default to OFF so production builds are unaffected.

const STORAGE_KEY = "axis_feature_flags_v1";

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Flag registry ─────────────────────────────────────────────────────────────

export type FlagId =
  | "devtools_visible"
  | "regression_auto_run"
  | "trace_verbose"
  | "chaos_tests_on_start"
  | "mock_cycle_data"
  | "mock_long_history"
  | "performance_overlay"
  | "confidence_debug";

export interface FeatureFlag {
  id:          FlagId;
  label:       string;
  description: string;
  devOnly:     boolean;    // if true, never expose to production users
  default:     boolean;
}

export const FLAG_REGISTRY: FeatureFlag[] = [
  {
    id: "devtools_visible",
    label: "Developer Tools Visible",
    description: "Show the /dev route link in the main navigation.",
    devOnly: true,
    default: false,
  },
  {
    id: "regression_auto_run",
    label: "Auto-Run Regression on Load",
    description: "Automatically run the regression suite when the dev page loads.",
    devOnly: true,
    default: false,
  },
  {
    id: "trace_verbose",
    label: "Verbose Decision Traces",
    description: "Store full input snapshots in every DecisionTrace entry.",
    devOnly: true,
    default: false,
  },
  {
    id: "chaos_tests_on_start",
    label: "Chaos Tests on App Start",
    description: "Run RecoveryManager chaos suite on every cold start (dev only).",
    devOnly: true,
    default: false,
  },
  {
    id: "mock_cycle_data",
    label: "Mock Cycle Data",
    description: "Inject synthetic cycle phase data to test phase-specific recommendations.",
    devOnly: true,
    default: false,
  },
  {
    id: "mock_long_history",
    label: "Mock Long Workout History",
    description: "Inject 200 synthetic past workouts for scalability testing.",
    devOnly: true,
    default: false,
  },
  {
    id: "performance_overlay",
    label: "Performance Timing Overlay",
    description: "Show a floating timing overlay on all major renders.",
    devOnly: true,
    default: false,
  },
  {
    id: "confidence_debug",
    label: "Confidence Debug Info",
    description: "Show raw dimension scores alongside confidence badges in the UI.",
    devOnly: true,
    default: false,
  },
];

// ── Storage ───────────────────────────────────────────────────────────────────

type FlagOverrides = Partial<Record<FlagId, boolean>>;

function loadOverrides(): FlagOverrides {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FlagOverrides) : {};
  } catch { return {}; }
}

function saveOverrides(overrides: FlagOverrides): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isEnabled(id: FlagId): boolean {
  const overrides = loadOverrides();
  if (id in overrides) return Boolean(overrides[id]);
  return FLAG_REGISTRY.find(f => f.id === id)?.default ?? false;
}

export function setFlag(id: FlagId, value: boolean): void {
  const overrides = loadOverrides();
  overrides[id] = value;
  saveOverrides(overrides);
}

export function resetAllFlags(): void {
  if (isClient()) localStorage.removeItem(STORAGE_KEY);
}

export interface ResolvedFlag extends FeatureFlag {
  currentValue: boolean;
  overridden:   boolean;
}

export function getAllFlags(): ResolvedFlag[] {
  const overrides = loadOverrides();
  return FLAG_REGISTRY.map(f => ({
    ...f,
    currentValue: f.id in overrides ? Boolean(overrides[f.id]) : f.default,
    overridden:   f.id in overrides,
  }));
}
