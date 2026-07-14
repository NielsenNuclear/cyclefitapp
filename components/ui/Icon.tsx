"use client";

/**
 * Axis Icon System (DS-2 Batch 7).
 *
 * Zero-dependency internal icon registry — generalizes the pattern
 * DashboardShell's NavIcon already proved out (a shared shell + a data map
 * of path strings) to the whole app, rather than adding an external icon
 * library. Every path below was extracted verbatim from the hand-rolled SVG
 * it replaces (see docs/design/IconSystemAudit.md) — this is a consolidation
 * of existing icons, not a redraw, so appearance is preserved exactly.
 *
 * Data-visualization elements (confidence rings, score rings, the cycle-day
 * arc, the body-silhouette illustration) are explicitly NOT icons and are
 * not in this registry — see IconSystemAudit.md §5.1.
 */

import type { SVGProps } from "react";

export type IconName =
  // Navigation (DashboardShell)
  | "nav-today"
  | "nav-library"
  | "nav-body"
  | "nav-settings"
  | "nav-profile"
  // Brand
  | "brand-mark"
  // Action / chrome
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "back"
  | "close"
  | "close-thin"
  | "plus"
  | "minus"
  | "grid"
  | "refresh"
  | "compass"
  // Informational / status
  | "info"
  | "question"
  | "moon"
  | "lightning"
  | "heartbeat"
  | "leaf"
  | "warning";

interface IconDef {
  viewBox: string;
  /** Path/shape markup as static children — no dynamic props inside. */
  children: React.ReactNode;
}

const ICONS: Record<IconName, IconDef> = {
  // ── Navigation (paths unchanged from DashboardShell's original NAV_ITEMS) ──
  "nav-today": {
    viewBox: "0 0 24 24",
    children: <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />,
  },
  "nav-library": {
    viewBox: "0 0 24 24",
    children: <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3" />,
  },
  "nav-body": {
    viewBox: "0 0 24 24",
    children: <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 22v-4a5 5 0 0 1 10 0v4" />,
  },
  "nav-settings": {
    viewBox: "0 0 24 24",
    children: (
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4 0a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    ),
  },
  "nav-profile": {
    viewBox: "0 0 24 24",
    children: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  },

  // ── Brand ──
  "brand-mark": {
    viewBox: "0 0 24 24",
    children: (
      <>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </>
    ),
  },

  // ── Action / chrome ──
  "check": {
    viewBox: "0 0 24 24",
    children: <polyline points="20 6 9 17 4 12" />,
  },
  "chevron-down": {
    // Rotate via className (e.g. "rotate-180") for the "up" state — the
    // existing convention every accordion/select toggle already used.
    viewBox: "0 0 24 24",
    children: <polyline points="6 9 12 15 18 9" />,
  },
  "chevron-up": {
    viewBox: "0 0 24 24",
    children: <polyline points="18 15 12 9 6 15" />,
  },
  "back": {
    viewBox: "0 0 24 24",
    children: (
      <>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </>
    ),
  },
  "close": {
    viewBox: "0 0 24 24",
    children: <line x1="18" y1="6" x2="6" y2="18" />,
  },
  "close-thin": {
    viewBox: "0 0 24 24",
    children: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  },
  "plus": {
    viewBox: "0 0 24 24",
    children: <path d="M12 5v14M5 12h14" />,
  },
  "minus": {
    viewBox: "0 0 24 24",
    children: <path d="M5 12h14" />,
  },
  "grid": {
    viewBox: "0 0 24 24",
    children: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
      </>
    ),
  },
  "refresh": {
    viewBox: "0 0 24 24",
    children: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  },
  "compass": {
    viewBox: "0 0 24 24",
    children: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
      </>
    ),
  },

  // ── Informational / status ──
  "info": {
    viewBox: "0 0 24 24",
    children: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
  },
  "question": {
    viewBox: "0 0 8 8",
    children: (
      <>
        <circle cx="4" cy="4" r="3.25" />
        <path d="M4 3.5v-.5M4 4.5v1.5" strokeWidth={1} />
      </>
    ),
  },
  "moon": {
    viewBox: "0 0 24 24",
    children: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  },
  "lightning": {
    viewBox: "0 0 24 24",
    children: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  },
  "heartbeat": {
    viewBox: "0 0 24 24",
    children: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  "leaf": {
    viewBox: "0 0 24 24",
    children: <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />,
  },
  "warning": {
    viewBox: "0 0 24 24",
    children: <path d="M12 8v4M12 16h.01" />,
  },
};

const SIZE_MAP = { xs: 12, sm: 16, md: 20, lg: 24 } as const;

export interface AxisIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  name: IconName;
  /** Named step from the DS-2 icon scale, or a raw pixel number for a one-off. */
  size?: keyof typeof SIZE_MAP | number;
  strokeWidth?: number;
  /**
   * Decorative icons (the default, and the vast majority) are aria-hidden —
   * the accessible name belongs on the interactive parent (button/link), per
   * AxisDesignSystem.md §10. Set false only for an icon that is itself the
   * sole accessible content of a non-interactive element (rare); pair with
   * aria-label in that case.
   */
  decorative?: boolean;
}

export function AxisIcon({
  name,
  size = "sm",
  strokeWidth = 2,
  decorative = true,
  className,
  ...rest
}: AxisIconProps) {
  const icon = ICONS[name];
  const px = typeof size === "number" ? size : SIZE_MAP[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox={icon.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative ? "true" : undefined}
      className={className}
      {...rest}
    >
      {icon.children}
    </svg>
  );
}
