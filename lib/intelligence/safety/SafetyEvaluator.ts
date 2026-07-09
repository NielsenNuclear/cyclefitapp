// ─── lib/intelligence/safety/SafetyEvaluator.ts ──────────────────────────────
// Phase 68 — runs all safety rules and produces a constrained output.

import { getRulesByPriority } from "./SafetyRegistry";
import type { SafetyContext, SafetyRuleResult, RuleOutcome } from "./SafetyRule";

const STORAGE_KEY  = "axis_safety_audit_v1";
const MAX_ENTRIES  = 200;
const RETENTION_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Audit persistence ─────────────────────────────────────────────────────────

export interface SafetyAuditEntry {
  id:          string;
  timestamp:   string;
  results:     SafetyRuleResult[];
  inputVolume: number;
  outputVolume: number;
  activations: number;   // rules that blocked or clamped
}

function loadAudit(): SafetyAuditEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAudit(entries: SafetyAuditEntry[]): void {
  if (!isClient()) return;
  const cutoff = Date.now() - RETENTION_MS;
  const pruned = entries
    .filter(e => new Date(e.timestamp).getTime() > cutoff)
    .slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ── Evaluation ────────────────────────────────────────────────────────────────

export interface SafetyEvaluation {
  originalVolumeScale:    number;
  constrainedVolumeScale: number;
  wasConstrained:         boolean;
  results:                SafetyRuleResult[];
  userMessages:           string[];     // deduped user-facing explanations
  criticalActivations:    SafetyRuleResult[];
  highActivations:        SafetyRuleResult[];
}

export function evaluateSafety(ctx: SafetyContext): SafetyEvaluation {
  const rules   = getRulesByPriority();
  const results: SafetyRuleResult[] = [];
  let volume = ctx.proposedVolumeScale;

  for (const rule of rules) {
    const adjustedCtx: SafetyContext = { ...ctx, proposedVolumeScale: volume };
    const result = rule.evaluate(adjustedCtx);
    results.push(result);

    if ((result.outcome === "clamped" || result.outcome === "blocked") && result.constrainedTo !== undefined) {
      volume = Math.min(volume, result.constrainedTo);
    }
  }

  const activations    = results.filter(r => r.outcome !== "pass");
  const userMessages   = [...new Set(activations.map(r => r.userMessage).filter(Boolean) as string[])];

  // Persist audit entry
  const entry: SafetyAuditEntry = {
    id:           `safe-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    timestamp:    new Date().toISOString(),
    results,
    inputVolume:  ctx.proposedVolumeScale,
    outputVolume: volume,
    activations:  activations.length,
  };
  const entries = loadAudit();
  entries.push(entry);
  saveAudit(entries);

  return {
    originalVolumeScale:    ctx.proposedVolumeScale,
    constrainedVolumeScale: volume,
    wasConstrained:         Math.abs(volume - ctx.proposedVolumeScale) > 0.001,
    results,
    userMessages,
    criticalActivations: activations.filter(r => r.priority === "critical"),
    highActivations:     activations.filter(r => r.priority === "high"),
  };
}

export function loadSafetyAudit(): SafetyAuditEntry[] {
  return loadAudit();
}
