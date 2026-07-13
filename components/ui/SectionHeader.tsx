"use client";

// ── SectionHeader ──────────────────────────────────────────────────────────
// Canonical card/section heading. Use this for any new card that needs a
// title (with optional eyebrow, subtitle, or trailing action) — it's the
// full component; CardLabel below is a compact eyebrow-only variant, not a
// separate thing to reach for by default.

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

// ── CardLabel (compact variant) ────────────────────────────────────────────
// A bare eyebrow label with no title row — for the (25+ existing) cards that
// only need a small uppercase category tag, not a full heading. Not deprecated;
// use it deliberately when that's genuinely all the card needs. If a card
// grows a real title, move it to <SectionHeader eyebrow="..."> instead of
// hand-adding a heading next to <CardLabel>.

export function CardLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`type-micro text-ink-muted ${className}`}>{children}</p>
  );
}
