"use client";
// ─── components/dev/TraceExplorer.tsx ────────────────────────────────────────
// Phase 65 — Decision Trace Explorer (developer-facing)
// Browse, inspect, replay, and export decision audit traces.

import { useEffect, useState } from "react";
import { loadTraces, filterTraces, exportTrace } from "@/lib/intelligence/audit/traceStorage";
import { replayTrace }                            from "@/lib/intelligence/audit/replayEngine";
import type { DecisionTrace, ReplayResult }        from "@/lib/intelligence/audit/auditTypes";

// ── Sub-components ────────────────────────────────────────────────────────────

function GateTag({ result }: { result: string }) {
  const c = result === "passed" ? "bg-green-900/30 text-green-400" :
            result === "blocked" ? "bg-red-900/30 text-red-400" :
            "bg-yellow-900/30 text-yellow-400";
  return <span className={`text-xs px-1.5 py-0.5 rounded ${c}`}>{result}</span>;
}

function SignalTable({ signals }: { signals: DecisionTrace["signals"] }) {
  if (signals.length === 0) return <p className="text-xs text-ink-muted italic">No signals recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-ui-border">
            <th className="text-left py-1 pr-3 text-ink-muted font-medium">Signal</th>
            <th className="text-left py-1 pr-3 text-ink-muted font-medium">Value</th>
            <th className="text-left py-1 text-ink-muted font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s, i) => (
            <tr key={i} className="border-b border-ui-border/40">
              <td className="py-1 pr-3 text-ink-base">{s.name}</td>
              <td className="py-1 pr-3 text-brand font-mono">{String(s.value)}{s.unit ? ` ${s.unit}` : ""}</td>
              <td className="py-1 text-ink-muted">{s.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModifierTable({ modifiers }: { modifiers: DecisionTrace["modifiers"] }) {
  if (modifiers.length === 0) return <p className="text-xs text-ink-muted italic">No modifiers recorded.</p>;
  return (
    <div className="space-y-1">
      {modifiers.map((m, i) => (
        <div key={i} className="flex justify-between items-center text-xs">
          <span className="text-ink-muted">{m.name}</span>
          <span className={`font-mono font-medium ${m.outputFactor >= 1 ? "text-green-400" : "text-red-400"}`}>
            ×{m.outputFactor.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

function GateList({ gates }: { gates: DecisionTrace["safetyGates"] }) {
  if (gates.length === 0) return <p className="text-xs text-ink-muted italic">No safety gates recorded.</p>;
  return (
    <div className="space-y-1.5">
      {gates.map((g, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <GateTag result={g.result} />
          <div>
            <span className="text-ink-base font-medium">{g.name}</span>
            <span className="text-ink-muted ml-2">{g.reason}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TraceDetail({ trace, onBack }: { trace: DecisionTrace; onBack: () => void }) {
  const [replay, setReplay] = useState<ReplayResult | null>(null);
  const [section, setSection] = useState<"signals" | "modifiers" | "gates" | "output">("signals");

  const SECTIONS = ["signals","modifiers","gates","output"] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-xs text-brand hover:underline">← Back</button>
        <span className="text-xs text-ink-muted font-mono">{trace.id}</span>
        <span className="text-xs text-ink-muted">{new Date(trace.timestamp).toLocaleString()}</span>
      </div>

      {/* Output summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ui-surface rounded-lg p-3">
          <p className="text-lg font-mono font-semibold text-brand">{trace.finalVolumeScale.toFixed(3)}</p>
          <p className="text-xs text-ink-muted">Volume scale</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-3">
          <p className="text-lg font-semibold text-ink-base">{(trace.finalConfidence * 100).toFixed(0)}%</p>
          <p className="text-xs text-ink-muted">Confidence</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-3">
          <p className="text-sm font-medium text-ink-base">{trace.recommendationClass}</p>
          <p className="text-xs text-ink-muted">Class</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-ui-border">
        {SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-2 text-xs capitalize font-medium transition-colors ${section === s ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-base"}`}
          >
            {s} {s === "signals" ? `(${trace.signals.length})` : s === "modifiers" ? `(${trace.modifiers.length})` : s === "gates" ? `(${trace.safetyGates.length})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-ui-surface rounded-lg p-3">
        {section === "signals"   && <SignalTable signals={trace.signals} />}
        {section === "modifiers" && <ModifierTable modifiers={trace.modifiers} />}
        {section === "gates"     && <GateList gates={trace.safetyGates} />}
        {section === "output"    && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-ink-muted">Summary</span><span className="text-ink-base">{trace.recommendationSummary}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Intensity</span><span className="text-ink-base">{trace.finalIntensity}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Uncertainty</span><span className="font-mono text-ink-base">{trace.uncertaintyScore.toFixed(3)}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Calibration</span><span className="font-mono text-ink-base">{trace.calibrationFactor.toFixed(3)}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Algorithm</span><span className="text-ink-base">{trace.algorithmVersion}</span></div>
          </div>
        )}
      </div>

      {/* Replay */}
      <div className="flex gap-2">
        <button
          onClick={() => setReplay(replayTrace(trace))}
          className="text-xs px-3 py-1.5 bg-brand text-canvas rounded-lg font-medium hover:opacity-90"
        >
          Verify Determinism
        </button>
        <button
          onClick={() => {
            const json = exportTrace(trace.id);
            if (json) {
              const blob = new Blob([json], { type: "application/json" });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement("a");
              a.href = url; a.download = `trace-${trace.id}.json`; a.click();
              URL.revokeObjectURL(url);
            }
          }}
          className="text-xs px-3 py-1.5 bg-ui-surface text-ink-base rounded-lg font-medium hover:bg-ui-border"
        >
          Export JSON
        </button>
      </div>

      {replay && (
        <div className={`rounded-lg p-3 text-xs ${replay.status === "deterministic" ? "bg-green-900/20 text-green-400" : "bg-red-900/20 text-red-400"}`}>
          <p className="font-medium">{replay.status === "deterministic" ? "✓ Deterministic" : "⚠ Drift Detected"}</p>
          <p className="mt-0.5 opacity-80">{replay.message}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TraceExplorer() {
  const [traces, setTraces]   = useState<DecisionTrace[]>([]);
  const [selected, setSelected] = useState<DecisionTrace | null>(null);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    setTraces(loadTraces().slice().reverse()); // most recent first
  }, []);

  if (selected) return <TraceDetail trace={selected} onBack={() => setSelected(null)} />;

  const filtered = search
    ? traces.filter(t =>
        t.recommendationClass.includes(search) ||
        t.recommendationSummary.toLowerCase().includes(search.toLowerCase()) ||
        t.id.includes(search)
      )
    : traces;

  const hasBlocked = (t: DecisionTrace) => t.safetyGates.some(g => g.result !== "passed");

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Filter by class, summary, or ID…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-ui-surface border border-ui-border rounded-lg px-3 py-2 text-sm text-ink-base placeholder:text-ink-muted focus:outline-none focus:border-brand"
      />

      {filtered.length === 0 ? (
        <div className="bg-ui-surface rounded-lg p-4 text-center">
          <p className="text-sm text-ink-muted">No traces recorded yet.</p>
          <p className="text-xs text-ink-muted mt-1">Decision traces appear as recommendations are generated.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.slice(0, 50).map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left bg-ui-surface hover:bg-ui-border/40 rounded-lg p-3 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-base font-medium truncate">{t.recommendationSummary || t.recommendationClass}</p>
                  <p className="text-xs text-ink-muted mt-0.5 font-mono">{t.id} · {new Date(t.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="flex-shrink-0 text-right ml-2">
                  <p className="text-sm font-mono text-brand">{t.finalVolumeScale.toFixed(3)}</p>
                  {hasBlocked(t) && <span className="text-xs text-yellow-400">⚠ gate</span>}
                </div>
              </div>
            </button>
          ))}
          {filtered.length > 50 && <p className="text-xs text-ink-muted text-center py-2">+{filtered.length - 50} more</p>}
        </div>
      )}
    </div>
  );
}
