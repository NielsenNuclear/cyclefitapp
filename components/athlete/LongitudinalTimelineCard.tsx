"use client";

import type { TimelineEvent } from "@/lib/athlete/athleteTimeline";

// ── Event type labels ──────────────────────────────────────────────────────

const EVENT_STYLE: Record<string, { dot: string; label: string }> = {
  started:           { dot: "bg-brand",   label: "Start" },
  consistency:       { dot: "bg-success", label: "Streak" },
  volume_increase:   { dot: "bg-success", label: "Volume ↑" },
  volume_reduction:  { dot: "bg-caution", label: "Volume ↓" },
  readiness_peak:    { dot: "bg-brand",   label: "Peak" },
  readiness_low:     { dot: "bg-caution", label: "Low" },
  recovery_peak:     { dot: "bg-success", label: "Peak" },
  recovery_trend:    { dot: "bg-success", label: "Trend" },
  session_milestone: { dot: "bg-brand",   label: "Milestone" },
  program_change:    { dot: "bg-neutral", label: "Change" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

// ── Main ───────────────────────────────────────────────────────────────────

interface LongitudinalTimelineCardProps {
  events:     TimelineEvent[];
  className?: string;
}

export function LongitudinalTimelineCard({ events, className = "" }: LongitudinalTimelineCardProps) {
  if (events.length === 0) {
    return (
      <div className={`bg-surface rounded-2xl border border-border shadow-card p-5 ${className}`}>
        <p className="type-micro text-ink-muted mb-2">Training Timeline</p>
        <p className="text-[12px] text-ink-muted">Complete more sessions to build your personal timeline.</p>
      </div>
    );
  }

  // Show most recent 8 events
  const display = [...events].reverse().slice(0, 8);

  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-card overflow-hidden ${className}`}>
      <div className="px-5 pt-5 pb-3">
        <p className="type-micro text-ink-muted mb-0.5">Training Timeline</p>
        <p className="text-[11px] text-ink-muted">{events.length} milestone{events.length !== 1 ? "s" : ""} tracked</p>
      </div>

      <div className="px-5 pb-5">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

          <div className="space-y-4">
            {display.map((event, i) => {
              const style = EVENT_STYLE[event.type] ?? { dot: "bg-neutral", label: event.type };
              return (
                <div key={event.id} className="flex items-start gap-3 pl-6 relative">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-surface ${style.dot} flex-shrink-0`} aria-hidden="true" />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${style.dot.replace("bg-", "bg-").replace("bg-brand", "bg-brand-bg-mid text-brand-text").replace("bg-success", "bg-success-bg text-success-text").replace("bg-caution", "bg-caution-bg text-caution-text").replace("bg-neutral", "bg-neutral-bg text-neutral-text")}`}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-ink-muted">{formatDate(event.date)}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-ink mt-0.5">{event.label}</p>
                    <p className="text-[11px] text-ink-secondary leading-snug">{event.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
