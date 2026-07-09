"use client";
// ─── components/dev/ResilienceDashboard.tsx ──────────────────────────────────
// Phase 69 — storage health, recovery log, and chaos test runner.

import { useEffect, useState } from "react";
import {
  runHealthCheck,
  autoRepairProblems,
  getRecoveryLog,
  runChaosTests,
  type RecoveryEvent,
  type ChaosTestResult,
} from "@/lib/resilience/RecoveryManager";
import type { StorageHealthReport, KeyHealthReport } from "@/lib/resilience/IntegrityMonitor";

// ── Key row ───────────────────────────────────────────────────────────────────

function KeyRow({ k }: { k: KeyHealthReport }) {
  const ok = k.errors.length === 0;
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-ui-border/50 last:border-0 text-xs">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-green-400" : "bg-red-400"}`} />
      <span className="text-ink-muted flex-1 font-mono truncate">{k.key}</span>
      <span className="text-ink-muted">{k.present ? `${(k.byteSize / 1024).toFixed(1)} KB` : "—"}</span>
      {!ok && <span className="text-red-400">{k.errors[0].category}</span>}
    </div>
  );
}

// ── Recovery event row ────────────────────────────────────────────────────────

function EventRow({ event }: { event: RecoveryEvent }) {
  const TYPE_COLOR: Record<string, string> = {
    integrity_check:   "text-ink-muted",
    repair_success:    "text-green-400",
    repair_failed:     "text-red-400",
    repair_attempted:  "text-yellow-400",
    fallback_used:     "text-yellow-400",
    session_recovered: "text-brand",
    quota_cleared:     "text-orange-400",
  };
  const color = TYPE_COLOR[event.type] ?? "text-ink-muted";
  return (
    <div className="py-1.5 border-b border-ui-border/50 last:border-0 text-xs">
      <div className="flex items-center gap-2">
        <span className={`font-medium capitalize ${color}`}>{event.type.replace(/_/g," ")}</span>
        {event.key && <span className="text-ink-muted font-mono">{event.key.split("_").slice(1,3).join("_")}</span>}
        <span className="text-ink-muted ml-auto">{new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
      <p className="text-ink-muted mt-0.5">{event.details}</p>
    </div>
  );
}

// ── Chaos result row ──────────────────────────────────────────────────────────

function ChaosRow({ result }: { result: ChaosTestResult }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-ui-border/50 last:border-0 text-xs">
      <span className={result.passed ? "text-green-400" : "text-red-400"}>{result.passed ? "✓" : "✗"}</span>
      <div className="flex-1">
        <p className="text-ink-base">{result.scenario}</p>
        {!result.passed && <p className="text-red-400">{result.details}</p>}
      </div>
      <span className="text-ink-muted flex-shrink-0">{result.durationMs}ms</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type View = "health" | "log" | "chaos";

export function ResilienceDashboard() {
  const [report,  setReport]  = useState<StorageHealthReport | null>(null);
  const [log,     setLog]     = useState<RecoveryEvent[]>([]);
  const [chaos,   setChaos]   = useState<ChaosTestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [view,    setView]    = useState<View>("health");

  function refresh() {
    const r = runHealthCheck();
    setReport(r);
    setLog(getRecoveryLog().slice().reverse());
  }

  useEffect(() => { refresh(); }, []);

  function handleRepair() {
    if (!report) return;
    autoRepairProblems(report);
    refresh();
  }

  function handleChaos() {
    setRunning(true);
    setTimeout(() => {
      setChaos(runChaosTests());
      setRunning(false);
    }, 10);
  }

  const score = report ? (report.integrityScore * 100).toFixed(0) : "—";
  const scoreColor = report
    ? report.integrityScore >= 0.9 ? "text-green-400" : report.integrityScore >= 0.7 ? "text-yellow-400" : "text-red-400"
    : "text-ink-muted";

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-ui-surface rounded-lg p-2 text-center">
          <p className={`text-lg font-semibold ${scoreColor}`}>{score}%</p>
          <p className="text-xs text-ink-muted">Integrity</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-ink-base">{report?.problemKeys ?? "—"}</p>
          <p className="text-xs text-ink-muted">Problems</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-ink-base">
            {report ? `${(report.totalBytes / 1024).toFixed(1)} KB` : "—"}
          </p>
          <p className="text-xs text-ink-muted">Storage</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={refresh}
          className="px-3 py-1.5 bg-ui-surface text-ink-base text-xs font-medium rounded-lg hover:bg-ui-border"
        >
          Refresh
        </button>
        {report && report.problemKeys > 0 && (
          <button
            onClick={handleRepair}
            className="px-3 py-1.5 bg-orange-900/30 text-orange-400 text-xs font-medium rounded-lg hover:opacity-80"
          >
            Auto-Repair {report.problemKeys} Problem{report.problemKeys > 1 ? "s" : ""}
          </button>
        )}
        <button
          onClick={handleChaos}
          disabled={running}
          className="px-3 py-1.5 bg-brand text-canvas text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {running ? "Running Chaos Tests…" : "Run Chaos Tests"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ui-border">
        {([
          { id: "health" as const, label: `Storage (${report?.totalKeys ?? 0})` },
          { id: "log"    as const, label: `Recovery Log (${log.length})`        },
          { id: "chaos"  as const, label: `Chaos (${chaos?.length ?? 0})`       },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${view === t.id ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-base"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "health" && report && (
        <div className="bg-ui-surface rounded-lg p-3">
          {report.keys.map(k => <KeyRow key={k.key} k={k} />)}
          {report.totalBytes > 0 && (
            <p className="text-xs text-ink-muted mt-2 text-right">
              Total: {(report.totalBytes / 1024).toFixed(1)} KB used
            </p>
          )}
        </div>
      )}

      {view === "log" && (
        <div className="bg-ui-surface rounded-lg p-3">
          {log.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-2">No recovery events recorded.</p>
          ) : (
            log.slice(0, 30).map(e => <EventRow key={e.id} event={e} />)
          )}
        </div>
      )}

      {view === "chaos" && (
        <div className="bg-ui-surface rounded-lg p-3">
          {!chaos ? (
            <p className="text-xs text-ink-muted text-center py-2">Click "Run Chaos Tests" to validate resilience.</p>
          ) : (
            <>
              <div className="flex justify-between text-xs text-ink-muted mb-2">
                <span>{chaos.filter(r => r.passed).length}/{chaos.length} passed</span>
                <span>{chaos.reduce((s, r) => s + r.durationMs, 0)}ms total</span>
              </div>
              {chaos.map((r, i) => <ChaosRow key={i} result={r} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
