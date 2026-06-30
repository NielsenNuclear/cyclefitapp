// ─── design/tokens/spacing.ts ────────────────────────────────────────────────
// Card-level layout tokens. Use these instead of raw Tailwind spacing classes
// so padding and gaps stay consistent across all dashboard cards.

export const card = {
  // Default card inner padding
  padding:      "p-4",
  // Larger cards (PhaseCard, ReadinessCard)
  paddingLarge: "p-5",
  // Vertical section spacing within a card
  gap:          "space-y-4",
  // Tighter section spacing
  gapSmall:     "space-y-3",
  // Item-level gap (list rows, label-value pairs)
  itemGap:      "space-y-2",
  itemGapSmall: "space-y-1.5",
  // Horizontal gap in flex rows
  rowGap:       "gap-3",
} as const;

export const radius = {
  card:  "rounded-2xl",
  inner: "rounded-xl",
  small: "rounded-lg",
  pill:  "rounded-full",
  tiny:  "rounded-md",
} as const;

export const shadow = {
  card:   "shadow-[0_1px_12px_rgba(0,0,0,0.04)]",
  pop:    "shadow-[0_2px_20px_rgba(0,0,0,0.08)]",
} as const;
