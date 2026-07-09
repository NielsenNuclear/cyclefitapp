"use client";
// ─── app/dev/page.tsx ──────────────────────────────────────────────────────────
// Developer Tools — Black Box Flight Recorder (Phases 64, 65, 66)
// Route: /dev

import { useState } from "react";
import { VerificationDashboard } from "@/components/dev/VerificationDashboard";
import { TraceExplorer }         from "@/components/dev/TraceExplorer";
import { RegressionReport }      from "@/components/dev/RegressionReport";

type Tab = "verification" | "trace" | "regression";

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: "verification", label: "Verification",  subtitle: "Phase 64 — Recommendation outcomes" },
  { id: "trace",        label: "Trace Explorer", subtitle: "Phase 65 — Decision audit log"      },
  { id: "regression",   label: "Regression",     subtitle: "Phase 66 — Scenario stability"      },
];

export default function DevPage() {
  const [tab, setTab] = useState<Tab>("regression");

  return (
    <div className="min-h-screen bg-canvas text-ink-base">
      {/* Header */}
      <div className="border-b border-ui-border px-4 py-4">
        <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-0.5">
          Developer Tools
        </p>
        <h1 className="text-xl font-bold text-ink-base">Black Box Flight Recorder</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Axis engine observability · algorithm-version axis-v1.0
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-ui-border px-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 mr-4 text-sm font-medium transition-colors ${
              tab === t.id
                ? "text-brand border-b-2 border-brand"
                : "text-ink-muted hover:text-ink-base"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab subtitle */}
      <div className="px-4 py-2 border-b border-ui-border/50">
        <p className="text-xs text-ink-muted">
          {TABS.find(t => t.id === tab)?.subtitle}
        </p>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {tab === "verification" && <VerificationDashboard />}
        {tab === "trace"        && <TraceExplorer />}
        {tab === "regression"   && <RegressionReport />}
      </div>
    </div>
  );
}
