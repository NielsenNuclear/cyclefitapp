"use client";

// ── EmptyState ────────────────────────────────────────────────────────────
// Used when a card or section has no data yet.

interface EmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
  size?:        "sm" | "md";
  className?:   string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${size === "sm" ? "py-4 gap-2" : "py-8 gap-3"} ${className}`}>
      {icon && (
        <div className={`text-ink-faint flex items-center justify-center ${size === "sm" ? "[&>svg]:w-6 [&>svg]:h-6" : "[&>svg]:w-8 [&>svg]:h-8"}`}>
          {icon}
        </div>
      )}
      <div>
        <p className={`font-semibold text-ink-secondary ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}>{title}</p>
        {description && (
          <p className={`text-ink-muted mt-1 leading-relaxed ${size === "sm" ? "text-[11px]" : "text-[12px]"}`}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── LoadingState ───────────────────────────────────────────────────────────

export function LoadingState({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <p className="type-caption text-ink-muted">{label}</p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────
// Inline loading placeholder for text lines.

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-surface-subtle animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}
