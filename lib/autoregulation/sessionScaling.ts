// ─── lib/autoregulation/sessionScaling.ts ────────────────────────────────────
// Phase 37A — Dynamic session scaling modifiers.
// Pure function: takes multi-signal state → returns volume / intensity / complexity multipliers.

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionRecommendation = "full" | "scaled" | "recovery" | "rest";

export interface SessionScalingInput {
  readinessScore:          number;    // 0–100
  readinessCategory:       string;    // "optimal"|"ready"|"moderate"|"cautious"|"recover"
  recoveryDebtScore:       number;    // 0–100
  burnoutRiskScore:        number;    // 0–100
  fatigueScore:            number;    // 0–100 (Phase 37D)
  fatigueZone:             string;    // "fresh"|"normal"|"fatigued"|"overreached"
  symptomSeverityMean:     number;    // 0–4 mean severity
  symptomCount:            number;
  isDeloadRecommended:     boolean;
  performanceTrendStatus:  string;    // "improving"|"stable"|"plateau"|"regressing"|"insufficient_data"
  adherenceRiskLevel:      string;    // "low"|"moderate"|"high"
  existingVolumeScale:     number;    // current adherence / life-event scale (0.55–1.0)
  isDeloadPeriod:          boolean;
}

export interface SessionScaling {
  volumeModifier:          number;    // multiplicative; e.g. 0.8 = 80% of target
  intensityMultiplier:     number;    // RPE scaling; 0.9 = slight reduction
  complexityScale:         number;    // 1.0 = full complexity; 0.7 = prefer easier variants
  recommendation:          SessionRecommendation;
  rationale:               string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeSessionScaling(input: SessionScalingInput): SessionScaling {
  const rationale: string[] = [];
  let volumeMod    = 1.0;
  let intensityMul = 1.0;
  let complexitySc = 1.0;
  let recommendation: SessionRecommendation = "full";

  // ── Readiness layer ──────────────────────────────────────────────────────────
  if (input.readinessCategory === "optimal") {
    volumeMod    += 0.10;
    intensityMul += 0.05;
    rationale.push("High readiness — volume and intensity ceiling raised");
  } else if (input.readinessCategory === "moderate") {
    volumeMod    -= 0.05;
    intensityMul -= 0.05;
    rationale.push("Moderate readiness — slight volume reduction");
  } else if (input.readinessCategory === "cautious") {
    volumeMod    -= 0.15;
    intensityMul -= 0.10;
    complexitySc  = 0.80;
    recommendation = "scaled";
    rationale.push("Low readiness — reduced volume and complexity");
  } else if (input.readinessCategory === "recover") {
    volumeMod    -= 0.30;
    intensityMul -= 0.15;
    complexitySc  = 0.60;
    recommendation = "recovery";
    rationale.push("Recovery mode — session converted to active recovery");
  }

  // ── Fatigue layer ────────────────────────────────────────────────────────────
  if (input.fatigueZone === "overreached") {
    volumeMod    -= 0.25;
    intensityMul -= 0.15;
    complexitySc  = Math.min(complexitySc, 0.60);
    recommendation = "recovery";
    rationale.push("Overreached — heavy load would deepen fatigue debt");
  } else if (input.fatigueZone === "fatigued") {
    volumeMod    -= 0.12;
    intensityMul -= 0.08;
    complexitySc  = Math.min(complexitySc, 0.80);
    if (recommendation === "full") recommendation = "scaled";
    rationale.push("Elevated fatigue — volume scaled back to protect recovery");
  }

  // ── Recovery debt layer ──────────────────────────────────────────────────────
  if (input.recoveryDebtScore > 70) {
    volumeMod    -= 0.15;
    intensityMul -= 0.10;
    if (recommendation === "full") recommendation = "scaled";
    rationale.push("High recovery debt — additional volume reduction applied");
  } else if (input.recoveryDebtScore > 50) {
    volumeMod    -= 0.08;
    rationale.push("Moderate recovery debt — minor volume adjustment");
  }

  // ── Symptom layer ────────────────────────────────────────────────────────────
  if (input.symptomSeverityMean >= 3 && input.symptomCount >= 2) {
    volumeMod    -= 0.20;
    intensityMul -= 0.15;
    complexitySc  = Math.min(complexitySc, 0.65);
    recommendation = "recovery";
    rationale.push("Significant symptoms — session reduced to movement therapy");
  } else if (input.symptomSeverityMean >= 2) {
    volumeMod    -= 0.10;
    intensityMul -= 0.05;
    complexitySc  = Math.min(complexitySc, 0.80);
    if (recommendation === "full") recommendation = "scaled";
    rationale.push("Active symptoms — complexity and volume moderated");
  }

  // ── Performance trend layer ──────────────────────────────────────────────────
  if (input.performanceTrendStatus === "regressing") {
    volumeMod    -= 0.08;
    intensityMul -= 0.05;
    rationale.push("Regressing performance — reducing load to allow recovery");
  } else if (input.performanceTrendStatus === "improving") {
    // Don't add volume here — that's handled by Phase 36C progression
    rationale.push("Performance improving — maintaining current stimulus");
  }

  // ── Deload layer ─────────────────────────────────────────────────────────────
  if (input.isDeloadRecommended || input.isDeloadPeriod) {
    volumeMod    = Math.min(volumeMod, 0.60);
    intensityMul = Math.min(intensityMul, 0.85);
    complexitySc  = Math.min(complexitySc, 0.75);
    recommendation = "scaled";
    rationale.push("Deload phase — load capped to promote super-compensation");
  }

  // ── Compose with existing adherence / life-event scale ───────────────────────
  // existingVolumeScale already absorbs adherence risk and life events.
  // The final volume modifier is the product, clamped to prevent extremes.
  const composedVolume = clamp(volumeMod * input.existingVolumeScale, 0.40, 1.20);

  return {
    volumeModifier:      Math.round(composedVolume  * 100) / 100,
    intensityMultiplier: Math.round(clamp(intensityMul, 0.75, 1.10) * 100) / 100,
    complexityScale:     Math.round(clamp(complexitySc,  0.50, 1.00) * 100) / 100,
    recommendation,
    rationale: rationale.slice(0, 4),
  };
}
