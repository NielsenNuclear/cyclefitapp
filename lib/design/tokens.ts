/**
 * Axis Design System 2.0 — Phase 61
 *
 * TypeScript mirror of the CSS tokens in app/globals.css.
 * Use these in:
 *   - inline `style={{ color: tokens.color.ink }}` (where Tailwind can't be used)
 *   - Three.js / React Three Fiber materials
 *   - SVG stroke/fill attributes
 *   - Canvas / chart rendering
 *
 * Do NOT use these in JSX className strings — use the Tailwind utilities instead:
 *   bg-surface, text-ink, border-border, shadow-card, etc.
 */

// ── Colors ─────────────────────────────────────────────────────────────────

export const color = {
  // Surfaces
  canvas:         "#FAF9F5",
  surface:        "#FFFFFF",
  surfaceRaised:  "#FDFCF9",
  surfaceSubtle:  "#F5F3EE",
  surfaceHover:   "#F1EFE8",

  // Text
  ink:            "#1C1B18",
  inkSecondary:   "#5C5850",
  inkMuted:       "#9B9690",
  inkFaint:       "#C5C1B7",

  // Borders
  border:         "#EAE7DE",
  borderStrong:   "#D8D4CC",

  // Brand (Axis purple)
  brand:          "#534AB7",
  brandDark:      "#3C3489",
  brandLight:     "#6B63C8",
  brandBg:        "#F0EEF8",
  brandBgMid:     "#EEEDFE",
  brandBorder:    "#C9C5EE",
  brandText:      "#3C3489",

  // Success / Recovery
  success:        "#0F6E56",
  successBg:      "#E1F5EE",
  successBorder:  "#A3DCCA",
  successText:    "#085041",

  // Caution / Warning
  caution:        "#854F0B",
  cautionBg:      "#FDF6EC",
  cautionBorder:  "#E8C98A",
  cautionText:    "#633806",

  // Error / Danger
  danger:         "#C0390B",
  dangerBg:       "#FDE8E8",
  dangerBorder:   "#F5BCBC",

  // Info / Blue
  info:           "#1B4FA0",
  infoBg:         "#E3EFFE",
  infoBorder:     "#A8C4F0",

  // Neutral status
  neutral:        "#6B7280",
  neutralBg:      "#EEF0F2",
  neutralBorder:  "#CBD0D8",
  neutralText:    "#3D4451",

  // Domain semantics
  cycle:          "#C05BA8",
  cycleBg:        "#F9F0FA",
  cycleBorder:    "#D8A5DC",
  cycleText:      "#6B2A72",

  nutrition:      "#B25E1B",
  nutritionBg:    "#FDF6EC",

  performance:    "#534AB7",
  recovery:       "#0F6E56",
} as const;

export type ColorToken = keyof typeof color;

// ── Shadows ────────────────────────────────────────────────────────────────

export const shadow = {
  none:    "none",
  subtle:  "0 1px 4px rgba(28,27,24,0.04)",
  card:    "0 1px 12px rgba(28,27,24,0.06)",
  float:   "0 8px 32px rgba(28,27,24,0.10)",
  modal:   "0 20px 60px rgba(28,27,24,0.18)",
} as const;

// ── Spacing (px values for inline use) ────────────────────────────────────

export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ── Border radius ──────────────────────────────────────────────────────────

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  "2xl": 24,
  pill: 9999,
} as const;

// ── Animation ──────────────────────────────────────────────────────────────

export const duration = {
  fast:   100,
  normal: 200,
  slow:   300,
  slower: 500,
} as const;

export const easing = {
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  out:    "cubic-bezier(0, 0, 0.2, 1)",
} as const;

// ── Typography ─────────────────────────────────────────────────────────────

export const font = {
  sans:  "'DM Sans', 'Inter', 'Helvetica Neue', system-ui, sans-serif",
  serif: "'Lora', Georgia, serif",
  mono:  "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace",
} as const;

// ── Convenience: status variant lookup ────────────────────────────────────
// Used by Badge, Pill, and status indicators that need both bg+text colors.

export type StatusVariant =
  | "brand"
  | "success"
  | "caution"
  | "danger"
  | "info"
  | "neutral"
  | "cycle";

export const statusColors: Record<StatusVariant, {
  bg:     string;
  text:   string;
  border: string;
}> = {
  brand:   { bg: color.brandBgMid,  text: color.brandText,   border: color.brandBorder  },
  success: { bg: color.successBg,   text: color.successText,  border: color.successBorder },
  caution: { bg: color.cautionBg,   text: color.cautionText,  border: color.cautionBorder },
  danger:  { bg: color.dangerBg,    text: color.danger,       border: color.dangerBorder  },
  info:    { bg: color.infoBg,      text: color.info,         border: color.infoBorder    },
  neutral: { bg: color.neutralBg,   text: color.neutralText,  border: color.neutralBorder },
  cycle:   { bg: color.cycleBg,     text: color.cycleText,    border: color.cycleBorder   },
};
