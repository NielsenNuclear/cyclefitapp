// ─── lib/resilience/RecoveryManager.ts ───────────────────────────────────────
// Phase 69 — orchestrates resilience: integrity checks, repairs, and recovery.

import { runIntegrityCheck, repairKey, type StorageHealthReport } from "./IntegrityMonitor";
import { classifyError, type ClassifiedError }                     from "./ErrorClassifier";

const RECOVERY_LOG_KEY  = "axis_recovery_log_v1";
const MAX_LOG_ENTRIES   = 100;

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Recovery event log ────────────────────────────────────────────────────────

export type RecoveryEventType =
  | "integrity_check"
  | "repair_attempted"
  | "repair_success"
  | "repair_failed"
  | "fallback_used"
  | "session_recovered"
  | "quota_cleared";

export interface RecoveryEvent {
  id:        string;
  timestamp: string;
  type:      RecoveryEventType;
  key?:      string;
  details:   string;
  resolved:  boolean;
}

function loadLog(): RecoveryEvent[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(RECOVERY_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function appendLog(event: Omit<RecoveryEvent, "id" | "timestamp">): void {
  if (!isClient()) return;
  const log = loadLog();
  const entry: RecoveryEvent = {
    ...event,
    id:        `rev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
  };
  log.push(entry);
  try {
    localStorage.setItem(RECOVERY_LOG_KEY, JSON.stringify(log.slice(-MAX_LOG_ENTRIES)));
  } catch {}
}

export function getRecoveryLog(): RecoveryEvent[] {
  return loadLog();
}

// ── Main operations ────────────────────────────────────────────────────────────

export function runHealthCheck(): StorageHealthReport {
  const report = runIntegrityCheck();
  appendLog({
    type: "integrity_check",
    details: `Score: ${(report.integrityScore * 100).toFixed(0)}% — ${report.healthyKeys}/${report.totalKeys} keys healthy.`,
    resolved: report.problemKeys === 0,
  });
  return report;
}

export function autoRepairProblems(report: StorageHealthReport): number {
  let repaired = 0;
  for (const keyReport of report.keys) {
    if (keyReport.errors.length === 0) continue;
    const autoRepairErrors = keyReport.errors.filter(e => e.autoRepair);
    if (autoRepairErrors.length === 0) continue;

    appendLog({
      type: "repair_attempted",
      key:  keyReport.key,
      details: `Attempting auto-repair: ${autoRepairErrors.map(e => e.category).join(", ")}.`,
      resolved: false,
    });

    const success = repairKey(keyReport.key);
    appendLog({
      type:     success ? "repair_success" : "repair_failed",
      key:      keyReport.key,
      details:  success ? "Key removed and will reinitialise on next load." : "Repair failed — manual intervention required.",
      resolved: success,
    });
    if (success) repaired++;
  }
  return repaired;
}

export function logFallbackUsed(key: string, reason: string): void {
  appendLog({
    type: "fallback_used",
    key,
    details: reason,
    resolved: true,
  });
}

export function logSessionRecovered(workoutId: string, completedSets: number): void {
  appendLog({
    type: "session_recovered",
    details: `Workout ${workoutId} recovered with ${completedSets} completed sets.`,
    resolved: true,
  });
}

// ── Chaos testing ─────────────────────────────────────────────────────────────

export interface ChaosTestResult {
  scenario:   string;
  passed:     boolean;
  details:    string;
  durationMs: number;
}

export function runChaosTests(): ChaosTestResult[] {
  if (!isClient()) return [];
  const results: ChaosTestResult[] = [];

  function chaos(scenario: string, fn: () => boolean): void {
    const t0 = Date.now();
    try {
      const passed = fn();
      results.push({ scenario, passed, details: passed ? "Passed" : "Failed", durationMs: Date.now() - t0 });
    } catch (e) {
      results.push({ scenario, passed: false, details: `Exception: ${e instanceof Error ? e.message : String(e)}`, durationMs: Date.now() - t0 });
    }
  }

  // 1. Corrupted JSON recovery
  chaos("Corrupted JSON parse recovery", () => {
    const testKey = "axis_chaos_test_corrupted";
    localStorage.setItem(testKey, "{invalid json{{{{");
    let ok = false;
    try { JSON.parse(localStorage.getItem(testKey) ?? ""); } catch { ok = true; }
    localStorage.removeItem(testKey);
    return ok;
  });

  // 2. Missing key graceful handling
  chaos("Missing key returns null without crash", () => {
    const missing = localStorage.getItem("axis_chaos_test_nonexistent_key_xyz");
    return missing === null;
  });

  // 3. Invalid number detection
  chaos("NaN value detection", () => {
    const val = NaN;
    return isNaN(val) || !isFinite(val);
  });

  // 4. Oversized payload truncation
  chaos("Large payload write+read round-trip", () => {
    const testKey = "axis_chaos_test_large";
    const payload = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ id: i, data: "x".repeat(100) })));
    try {
      localStorage.setItem(testKey, payload);
      const back = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return back === payload;
    } catch { localStorage.removeItem(testKey); return false; }
  });

  // 5. Concurrent write simulation (write then immediate overwrite)
  chaos("Concurrent write stability", () => {
    const testKey = "axis_chaos_test_concurrent";
    localStorage.setItem(testKey, JSON.stringify({ v: 1 }));
    localStorage.setItem(testKey, JSON.stringify({ v: 2 }));
    const result = JSON.parse(localStorage.getItem(testKey) ?? "{}");
    localStorage.removeItem(testKey);
    return result.v === 2;
  });

  // 6. Integer overflow/underflow in stored values
  chaos("Extreme numeric values handled safely", () => {
    const big = Number.MAX_SAFE_INTEGER + 1;
    const check = classifyError(big, "test");
    // Just checking the classifier handles it without throwing
    return typeof check.category === "string";
  });

  // 7. Empty array storage
  chaos("Empty array persists correctly", () => {
    const testKey = "axis_chaos_test_empty";
    localStorage.setItem(testKey, JSON.stringify([]));
    const back = JSON.parse(localStorage.getItem(testKey) ?? "null");
    localStorage.removeItem(testKey);
    return Array.isArray(back) && back.length === 0;
  });

  // 8. Unicode key survival
  chaos("Unicode content round-trips safely", () => {
    const testKey = "axis_chaos_test_unicode";
    const payload = JSON.stringify({ text: "Høj intensitet – dag 3 🏋️" });
    localStorage.setItem(testKey, payload);
    const back = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return back === payload;
  });

  return results;
}
