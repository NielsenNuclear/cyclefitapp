// ─── lib/intelligence/confidence/ConfidenceEngine.ts ─────────────────────────
// Phase 67 — aggregates all dimensions into a ConfidenceProfile.

import type { ConfidenceLevel, ConfidenceProfile } from "./ConfidenceTypes";
import {
  calculateDimensions,
  computeCompositeScore,
  deriveMaturityStage,
  type ConfidenceInputs,
} from "./ConfidenceCalculator";
import { recordConfidenceSnapshot } from "./ConfidenceRegistry";

export type { ConfidenceInputs };

function scoreToLevel(score: number, availableDims: number): ConfidenceLevel {
  if (availableDims < 2) return "Insufficient";
  if (score >= 0.75)     return "High";
  if (score >= 0.55)     return "Moderate";
  if (score >= 0.35)     return "Building";
  if (score >= 0.15)     return "Limited";
  return "Insufficient";
}

export function buildConfidenceProfile(inputs: ConfidenceInputs): ConfidenceProfile {
  const dimensions     = calculateDimensions(inputs);
  const compositeScore = computeCompositeScore(dimensions);
  const availableDims  = Object.values(dimensions).filter(d => d.available).length;
  const level          = scoreToLevel(compositeScore, availableDims);
  const maturityStage  = deriveMaturityStage(inputs.completedWorkouts);

  const profile: ConfidenceProfile = {
    level,
    compositeScore,
    dimensions,
    maturityStage,
    generatedAt: new Date().toISOString(),
  };

  recordConfidenceSnapshot(level, compositeScore, maturityStage);

  return profile;
}

// ── Styling helpers used by UI components ─────────────────────────────────────

// Design-token 4-step semantic scale (success/brand/caution/danger) mapped
// onto the 5-level confidence scale. Building and Limited both map to
// "caution" — the original used raw Tailwind palette swatches (yellow-400 vs
// orange-400) for these two, which was never a deliberate design-system
// distinction, just an off-the-shelf gradient; consolidating onto the real
// token scale loses that fine-grained (untokenized) split rather than
// inventing a token to preserve it. Also: the original bg-*-900/20 values
// were dark-theme translucent overlays with no light-mode equivalent — this
// app is light-mode only, so those were already a latent visual bug.
export function getConfidenceLevelColor(level: ConfidenceLevel): string {
  switch (level) {
    case "High":         return "text-success";
    case "Moderate":     return "text-brand";
    case "Building":     return "text-caution";
    case "Limited":      return "text-caution";
    case "Insufficient": return "text-danger";
  }
}

export function getConfidenceLevelBg(level: ConfidenceLevel): string {
  switch (level) {
    case "High":         return "bg-success-bg";
    case "Moderate":     return "bg-brand-bg-mid";
    case "Building":     return "bg-caution-bg";
    case "Limited":      return "bg-caution-bg";
    case "Insufficient": return "bg-danger-bg";
  }
}

export function getConfidenceLevelBorder(level: ConfidenceLevel): string {
  switch (level) {
    case "High":         return "border-success-border";
    case "Moderate":     return "border-brand-border";
    case "Building":     return "border-caution-border";
    case "Limited":      return "border-caution-border";
    case "Insufficient": return "border-danger-border";
  }
}
