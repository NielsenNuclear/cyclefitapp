// ─── lib/performance/PerformanceBudget.ts ────────────────────────────────────
// Phase 71 — performance budget definitions.

export type BudgetCategory =
  | "dashboard_render"
  | "recommendation_compute"
  | "body_viewer_fps"
  | "workout_log_interaction"
  | "storage_read"
  | "storage_write"
  | "analytics_generation"
  | "integrity_check";

export interface PerformanceBudget {
  category:     BudgetCategory;
  label:        string;
  targetMs:     number;    // ideal — green
  warningMs:    number;    // acceptable — yellow
  criticalMs:   number;    // violation — red
  unit:         "ms" | "fps";
  description:  string;
}

export const BUDGETS: PerformanceBudget[] = [
  {
    category: "dashboard_render", label: "Dashboard Render",
    targetMs: 100, warningMs: 200, criticalMs: 500,
    unit: "ms",
    description: "Time to interactive on the main dashboard",
  },
  {
    category: "recommendation_compute", label: "Recommendation Compute",
    targetMs: 50, warningMs: 100, criticalMs: 300,
    unit: "ms",
    description: "Full recommendation pipeline from signals to output",
  },
  {
    category: "body_viewer_fps", label: "Body Viewer (R3F)",
    targetMs: 17, warningMs: 33, criticalMs: 66,   // 60fps = 16.7ms, 30fps = 33ms
    unit: "fps",
    description: "Frame render time in the 3D body viewer",
  },
  {
    category: "workout_log_interaction", label: "Workout Log Interaction",
    targetMs: 16, warningMs: 50, criticalMs: 100,
    unit: "ms",
    description: "Latency from set completion tap to UI update",
  },
  {
    category: "storage_read", label: "Storage Read",
    targetMs: 5, warningMs: 20, criticalMs: 100,
    unit: "ms",
    description: "localStorage.getItem + JSON.parse for a single key",
  },
  {
    category: "storage_write", label: "Storage Write",
    targetMs: 10, warningMs: 30, criticalMs: 150,
    unit: "ms",
    description: "JSON.stringify + localStorage.setItem for a single key",
  },
  {
    category: "analytics_generation", label: "Analytics Generation",
    targetMs: 200, warningMs: 500, criticalMs: 2000,
    unit: "ms",
    description: "Full analytics computation (can run in background)",
  },
  {
    category: "integrity_check", label: "Integrity Check",
    targetMs: 100, warningMs: 300, criticalMs: 1000,
    unit: "ms",
    description: "Full data health check across all localStorage keys",
  },
];

export function getBudget(category: BudgetCategory): PerformanceBudget | undefined {
  return BUDGETS.find(b => b.category === category);
}

export type BudgetStatus = "target" | "warning" | "critical";

export function evaluateBudget(
  category: BudgetCategory,
  measuredMs: number,
): BudgetStatus {
  const budget = getBudget(category);
  if (!budget) return "target";
  if (measuredMs <= budget.targetMs)  return "target";
  if (measuredMs <= budget.warningMs) return "warning";
  return "critical";
}

export const BUDGET_COLOR: Record<BudgetStatus, string> = {
  target:   "text-green-400",
  warning:  "text-yellow-400",
  critical: "text-red-400",
};
