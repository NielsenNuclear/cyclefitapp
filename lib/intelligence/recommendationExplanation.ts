// ─── lib/intelligence/recommendationExplanation.ts ────────────────────────────
// Phase 56 — Recommendation Explanation Engine
// Decomposes the final volume scale into per-signal contributions, generates
// a human-readable summary, and persists the explanation for history analysis.

const STORAGE_KEY_LATEST  = "axis_recommendation_explanation";
const STORAGE_KEY_HISTORY = "axis_recommendation_history";
const MAX_HISTORY         = 50;
const RETENTION_DAYS      = 90;

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendationExplanation {
  timestamp: string;

  readinessImpact:    number;   // percentage points, signed
  recoveryImpact:     number;
  cycleImpact:        number;
  adherenceImpact:    number;
  uncertaintyImpact:  number;
  momentumImpact:     number;
  symptomImpact:      number;
  burnoutImpact:      number;

  baseVolumeScale:    number;   // 1.0
  finalVolumeScale:   number;   // actual (e.g. 0.82)

  primaryDrivers:     string[];

  confidenceLevel:    "high" | "medium" | "low";
  explanationSummary: string;
}

export interface ExplanationInput {
  readinessScore:      number;
  readinessCategory:   string;
  recoveryScore:       number;
  cyclePhase:          string;
  adherenceScale:      number;       // finalAdherenceScale
  uncertaintyModifier: number;       // prevSessionUncertainty?.volumeModifier ?? 1.0
  burnoutRiskScore:    number;
  fatigueScore:        number;
  symptomCount:        number;
  symptomSeverityMean: number;
  momentumLevel:       string;       // Phase 35 momentum level
  finalVolumeScale:    number;       // from trainingDecisionVal
  confidenceLevel:     "high" | "medium" | "low";
  todayDate:           string;
}

// ─── Per-signal raw contribution coefficients ─────────────────────────────────

const READINESS_NEUTRAL  = 70;
const RECOVERY_NEUTRAL   = 70;
const BURNOUT_NEUTRAL    = 30;
const FATIGUE_NEUTRAL    = 50;

// Maps cycle phase name to inherent volume modifier (fraction, -1 to +1)
function cyclePhaseRawImpact(phase: string): number {
  const p = phase.toLowerCase();
  if (p.includes("menstrual"))  return -0.05;
  if (p.includes("follicular")) return  0.02;
  if (p.includes("ovulat"))     return  0.05;
  if (p.includes("luteal"))     return -0.03;
  return 0;
}

// Maps Phase 35 momentum level to inherent volume modifier
function momentumRawImpact(level: string): number {
  const l = level.toLowerCase();
  if (l === "strong" || l === "improving" || l === "building") return  0.03;
  if (l === "declining" || l === "fading")                     return -0.02;
  return 0;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateRecommendationExplanation(
  input: ExplanationInput,
): RecommendationExplanation {
  const {
    readinessScore, recoveryScore, cyclePhase,
    adherenceScale, uncertaintyModifier,
    burnoutRiskScore, fatigueScore,
    symptomCount, symptomSeverityMean,
    momentumLevel, finalVolumeScale,
    confidenceLevel, todayDate,
  } = input;

  // Raw (unscaled) contributions in fractional units
  const rawReadiness   = (readinessScore  - READINESS_NEUTRAL) * 0.004;
  const rawRecovery    = (recoveryScore   - RECOVERY_NEUTRAL)  * 0.003;
  const rawBurnout     = (BURNOUT_NEUTRAL - burnoutRiskScore)  * 0.002;
  const rawFatigue     = (FATIGUE_NEUTRAL - fatigueScore)      * 0.0015;
  const rawCycle       = cyclePhaseRawImpact(cyclePhase);
  const rawAdherence   = adherenceScale - 1.0;
  const rawUncertainty = uncertaintyModifier - 1.0;
  const rawSymptoms    = -(symptomCount * 0.012 + symptomSeverityMean * 0.018);
  const rawMomentum    = momentumRawImpact(momentumLevel);

  const rawSum = rawReadiness + rawRecovery + rawBurnout + rawFatigue +
                 rawCycle + rawAdherence + rawUncertainty + rawSymptoms + rawMomentum;

  // Calibrate so contributions sum to actual delta
  const actualDelta = finalVolumeScale - 1.0;
  const scale = Math.abs(rawSum) > 0.001 ? actualDelta / rawSum : 1.0;

  // Convert to integer percentage-point impacts
  const pp = (v: number) => Math.round(v * scale * 100);

  const readinessImpact   = pp(rawReadiness);
  const recoveryImpact    = pp(rawRecovery);
  const burnoutImpact     = pp(rawBurnout);
  const symptomImpact     = pp(rawSymptoms + rawFatigue); // group fatigue + symptoms
  const cycleImpact       = pp(rawCycle);
  const adherenceImpact   = pp(rawAdherence);
  const uncertaintyImpact = pp(rawUncertainty);
  const momentumImpact    = pp(rawMomentum);

  // Build primary drivers (largest magnitude, negative = reducing volume)
  const drivers: Array<{ label: string; impact: number }> = [
    { label: "Low readiness",          impact: readinessImpact   < -3 ? readinessImpact   : 0 },
    { label: "Strong readiness",       impact: readinessImpact   >  3 ? readinessImpact   : 0 },
    { label: "Recovery deficit",       impact: recoveryImpact    < -3 ? recoveryImpact    : 0 },
    { label: "Strong recovery",        impact: recoveryImpact    >  3 ? recoveryImpact    : 0 },
    { label: "High burnout risk",      impact: burnoutImpact     < -3 ? burnoutImpact     : 0 },
    { label: "Elevated adherence risk",impact: adherenceImpact   < -2 ? adherenceImpact   : 0 },
    { label: "Symptom burden",         impact: symptomImpact     < -2 ? symptomImpact     : 0 },
    { label: "Cycle phase suppression",impact: cycleImpact       < -2 ? cycleImpact       : 0 },
    { label: "Cycle phase boost",      impact: cycleImpact       >  2 ? cycleImpact       : 0 },
    { label: "Prediction uncertainty", impact: uncertaintyImpact < -2 ? uncertaintyImpact : 0 },
    { label: "Building momentum",      impact: momentumImpact    >  1 ? momentumImpact    : 0 },
    { label: "Fading momentum",        impact: momentumImpact    < -1 ? momentumImpact    : 0 },
  ].filter(d => d.impact !== 0);

  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const primaryDrivers = drivers.slice(0, 3).map(d => d.label);

  if (primaryDrivers.length === 0) {
    primaryDrivers.push("All signals near baseline");
  }

  const explanationSummary = buildSummary(
    finalVolumeScale,
    primaryDrivers,
    readinessImpact,
    recoveryImpact,
    cycleImpact,
    symptomImpact,
    adherenceImpact,
    confidenceLevel,
  );

  return {
    timestamp: todayDate,
    readinessImpact,
    recoveryImpact,
    cycleImpact,
    adherenceImpact,
    uncertaintyImpact,
    momentumImpact,
    symptomImpact,
    burnoutImpact,
    baseVolumeScale: 1.0,
    finalVolumeScale,
    primaryDrivers,
    confidenceLevel,
    explanationSummary,
  };
}

// ─── Human-readable summary ───────────────────────────────────────────────────

function buildSummary(
  volumeScale:      number,
  primaryDrivers:   string[],
  readinessImpact:  number,
  recoveryImpact:   number,
  cycleImpact:      number,
  symptomImpact:    number,
  adherenceImpact:  number,
  confidence:       "high" | "medium" | "low",
): string {
  const direction = volumeScale >= 1.02
    ? "increased" : volumeScale <= 0.94
    ? "reduced"   : "kept close to normal";

  const parts: string[] = [];

  if (readinessImpact < -3) {
    parts.push("lower-than-usual readiness");
  } else if (readinessImpact > 3) {
    parts.push("strong readiness today");
  }

  if (recoveryImpact < -3) {
    parts.push("a recovery deficit");
  } else if (recoveryImpact > 3) {
    parts.push("excellent recovery");
  }

  if (cycleImpact < -2) {
    parts.push("cycle phase patterns that typically call for more rest");
  } else if (cycleImpact > 2) {
    parts.push("a phase in your cycle that supports higher output");
  }

  if (symptomImpact < -2) {
    parts.push("current symptoms");
  }

  if (adherenceImpact < -2) {
    parts.push("an elevated risk of skipping");
  }

  let reason = "";
  if (parts.length === 0) {
    reason = "All signals are close to your personal baseline.";
  } else if (parts.length === 1) {
    reason = `This is primarily because of ${parts[0]}.`;
  } else {
    const last = parts.pop()!;
    reason = `This is driven by ${parts.join(", ")} and ${last}.`;
  }

  const confidenceNote = confidence === "low"
    ? " Axis has limited history and is being cautious."
    : confidence === "medium"
    ? " Moderate confidence — the plan may refine further as more data accumulates."
    : "";

  return `Today's training volume has been ${direction}. ${reason}${confidenceNote}`.trim();
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export function saveRecommendationExplanation(explanation: RecommendationExplanation): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY_LATEST, JSON.stringify(explanation));
    appendToHistory(explanation);
  } catch {}
}

export function loadRecommendationExplanation(): RecommendationExplanation | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LATEST);
    return raw ? (JSON.parse(raw) as RecommendationExplanation) : null;
  } catch { return null; }
}

function appendToHistory(explanation: RecommendationExplanation): void {
  try {
    const raw     = localStorage.getItem(STORAGE_KEY_HISTORY);
    const history: RecommendationExplanation[] = raw ? JSON.parse(raw) : [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const pruned = history.filter(e => new Date(e.timestamp + "T12:00:00") >= cutoff);
    pruned.unshift(explanation);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(pruned.slice(0, MAX_HISTORY)));
  } catch {}
}

export function getRecommendationHistory(): RecommendationExplanation[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? (JSON.parse(raw) as RecommendationExplanation[]) : [];
  } catch { return []; }
}
