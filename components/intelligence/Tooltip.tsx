"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";

// ── Glossary ───────────────────────────────────────────────────────────────
// Educational definitions for fitness / intelligence terms surfaced in the UI.

export const GLOSSARY: Record<string, { title: string; body: string }> = {
  readiness: {
    title: "Readiness",
    body:  "Your overall capacity to train hard today — a composite of sleep, recovery, cycle phase, and recent training load.",
  },
  recovery: {
    title: "Recovery",
    body:  "How well your body has bounced back since your last session. Influenced by sleep, stress, nutrition, and time between sessions.",
  },
  momentum: {
    title: "Momentum",
    body:  "Your recent training consistency streak. High momentum means you have been showing up regularly; it compounds over time.",
  },
  burnout: {
    title: "Burnout Risk",
    body:  "The likelihood that continued load without adequate rest will tip into overtraining. Flagged when several stress signals pile up.",
  },
  trainingLoad: {
    title: "Training Load",
    body:  "The accumulated stress of recent sessions. A high load is normal after a tough week but should be balanced with recovery.",
  },
  cyclePhase: {
    title: "Cycle Phase",
    body:  "Where you are in your menstrual cycle. Hormonal shifts across Follicular, Ovulatory, Luteal, and Menstrual phases affect strength, endurance, and recovery.",
  },
  rpe: {
    title: "RPE",
    body:  "Rate of Perceived Exertion — a 1–10 scale describing how hard a set feels. 6 is comfortable, 8 is challenging, 10 is absolute maximum.",
  },
  deload: {
    title: "Deload",
    body:  "A planned reduction in training volume or intensity to allow accumulated fatigue to dissipate and super-compensation to occur.",
  },
  mesocycle: {
    title: "Mesocycle",
    body:  "A training block of 4–6 weeks with a focused goal (e.g. hypertrophy, strength). Usually followed by a deload before the next block.",
  },
  plateau: {
    title: "Plateau",
    body:  "A period when progress stalls despite continued effort. Usually broken by changing exercise selection, volume, or training stimulus.",
  },
};

// ── Tooltip component ──────────────────────────────────────────────────────

interface TooltipProps {
  term:       keyof typeof GLOSSARY | (string & {});
  children:   ReactNode;
  className?: string;
}

export function Tooltip({ term, children, className = "" }: TooltipProps) {
  const [open, setOpen]   = useState(false);
  const closeTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entry             = GLOSSARY[term];

  const show = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  if (!entry) return <>{children}</>;

  return (
    <span className={`relative inline-flex items-baseline gap-0.5 ${className}`}>
      {/* Underlined trigger */}
      <button
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => setOpen(v => !v)}
        className="underline decoration-dotted decoration-ink-muted underline-offset-2 text-inherit cursor-help focus-ring rounded focus-visible:rounded"
        aria-describedby={open ? `tooltip-${term}` : undefined}
      >
        {children}
      </button>

      {/* Tooltip popover */}
      {open && (
        <span
          id={`tooltip-${term}`}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          className={[
            "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2",
            "w-56 p-3 rounded-xl shadow-float",
            "bg-ink text-canvas",
            "pointer-events-auto",
          ].join(" ")}
        >
          <p className="text-[11px] font-semibold mb-0.5">{entry.title}</p>
          <p className="text-[11px] leading-relaxed opacity-80">{entry.body}</p>
          {/* Arrow */}
          <span
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-ink rotate-45 rounded-sm"
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}

// ── TermChip — pill-style labeled term with tooltip ────────────────────────

interface TermChipProps {
  term:       keyof typeof GLOSSARY | (string & {});
  className?: string;
}

export function TermChip({ term, className = "" }: TermChipProps) {
  const entry = GLOSSARY[term];
  if (!entry) return null;
  return (
    <Tooltip term={term} className={className}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-bg-mid text-brand-text border border-brand-border">
        {entry.title}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true" className="opacity-60">
          <circle cx="4" cy="4" r="3.25" stroke="currentColor" strokeWidth="1"/>
          <path d="M4 3.5v-.5M4 4.5v1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </span>
    </Tooltip>
  );
}
