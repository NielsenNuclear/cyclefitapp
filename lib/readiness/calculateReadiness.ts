// ─── lib/readiness/calculateReadiness.ts ─────────────────────────────────────
// Unified readiness scoring engine.
// Pure logic only — no localStorage, no React, no side effects.
//
// Converts sleep, stress, energy, training load, cycle phase, and adherence
// into a single 0–100 score with explainable per-contributor breakdown.

import type { OnboardingData }    from "@/lib/onboarding-types";
import type { PhaseData }         from "@/types/recommendation";
import type { TrainingLoadReport } from "@/lib/analytics/trainingLoad";
import type { ProgressionProfile } from "@/lib/progression/progressionProfile";
import type { AdaptiveProfile }   from "@/lib/adaptive-profile";
import {
  READINESS_WEIGHTS,
  SLEEP_RAW,
  LOAD_RAW,
  CYCLE_RAW,
  ENERGY_RAW,
  stressRaw,
  type ReadinessWeightKey,
} from "./readinessWeights";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessCategory =
  | "optimal"   // 90–100
  | "ready"     // 75–89
  | "moderate"  // 60–74
  | "cautious"  // 40–59
  | "recover";  // 0–39

export interface ReadinessContributors {
  sleep:        number;   // 0–100
  stress:       number;   // 0–100
  energy:       number;   // 0–100
  cycle:        number;   // 0–100
  trainingLoad: number;   // 0–100
  adherence:    number;   // 0–100
}

export interface ReadinessScore {
  score:        number;               // 0–100 composite
  category:     ReadinessCategory;
  contributors: ReadinessContributors;
  rationale:    string[];             // 1–3 data-backed sentences
}

// ─── Category mapping ─────────────────────────────────────────────────────────

function scoreToCategory(score: number): ReadinessCategory {
  if (score >= 90) return "optimal";
  if (score >= 75) return "ready";
  if (score >= 60) return "moderate";
  if (score >= 40) return "cautious";
  return "recover";
}

// ─── Energy level derivation ──────────────────────────────────────────────────
// Mirrors deriveEnergyLevel() in generateRecommendation.ts.
// Inlined here to avoid a circular dependency once Phase 12D wires
// generateRecommendation.ts to import calculateReadiness.ts.

const ENERGY_BASE_MAP: Record<string, number> = {
  consistent_high:  3,
  morning_peak:     3,
  afternoon_peak:   2,
  variable:         1,
  consistently_low: 0,
};

const SLEEP_MOD_MAP: Record<string, number> = {
  excellent:  1,
  good:       0,
  variable:  -1,
  poor:      -2,
};

function deriveEnergyLevel(
  user:           OnboardingData,
  adaptiveWeights?: AdaptiveProfile["readinessWeights"],
): number {
  const SLEEP_WEIGHT_BASELINE  = 25;
  const STRESS_WEIGHT_BASELINE = 17;

  const sleepScale  = adaptiveWeights
    ? Math.min(adaptiveWeights.sleep  / SLEEP_WEIGHT_BASELINE,  1.5)
    : 1.0;
  const stressScale = adaptiveWeights
    ? Math.min(adaptiveWeights.stress / STRESS_WEIGHT_BASELINE, 1.5)
    : 1.0;

  let mod = 0;
  mod += (SLEEP_MOD_MAP[user.sleepQuality] ?? 0) * sleepScale;

  const stressMod =
    user.stressLevel >= 8 ? -2 :
    user.stressLevel >= 6 ? -1 :
    user.stressLevel <= 3 ?  1 : 0;
  mod += stressMod * stressScale;

  if (user.sessionsPerWeek >= 5 && user.trainingLevel !== "competitive") mod -= 1;

  const base = ENERGY_BASE_MAP[user.energyPattern] ?? 2;
  return Math.max(0, Math.min(4, Math.round(base + mod)));
}

// ─── Per-contributor raw scores ───────────────────────────────────────────────

function sleepContributor(user: OnboardingData): number {
  return SLEEP_RAW[user.sleepQuality] ?? 50;
}

function stressContributor(user: OnboardingData): number {
  return stressRaw(user.stressLevel);
}

function energyContributor(
  user:            OnboardingData,
  adaptiveWeights?: AdaptiveProfile["readinessWeights"],
): number {
  const level = deriveEnergyLevel(user, adaptiveWeights);
  return ENERGY_RAW[level] ?? 60;
}

function cycleContributor(phase: PhaseData): number {
  return CYCLE_RAW[phase.name] ?? 60;
}

function trainingLoadContributor(loadReport: TrainingLoadReport): number {
  return LOAD_RAW[loadReport.recoveryStatus] ?? 60;
}

function adherenceContributor(profile: ProgressionProfile): number {
  // No history (confidence = 0) → neutral 50, not penalised
  if (profile.confidence === 0) return 50;
  return profile.adherenceScore;
}

// ─── Weight personalisation ───────────────────────────────────────────────────
// When AdaptiveProfile is present, its per-user weights replace the defaults
// for sleep/stress/energy/cycle. The AdaptiveProfile "recovery" field maps to
// trainingLoad (60%) and adherence (40%). All six weights are then normalised
// so they sum to exactly 1.0.

function resolveWeights(
  adaptiveProfile?: AdaptiveProfile,
): Record<ReadinessWeightKey, number> {
  if (!adaptiveProfile) return { ...READINESS_WEIGHTS };

  const ap = adaptiveProfile.readinessWeights;
  const raw: Record<ReadinessWeightKey, number> = {
    sleep:        ap.sleep,
    stress:       ap.stress,
    energy:       ap.energy,
    cycle:        ap.cyclePhase,
    trainingLoad: ap.recovery * 0.6,
    adherence:    ap.recovery * 0.4,
  };

  const total = (Object.values(raw) as number[]).reduce((s, v) => s + v, 0);
  if (total === 0) return { ...READINESS_WEIGHTS };

  return {
    sleep:        raw.sleep        / total,
    stress:       raw.stress       / total,
    energy:       raw.energy       / total,
    cycle:        raw.cycle        / total,
    trainingLoad: raw.trainingLoad / total,
    adherence:    raw.adherence    / total,
  };
}

// ─── Rationale generation ─────────────────────────────────────────────────────
// Produces 1–3 data-backed sentences. Each sentence is tied to a specific
// contributor value — no generic wellness language.

function buildRationale(c: ReadinessContributors): string[] {
  const lines: string[] = [];

  // Sleep
  if (c.sleep <= 40) {
    lines.push("Sleep quality is the primary limiting factor on today's readiness.");
  } else if (c.sleep >= 100) {
    lines.push("Excellent sleep quality is supporting full readiness today.");
  }

  // Stress
  if (c.stress <= 45) {
    lines.push(`Elevated stress (score ${c.stress}/100) is reducing physiological recovery capacity.`);
  } else if (c.stress >= 85) {
    lines.push("Stress levels are low, supporting optimal hormonal recovery.");
  }

  // Energy
  if (c.energy <= 40) {
    lines.push("Derived energy signals indicate reduced training capacity — lower than baseline.");
  } else if (c.energy >= 80) {
    lines.push("Energy signals are above baseline and support a full training stimulus.");
  }

  // Training load
  if (c.trainingLoad <= 40) {
    lines.push("Recent training load shows accumulated fatigue — recovery is the priority signal.");
  } else if (c.trainingLoad >= 85) {
    lines.push("Training load and recovery markers are well-balanced this week.");
  }

  // Cycle
  if (c.cycle <= 40) {
    lines.push("Current cycle phase is associated with reduced training tolerance for many women.");
  } else if (c.cycle >= 80) {
    lines.push("Cycle phase is supportive of higher training output.");
  }

  // Adherence (only comment when extreme)
  if (c.adherence >= 85) {
    lines.push("Strong recent training consistency is a positive readiness signal.");
  } else if (c.adherence <= 25) {
    lines.push("Low recent adherence limits the precision of the readiness estimate.");
  }

  if (lines.length === 0) {
    lines.push("All readiness signals are within a balanced range — no dominant positive or negative driver.");
  }

  // Cap at 3 lines to avoid information overload
  return lines.slice(0, 3);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ReadinessInput {
  user:               OnboardingData;
  phase:              PhaseData;
  loadReport:         TrainingLoadReport;
  progressionProfile: ProgressionProfile;
  adaptiveProfile?:   AdaptiveProfile;
}

export function calculateReadiness(input: ReadinessInput): ReadinessScore {
  const { user, phase, loadReport, progressionProfile, adaptiveProfile } = input;

  const weights = resolveWeights(adaptiveProfile);
  const aw      = adaptiveProfile?.readinessWeights;

  const contributors: ReadinessContributors = {
    sleep:        sleepContributor(user),
    stress:       stressContributor(user),
    energy:       energyContributor(user, aw),
    cycle:        cycleContributor(phase),
    trainingLoad: trainingLoadContributor(loadReport),
    adherence:    adherenceContributor(progressionProfile),
  };

  const raw =
    contributors.sleep        * weights.sleep        +
    contributors.stress       * weights.stress       +
    contributors.energy       * weights.energy       +
    contributors.cycle        * weights.cycle        +
    contributors.trainingLoad * weights.trainingLoad +
    contributors.adherence    * weights.adherence;

  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    category:     scoreToCategory(score),
    contributors,
    rationale:    buildRationale(contributors),
  };
}
