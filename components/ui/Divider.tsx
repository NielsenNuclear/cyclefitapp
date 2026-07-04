"use client";

interface DividerProps {
  className?: string;
  label?:     string;
}

export function Divider({ className = "", label }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px bg-border" />
        <span className="type-micro text-ink-muted">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }
  return <div className={`h-px bg-border ${className}`} aria-hidden="true" />;
}
