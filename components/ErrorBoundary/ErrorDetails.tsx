"use client";
// ─── components/ErrorBoundary/ErrorDetails.tsx ────────────────────────────────
// Phase B — Developer-only expandable diagnostic panel.
// Never shown in production mode; only visible when #axis-debug is in the URL
// or when explicitly mounted by dev tooling.

import { useState } from "react";
import type { ErrorLogEntry } from "@/types/ErrorTypes";

interface Props {
  entry:     ErrorLogEntry;
  className?: string;
}

export function ErrorDetails({ entry, className = "" }: Props) {
  const [open, setOpen] = useState(false);

  // Show only in development or when debug flag is present
  const isDev =
    typeof window !== "undefined" &&
    (process.env.NODE_ENV === "development" ||
      window.location.hash.includes("axis-debug"));

  if (!isDev) return null;

  return (
    <div className={`text-left border border-ui-border rounded-xl overflow-hidden ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-ink-muted bg-ui-surface hover:bg-ui-muted transition-colors"
        aria-expanded={open}
        aria-controls="error-details-panel"
      >
        <span className="font-mono">Developer diagnostics</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          id="error-details-panel"
          className="px-3 py-3 bg-ui-surface/50 space-y-1.5 border-t border-ui-border"
        >
          <Row label="Category"  value={entry.category} />
          <Row label="Strategy"  value={entry.strategyId} />
          <Row label="Retries"   value={String(entry.retryCount)} />
          <Row label="Timestamp" value={entry.timestamp} />
          {entry.componentLabel && (
            <Row label="Component" value={entry.componentLabel} />
          )}
          <div className="pt-1">
            <p className="text-[10px] text-ink-muted font-mono uppercase tracking-wide mb-1">Error</p>
            <p className="text-xs font-mono text-red-400 break-all">{entry.devMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-ink-muted font-mono uppercase tracking-wide w-20 flex-shrink-0">
        {label}
      </span>
      <span className="text-xs font-mono text-ink-subtle break-all">{value}</span>
    </div>
  );
}
