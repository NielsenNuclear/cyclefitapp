"use client";
// ─── components/dev/SafetyDashboard.tsx ──────────────────────────────────────
// Phase 68 — developer view of safety rule activations and audit log.

import { useEffect, useState } from "react";
import { loadSafetyAudit, type SafetyAuditEntry } from "@/lib/intelligence/safety/SafetyEvaluator";
import { getAllRules } from "@/lib/intelligence/safety/SafetyRegistry";
import type { SafetyRule, RulePriority, SafetyRuleResult } from "@/lib/intelligence/safety/SafetyRule";

const PRIORITY_COLOR: Record<RulePriority, string> = {
  critical:      "text-red-400",
  high:          "text-orange-400",
  moderate:      "text-yellow-400",
  informational: "text-ink-muted",
};

function RuleCard({ rule }: { rule: SafetyRule }) {
  return (
    <div className="bg-ui-surface rounded-lg p-3 flex items-start justify-between gap-2">
      <div>
        <p className="text-sm text-ink-base font-medium">{rule.name}</p>
        <p className="text-xs text-ink-muted font-mono">{rule.id}</p>
      </div>
      <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[rule.priority]}`}>
        {rule.priority}
      </span>
    </div>
  );
}

function AuditRow({ entry }: { entry: SafetyAuditEntry }) {
  const [open, setOpen] = useState(false);
  const nonPass = entry.results.filter(r => r.outcome !== "pass");
  const delta   = entry.outputVolume - entry.inputVolume;

  return (
    <div className="border-b border-ui-border/50 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left py-2.5 px-3 flex items-center gap-3">
        <span className={`text-xs font-medium w-14 flex-shrink-0 ${entry.activations > 0 ? "text-red-400" : "text-green-400"}`}>
          {entry.activations > 0 ? `${entry.activations} rule${entry.activations > 1 ? "s" : ""}` : "Pass"}
        </span>
        <span className="text-xs text-ink-muted font-mono flex-1">
          {entry.inputVolume.toFixed(3)} → {entry.outputVolume.toFixed(3)}
          {delta !== 0 && (
            <span className={delta < 0 ? " text-red-400" : " text-green-400"}>
              {" "}({delta > 0 ? "+" : ""}{delta.toFixed(3)})
            </span>
          )}
        </span>
        <span className="text-xs text-ink-muted flex-shrink-0">
          {new Date(entry.timestamp).toLocaleDateString()}
        </span>
        <span className="text-ink-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && nonPass.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {nonPass.map(r => (
            <div key={r.ruleId} className="flex items-start gap-2 text-xs">
              <span className={PRIORITY_COLOR[r.priority]}>
                [{r.priority}]
              </span>
              <div>
                <span className="text-ink-base font-medium">{r.ruleName}</span>
                <span className="text-ink-muted ml-2">{r.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SafetyDashboard() {
  const [entries, setEntries] = useState<SafetyAuditEntry[]>([]);
  const [rules]               = useState<SafetyRule[]>(getAllRules());
  const [view, setView]       = useState<"rules" | "audit">("audit");

  useEffect(() => {
    setEntries(loadSafetyAudit().slice().reverse());
  }, []);

  // Aggregate stats
  const total      = entries.length;
  const activated  = entries.filter(e => e.activations > 0).length;
  const passRate   = total > 0 ? ((total - activated) / total * 100).toFixed(0) : "—";

  // Rule activation frequency
  const ruleCounts: Record<string, number> = {};
  for (const entry of entries) {
    for (const r of entry.results) {
      if (r.outcome !== "pass") {
        ruleCounts[r.ruleName] = (ruleCounts[r.ruleName] ?? 0) + 1;
      }
    }
  }
  const topRules = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Evaluations",    value: total        },
          { label: "Activations",    value: activated    },
          { label: "Pass Rate",      value: `${passRate}%` },
        ].map(c => (
          <div key={c.label} className="bg-ui-surface rounded-lg p-2 text-center">
            <p className="text-lg font-semibold text-ink-base">{c.value}</p>
            <p className="text-xs text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Top interventions */}
      {topRules.length > 0 && (
        <div className="bg-ui-surface rounded-lg p-3">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Most Active Rules</p>
          {topRules.map(([name, count]) => (
            <div key={name} className="flex justify-between text-xs py-0.5">
              <span className="text-ink-muted">{name}</span>
              <span className="text-ink-base font-medium">{count}×</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-ui-border">
        {(["audit","rules"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${view === v ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-base"}`}
          >
            {v === "audit" ? `Audit Log (${total})` : `Rules (${rules.length})`}
          </button>
        ))}
      </div>

      {view === "audit" && (
        <div className="bg-ui-surface rounded-lg overflow-hidden">
          {entries.length === 0 ? (
            <p className="text-sm text-ink-muted p-4 text-center">No safety evaluations recorded yet.</p>
          ) : (
            entries.slice(0, 30).map(e => <AuditRow key={e.id} entry={e} />)
          )}
        </div>
      )}

      {view === "rules" && (
        <div className="space-y-2">
          {rules.map(r => <RuleCard key={r.id} rule={r} />)}
        </div>
      )}
    </div>
  );
}
