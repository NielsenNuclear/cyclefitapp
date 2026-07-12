"use client";
// ─── app/dev/page.tsx ──────────────────────────────────────────────────────────
// Developer Tools — Phases 64–76
// Route: /dev

import { useState } from "react";
import { VerificationDashboard } from "@/components/dev/VerificationDashboard";
import { TraceExplorer }         from "@/components/dev/TraceExplorer";
import { RegressionReport }      from "@/components/dev/RegressionReport";
import { ConfidenceInspector }   from "@/components/dev/ConfidenceInspector";
import { SafetyDashboard }       from "@/components/dev/SafetyDashboard";
import { ResilienceDashboard }   from "@/components/dev/ResilienceDashboard";
import { DataHealthDashboard }   from "@/components/dev/DataHealthDashboard";
import { PerformanceDashboard }  from "@/components/dev/PerformanceDashboard";
import { QADashboard }           from "@/components/dev/QADashboard";
import { DevToolsPanel }         from "@/components/dev/DevToolsPanel";
import { TelemetryDashboard }    from "@/components/dev/TelemetryDashboard";
import { LaunchDashboard }         from "@/components/dev/LaunchDashboard";
import { ObservabilityInspector }  from "@/components/dev/ObservabilityInspector";

type Tab =
  | "verification"
  | "trace"
  | "regression"
  | "confidence"
  | "safety"
  | "resilience"
  | "data"
  | "performance"
  | "qa"
  | "devtools"
  | "telemetry"
  | "observability"
  | "launch";

const TABS: { id: Tab; label: string; subtitle: string; era: string }[] = [
  // Trust & Verification era
  { id: "verification", label: "Verification",  era: "64", subtitle: "Recommendation outcome tracking"            },
  { id: "trace",        label: "Traces",         era: "65", subtitle: "Decision audit log and replay"              },
  { id: "regression",   label: "Regression",     era: "66", subtitle: "Scenario stability and snapshots"           },
  { id: "confidence",   label: "Confidence",     era: "67", subtitle: "Trust profile and dimension audit"          },
  { id: "safety",       label: "Safety",         era: "68", subtitle: "Safety rule activations and audit"          },
  { id: "resilience",   label: "Resilience",     era: "69", subtitle: "Storage health and chaos testing"           },
  { id: "data",         label: "Data Health",    era: "70", subtitle: "Schema validation, migration, cross-object" },
  { id: "performance",  label: "Performance",    era: "71", subtitle: "Timing stats, budgets, scalability"         },
  // Production Readiness era
  { id: "qa",           label: "QA",             era: "73", subtitle: "Feature audit and release checklist"        },
  { id: "devtools",     label: "Dev Tools",      era: "74", subtitle: "Feature flags, debug console, mock data"    },
  { id: "telemetry",      label: "Telemetry",      era: "75", subtitle: "Privacy-first product analytics"            },
  { id: "observability",  label: "Observability",  era: "E",  subtitle: "System governance traces and pipeline timeline" },
  { id: "launch",         label: "Launch",         era: "76", subtitle: "Beta readiness and launch gate tracking"    },
];

export default function DevPage() {
  const [tab, setTab] = useState<Tab>("launch");

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="min-h-screen bg-canvas text-ink-base">
      {/* Header */}
      <div className="border-b border-ui-border px-4 py-4">
        <p className="text-xs text-ink-muted uppercase tracking-widest font-medium mb-0.5">
          Developer Tools
        </p>
        <h1 className="text-xl font-bold text-ink-base">Axis Intelligence Workbench</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Phases 64–76 · Trust · Safety · QA · Launch · algorithm-version axis-v1.0
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
      <div className="px-4 py-2 border-b border-ui-border/50 flex items-center gap-2">
        <span className="text-xs bg-ui-surface text-ink-muted rounded px-1.5 py-0.5 font-mono">
          Phase {activeTab.era}
        </span>
        <p className="text-xs text-ink-muted">{activeTab.subtitle}</p>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {tab === "verification" && <VerificationDashboard />}
        {tab === "trace"        && <TraceExplorer />}
        {tab === "regression"   && <RegressionReport />}
        {tab === "confidence"   && <ConfidenceInspector />}
        {tab === "safety"       && <SafetyDashboard />}
        {tab === "resilience"   && <ResilienceDashboard />}
        {tab === "data"         && <DataHealthDashboard />}
        {tab === "performance"  && <PerformanceDashboard />}
        {tab === "qa"           && <QADashboard />}
        {tab === "devtools"     && <DevToolsPanel />}
        {tab === "telemetry"      && <TelemetryDashboard />}
        {tab === "observability"  && <ObservabilityInspector />}
        {tab === "launch"         && <LaunchDashboard />}
      </div>
    </div>
  );
}
