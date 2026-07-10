"use client";
// ─── components/dev/PerformanceDashboard.tsx ─────────────────────────────────
// Phase 71 — performance stats, budget violations, scalability benchmarks.

import { useEffect, useState } from "react";
import {
  computePerfStats,
  clearPerfLog,
  getPerfLog,
  type PerfStats,
  type PerfEntry,
} from "@/lib/performance/PerformanceMonitor";
import {
  runScalabilityBenchmarks,
  type ScalabilityReport,
} from "@/lib/performance/ScalabilityBenchmark";
import { BUDGETS, BUDGET_COLOR, evaluateBudget, type BudgetCategory } from "@/lib/performance/PerformanceBudget";

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({ stat }: { stat: PerfStats }) {
  const status = BUDGETS.find(b => b.category === stat.category)
    ? evaluateBudget(stat.category as BudgetCategory, stat.p90)
    : "target";

  return (
    <tr className="border-b border-ui-border/40">
      <td className="py-1.5 px-3 text-xs text-ink-base">{stat.category.replace(/_/g," ")}</td>
      <td className="py-1.5 px-3 text-xs text-ink-muted text-right font-mono">{stat.count}</td>
      <td className="py-1.5 px-3 text-xs text-ink-muted text-right font-mono">{stat.mean.toFixed(1)}</td>
      <td className={`py-1.5 px-3 text-xs text-right font-mono ${BUDGET_COLOR[status]}`}>{stat.p90.toFixed(1)}</td>
      <td className="py-1.5 px-3 text-xs text-right font-mono text-ink-muted">{stat.max.toFixed(1)}</td>
      <td className={`py-1.5 px-3 text-xs text-right font-mono ${stat.violations > 0 ? "text-red-400" : "text-ink-muted"}`}>
        {stat.violations}
      </td>
    </tr>
  );
}

// ── Benchmark result row ──────────────────────────────────────────────────────

function BenchRow({ r }: { r: ScalabilityReport["results"][0] }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-ui-border/50 last:border-0 text-xs">
      <span className={r.passed ? "text-green-400" : "text-red-400"}>{r.passed ? "✓" : "✗"}</span>
      <span className="text-ink-base flex-1 truncate">{r.name}</span>
      <span className={`font-mono flex-shrink-0 ${r.passed ? "text-ink-muted" : "text-red-400"}`}>
        {r.durationMs.toFixed(1)}ms
      </span>
    </div>
  );
}

// ── Budget table ─────────────────────────────────────────────────────────────

function BudgetTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-ui-border">
            <th className="text-left py-2 px-3 text-ink-muted font-medium">Operation</th>
            <th className="text-right py-2 px-3 text-green-400 font-medium">Target</th>
            <th className="text-right py-2 px-3 text-yellow-400 font-medium">Warning</th>
            <th className="text-right py-2 px-3 text-red-400 font-medium">Critical</th>
          </tr>
        </thead>
        <tbody>
          {BUDGETS.map(b => (
            <tr key={b.category} className="border-b border-ui-border/40">
              <td className="py-1.5 px-3 text-ink-base">{b.label}</td>
              <td className="py-1.5 px-3 text-right font-mono text-green-400">{b.targetMs}ms</td>
              <td className="py-1.5 px-3 text-right font-mono text-yellow-400">{b.warningMs}ms</td>
              <td className="py-1.5 px-3 text-right font-mono text-red-400">{b.criticalMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type View = "stats" | "budgets" | "benchmarks";

export function PerformanceDashboard() {
  const [stats,    setStats]    = useState<PerfStats[]>([]);
  const [log,      setLog]      = useState<PerfEntry[]>([]);
  const [benchReport, setBenchReport] = useState<ScalabilityReport | null>(null);
  const [running,  setRunning]  = useState(false);
  const [view,     setView]     = useState<View>("stats");

  function refresh() {
    setStats(computePerfStats());
    setLog(getPerfLog().slice().reverse().slice(0, 50));
  }

  useEffect(() => { refresh(); }, []);

  function handleBenchmark() {
    setRunning(true);
    setTimeout(() => {
      setBenchReport(runScalabilityBenchmarks());
      setRunning(false);
    }, 10);
  }

  const violations = stats.reduce((s, st) => s + st.violations, 0);

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-ui-surface rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-ink-base">{log.length}</p>
          <p className="text-xs text-ink-muted">Recorded Ops</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-2 text-center">
          <p className={`text-lg font-semibold ${violations > 0 ? "text-red-400" : "text-green-400"}`}>
            {violations}
          </p>
          <p className="text-xs text-ink-muted">Violations</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-ink-base">{stats.length}</p>
          <p className="text-xs text-ink-muted">Categories</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={refresh}
          className="px-3 py-1.5 bg-ui-surface text-ink-base text-xs font-medium rounded-lg hover:bg-ui-border"
        >Refresh</button>
        <button
          onClick={handleBenchmark}
          disabled={running}
          className="px-3 py-1.5 bg-brand text-canvas text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {running ? "Running…" : "Run Scalability Benchmarks"}
        </button>
        {log.length > 0 && (
          <button
            onClick={() => { clearPerfLog(); refresh(); }}
            className="px-3 py-1.5 bg-ui-surface text-ink-muted text-xs font-medium rounded-lg hover:text-red-400"
          >
            Clear Log
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ui-border">
        {([
          { id: "stats"      as const, label: `Stats (${stats.length})` },
          { id: "budgets"    as const, label: `Budgets (${BUDGETS.length})` },
          { id: "benchmarks" as const, label: `Benchmarks (${benchReport?.results.length ?? 0})` },
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

      {view === "stats" && (
        stats.length === 0 ? (
          <p className="text-xs text-ink-muted text-center py-4">No performance data yet. Operations are recorded as features run.</p>
        ) : (
          <div className="bg-ui-surface rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui-border">
                  {["Operation","Count","Mean","p90","Max","Violations"].map(h => (
                    <th key={h} className={`py-2 px-3 text-xs text-ink-muted font-medium ${h !== "Operation" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map(s => <StatRow key={s.category} stat={s} />)}
              </tbody>
            </table>
          </div>
        )
      )}

      {view === "budgets" && (
        <div className="bg-ui-surface rounded-lg overflow-hidden">
          <BudgetTable />
        </div>
      )}

      {view === "benchmarks" && (
        <div className="bg-ui-surface rounded-lg p-3 space-y-2">
          {!benchReport ? (
            <p className="text-xs text-ink-muted text-center py-2">Click "Run Scalability Benchmarks" to test performance at scale.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${benchReport.overallPass ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  {benchReport.overallPass ? "All Pass" : "Violations Detected"}
                </span>
                <span className="text-xs text-ink-muted">{benchReport.summary}</span>
              </div>
              {benchReport.results.map((r, i) => <BenchRow key={i} r={r} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
