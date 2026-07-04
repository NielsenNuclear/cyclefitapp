"use client";

// ── ProgressRing ───────────────────────────────────────────────────────────
// SVG arc ring with optional center label. Size-agnostic — pass `size` in px.

interface ProgressRingProps {
  value:       number;          // 0–100
  size?:       number;          // outer diameter in px (default 56)
  stroke?:     number;          // stroke width (default 4)
  color?:      string;          // arc color (default brand purple)
  trackColor?: string;          // track color (default border)
  children?:   React.ReactNode; // content rendered in center
  className?:  string;
  label?:      string;          // accessible label
}

export function ProgressRing({
  value,
  size       = 56,
  stroke     = 4,
  color      = "var(--color-brand)",
  trackColor = "var(--color-border)",
  children,
  className  = "",
  label,
}: ProgressRingProps) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;

  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray var(--duration-slow) var(--ease-out)" }}
        />
      </svg>
      {children && (
        <div className="relative z-10 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
