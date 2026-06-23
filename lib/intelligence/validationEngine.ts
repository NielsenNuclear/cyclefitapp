// ─── lib/intelligence/validationEngine.ts ────────────────────────────────────
// Phase 56 — Recommendation Safety Validator
// Detects impossible states and contradictory explanations. Warnings are
// logged to console in development and stored for observability.

import type { RecommendationExplanation } from "./recommendationExplanation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidationSeverity = "warning" | "info";

export interface ValidationWarning {
  code:     string;
  severity: ValidationSeverity;
  message:  string;
}

export interface ValidationResult {
  valid:    boolean;
  warnings: ValidationWarning[];
}

// ─── Impossible state thresholds ─────────────────────────────────────────────

// High signals + severely reduced volume suggests something is wrong with the
// explanation attribution (not necessarily with the underlying recommendation).
const IMPOSSIBLE_STATE_RULES: Array<{
  code:       string;
  check:      (e: RecommendationExplanation, readiness: number, recovery: number, symptoms: number) => boolean;
  message:    string;
}> = [
  {
    code:    "IMPOSSIBLE_LOW_VOLUME_HIGH_SIGNALS",
    check:   (e, r, rec, s) =>
      r >= 80 && rec >= 80 && s === 0 && e.finalVolumeScale < 0.75,
    message: "Volume scale is unusually low given strong readiness, recovery, and no symptoms.",
  },
  {
    code:    "IMPOSSIBLE_HIGH_VOLUME_LOW_SIGNALS",
    check:   (e, r, rec) =>
      r < 45 && rec < 45 && e.finalVolumeScale > 1.05,
    message: "Volume scale is unusually high given low readiness and poor recovery.",
  },
  {
    code:    "DELOAD_VOLUME_TOO_HIGH",
    check:   (e) => e.burnoutImpact < -8 && e.finalVolumeScale > 0.90,
    message: "Burnout risk is elevated but volume scale remains high.",
  },
];

// Contradiction checks: what the primaryDrivers claim vs what the impacts say
const CONTRADICTION_RULES: Array<{
  code:    string;
  check:   (e: RecommendationExplanation) => boolean;
  message: string;
}> = [
  {
    code:    "CONTRADICTION_RECOVERY_CLAIM",
    check:   (e) =>
      e.primaryDrivers.includes("Strong recovery") && e.recoveryImpact < 0,
    message: "Primary driver claims strong recovery but recovery impact is negative.",
  },
  {
    code:    "CONTRADICTION_READINESS_CLAIM",
    check:   (e) =>
      e.primaryDrivers.includes("Strong readiness") && e.readinessImpact < 0,
    message: "Primary driver claims strong readiness but readiness impact is negative.",
  },
  {
    code:    "MISMATCHED_VOLUME_DIRECTION",
    check:   (e) => {
      const allNegative =
        e.readinessImpact  < 0 &&
        e.recoveryImpact   < 0 &&
        e.adherenceImpact  < 0;
      return allNegative && e.finalVolumeScale > 1.02;
    },
    message: "All signal impacts are negative but final volume scale exceeds baseline.",
  },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export function validateRecommendationConsistency(
  explanation:   RecommendationExplanation,
  readiness:     number,
  recoveryScore: number,
  symptomCount:  number,
): ValidationResult {
  const warnings: ValidationWarning[] = [];

  for (const rule of IMPOSSIBLE_STATE_RULES) {
    if (rule.check(explanation, readiness, recoveryScore, symptomCount)) {
      warnings.push({ code: rule.code, severity: "warning", message: rule.message });
    }
  }

  for (const rule of CONTRADICTION_RULES) {
    if (rule.check(explanation)) {
      warnings.push({ code: rule.code, severity: "warning", message: rule.message });
    }
  }

  if (process.env.NODE_ENV === "development" && warnings.length > 0) {
    console.warn("[Axis Validation]", warnings.map(w => `${w.code}: ${w.message}`));
  }

  return { valid: warnings.length === 0, warnings };
}
