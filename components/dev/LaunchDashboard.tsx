"use client";
// ─── components/dev/LaunchDashboard.tsx ──────────────────────────────────────
// Phase 76 — beta readiness and launch gate dashboard.

import { useMemo } from "react";
import { computeBetaReadiness }  from "@/lib/launch/BetaReadiness";
import { LAUNCH_GATES, computeLaunchReadiness, type LaunchGateStatus } from "@/lib/launch/LaunchChecklist";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<LaunchGateStatus, string> = {
  green:   "bg-green-500",
  yellow:  "bg-yellow-400",
  red:     "bg-red-500",
  unknown: "bg-ui-muted",
};

const STATUS_LABEL: Record<LaunchGateStatus, string> = {
  green:   "Ready",
  yellow:  "Partial",
  red:     "Blocked",
  unknown: "Unknown",
};

const OVERALL_LABEL: Record<string, string> = {
  launch_ready: "Launch Ready",
  nearly_ready: "Nearly Ready",
  in_progress:  "In Progress",
  blocked:      "Blocked",
};

const OVERALL_COLOR: Record<string, string> = {
  launch_ready: "text-green-400",
  nearly_ready: "text-yellow-400",
  in_progress:  "text-sky-400",
  blocked:      "text-red-400",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center">
      <p className={`text-5xl font-bold ${color}`}>{score}</p>
      <p className="text-xs text-ink-muted mt-1">Beta Readiness Score</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LaunchDashboard() {
  const readiness = useMemo(() => computeBetaReadiness(), []);
  const launch    = useMemo(() => computeLaunchReadiness(), []);

  // Group gates by category
  const categories = useMemo(() => {
    const map = new Map<string, typeof LAUNCH_GATES>();
    for (const g of LAUNCH_GATES) {
      const list = map.get(g.category) ?? [];
      list.push(g);
      map.set(g.category, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className="space-y-5">

      {/* Hero */}
      <div className="bg-ui-surface rounded-2xl p-6 flex flex-col items-center gap-3">
        <ScoreArc score={readiness.compositeScore} />
        <p className={`text-lg font-semibold ${OVERALL_COLOR[readiness.overallStatus]}`}>
          {OVERALL_LABEL[readiness.overallStatus]}
        </p>
        <p className="text-xs text-ink-muted text-center">
          {launch.criticalBlocks.length} critical gate{launch.criticalBlocks.length !== 1 ? "s" : ""} remaining
          {" · "}{readiness.blockers.length} total blocker{readiness.blockers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* System scores */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">System Scores</p>
        {readiness.systems.map(sys => (
          <div key={sys.name} className="bg-ui-surface rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{sys.name}</p>
              <p className={`text-sm font-bold ${sys.score >= 80 ? "text-green-400" : sys.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                {sys.score}%
              </p>
            </div>
            <div className="h-1.5 bg-ui-muted rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-all ${sys.score >= 80 ? "bg-green-500" : sys.score >= 60 ? "bg-yellow-400" : "bg-red-500"}`}
                style={{ width: `${sys.score}%` }}
              />
            </div>
            {sys.notes && <p className="text-xs text-ink-muted">{sys.notes}</p>}
          </div>
        ))}
      </div>

      {/* Blockers */}
      {readiness.blockers.length > 0 && (
        <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-400 mb-2">
            {readiness.blockers.length} Blocker{readiness.blockers.length !== 1 ? "s" : ""} to Resolve
          </p>
          <ul className="space-y-1">
            {readiness.blockers.map((b, i) => (
              <li key={i} className="text-xs text-ink-subtle">• {b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Launch gates by category */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Launch Gates</p>
        {categories.map(([category, gates]) => (
          <div key={category} className="bg-ui-surface rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-ui-border">
              <p className="text-xs font-semibold text-ink-muted">{category}</p>
            </div>
            <div className="px-3 py-2 space-y-2">
              {gates.map(gate => (
                <div key={gate.id} className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${STATUS_DOT[gate.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-ink-base">{gate.name}</p>
                      {gate.critical && (
                        <span className="text-xs text-red-400">required</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted">{STATUS_LABEL[gate.status]}{gate.notes ? ` — ${gate.notes}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Generated at */}
      <p className="text-xs text-ink-muted text-center">
        Generated {new Date(readiness.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
