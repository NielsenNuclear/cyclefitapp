"use client";
// ─── app/dev/page.tsx ──────────────────────────────────────────────────────────
// Developer Tools — Phases 64–69
// Route: /dev

import { useState } from "react";
import { VerificationDashboard } from "@/components/dev/VerificationDashboard";
import { TraceExplorer }         from "@/components/dev/TraceExplorer";
import { RegressionReport }      from "@/components/dev/RegressionReport";
import { ConfidenceInspector }   from "@/components/dev/ConfidenceInspector";
import { SafetyDashboard }       from "@/components/dev/SafetyDashboard";
import { ResilienceDashboard }   from "@/components/dev/ResilienceDashboard";

type Tab =
  | "verification"
  | "trace"
  | "regression"
  | "confidence"
  | "safety"
  | "resilience";

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: "verification", label: "Verification",  subtitle: "Phase 64 — Recommendation outcome tracking"    },
  { id: "trace",        label: "Traces",         subtitle: "Phase 65 — Decision audit log and replay"      },
  { id: "regression",   label: "Regression",     subtitle: "Phase 66 — Scenario stability and snapshots"   },
  { id: "confidence",   label: "Confidence",     subtitle: "Phase 67 — Trust profile and dimension audit"  },
  { id: "safety",       label: "Safety",         subtitle: "Phase 68 — Safety rule activations and audit"  },
  { id: "resilience",   label: "Resilience",     subtitle: "Phase 69 — Storage health and chaos testing"   },
];

export default function DevPage() {
  const [tab, setTab] = useState<Tab>("resilience");

  return (
    <div className="min-h-screen bg-canvas text-ink-base">
      {/* Header */}
      <div className="border-b border-ui-border px-4 py-4">
        <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-0.5">
          Developer Tools
        </p>
        <h1 className="text-xl font-bold text-ink-base">Axis Intelligence Workbench</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Observability · Trust · Safety · Resilience · algorithm-version axis-v1.0
        </p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="flex border-b border-ui-border px-4 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 mr-4 text-sm font-medium whitespace-nowrap transition-colors ${
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
        {tab === "confidence"   && <ConfidenceInspector />}
        {tab === "safety"       && <SafetyDashboard />}
        {tab === "resilience"   && <ResilienceDashboard />}
      </div>
    </div>
  );
}
