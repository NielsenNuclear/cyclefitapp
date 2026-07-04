"use client";

import type { ReactNode } from "react";

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children:   ReactNode;
  className?: string;
  variant?:   "default" | "subtle" | "raised";
  padding?:   "none" | "sm" | "md" | "lg";
}

const CARD_PADDING = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-5",
};

const CARD_BG = {
  default: "bg-surface",
  subtle:  "bg-surface-subtle",
  raised:  "bg-surface-raised",
};

export function Card({ children, className = "", variant = "default", padding = "md" }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-border
        shadow-card
        ${CARD_BG[variant]}
        ${CARD_PADDING[padding]}
        space-y-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ── CardHeader ────────────────────────────────────────────────────────────

interface CardHeaderProps {
  eyebrow?:      string;
  eyebrowColor?: string;
  title:         string;
  subtitle?:     string;
  action?:       ReactNode;
}

export function CardHeader({
  eyebrow,
  eyebrowColor = "text-ink-muted",
  title,
  subtitle,
  action,
}: CardHeaderProps) {
  return (
    <div>
      {eyebrow && (
        <p className={`type-micro mb-1.5 ${eyebrowColor}`}>{eyebrow}</p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-card-title text-ink">{title}</h3>
          {subtitle && <p className="type-caption text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// ── CardDivider ───────────────────────────────────────────────────────────

export function CardDivider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}

// ── CardSection ───────────────────────────────────────────────────────────

interface CardSectionProps {
  label?:     string;
  children:   ReactNode;
  className?: string;
}

export function CardSection({ label, children, className = "" }: CardSectionProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <p className="type-micro text-ink-muted">{label}</p>
      )}
      {children}
    </div>
  );
}

// ── CardRow ───────────────────────────────────────────────────────────────

interface CardRowProps {
  label:       string;
  value:       ReactNode;
  valueClass?: string;
}

export function CardRow({ label, value, valueClass = "text-ink" }: CardRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className={`text-[12px] font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────

interface ProgressBarProps {
  value:  number;
  color?: string;
  thin?:  boolean;
}

export function ProgressBar({ value, color = "bg-brand", thin = false }: ProgressBarProps) {
  return (
    <div className={`w-full ${thin ? "h-[2px]" : "h-[3px]"} bg-border rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-[width] duration-slow ease-out ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── ToggleChip ────────────────────────────────────────────────────────────
// Radio / checkbox-style selectable chip.

interface ToggleChipProps {
  label:      string;
  selected:   boolean;
  onToggle:   () => void;
  disabled?:  boolean;
}

export function ToggleChip({ label, selected, onToggle, disabled = false }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      className={`
        px-3 py-1.5 rounded-full text-[11px] font-semibold border
        transition-colors duration-normal
        focus-ring
        disabled:opacity-50 disabled:cursor-not-allowed
        ${selected
          ? "bg-ink text-canvas border-ink"
          : "bg-surface-subtle text-ink-secondary border-border hover:border-border-strong"
        }
      `}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
