"use client";
import type { StatusVariant } from "@/lib/design/tokens";

// ── Badge ──────────────────────────────────────────────────────────────────
// Inline label for status, category, or domain.

interface BadgeProps {
  children:  React.ReactNode;
  variant?:  StatusVariant | "default";
  dot?:      boolean;
  className?: string;
}

const VARIANT_CLS: Record<StatusVariant | "default", string> = {
  default: "bg-surface-subtle text-ink-secondary border-border",
  brand:   "bg-brand-bg-mid text-brand-text border-brand-border",
  success: "bg-success-bg text-success-text border-success-border",
  caution: "bg-caution-bg text-caution-text border-caution-border",
  danger:  "bg-danger-bg text-danger border-danger-border",
  info:    "bg-info-bg text-info border-info-border",
  neutral: "bg-neutral-bg text-neutral-text border-neutral-border",
  cycle:   "bg-cycle-bg text-cycle-text border-cycle-border",
};

const DOT_CLS: Record<StatusVariant | "default", string> = {
  default: "bg-ink-muted",
  brand:   "bg-brand",
  success: "bg-success",
  caution: "bg-caution",
  danger:  "bg-danger",
  info:    "bg-info",
  neutral: "bg-neutral",
  cycle:   "bg-cycle",
};

export function Badge({ children, variant = "default", dot = false, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-[11px] font-semibold
        border
        ${VARIANT_CLS[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLS[variant]}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

// ── Pill ───────────────────────────────────────────────────────────────────
// Smaller, simpler variant — typically for muscle names, tags, etc.

interface PillProps {
  children:   React.ReactNode;
  primary?:   boolean;
  className?: string;
}

export function Pill({ children, primary = false, className = "" }: PillProps) {
  return (
    <span
      className={`
        inline-flex px-2 py-0.5 rounded-full
        text-[10px] font-medium
        ${primary
          ? "bg-brand-bg text-brand border border-brand-border"
          : "bg-surface-subtle text-ink-secondary border border-border"
        }
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// ── StatPill ───────────────────────────────────────────────────────────────
// Small neutral label for set × rep prescriptions, equipment info, etc.

export function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-subtle text-ink-secondary border border-border">
      {children}
    </span>
  );
}

// ── RpePill ────────────────────────────────────────────────────────────────

export function RpePill({ rpe }: { rpe: number }) {
  const cls =
    rpe >= 9 ? "bg-danger-bg text-danger border-danger-border" :
    rpe >= 7 ? "bg-caution-bg text-caution-text border-caution-border" :
               "bg-success-bg text-success-text border-success-border";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      RPE {rpe}
    </span>
  );
}
