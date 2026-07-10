"use client";
// ─── components/dev/DataHealthDashboard.tsx ───────────────────────────────────
// Phase 70 — data health, validation results, cross-object issues, migration.

import { useEffect, useState } from "react";
import { runDataHealthCheck, autoRepairData, type DataHealthReport, type KeyDataHealth } from "@/lib/data/integrity/DataIntegrityService";

// ── Key row ───────────────────────────────────────────────────────────────────

function KeyRow({ k }: { k: KeyDataHealth }) {
  const [open, setOpen] = useState(false);
  const pct  = k.totalItems > 0 ? Math.round((k.validItems / k.totalItems) * 100) : 100;
  const ok   = k.issues.filter(i => i.severity === "error").length === 0;

  return (
    <div className="border-b border-ui-border/50 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left py-2 px-3 flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-green-400" : "bg-red-400"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-base font-medium">{k.schemaName}</p>
          <p className="text-xs text-ink-muted font-mono truncate">{k.key}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xs font-mono font-medium ${pct === 100 ? "text-green-400" : pct >= 90 ? "text-yellow-400" : "text-red-400"}`}>
            {pct}%
          </p>
          <p className="text-xs text-ink-muted">{k.validItems}/{k.totalItems}</p>
        </div>
        {k.migrationStatus && k.migrationStatus.legacyItems > 0 && (
          <span className="text-xs text-yellow-400 flex-shrink-0">{k.migrationStatus.legacyItems} legacy</span>
        )}
        <span className="text-ink-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {k.issues.length === 0 ? (
            <p className="text-xs text-green-400">All items valid.</p>
          ) : (
            k.issues.slice(0, 10).map((issue, i) => (
              <p key={i} className={`text-xs ${issue.severity === "error" ? "text-red-400" : "text-yellow-400"}`}>
                [{issue.severity}] {issue.field}: {issue.message}
              </p>
            ))
          )}
          {k.issues.length > 10 && (
            <p className="text-xs text-ink-muted">+{k.issues.length - 10} more issues</p>
          )}
          <p className="text-xs text-ink-muted">{(k.byteSize / 1024).toFixed(1)} KB</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DataHealthDashboard() {
  const [report,   setReport]   = useState<DataHealthReport | null>(null);
  const [repaired, setRepaired] = useState<string[]>([]);
  const [view,     setView]     = useState<"keys" | "cross" | "migration">("keys");

  function refresh() {
    setReport(runDataHealthCheck());
    setRepaired([]);
  }

  useEffect(() => { refresh(); }, []);

  function handleRepair() {
    if (!report) return;
    const { repairedKeys } = autoRepairData(report);
    setRepaired(repairedKeys);
    refresh();
  }

  if (!report) return <p className="text-sm text-ink-muted">Checking…</p>;

  const healthColor =
    report.healthPercent >= 95 ? "text-green-400" :
    report.healthPercent >= 80 ? "text-yellow-400" :
    "text-red-400";

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Health",   value: `${report.healthPercent}%`, color: healthColor },
          { label: "Total",    value: report.totalObjects,    color: "text-ink-base"  },
          { label: "Invalid",  value: report.invalidObjects,  color: report.invalidObjects  > 0 ? "text-red-400"    : "text-ink-base" },
          { label: "Legacy",   value: report.legacyObjects,   color: report.legacyObjects   > 0 ? "text-yellow-400" : "text-ink-base" },
        ].map(c => (
          <div key={c.label} className="bg-ui-surface rounded-lg p-2 text-center">
            <p className={`text-lg font-semibold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={refresh}
          className="px-3 py-1.5 bg-ui-surface text-ink-base text-xs font-medium rounded-lg hover:bg-ui-border"
        >
          Refresh
        </button>
        {report.invalidObjects > 0 && (
          <button onClick={handleRepair}
            className="px-3 py-1.5 bg-yellow-900/30 text-yellow-400 text-xs font-medium rounded-lg hover:opacity-80"
          >
            Auto-Repair
          </button>
        )}
      </div>
      {repaired.length > 0 && (
        <div className="text-xs text-green-400 space-y-0.5">
          {repaired.map((r, i) => <p key={i}>✓ {r}</p>)}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-ui-border">
        {([
          { id: "keys"      as const, label: `Schemas (${report.keys.length})`              },
          { id: "cross"     as const, label: `Cross Issues (${report.crossIssues.length})`  },
          { id: "migration" as const, label: `Migration (${report.legacyObjects} legacy)`   },
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

      {view === "keys" && (
        <div className="bg-ui-surface rounded-lg overflow-hidden">
          {report.keys.map(k => <KeyRow key={k.key} k={k} />)}
        </div>
      )}

      {view === "cross" && (
        <div className="bg-ui-surface rounded-lg p-3 space-y-1.5">
          {report.crossIssues.length === 0 ? (
            <p className="text-xs text-green-400">No cross-object issues detected.</p>
          ) : (
            report.crossIssues.map((issue, i) => (
              <div key={i} className="text-xs">
                <span className="text-yellow-400 capitalize">[{issue.type.replace(/_/g," ")}]</span>
                <span className="text-ink-muted ml-2">{issue.message}</span>
              </div>
            ))
          )}
        </div>
      )}

      {view === "migration" && (
        <div className="bg-ui-surface rounded-lg p-3 space-y-2">
          {report.keys.filter(k => k.migrationStatus !== null).map(k => (
            <div key={k.key} className="flex justify-between text-xs">
              <span className="text-ink-muted">{k.schemaName}</span>
              <span className={k.migrationStatus!.legacyItems > 0 ? "text-yellow-400" : "text-green-400"}>
                {k.migrationStatus!.legacyItems > 0
                  ? `${k.migrationStatus!.legacyItems} legacy → v${k.migrationStatus!.targetVersion}`
                  : `Current (v${k.migrationStatus!.targetVersion})`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
