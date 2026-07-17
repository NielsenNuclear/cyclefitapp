"use client";

import { useState } from "react";
import type { TrainingRecommendation, RecoveryRecommendation } from "@/types/recommendation";
import { AxisIcon } from "@/components/ui/Icon";

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[12px] text-ink-secondary leading-relaxed">
      <span className="mt-[5px] w-1 h-1 rounded-full bg-ink-faint flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG = {
  Push:     { bg: "bg-success-bg",    text: "text-success-text", label: "Push day"    },
  Maintain: { bg: "bg-brand-bg-mid",  text: "text-brand-text",   label: "Maintain"    },
  Watch:    { bg: "bg-caution-bg",    text: "text-caution-text", label: "Watch"       },
  Recover:  { bg: "bg-neutral-bg",    text: "text-neutral-text", label: "Recovery day" },
};

// ─── TrainingCard ─────────────────────────────────────────────────────────────

export function TrainingCard({
  training,
  restDaySignal = false,
}: {
  training:       TrainingRecommendation;
  restDaySignal?: boolean;
}) {
  const badge = BADGE_CONFIG[training.badge] ?? BADGE_CONFIG.Maintain;
  // Dashboard 2.0 — Layer 1. Collapsed by default: focus/badge/intensity/
  // headline only, so the workout hero clears the fold on mobile without
  // losing the body/suggestions/avoid-note content — one tap reveals it.
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
      <CardLabel>Training</CardLabel>

      {/* Rest-day signal banner */}
      {restDaySignal && (
        <div className="mb-4 p-3 bg-neutral-bg rounded-xl border border-neutral-border">
          <p className="text-[11px] text-neutral-text leading-relaxed">
            Readiness has been below threshold for 3 consecutive days. A rest day or active
            recovery session may better serve training outcomes than structured load today.
          </p>
        </div>
      )}

      {/* Focus + badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug">
          {training.focus}
        </h3>
        <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Intensity */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">Intensity</span>
        <span className="text-[11px] font-semibold text-ink">{training.intensity}</span>
      </div>

      {/* Headline — always visible, the "at a glance" summary */}
      <p className="text-[12px] text-ink-secondary leading-relaxed italic border-l-2 border-border-strong pl-3">
        &ldquo;{training.headline}&rdquo;
      </p>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="mt-3 text-[11px] font-semibold text-brand hover:text-brand-dark transition-colors min-h-[44px] flex items-center"
        aria-expanded={expanded}
      >
        {expanded ? "Show less ↑" : "More detail ↓"}
      </button>

      {expanded && (
        <div className="mt-2">
          <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">{training.body}</p>

          {training.suggestions?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Suggested focus</div>
              <ul className="space-y-1.5">
                {training.suggestions?.map((s, i) => (
                  <ListItem key={i}>{s}</ListItem>
                ))}
              </ul>
            </div>
          )}

          {training.avoidNote && (
            <div className="mt-3 p-3 bg-caution-bg rounded-xl border border-caution-border">
              <p className="text-[11px] text-caution-text leading-relaxed">{training.avoidNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RecoveryCard ─────────────────────────────────────────────────────────────

export function RecoveryCard({ recovery }: { recovery: RecoveryRecommendation }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery</CardLabel>

      <h3
        className="text-[1.1rem] font-light text-ink leading-snug mb-3"
        style={{ fontFamily: "'Lora', Georgia, serif" }}
      >
        {recovery.focus}
      </h3>

      <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">{recovery.body}</p>

      {/* Sleep target */}
      <div className="flex items-start gap-2.5 p-3 bg-surface-subtle rounded-xl mb-4">
        <span className="text-brand mt-0.5">
          <AxisIcon name="moon" size={13} />
        </span>
        <p className="text-[11px] text-ink-secondary leading-relaxed">{recovery.sleepTarget}</p>
      </div>

      {/* Practices */}
      {recovery.practices.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Practices</div>
          <ul className="space-y-1.5">
            {recovery.practices.map((p, i) => <ListItem key={i}>{p}</ListItem>)}
          </ul>
        </div>
      )}

      {/* Stress note */}
      {recovery.stressNote && (
        <div className="mt-3 p-3 bg-caution-bg rounded-xl border border-caution-border">
          <p className="text-[11px] text-caution-text leading-relaxed">{recovery.stressNote}</p>
        </div>
      )}
    </div>
  );
}
