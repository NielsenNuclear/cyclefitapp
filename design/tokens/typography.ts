// ─── design/tokens/typography.ts ─────────────────────────────────────────────
// Named type-scale tokens for the Axis dashboard.
// Use these class-string combinations instead of arbitrary Tailwind sizes.
// Reference: PhaseCard, DashboardHeader, ReadinessCard set the visual standard.

export const type = {
  // "CURRENT PHASE" — section eyebrow / chip label
  eyebrow:    "text-[10px] font-bold uppercase tracking-[0.12em]",
  // Secondary eyebrow — slightly lighter weight
  eyebrowAlt: "text-[10px] font-semibold uppercase tracking-[0.10em]",
  // Supporting micro-labels — axis labels, helper text
  micro:      "text-[11px] font-medium",
  // Small body — card details, secondary metadata
  bodySmall:  "text-[12px] leading-relaxed",
  // Standard body — explanations, descriptions
  body:       "text-[13px] leading-relaxed",
  // Sub-section headings
  subheading: "text-[14px] font-medium",
  // Card section headings
  heading:    "text-[15px] font-semibold leading-tight",
  // Card title (h3-level)
  title:      "text-[15px] font-semibold",
  // Large card titles
  titleLarge: "text-[17px] font-semibold",
  // Score / stat display — single prominent number
  score:      "text-[2rem] font-light leading-none",
  // Dashboard greeting
  display:    "text-[clamp(1.6rem,5vw,2.2rem)] font-light leading-tight",
} as const;

// Font families (for style={{ fontFamily }} inline use)
export const font = {
  sans:  "'DM Sans', system-ui, sans-serif",
  serif: "'Lora', Georgia, serif",
  mono:  "'DM Mono', 'Fira Code', monospace",
} as const;
