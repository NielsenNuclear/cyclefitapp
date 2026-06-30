// ─── design/tokens/colors.ts ─────────────────────────────────────────────────
// Semantic color palette for Axis dashboard.
// Extends the warm-light visual language established in DashboardShell,
// ReadinessCard, and PhaseCard. All hex values below are canonical — do not
// introduce new hex colors without adding them here first.

export const surface = {
  page:    "#FAF9F5",  // page background
  card:    "#FFFFFF",  // default card surface
  subtle:  "#F5F3EE",  // secondary / tinted card surface
  hover:   "#F1EFE8",  // interactive hover state
} as const;

export const border = {
  default: "#EAE7DE",  // standard card border
  subtle:  "#F0EDE5",  // secondary border
  strong:  "#C8C5BC",  // separator / emphasis border
} as const;

export const text = {
  primary:   "#1C1B18",  // headings, primary values
  secondary: "#5C5850",  // body text, descriptions
  body:      "#6B6860",  // supporting / contextual text
  muted:     "#9B9690",  // labels, timestamps, metadata
  disabled:  "#C8C5BC",  // unavailable / empty states
} as const;

export const brand = {
  default: "#534AB7",  // primary brand purple
  light:   "#EEEDFE",  // tinted brand background
  muted:   "#C4C0EE",  // muted brand (borders, dividers)
  dark:    "#3C3489",  // dark brand (text on tinted bg)
} as const;

export const success = {
  default: "#0F6E56",  // success text / bar fill
  light:   "#E1F5EE",  // success chip background
  border:  "#A8DFC8",  // success chip border
  dark:    "#085041",  // success text on tinted bg
} as const;

export const warning = {
  default: "#854F0B",  // warning text / bar fill
  light:   "#FAEEDA",  // warning chip background
  border:  "#E4C88A",  // warning chip border
  dark:    "#633806",  // warning text on tinted bg
} as const;

export const error = {
  default: "#C0392B",  // error text / bar fill
  light:   "#FDF3F2",  // error chip background
  border:  "#F5C5C0",  // error chip border
  dark:    "#9B2015",  // error text on tinted bg
} as const;

export const info = {
  default: "#1B4FA0",  // info text
  light:   "#E3EFFE",  // info chip background
  border:  "#A8C4F0",  // info chip border
} as const;

// Neutral grey (non-brand muted tones)
export const neutral = {
  text:    "#6B7280",  // slate-500 equivalent on light bg
  bg:      "#EEF0F2",  // neutral chip background
  border:  "#D1D5DB",  // neutral chip border
} as const;

// Readiness/recovery semantic signal colors
export const signal = {
  optimal:  { text: "#085041", bg: "#E1F5EE", bar: "#0F6E56" },
  ready:    { text: "#3C3489", bg: "#EEEDFE", bar: "#534AB7" },
  moderate: { text: "#1B4FA0", bg: "#E3EFFE", bar: "#1B5FA0" },
  cautious: { text: "#633806", bg: "#FAEEDA", bar: "#854F0B" },
  recover:  { text: "#3D4451", bg: "#EEF0F2", bar: "#6B7280" },
} as const;
