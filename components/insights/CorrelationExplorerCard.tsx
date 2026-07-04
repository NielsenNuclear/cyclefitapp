"use client";

import type { CorrelationReport, CorrelationSignal } from "@/lib/insights/correlationEngine";

// ── Signal strength pips ───────────────────────────────────────────────────

const STRENGTH_PIPS: Record<string, number> = { weak: 1, moderate: 2, strong: 3 };
const STRENGTH_COLOR: Record<string, string> = {
  weak:     "bg-neutral",
  moderate: "bg-brand",
  strong:   "bg-success",
};
const DIR_ARROW: Record<string, string> = { positive: "↑↑", negative: "↑↓" };

function StrengthPips({ strength }: { strength: CorrelationSignal["strength"] }) {
  const n   = STRENGTH_PIPS[strength] ?? 1;
  const cls = STRENGTH_COLOR[strength] ?? "bg-neutral";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${strength} correlation`}>
      {[1, 2, 3].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= n ? cls : "bg-border"}`} />
      ))}
    </div>
  );
}

// ── Correlation row ────────────────────────────────────────────────────────

function CorrelationRow({ signal }: { signal: CorrelationSignal }) {
  return (
    <div className="py-3.5 border-b border-border/50 last:border-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-ink-secondary">{signal.labelA}</span>
          <span className="text-[10px] text-ink-muted">{DIR_ARROW[signal.direction]}</span>
          <span className="text-[11px] font-semibold text-ink-secondary">{signal.labelB}</span>
        </div>
        <StrengthPips strength={signal.strength} />
      </div>

      {/* Observation */}
      <p className="text-[12px] text-ink-secondary leading-snug">{signal.observation}</p>

      {/* Caveat */}
      <p className="text-[10px] text-ink-muted mt-1.5 italic">{signal.caveat}</p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

interface CorrelationExplorerCardProps {
  report:     CorrelationReport;
  className?: string;
}

export function CorrelationExplorerCard({ report, className = "" }: CorrelationExplorerCardProps) {
  if (!report.dataReady || report.signals.length === 0) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">Pattern Explorer</p>
        <p className="text-[12px] text-ink-muted">
          Log at least {report.minSamples} days of data to discover relationships between your signals.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <p className="type-micro text-ink-muted mb-0.5">Pattern Explorer</p>
        <p className="text-[11px] text-ink-muted">
          {report.signals.length} relationship{report.signals.length !== 1 ? "s" : ""} observed in your data
        </p>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 bg-surface-raised border-b border-border flex items-center gap-4">
        {(["weak", "moderate", "strong"] as const).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <StrengthPips strength={s} />
            <span className="text-[10px] text-ink-muted capitalize">{s}</span>
          </div>
        ))}
        <div className="ml-auto text-[9px] text-ink-muted">↑↑ positive &nbsp; ↑↓ inverse</div>
      </div>

      {/* Signals */}
      <div className="px-5 py-2">
        {report.signals.map(sig => (
          <CorrelationRow key={sig.id} signal={sig} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-surface-raised border-t border-border">
        <p className="text-[10px] text-ink-muted leading-relaxed">
          These are observed correlations — they do not prove cause and effect. More data improves reliability.
        </p>
      </div>
    </div>
  );
}
