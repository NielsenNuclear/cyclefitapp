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

export function getConfidenceLevelColor(level: ConfidenceLevel): string {
  switch (level) {
    case "High":         return "text-green-400";
    case "Moderate":     return "text-brand";
    case "Building":     return "text-yellow-400";
    case "Limited":      return "text-orange-400";
    case "Insufficient": return "text-red-400";
  }
}

export function getConfidenceLevelBg(level: ConfidenceLevel): string {
  switch (level) {
    case "High":         return "bg-green-900/20";
    case "Moderate":     return "bg-brand/10";
    case "Building":     return "bg-yellow-900/20";
    case "Limited":      return "bg-orange-900/20";
    case "Insufficient": return "bg-red-900/20";
  }
}

export function getConfidenceLevelBorder(level: ConfidenceLevel): string {
  switch (level) {
    case "High":         return "border-green-400/40";
    case "Moderate":     return "border-brand/40";
    case "Building":     return "border-yellow-400/40";
    case "Limited":      return "border-orange-400/40";
    case "Insufficient": return "border-red-400/40";
  }
}
