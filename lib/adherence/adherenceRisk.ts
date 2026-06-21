// ─── lib/adherence/adherenceRisk.ts ──────────────────────────────────────────
// Phase 34E — Skip risk prediction.
// Synthesises weekday patterns, current phase, recent skip streak, and energy
// into a risk level used to scale workout volume (34F) and surface rescue sessions.

import type { AdherenceEntry } from "./adherenceTracker";
import type { BehaviorPatterns } from "./behaviorPatterns";
import { getWeekdayCompletionRate } from "./behaviorPatterns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high";

export interface AdherenceRisk {
  riskLevel:  RiskLevel;
  riskScore:  number;      // 0–1 raw composite
  confidence: number;      // 0–1 (increases with history depth)
  reasons:    string[];
}

// ─── High-risk phases ─────────────────────────────────────────────────────────

const HIGH_RISK_PHASES = new Set(["Late Luteal", "Menstrual"]);
const MODERATE_RISK_PHASES = new Set(["Luteal"]);

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeAdherenceRisk(
  history:      AdherenceEntry[],
  patterns:     BehaviorPatterns,
  todayWeekday: number,
  cyclePhase:   string,
  energyLevel:  number,   // 0–4
): AdherenceRisk {
  const reasons: string[] = [];
  let riskScore = 0.15;   // baseline

  // ── Layer 1: weekday pattern ─────────────────────────────────────────────
  const weekdayRate = getWeekdayCompletionRate(patterns, todayWeekday);
  if (weekdayRate !== null) {
    if (weekdayRate < 0.40) {
      riskScore += 0.25;
      reasons.push(`${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][todayWeekday]}s are historically your hardest day to train.`);
    } else if (weekdayRate < 0.60) {
      riskScore += 0.12;
      reasons.push(`You complete workouts less often on ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][todayWeekday]}s.`);
    }
  }

  // ── Layer 2: cycle phase ─────────────────────────────────────────────────
  if (HIGH_RISK_PHASES.has(cyclePhase)) {
    riskScore += 0.15;
    reasons.push(`${cyclePhase} phase is associated with lower training motivation and energy.`);
  } else if (MODERATE_RISK_PHASES.has(cyclePhase)) {
    riskScore += 0.07;
  }

  // ── Layer 3: recent skip streak ──────────────────────────────────────────
  const recent = [...history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const recentSkips = recent.filter(e => e.status === "skipped").length;
  if (recentSkips >= 2) {
    riskScore += 0.30;
    reasons.push("You've skipped multiple sessions recently — momentum is low.");
  } else if (recentSkips === 1) {
    riskScore += 0.12;
    reasons.push("You skipped a recent session — bounce-back session is important.");
  }

  // ── Layer 4: current energy ──────────────────────────────────────────────
  if (energyLevel <= 1) {
    riskScore += 0.20;
    reasons.push("Your energy and readiness are very low today.");
  } else if (energyLevel === 2) {
    riskScore += 0.08;
  }

  // ── Clamp and classify ───────────────────────────────────────────────────
  riskScore = Math.min(1, riskScore);

  const riskLevel: RiskLevel =
    riskScore >= 0.60 ? "high"
    : riskScore >= 0.35 ? "moderate"
    : "low";

  // ── Confidence: sigmoid on history depth ─────────────────────────────────
  // Reaches ~0.75 at 30 entries, ~0.95 at 60+
  const n = history.length;
  const confidence = Math.round((1 / (1 + Math.exp(-0.08 * (n - 20)))) * 100) / 100;

  if (reasons.length === 0) {
    reasons.push("Good conditions for training today — history supports completion.");
  }

  return { riskLevel, riskScore, confidence, reasons };
}

// Maps risk level to a volume scale multiplier applied in generateWorkout (34F)
export function riskToVolumeScale(risk: RiskLevel): number {
  if (risk === "high")     return 0.70;
  if (risk === "moderate") return 0.85;
  return 1.0;
}
