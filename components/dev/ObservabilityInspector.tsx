"use client";
// ─── components/dev/ObservabilityInspector.tsx ────────────────────────────────
// Phase E — system observability inspector for the /dev console.
// Shows the governance pipeline traces, session timeline, and system health.

import { useState, useMemo } from "react";
import {
  buildSessionTimeline,
  getAllSessions,
  getSessionSummary,
  filterTimeline,
  getLatestSessionId,
  type SessionSummary,
} from "@/lib/telemetry/SessionTimeline";
import { getEvents }    from "@/lib/telemetry/TelemetryCollector";
import type { TelemetryCategory, TelemetryEventName, TimelineEntry } from "@/lib/telemetry/TelemetryTypes";

// ─── Category badge colour ────────────────────────────────────────────────────

const CAT_COLOUR: Record<TelemetryCategory, string> = {
  system:         "bg-brand/20 text-brand",
  health:         "bg-orange-400/20 text-orange-400",
  error:          "bg-red-400/20 text-red-400",
  performance:    "bg-yellow-400/20 text-yellow-400",
  recommendation: "bg-green-400/20 text-green-400",
  workout:        "bg-cyan-400/20 text-cyan-400",
  checkin:        "bg-purple-400/20 text-purple-400",
  navigation:     "bg-ink-muted/20 text-ink-muted",
  onboarding:     "bg-ink-muted/20 text-ink-muted",
  feature_use:    "bg-ink-muted/20 text-ink-muted",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: TelemetryCategory }) {
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLOUR[cat] ?? "bg-ui-muted text-ink-muted"}`}>
      {cat}
    </span>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const [open, setOpen] = useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="border-b border-ui-border/40 last:border-0">
      <button
        className="w-full text-left py-1.5 px-2 flex items-start gap-2 hover:bg-ui-surface/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-[10px] text-ink-muted font-mono w-16 flex-shrink-0 pt-0.5">{time}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryBadge cat={entry.category} />
            <span className="text-xs text-ink-base font-mono truncate">{entry.name}</span>
            {entry.durationMs !== undefined && (
              <span className="text-[9px] text-ink-muted ml-auto flex-shrink-0">{entry.durationMs}ms</span>
            )}
          </div>
          <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">{entry.summary}</p>
        </div>
        <span className="text-ink-muted text-[10px] flex-shrink-0 mt-0.5">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-2 ml-16">
          <div className="bg-ui-surface rounded-md p-2 text-[10px] font-mono text-ink-muted space-y-0.5">
            {Object.entries(entry.properties).map(([k, v]) => (
              <div key={k}>
                <span className="text-ink-base">{k}</span>
                <span className="text-ink-muted">: </span>
                <span className={
                  v === true ? "text-green-400" :
                  v === false ? "text-red-400" :
                  "text-yellow-400"
                }>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionSummaryCard({ summary }: { summary: SessionSummary }) {
  return (
    <div className="bg-ui-surface rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-ink-muted truncate max-w-[60%]">{summary.sessionId}</span>
        <span className="text-[10px] text-ink-muted">{summary.eventCount} events</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-base font-bold text-brand">{summary.systemEvents}</p>
          <p className="text-[9px] text-ink-muted">system</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-orange-400">{summary.errorEvents}</p>
          <p className="text-[9px] text-ink-muted">health</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-yellow-400">{summary.safetyConstraints}</p>
          <p className="text-[9px] text-ink-muted">safety</p>
        </div>
      </div>
      {summary.confidenceLevels.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {summary.confidenceLevels.map((l, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ObservabilityInspector() {
  const latestSession = getLatestSessionId();
  const [selectedSession, setSelectedSession] = useState<string | null>(latestSession);
  const [filterCat, setFilterCat]             = useState<TelemetryCategory | "">("");

  const sessions  = useMemo(() => getAllSessions(), []);
  const summary   = useMemo(
    () => selectedSession ? getSessionSummary(selectedSession) : null,
    [selectedSession],
  );
  const timeline  = useMemo(
    () => selectedSession ? buildSessionTimeline(selectedSession) : [],
    [selectedSession],
  );
  const filtered  = useMemo(
    () => filterCat ? filterTimeline(timeline, { category: filterCat as TelemetryCategory }) : timeline,
    [timeline, filterCat],
  );

  const totalSystemEvents = useMemo(
    () => getEvents().filter(e => e.category === "system").length,
    [],
  );

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-ink-muted">No observability events recorded yet.</p>
        <p className="text-xs text-ink-muted mt-1">Events are captured as you use Axis — load the dashboard to generate system traces.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ui-surface rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-brand">{sessions.length}</p>
          <p className="text-[10px] text-ink-muted">sessions</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-brand">{totalSystemEvents}</p>
          <p className="text-[10px] text-ink-muted">system events</p>
        </div>
        <div className="bg-ui-surface rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-brand">{timeline.length}</p>
          <p className="text-[10px] text-ink-muted">this session</p>
        </div>
      </div>

      {/* Session selector */}
      {sessions.length > 1 && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">Session</p>
          <div className="flex flex-wrap gap-1.5">
            {sessions.slice(-6).map(sid => (
              <button
                key={sid}
                onClick={() => setSelectedSession(sid)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  sid === selectedSession
                    ? "border-brand text-brand bg-brand/10"
                    : "border-ui-border text-ink-muted hover:border-brand/40"
                }`}
              >
                {sid.slice(-8)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Session summary */}
      {summary && <SessionSummaryCard summary={summary} />}

      {/* Category filter */}
      <div>
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">Filter by category</p>
        <div className="flex flex-wrap gap-1.5">
          {["", "system", "health", "error", "recommendation", "workout", "checkin"].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat as TelemetryCategory | "")}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                filterCat === cat
                  ? "border-brand text-brand bg-brand/10"
                  : "border-ui-border text-ink-muted hover:border-brand/40"
              }`}
            >
              {cat || "all"}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
          Timeline ({filtered.length} events)
        </p>
        {filtered.length === 0 ? (
          <p className="text-xs text-ink-muted text-center py-3">No events match filter.</p>
        ) : (
          <div className="bg-ui-surface rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
            {filtered.map(e => <TimelineRow key={e.eventId} entry={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
