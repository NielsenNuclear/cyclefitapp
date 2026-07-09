"use client";
// ─── components/intelligence/ConfidenceBadge.tsx ─────────────────────────────
// Phase 67 — reusable confidence badge. No numeric percentages for users.

import type { ConfidenceLevel } from "@/lib/intelligence/confidence/ConfidenceTypes";
import {
  getConfidenceLevelColor,
  getConfidenceLevelBg,
} from "@/lib/intelligence/confidence/ConfidenceEngine";

interface Props {
  level:    ConfidenceLevel;
  showDot?: boolean;
  size?:    "sm" | "md";
}

export function ConfidenceBadge({ level, showDot = true, size = "md" }: Props) {
  const color   = getConfidenceLevelColor(level);
  const bg      = getConfidenceLevelBg(level);
  const text    = size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${padding} ${bg} ${color} ${text} font-medium`}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />}
      {level} Confidence
    </span>
  );
}
