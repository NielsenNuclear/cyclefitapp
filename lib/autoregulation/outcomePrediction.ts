// ─── lib/autoregulation/outcomePrediction.ts ─────────────────────────────────
// Phase 37F — Pre-workout session outcome prediction.
// Predicts success probability, expected quality, and fatigue cost.
// Stored before workout, validated after (Phase 37G).

import type { FatigueScoreEntry } from "./fatigueModel";
import type { TrainingDecision }  from "./trainingDecisionEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpectedQuality = "low" | "medium" | "high";
export type FatigueCostLevel = "minimal" | "low" | "medium" | "high";

export interface OutcomePrediction {
  date:                string;
  successProbability:  number;      // 0–100
  expectedQuality:     ExpectedQuality;
  fatigueCost:         FatigueCostLevel;
  rationale:           string;
}

export interface OutcomePredictionInput {
  readinessScore:     number;       // 0–100
  fatigueScore:       number;       // 0–100
  fatigueZone:        string;
  decisionType:       string;       // from TrainingDecision.type
  volumeModifier:     number;       // 0.4–1.2
  sessionName?:       string;
  adherenceRiskLevel: string;       // "low"|"moderate"|"high"
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_outcome_predictions";
const RETENTION_DAYS = 90;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadPredictions(): OutcomePrediction[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OutcomePrediction[]) : [];
  } catch {
    return [];
  }
}

function persistPredictions(entries: OutcomePrediction[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const pruned = entries.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function predictSessionOutcome(input: OutcomePredictionInput): OutcomePrediction {
  const date = new Date().toISOString().slice(0, 10);

  // Success probability: readiness drives this most
  let successProb = input.readinessScore;
  if (input.fatigueZone === "overreached") successProb -= 30;
  else if (input.fatigueZone === "fatigued") successProb -= 15;
  if (input.adherenceRiskLevel === "high")  successProb -= 15;
  else if (input.adherenceRiskLevel === "moderate") successProb -= 7;
  if (input.decisionType === "recover")     successProb -= 10;
  successProb = Math.min(100, Math.max(10, Math.round(successProb)));

  // Expected quality
  const expectedQuality: ExpectedQuality =
    successProb >= 75 ? "high"
    : successProb >= 50 ? "medium"
    : "low";

  // Fatigue cost: heavier sessions cost more recovery
  const volumeLoad = input.volumeModifier;
  const baseFatigueCost =
    volumeLoad >= 1.0 ? "high"
    : volumeLoad >= 0.85 ? "medium"
    : volumeLoad >= 0.65 ? "low"
    : "minimal";

  // Fatigued state amplifies cost
  const fatigueCost: FatigueCostLevel =
    input.fatigueZone === "overreached" ? "high"
    : input.fatigueZone === "fatigued" && baseFatigueCost === "low" ? "medium"
    : baseFatigueCost;

  const rationale =
    expectedQuality === "high" && fatigueCost === "low"
      ? "Conditions are strong — expect a quality session with manageable recovery cost."
    : expectedQuality === "high" && fatigueCost === "high"
      ? "High potential but significant fatigue cost — prioritise recovery after."
    : expectedQuality === "medium"
      ? "Moderate session expected — execution matters more than load today."
    : "Session will be challenging. Show up and move — completion itself is a win.";

  return { date, successProbability: successProb, expectedQuality, fatigueCost, rationale };
}

export function saveOutcomePrediction(prediction: OutcomePrediction): void {
  const stored = loadPredictions().filter(p => p.date !== prediction.date);
  stored.push(prediction);
  persistPredictions(stored);
}

export function getOutcomePrediction(date: string): OutcomePrediction | null {
  return loadPredictions().find(p => p.date === date) ?? null;
}
