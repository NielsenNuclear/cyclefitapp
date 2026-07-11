"use client";
// ─── components/dev/QADashboard.tsx ──────────────────────────────────────────
// Phase 73 — QA & release readiness developer view.

import { useMemo, useState } from "react";
import { FEATURE_AUDIT_ITEMS, computeAuditReport } from "@/lib/qa/FeatureAudit";
import {
  loadChecklist,
  updateItem,
  getChecklistStats,
  groupBySection,
  type ChecklistStatus,
  type ChecklistItem,
} from "@/lib/qa/ReleaseChecklist";
import type { AuditItem, AuditSeverity, AuditStatus } from "@/lib/qa/AuditTypes";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<AuditSeverity, string> = {
  blocker:  "text-red-400",
  critical: "text-orange-400",
  major:    "text-yellow-400",
  minor:    "text-sky-400",
  info:     "text-ink-muted",
};

const STATUS_LABEL: Record<AuditStatus, string> = {
  pass:           "Pass",
  partial:        "Partial",
  fail:           "Fail",
  not_tested:     "Not Tested",
  not_applicable: "N/A",
};

const STATUS_COLOR: Record<AuditStatus, string> = {
  pass:           "text-green-400",
  partial:        "text-yellow-400",
  fail:           "text-red-400",
  not_tested:     "text-ink-muted",
  not_applicable: "text-ink-muted",
};

const CHECKLIST_STATUS_COLORS: Record<ChecklistStatus, string> = {
  complete: "bg-green-500",
  skipped:  "bg-sky-500",
  pending:  "bg-ui-muted",
  blocked:  "bg-red-500",
};

// ── Feature Audit pane ────────────────────────────────────────────────────────

function FeatureAuditPane() {
  const report      = useMemo(() => computeAuditReport(), []);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group by area
  const areas = useMemo(() => {
    const map = new Map<string, AuditItem[]>();
    for (const item of FEATURE_AUDIT_ITEMS) {
      const list = map.get(item.area) ?? [];
      list.push(item);
      map.set(item.area, list);
    }
    return [...map.entries()];
  }, []);

  const score = report.readinessScore;
  const scoreColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Readiness Score</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>{score}<span className="text-sm text-ink-muted">%</span></p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Release Ready?</p>
          <p className={`text-lg font-semibold mt-1 ${report.releaseReady ? "text-green-400" : "text-red-400"}`}>
            {report.releaseReady ? "Yes" : "Not yet"}
          </p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Pass / Partial / Fail</p>
          <p className="text-sm font-medium mt-1">
            <span className="text-green-400">{report.passed}</span>
            <span className="text-ink-muted"> / </span>
            <span className="text-yellow-400">{report.partial}</span>
            <span className="text-ink-muted"> / </span>
            <span className="text-red-400">{report.failed}</span>
          </p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Not Yet Tested</p>
          <p className="text-2xl font-bold text-ink-muted">{report.notTested}</p>
        </div>
      </div>

      {/* Blockers alert */}
      {report.blockers.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3">
          <p className="text-xs font-semibold text-red-400 mb-2">
            {report.blockers.length} BLOCKER{report.blockers.length !== 1 ? "S" : ""} — must resolve before launch
          </p>
          {report.blockers.map(b => (
            <p key={b.id} className="text-xs text-ink-subtle mb-1">
              <span className="text-red-400 font-medium">[{b.id}]</span> {b.check}
            </p>
          ))}
        </div>
      )}

      {/* Items by area */}
      <div className="space-y-3">
        {areas.map(([area, items]) => (
          <div key={area} className="bg-ui-surface rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === area ? null : area)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="text-sm font-medium">{area}</span>
              <span className="text-xs text-ink-muted">{items.filter(i => i.status === "pass").length}/{items.length} pass</span>
            </button>
            {expanded === area && (
              <div className="px-3 pb-3 space-y-2 border-t border-ui-border">
                {items.map(item => (
                  <div key={item.id} className="pt-2">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-mono mt-0.5 ${SEVERITY_COLOR[item.severity]}`}>
                        [{item.severity.slice(0,3).toUpperCase()}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ink-base">{item.check}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium ${STATUS_COLOR[item.status]}`}>
                            {STATUS_LABEL[item.status]}
                          </span>
                          {item.manual && (
                            <span className="text-xs text-ink-muted bg-ui-muted rounded px-1">manual</span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-ink-muted mt-0.5">{item.notes}</p>
                        )}
                        {item.actionItem && item.status !== "pass" && (
                          <p className="text-xs text-yellow-300/70 mt-0.5">→ {item.actionItem}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Release Checklist pane ────────────────────────────────────────────────────

function ReleaseChecklistPane() {
  const [items, setItems] = useState(() => loadChecklist());
  const stats    = useMemo(() => getChecklistStats(items), [items]);
  const sections = useMemo(() => groupBySection(items), [items]);

  function cycle(item: ChecklistItem) {
    const order: ChecklistStatus[] = ["pending", "complete", "skipped", "blocked"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    updateItem(item.id, next);
    setItems(loadChecklist());
  }

  const launchColor = stats.readyToLaunch ? "text-green-400" : "text-red-400";

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Required Complete</p>
          <p className="text-2xl font-bold text-ink-base">
            {stats.requiredComplete}
            <span className="text-sm text-ink-muted">/{stats.required}</span>
          </p>
        </div>
        <div className="bg-ui-surface rounded-xl p-3">
          <p className="text-xs text-ink-muted">Ready to Launch</p>
          <p className={`text-lg font-semibold mt-1 ${launchColor}`}>
            {stats.readyToLaunch ? "Yes" : "Not yet"}
          </p>
        </div>
      </div>

      {stats.blocked > 0 && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3">
          <p className="text-xs text-red-400 font-semibold">
            {stats.blocked} item{stats.blocked !== 1 ? "s" : ""} blocked
          </p>
        </div>
      )}

      <p className="text-xs text-ink-muted">Tap any item to cycle its status.</p>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.name}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              {section.name}
            </p>
            <div className="space-y-1">
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => cycle(item)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-ui-surface hover:bg-ui-hover transition-colors text-left"
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${CHECKLIST_STATUS_COLORS[item.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.status === "complete" || item.status === "skipped" ? "text-ink-muted line-through" : "text-ink-base"}`}>
                      {item.item}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ink-muted capitalize">{item.status.replace("_", " ")}</span>
                      {item.required && (
                        <span className="text-xs text-red-400">required</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type QAPane = "audit" | "checklist";

export function QADashboard() {
  const [pane, setPane] = useState<QAPane>("audit");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["audit", "checklist"] as QAPane[]).map(p => (
          <button
            key={p}
            onClick={() => setPane(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pane === p ? "bg-brand text-white" : "bg-ui-surface text-ink-muted hover:text-ink-base"
            }`}
          >
            {p === "audit" ? "Feature Audit" : "Release Checklist"}
          </button>
        ))}
      </div>

      {pane === "audit"     && <FeatureAuditPane />}
      {pane === "checklist" && <ReleaseChecklistPane />}
    </div>
  );
}
