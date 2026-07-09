// ─── lib/intelligence/safety/SafetyRegistry.ts ───────────────────────────────
// Phase 68 — registry of all active safety rules.
// Built-in rules are loaded by default; additional rules can be registered.

import { BUILT_IN_RULES, type SafetyRule } from "./SafetyRule";

const _rules: Map<string, SafetyRule> = new Map(
  BUILT_IN_RULES.map(r => [r.id, r])
);

export function registerRule(rule: SafetyRule): void {
  _rules.set(rule.id, rule);
}

export function deregisterRule(id: string): void {
  _rules.delete(id);
}

export function getRule(id: string): SafetyRule | undefined {
  return _rules.get(id);
}

export function getAllRules(): SafetyRule[] {
  return [..._rules.values()];
}

export function getRulesByPriority(): SafetyRule[] {
  const order = { critical: 0, high: 1, moderate: 2, informational: 3 } as const;
  return getAllRules().sort((a, b) => order[a.priority] - order[b.priority]);
}
