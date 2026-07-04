"use client";

// ── MetricTile ────────────────────────────────────────────────────────────
// Compact label + value tile used inside dashboard cards for key numbers.

interface MetricTileProps {
  label:     string;
  value:     React.ReactNode;
  unit?:     string;
  trend?:    "up" | "down" | "neutral";
  trendVal?: string;
  muted?:    boolean;
  className?: string;
}

const TREND_STYLE = {
  up:      { icon: "↑", cls: "text-success" },
  down:    { icon: "↓", cls: "text-caution" },
  neutral: { icon: "→", cls: "text-ink-muted" },
};

export function MetricTile({
  label, value, unit, trend, trendVal, muted = false, className = "",
}: MetricTileProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <p className="type-micro text-ink-muted">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`type-metric-sm ${muted ? "text-ink-muted" : "text-ink"}`}>
          {value}
        </span>
        {unit && (
          <span className="text-[11px] text-ink-muted">{unit}</span>
        )}
      </div>
      {trend && trendVal && (
        <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${TREND_STYLE[trend].cls}`}>
          <span>{TREND_STYLE[trend].icon}</span>
          <span>{trendVal}</span>
        </div>
      )}
    </div>
  );
}

// ── StatGrid ──────────────────────────────────────────────────────────────
// Uniform 2- or 3-column grid of MetricTiles.

interface StatGridProps {
  children:   React.ReactNode;
  cols?:      2 | 3 | 4;
  className?: string;
}

export function StatGrid({ children, cols = 3, className = "" }: StatGridProps) {
  const colCls = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];
  return (
    <div className={`grid ${colCls} gap-3 ${className}`}>{children}</div>
  );
}
