// ─── lib/privacy/DataInventory.ts ────────────────────────────────────────────
// Phase 72 — enumerates all data Axis stores and explains why.

export type DataCategory =
  | "training"
  | "recovery"
  | "cycle"
  | "nutrition"
  | "recommendations"
  | "intelligence"
  | "system";

export interface DataEntry {
  key:         string;
  category:    DataCategory;
  label:       string;
  description: string;
  why:         string;          // why this is stored
  howUsed:     string;          // how it improves recommendations
  ifRemoved:   string;          // consequence of deletion
  sensitive:   boolean;         // true for health/cycle data
  retention:   string;          // human-readable retention policy
}

export const DATA_CATALOG: DataEntry[] = [
  // ── Training ───────────────────────────────────────────────────────────────
  {
    key:         "axis_session_recovery_v1",
    category:    "training",
    label:       "Active Workout Session",
    description: "State of an in-progress or interrupted workout session.",
    why:         "Allows Axis to recover an interrupted workout without losing completed sets.",
    howUsed:     "Restores your progress if the app is closed or the browser refreshes mid-workout.",
    ifRemoved:   "Any in-progress workout session would be lost. Completed workouts are unaffected.",
    sensitive:   false,
    retention:   "Cleared when the workout is completed or manually ended.",
  },

  // ── Recommendations & intelligence ────────────────────────────────────────
  {
    key:         "axis_verification_registry_v1",
    category:    "recommendations",
    label:       "Recommendation Verification Records",
    description: "A log of past recommendations and their evaluated outcomes.",
    why:         "Enables Axis to measure whether its recommendations are working for you specifically.",
    howUsed:     "Calibrates future confidence scores and improves recommendation accuracy over time.",
    ifRemoved:   "Axis loses its accuracy history and reverts to generalised confidence defaults.",
    sensitive:   false,
    retention:   "Up to 300 records, up to 120 days.",
  },
  {
    key:         "axis_decision_traces_v1",
    category:    "intelligence",
    label:       "Decision Audit Traces",
    description: "Complete audit trail of every recommendation decision (signals, modifiers, safety gates).",
    why:         "Supports transparency, determinism verification, and developer debugging.",
    howUsed:     "Not used in recommendations directly — provides explainability and audit capability.",
    ifRemoved:   "Decision history is cleared. Recommendations continue normally.",
    sensitive:   false,
    retention:   "Up to 200 traces, up to 60 days.",
  },
  {
    key:         "axis_regression_snapshots_v1",
    category:    "system",
    label:       "Regression Test Snapshots",
    description: "Stored baseline outputs for regression testing of the recommendation engine.",
    why:         "Allows detection of unintended changes to recommendation behaviour.",
    howUsed:     "Developer tooling only — not visible to or used in user-facing features.",
    ifRemoved:   "Regression baselines are cleared. Run regression tests again to create new baselines.",
    sensitive:   false,
    retention:   "One snapshot per scenario, retained indefinitely.",
  },
  {
    key:         "axis_confidence_registry_v1",
    category:    "intelligence",
    label:       "Confidence History",
    description: "Daily snapshots of Axis's confidence level in its understanding of your patterns.",
    why:         "Enables the confidence timeline and maturity progression display.",
    howUsed:     "Shows you how Axis's understanding has grown over time.",
    ifRemoved:   "Confidence history is cleared. Axis continues to compute confidence from current data.",
    sensitive:   false,
    retention:   "Up to 90 daily snapshots (~3 months).",
  },
  {
    key:         "axis_safety_audit_v1",
    category:    "system",
    label:       "Safety Rule Audit Log",
    description: "Log of every safety rule evaluation and any constraints applied.",
    why:         "Ensures safety governance is auditable and transparent.",
    howUsed:     "Developer tooling — surfaces how often safety rules constrain recommendations.",
    ifRemoved:   "Safety audit history is cleared. Safety rules continue to operate normally.",
    sensitive:   false,
    retention:   "Up to 200 entries, up to 60 days.",
  },
  {
    key:         "axis_recovery_log_v1",
    category:    "system",
    label:       "Recovery Event Log",
    description: "Log of storage integrity checks, auto-repairs, and recovery events.",
    why:         "Supports resilience monitoring and self-healing diagnostics.",
    howUsed:     "Developer tooling only.",
    ifRemoved:   "Recovery history is cleared. The app continues to self-monitor.",
    sensitive:   false,
    retention:   "Up to 100 events.",
  },
  {
    key:         "axis_perf_log_v1",
    category:    "system",
    label:       "Performance Log",
    description: "Timing data for instrumented operations.",
    why:         "Tracks application responsiveness and detects budget violations.",
    howUsed:     "Developer tooling — performance dashboard.",
    ifRemoved:   "Timing history is cleared. Performance continues to be monitored from next operation.",
    sensitive:   false,
    retention:   "Up to 500 entries, up to 7 days.",
  },
];

// ── Inventory scan ────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

export interface InventoryItem extends DataEntry {
  present:   boolean;
  byteSize:  number;
  itemCount: number | null;
}

export function getDataInventory(): InventoryItem[] {
  return DATA_CATALOG.map(entry => {
    if (!isClient()) return { ...entry, present: false, byteSize: 0, itemCount: null };

    let raw: string | null = null;
    try { raw = localStorage.getItem(entry.key); } catch {}

    const present  = raw !== null;
    const byteSize = raw ? new TextEncoder().encode(raw).length : 0;

    let itemCount: number | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) itemCount = parsed.length;
        else if (typeof parsed === "object" && parsed !== null) itemCount = Object.keys(parsed).length;
      } catch {}
    }

    return { ...entry, present, byteSize, itemCount };
  });
}

export function getTotalStorageBytes(): number {
  return getDataInventory().reduce((s, i) => s + i.byteSize, 0);
}
