// ─── lib/errorRecovery/RecoveryRegistry.ts ───────────────────────────────────
// Phase B — Registry of recovery strategies. Allows future phases to register
// additional strategies without modifying existing code.

import type { RecoveryStrategyDef, RecoveryStrategyId } from "@/types/ErrorTypes";
import { BUILT_IN_STRATEGIES } from "./RecoveryStrategies";

// ─── Internal registry ────────────────────────────────────────────────────────

const registry = new Map<RecoveryStrategyId, RecoveryStrategyDef>(
  BUILT_IN_STRATEGIES.map(s => [s.id, s]),
);

// ─── Public API ───────────────────────────────────────────────────────────────

/** Register a new or replacement strategy. */
export function registerStrategy(strategy: RecoveryStrategyDef): void {
  registry.set(strategy.id, strategy);
}

/** Deregister a strategy by id. Built-in strategies can be replaced but not removed. */
export function deregisterStrategy(id: RecoveryStrategyId): void {
  if (BUILT_IN_STRATEGIES.some(s => s.id === id)) return; // protect built-ins
  registry.delete(id);
}

/** Retrieve a strategy definition. Returns undefined if not registered. */
export function getStrategy(id: RecoveryStrategyId): RecoveryStrategyDef | undefined {
  return registry.get(id);
}

/** Return all registered strategies in registration order. */
export function getAllStrategies(): RecoveryStrategyDef[] {
  return [...registry.values()];
}
