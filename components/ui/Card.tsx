"use client";

import type { ReactNode } from "react";

// ─── Card ─────────────────────────────────────────────────────────────────────
// Standard dashboard card container. Matches the PhaseCard / ReadinessCard
// light-warm visual language. Use `variant="subtle"` for secondary/nested cards.

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "subtle";
}

export function Card({ children, className = "", variant = "default" }: CardProps) {
  const bg = variant === "subtle" ? "bg-[#F5F3EE]" : "bg-white";
  return (
    <div
      className={`rounded-2xl border border-[#EAE7DE] ${bg} p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

// ─── CardHeader ───────────────────────────────────────────────────────────────

interface CardHeaderProps {
  eyebrow?: string;
  eyebrowColor?: string;
  title: string;
  action?: ReactNode;
}

export function CardHeader({
  eyebrow,
  eyebrowColor = "text-[#9B9690]",
  title,
  action,
}: CardHeaderProps) {
  return (
    <div>
      {eyebrow && (
        <p className={`text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 ${eyebrowColor}`}>
          {eyebrow}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[#1C1B18] leading-tight">{title}</h3>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// ─── CardDivider ──────────────────────────────────────────────────────────────

export function CardDivider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-black/6 ${className}`} />;
}

// ─── CardSection ──────────────────────────────────────────────────────────────
// Labeled subsection within a card.

interface CardSectionProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function CardSection({ label, children, className = "" }: CardSectionProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690]">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── CardRow ──────────────────────────────────────────────────────────────────
// Label / value pair row. Common pattern across nearly all intelligence cards.

interface CardRowProps {
  label: string;
  value: ReactNode;
  valueClass?: string;
}

export function CardRow({ label, value, valueClass = "text-[#1C1B18]" }: CardRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#9B9690]">{label}</span>
      <span className={`text-[12px] font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  color?: string;
  thin?: boolean;
}

export function ProgressBar({
  value,
  color = "bg-[#534AB7]",
  thin = false,
}: ProgressBarProps) {
  return (
    <div className={`w-full ${thin ? "h-[2px]" : "h-[3px]"} bg-black/8 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
