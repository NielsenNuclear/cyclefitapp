"use client";

// ── SectionHeader ──────────────────────────────────────────────────────────
// Eyebrow + title row used at the top of every card and section.

interface SectionHeaderProps {
  eyebrow?:      string;
  eyebrowColor?: string;
  title:         string;
  subtitle?:     string;
  action?:       React.ReactNode;
  className?:    string;
}

export function SectionHeader({
  eyebrow,
  eyebrowColor = "text-ink-muted",
  title,
  subtitle,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={className}>
      {eyebrow && (
        <p className={`type-micro ${eyebrowColor} mb-1.5`}>{eyebrow}</p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-card-title text-ink leading-tight">{title}</h3>
          {subtitle && <p className="type-caption text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// ── CardLabel (legacy alias) ───────────────────────────────────────────────
// Many existing cards use <CardLabel>. Keep it working.

export function CardLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`type-micro text-ink-muted ${className}`}>{children}</p>
  );
}
