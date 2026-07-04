"use client";
import { useState } from "react";

// ── Accordion ──────────────────────────────────────────────────────────────
// Animated expand/collapse container used for prep sections, detail drawers.

interface AccordionProps {
  label:        string;
  defaultOpen?: boolean;
  badge?:       React.ReactNode;
  children:     React.ReactNode;
  className?:   string;
}

export function Accordion({
  label, defaultOpen = false, badge, children, className = "",
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-border overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-surface-hover transition-colors duration-normal text-left focus-ring"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span className="type-micro text-brand">{label}</span>
          {badge && badge}
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 py-3 bg-surface border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      className={`flex-shrink-0 text-ink-muted transition-transform duration-normal ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
