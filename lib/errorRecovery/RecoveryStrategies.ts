// ─── lib/errorRecovery/RecoveryStrategies.ts ─────────────────────────────────
// Phase B — Definition of all built-in recovery strategies.
// These are descriptors; execution is handled by RecoveryManager.

import type { RecoveryStrategyDef, RecoveryStrategyId } from "@/types/ErrorTypes";

export const BUILT_IN_STRATEGIES: RecoveryStrategyDef[] = [
  {
    id:          "retry_component",
    label:       "Retry",
    description: "Reset the error boundary and re-render the component tree.",
    autoExecute: true,
    maxAttempts: 3,
  },
  {
    id:          "reload_local_state",
    label:       "Reload",
    description: "Re-read application state from localStorage and re-render.",
    autoExecute: true,
    maxAttempts: 2,
  },
  {
    id:          "recompute_derived",
    label:       "Recalculate",
    description: "Trigger a full re-computation of derived intelligence state.",
    autoExecute: true,
    maxAttempts: 2,
  },
  {
    id:          "restore_snapshot",
    label:       "Restore",
    description: "Restore from the pre-crash session snapshot.",
    autoExecute: true,
    maxAttempts: 1,
  },
  {
    id:          "reset_ui",
    label:       "Reset",
    description: "Clear non-critical UI state and return to a clean render.",
    autoExecute: true,
    maxAttempts: 2,
  },
  {
    id:          "fallback_recommendation",
    label:       "Use safe defaults",
    description: "Replace the failed recommendation with conservative safe defaults.",
    autoExecute: true,
    maxAttempts: 1,
  },
  {
    id:          "graceful_shutdown",
    label:       "Reload the app",
    description: "Cannot automatically recover. Guide the user to reload the page.",
    autoExecute: false,
    maxAttempts: 1,
  },
];

export function getStrategy(id: RecoveryStrategyId): RecoveryStrategyDef | undefined {
  return BUILT_IN_STRATEGIES.find(s => s.id === id);
}
