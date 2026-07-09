// ─── lib/testing/propertyValidators.ts ────────────────────────────────────────
// Phase 66 — Property Validators
// Invariants that must hold for any recommendation output.
// These are the "laws" of the Adaptive Engine.

// ── Result type ───────────────────────────────────────────────────────────────

export type PropertyTestStatus = "pass" | "fail" | "warn";

export interface PropertyTestResult {
  property:    string;
  status:      PropertyTestStatus;
  expected:    string;
  actual:      string;
  message:     string;
}

// ── Recommendation output shape ───────────────────────────────────────────────
// Matches the subset of DailyRecommendation / pipeline output used here.

export interface RecommendationOutput {
  volumeScale:    number;
  confidenceScore: number;
  readinessBadge: string;
  recommendationClass: string;
  intensityLevel: string;
}

// ── Individual property validators ────────────────────────────────────────────

function pass(property: string, actual: string, expected: string): PropertyTestResult {
  return { property, status: "pass", expected, actual, message: "OK" };
}
function fail(property: string, actual: string, expected: string, msg: string): PropertyTestResult {
  return { property, status: "fail", expected, actual, message: msg };
}
function warn(property: string, actual: string, expected: string, msg: string): PropertyTestResult {
  return { property, status: "warn", expected, actual, message: msg };
}

/** Volume scale must stay in [0.50, 1.40]. */
export function validateVolumeBounds(output: RecommendationOutput): PropertyTestResult {
  const { volumeScale } = output;
  const MIN = 0.50, MAX = 1.40;
  if (volumeScale < MIN || volumeScale > MAX) {
    return fail(
      "volume_bounds",
      `volumeScale=${volumeScale.toFixed(3)}`,
      `[${MIN}, ${MAX}]`,
      `Volume scale ${volumeScale.toFixed(3)} is outside safe bounds [${MIN}, ${MAX}].`,
    );
  }
  if (volumeScale < 0.60 || volumeScale > 1.30) {
    return warn(
      "volume_bounds",
      `volumeScale=${volumeScale.toFixed(3)}`,
      `[0.60, 1.30] (preferred)`,
      `Volume scale ${volumeScale.toFixed(3)} is in hard-limit zone but within outer bounds.`,
    );
  }
  return pass("volume_bounds", `volumeScale=${volumeScale.toFixed(3)}`, `[${MIN}, ${MAX}]`);
}

/** Confidence score must be in [0, 1]. */
export function validateConfidenceBounds(output: RecommendationOutput): PropertyTestResult {
  const { confidenceScore } = output;
  if (confidenceScore < 0 || confidenceScore > 1) {
    return fail(
      "confidence_bounds",
      `confidence=${confidenceScore.toFixed(3)}`,
      "[0, 1]",
      `Confidence ${confidenceScore.toFixed(3)} is outside [0, 1].`,
    );
  }
  return pass("confidence_bounds", `confidence=${confidenceScore.toFixed(3)}`, "[0, 1]");
}

/** Recover badge must never be paired with high-volume output. */
export function validateRecoverBadgeNotHighVolume(output: RecommendationOutput): PropertyTestResult {
  if (output.readinessBadge === "Recover" && output.volumeScale > 0.85) {
    return fail(
      "recover_badge_volume_contract",
      `badge=Recover, volumeScale=${output.volumeScale.toFixed(3)}`,
      "badge=Recover → volumeScale ≤ 0.85",
      `'Recover' badge must not pair with volumeScale > 0.85.`,
    );
  }
  return pass("recover_badge_volume_contract",
    `badge=${output.readinessBadge}, volume=${output.volumeScale.toFixed(3)}`,
    "Recover → volume ≤ 0.85");
}

/** Push badge must not appear with volume below 0.90. */
export function validatePushBadgeVolume(output: RecommendationOutput): PropertyTestResult {
  if (output.readinessBadge === "Push" && output.volumeScale < 0.90) {
    return warn(
      "push_badge_volume_contract",
      `badge=Push, volumeScale=${output.volumeScale.toFixed(3)}`,
      "badge=Push → volumeScale ≥ 0.90 (preferred)",
      `'Push' badge with volumeScale ${output.volumeScale.toFixed(3)} is unexpectedly low.`,
    );
  }
  return pass("push_badge_volume_contract",
    `badge=${output.readinessBadge}, volume=${output.volumeScale.toFixed(3)}`,
    "Push → volume ≥ 0.90");
}

/** Deload class must produce volume ≤ 0.75. */
export function validateDeloadVolume(output: RecommendationOutput): PropertyTestResult {
  if (output.recommendationClass === "deload" && output.volumeScale > 0.75) {
    return fail(
      "deload_volume_contract",
      `class=deload, volumeScale=${output.volumeScale.toFixed(3)}`,
      "deload → volumeScale ≤ 0.75",
      `Deload recommendation must produce volumeScale ≤ 0.75, got ${output.volumeScale.toFixed(3)}.`,
    );
  }
  return pass("deload_volume_contract",
    `class=${output.recommendationClass}, volume=${output.volumeScale.toFixed(3)}`,
    "deload → volume ≤ 0.75");
}

/** Confidence must not be "high" when volume is at extreme bounds. */
export function validateHighConfidenceNotExtreme(output: RecommendationOutput): PropertyTestResult {
  const atExtreme = output.volumeScale < 0.62 || output.volumeScale > 1.28;
  if (atExtreme && output.confidenceScore > 0.85) {
    return warn(
      "confidence_extreme_volume",
      `confidence=${output.confidenceScore.toFixed(2)}, volume=${output.volumeScale.toFixed(3)}`,
      "confidence ≤ 0.85 when volume at extremes",
      `High confidence (${output.confidenceScore.toFixed(2)}) at extreme volume (${output.volumeScale.toFixed(3)}) may indicate over-confidence.`,
    );
  }
  return pass("confidence_extreme_volume",
    `confidence=${output.confidenceScore.toFixed(2)}, volume=${output.volumeScale.toFixed(3)}`,
    "reasonable confidence at extreme volumes");
}

// ── Run all validators ────────────────────────────────────────────────────────

export function runPropertyTests(output: RecommendationOutput): PropertyTestResult[] {
  return [
    validateVolumeBounds(output),
    validateConfidenceBounds(output),
    validateRecoverBadgeNotHighVolume(output),
    validatePushBadgeVolume(output),
    validateDeloadVolume(output),
    validateHighConfidenceNotExtreme(output),
  ];
}

export function allPropertiesPass(results: PropertyTestResult[]): boolean {
  return results.every(r => r.status !== "fail");
}
