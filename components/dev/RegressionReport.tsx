"use client";
// ─── components/dev/RegressionReport.tsx ──────────────────────────────────────
// Phase 66 — Regression Report (developer-facing)
// Run the scenario suite, compare with baselines, show drift/regressions.

import { useState } from "react";
import { runRegressionSuite, promoteToBaseline, type RegressionReport as Report, type ScenarioResult } from "@/lib/testing/regressionRunner";
import { SCENARIO_LIBRARY } from "@/lib/testing/scenarios";

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { dot: string; label: string; bg: string }> = {
  pass:       { dot: "bg-green-400",  label: "Pass",       bg: "border-l-2 border-green-400/50" },
  drift:      { dot: "bg-yellow-400", label: "Drift",      bg: "border-l-2 border-yellow-400/50" },
  regression: { dot: "bg-red-400",    label: "Regression", bg: "border-l-2 border-red-500" },
  new:        { dot: "bg-brand",      label: "New",        bg: "border-l-2 border-brand/50" },
  error:      { dot: "bg-red-600",    label: "Error",      bg: "border-l-2 border-red-600" },
};

function ScenarioRow({ result }: { result: ScenarioResult }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLE[result.status] ?? STATUS_STYLE.pass;

  return (
    <div className={`bg-ui-surface rounded-lg overflow-hidden ${s.bg}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-3 flex items-center gap-3"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-base font-medium truncate">{result.scenarioLabel}</p>
          <p className="text-xs text-ink-muted">{result.scenarioId}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-xs font-medium ${result.status === "regression" ? "text-red-400" : result.status === "drift" ? "text-yellow-400" : result.status === "new" ? "text-brand" : "text-green-400"}`}>
            {s.label}
          </span>
          {result.diff && result.diff.hasChanged && (
            <p className="text-xs text-ink-muted">{result.diff.summary}</p>
          )}
        </div>
        <span className="text-ink-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-ui-border">
          {/* Current output */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: "Volume",     value: result.current.output.volumeScale.toFixed(3)         },
              { label: "Confidence", value: `${(result.current.output.confidenceScore * 100).toFixed(0)}%` },
              { label: "Badge",      value: result.current.output.readinessBadge                  },
            ].map(c => (
              <div key={c.label} className="bg-canvas rounded p-2 text-center">
                <p className="text-sm font-semibold text-ink-base font-mono">{c.value}</p>
                <p className="text-xs text-ink-muted">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Diff */}
          {result.diff && result.diff.hasChanged && (
            <div className="text-xs space-y-0.5">
              {result.diff.volumeScaleDelta !== 0 && (
                <p className="text-ink-muted">
                  Volume drift: <span className={result.diff.volumeScaleDelta > 0 ? "text-green-400" : "text-red-400"}>
                    {result.diff.volumeScaleDelta > 0 ? "+" : ""}{result.diff.volumeScaleDelta.toFixed(4)}
                  </span>
                </p>
              )}
              {result.diff.badgeChanged && <p className="text-yellow-400">Badge changed</p>}
              {result.diff.classChanged && <p className="text-yellow-400">Class changed</p>}
              {result.diff.newFailingProperties.map(p => (
                <p key={p} className="text-red-400">⚠ New failure: {p}</p>
              ))}
            </div>
          )}

          {/* Property results */}
          {result.current.propertyResults.filter(r => r.status !== "pass").length > 0 && (
            <div className="text-xs space-y-0.5">
              {result.current.propertyResults.filter(r => r.status !== "pass").map(pr => (
                <p key={pr.property} className={pr.status === "fail" ? "text-red-400" : "text-yellow-400"}>
                  {pr.status === "fail" ? "✗" : "!"} {pr.property}: {pr.message}
                </p>
              ))}
            </div>
          )}

          {/* Failure details */}
          {result.propertyFailures.length > 0 && (
            <div className="text-xs text-red-400">
              {result.propertyFailures.map(f => <p key={f}>✗ {f}</p>)}
            </div>
          )}

          <p className="text-xs text-ink-muted">Ran in {result.durationMs}ms</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RegressionReport() {
  const [report, setReport]     = useState<Report | null>(null);
  const [running, setRunning]   = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [filter, setFilter]     = useState<"all" | "pass" | "drift" | "regression" | "new">("all");

  function handleRun() {
    setRunning(true);
    setTimeout(() => {
      setReport(runRegressionSuite());
      setRunning(false);
    }, 10);
  }

  function handlePromote() {
    promoteToBaseline();
    setPromoted(true);
    setTimeout(() => setPromoted(false), 3000);
  }

  const displayed = report
    ? (filter === "all" ? report.results : report.results.filter(r => r.status === filter))
    : [];

  const STATUS_BADGE_COLOR = {
    green:  "bg-green-900/30 text-green-400",
    yellow: "bg-yellow-900/30 text-yellow-400",
    red:    "bg-red-900/30 text-red-400",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 bg-brand text-canvas text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {running ? "Running…" : "Run Regression Suite"}
        </button>
        {report && (
          <button
            onClick={handlePromote}
            className="px-4 py-2 bg-ui-surface text-ink-base text-sm font-medium rounded-lg hover:bg-ui-border"
          >
            {promoted ? "✓ Promoted!" : `Accept as Baseline (${SCENARIO_LIBRARY.length} scenarios)`}
          </button>
        )}
      </div>

      {/* Report header */}
      {report && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLOR[report.overallStatus]}`}>
              {report.overallStatus.toUpperCase()}
            </span>
            <span className="text-sm text-ink-muted">{report.summary}</span>
            <span className="text-xs text-ink-muted ml-auto">{new Date(report.runAt).toLocaleTimeString()}</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Total",       value: report.totalScenarios,  color: "text-ink-base"    },
              { label: "Pass",        value: report.passed,          color: "text-green-400"   },
              { label: "Drift",       value: report.drifted,         color: "text-yellow-400"  },
              { label: "Regression",  value: report.regressed,       color: "text-red-400"     },
              { label: "New",         value: report.newScenarios,    color: "text-brand"       },
            ].map(c => (
              <button
                key={c.label}
                onClick={() => setFilter(c.label.toLowerCase() as typeof filter)}
                className={`bg-ui-surface rounded-lg p-2 text-center transition-colors hover:bg-ui-border ${filter === c.label.toLowerCase() ? "ring-1 ring-brand" : ""}`}
              >
                <p className={`text-lg font-semibold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-ink-muted">{c.label}</p>
              </button>
            ))}
          </div>

          {report.maxVolumeDrift > 0 && (
            <p className="text-xs text-ink-muted">
              Max volume drift: <span className="font-mono text-yellow-400">{report.maxVolumeDrift.toFixed(4)}</span> · Algorithm: {report.algorithmVersion}
            </p>
          )}
        </div>
      )}

      {/* Scenario list */}
      {!report && !running && (
        <div className="bg-ui-surface rounded-lg p-6 text-center">
          <p className="text-sm text-ink-base font-medium">{SCENARIO_LIBRARY.length} scenarios ready</p>
          <p className="text-xs text-ink-muted mt-1">Click "Run Regression Suite" to compare against stored baselines.</p>
        </div>
      )}

      {report && (
        <div className="space-y-2">
          {displayed.map(r => <ScenarioRow key={r.scenarioId} result={r} />)}
        </div>
      )}
    </div>
  );
}
