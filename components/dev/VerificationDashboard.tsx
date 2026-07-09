"use client";
// ─── components/dev/VerificationDashboard.tsx ─────────────────────────────────
// Phase 64 — Verification Dashboard (developer-facing)
// Shows active, pending, and completed verification records.

import { useEffect, useState } from "react";
import {
  loadVerificationRegistry,
  getCompletedVerifications,
  getPendingVerifications,
  getActiveVerifications,
} from "@/lib/intelligence/verification/verificationRegistry";
import { computeVerificationSummary, computeClassAccuracy } from "@/lib/intelligence/verification/calculateRecommendationAccuracy";
import type { VerificationRecord, VerificationScore } from "@/lib/intelligence/verification/verificationTypes";

const SCORE_COLOR: Record<VerificationScore, string> = {
  successful:           "text-green-400",
  partially_successful: "text-brand",
  neutral:              "text-ink-muted",
  unsuccessful:         "text-red-400",
  insufficient_data:    "text-yellow-400",
};

const SCORE_LABEL: Record<VerificationScore, string> = {
  successful:           "Successful",
  partially_successful: "Partial",
  neutral:              "Neutral",
  unsuccessful:         "Unsuccessful",
  insufficient_data:    "No Data",
};

function RecordRow({ record }: { record: VerificationRecord }) {
  const score = record.verificationScore;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-ui-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-base truncate">{record.recommendationSummary}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {record.recommendationClass} · {record.timestamp} · conf {(record.confidenceAtGeneration * 100).toFixed(0)}%
        </p>
        {record.scoreRationale && (
          <p className="text-xs text-ink-muted mt-0.5 italic">{record.scoreRationale}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {score ? (
          <span className={`text-xs font-medium ${SCORE_COLOR[score]}`}>
            {SCORE_LABEL[score]}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">Pending</span>
        )}
        <p className="text-xs text-ink-muted">due {record.evaluationDueDate}</p>
      </div>
    </div>
  );
}

export function VerificationDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [records, setRecords]   = useState<VerificationRecord[]>([]);
  const [tab, setTab]           = useState<"active" | "pending" | "completed">("pending");

  useEffect(() => {
    setRecords(loadVerificationRegistry());
  }, []);

  const summary   = computeVerificationSummary(records, today);
  const classAcc  = computeClassAccuracy(records);

  const active    = getActiveVerifications(today);
  const pending   = getPendingVerifications(today);
  const completed = getCompletedVerifications();

  const displayed = tab === "active" ? active : tab === "pending" ? pending : completed;

  const TABS = [
    { id: "active"    as const, label: "Active",    count: active.length    },
    { id: "pending"   as const, label: "Pending",   count: pending.length   },
    { id: "completed" as const, label: "Completed", count: completed.length },
  ];

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",     value: summary.totalRecords         },
          { label: "Pending",   value: summary.pendingEvaluations   },
          { label: "Completed", value: summary.completedEvaluations },
          { label: "Success %", value: `${(summary.overallSuccessRate * 100).toFixed(0)}%` },
        ].map(cell => (
          <div key={cell.label} className="bg-ui-surface rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-ink-base">{cell.value}</p>
            <p className="text-xs text-ink-muted">{cell.label}</p>
          </div>
        ))}
      </div>

      {/* Score distribution */}
      {summary.completedEvaluations > 0 && (
        <div className="bg-ui-surface rounded-lg p-3">
          <p className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-wide">Outcome Distribution</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(summary.scoreDistribution) as [VerificationScore, number][])
              .filter(([, n]) => n > 0)
              .map(([score, n]) => (
                <span key={score} className={`text-xs px-2 py-0.5 rounded-full bg-canvas ${SCORE_COLOR[score]}`}>
                  {SCORE_LABEL[score]} {n}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Class accuracy */}
      {classAcc.length > 0 && (
        <div className="bg-ui-surface rounded-lg p-3">
          <p className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-wide">By Recommendation Class</p>
          {classAcc.map(ca => (
            <div key={ca.recommendationClass} className="flex justify-between items-center py-1 text-xs">
              <span className="text-ink-muted">{ca.recommendationClass}</span>
              <span className="text-ink-base font-medium">{(ca.successRate * 100).toFixed(0)}% success ({ca.total} evals)</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-ui-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${tab === t.id ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-base"}`}
          >
            {t.label} {t.count > 0 && <span className="ml-1 opacity-60">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Record list */}
      <div>
        {displayed.length === 0 ? (
          <p className="text-sm text-ink-muted py-4 text-center">No {tab} records.</p>
        ) : (
          displayed.slice(0, 20).map(r => <RecordRow key={r.id} record={r} />)
        )}
        {displayed.length > 20 && (
          <p className="text-xs text-ink-muted text-center py-2">+{displayed.length - 20} more</p>
        )}
      </div>

      {records.length === 0 && (
        <div className="bg-ui-surface rounded-lg p-4 text-center">
          <p className="text-sm text-ink-muted">No verification records yet.</p>
          <p className="text-xs text-ink-muted mt-1">Records appear as recommendations are generated.</p>
        </div>
      )}
    </div>
  );
}
