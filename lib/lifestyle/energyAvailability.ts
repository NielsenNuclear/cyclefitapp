// ─── lib/lifestyle/energyAvailability.ts ──────────────────────────────────────
// Phase 39E — Energy Availability Model.
// Distinct from training readiness ("Can I train?").
// Answers: "Do I realistically have capacity today?"
// Considers life context, not just physiology.
// Pure function — no storage.

import type { ActiveLifeEvent } from "@/lib/adherence/lifeEvents";
import type { BurnoutRisk }     from "@/lib/recovery/burnoutRisk";
import type { ScheduledLifeEventWithContext } from "./lifeStressCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnergyAvailabilityLevel = "low" | "moderate" | "high";

export interface EnergyAvailability {
  level:          EnergyAvailabilityLevel;
  score:          number;   // 0–100 composite
  factors:        string[];
  recommendation: string;
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface EnergyAvailabilityInput {
  readinessScore:         number;
  stressLevel:            number;    // 1–10
  sleepQuality:           string;    // "excellent" | "good" | "variable" | "poor"
  recoveryBankBalance:    number;    // 0–100
  activeLifeEvent:        ActiveLifeEvent | null;
  currentScheduledEvent:  ScheduledLifeEventWithContext | null;
  burnoutRisk:            BurnoutRisk;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function sleepScore(sq: string): number {
  switch (sq) {
    case "excellent": return 100;
    case "good":      return 75;
    case "variable":  return 45;
    case "poor":      return 20;
    default:          return 50;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeEnergyAvailability(input: EnergyAvailabilityInput): EnergyAvailability {
  const factors: string[] = [];

  // Readiness (physiological base): 35% weight
  const readinessCmp = clamp(input.readinessScore, 0, 100);

  // Sleep quality: 20% weight
  const sleepCmp = sleepScore(input.sleepQuality);

  // Stress (inverted — high stress = low capacity): 20% weight
  const stressCmp = clamp(100 - (input.stressLevel - 1) * 11, 0, 100);

  // Recovery bank: 15% weight
  const bankCmp = clamp(input.recoveryBankBalance, 0, 100);

  // Life event penalty: −20 flat (active life event present)
  const lifeEventPenalty = input.activeLifeEvent !== null ? 20 : 0;
  if (input.activeLifeEvent) {
    factors.push(`Active life event (${input.activeLifeEvent.type.replace("_", " ")}) is reducing available capacity.`);
  }

  // Scheduled event penalty: scales with volume scale (closer to 1 = less impact)
  const schedPenalty = input.currentScheduledEvent
    ? Math.round((1 - input.currentScheduledEvent.adjustments.volumeScale) * 25)
    : 0;
  if (input.currentScheduledEvent) {
    factors.push(`Scheduled event "${input.currentScheduledEvent.label}" is impacting today's capacity.`);
  }

  // Burnout risk modifier
  const burnoutPenalty =
    input.burnoutRisk.level === "severe"   ? 25
    : input.burnoutRisk.level === "high"   ? 15
    : input.burnoutRisk.level === "moderate" ? 8
    : 0;
  if (burnoutPenalty > 0) {
    factors.push("Elevated burnout risk is reducing overall capacity.");
  }

  // Composite (weighted, before penalties)
  const base = Math.round(
    readinessCmp * 0.35 +
    sleepCmp     * 0.20 +
    stressCmp    * 0.20 +
    bankCmp      * 0.15,
  );
  const score = clamp(base - lifeEventPenalty - schedPenalty - burnoutPenalty, 0, 100);

  // Classify
  let level: EnergyAvailabilityLevel;
  if (score >= 65) {
    level = "high";
  } else if (score >= 40) {
    level = "moderate";
  } else {
    level = "low";
  }

  // Contextual factors
  if (input.stressLevel >= 8)    factors.push("Very high stress is limiting energy availability.");
  if (input.sleepQuality === "poor") factors.push("Poor sleep is reducing today's capacity significantly.");
  if (input.recoveryBankBalance < 30) factors.push("Low recovery bank — extra rest will repay this debt.");

  const recommendation =
    level === "high"
      ? "You have good capacity today — a full training session is well-timed."
      : level === "moderate"
        ? "Moderate capacity — a condensed session is more realistic than a full one."
        : "Low capacity today — a minimum effective dose or rest day is the smarter choice.";

  return { level, score, factors, recommendation };
}
