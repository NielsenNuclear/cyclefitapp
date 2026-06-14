// ─── lib/adaptive/readinessValidation.ts ─────────────────────────────────────
// Measures whether Axis's readiness prediction matched actual workout experience.

import type { ReadinessBadge } from "@/types/recommendation";
import type { WorkoutFeedback } from "@/lib/workoutExecution/feedback";

const VALIDATION_KEY = "axis_readiness_validation";
const RETENTION_DAYS = 180;

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadinessAccuracy {
  id:             string;         // YYYY-MM-DD
  date:           string;
  predictedBadge: ReadinessBadge;
  actualBadge:    ReadinessBadge; // derived from feedback
  correct:        boolean;
  sessionRPE:     number;
  savedAt:        string;
}

export interface AccuracyReport {
  last30Days:  number;  // 0–1 accuracy rate
  last90Days:  number;
  lifetime:    number;
  totalSamples: number;
}

// ─── Derive actual readiness from feedback ────────────────────────────────────
//
// Maps session RPE + recovery rating + performance rating → ReadinessBadge.
// This is the "ground truth" signal that tells us what the body actually needed.

export function deriveActualBadge(feedback: WorkoutFeedback): ReadinessBadge {
  const { sessionRPE, recoveryRating, performanceRating } = feedback;

  // Significant fatigue + high RPE + worse performance → should have recovered
  if (
    recoveryRating === "significant_fatigue" &&
    (sessionRPE >= 8 || performanceRating === "worse")
  ) return "Recover";

  // Moderate fatigue or high RPE with expected/worse performance → watch
  if (
    recoveryRating === "moderate_fatigue" ||
    (sessionRPE >= 8 && performanceRating !== "better")
  ) return "Watch";

  // Slight fatigue or average effort → maintain
  if (recoveryRating === "slight_fatigue" || sessionRPE >= 6) return "Maintain";

  // Fully recovered, good performance, low RPE → could have pushed
  return "Push";
}

// ─── Accuracy assessment ─────────────────────────────────────────────────────

export function assessPrediction(
  predictedBadge: ReadinessBadge,
  actualBadge:    ReadinessBadge,
): boolean {
  // Exact match or within one level counts as correct
  const ORDER: ReadinessBadge[] = ["Push", "Maintain", "Watch", "Recover"];
  const predictedIdx = ORDER.indexOf(predictedBadge);
  const actualIdx    = ORDER.indexOf(actualBadge);
  return Math.abs(predictedIdx - actualIdx) <= 1;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function loadValidations(): ReadinessAccuracy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VALIDATION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistValidations(entries: ReadinessAccuracy[]): void {
  if (typeof window === "undefined") return;
  try {
    const pruned = entries.filter(e => e.date >= cutoffDate(RETENTION_DAYS));
    localStorage.setItem(VALIDATION_KEY, JSON.stringify(pruned));
  } catch {}
}

export function saveReadinessValidation(entry: ReadinessAccuracy): void {
  const existing = loadValidations().filter(e => e.id !== entry.id);
  persistValidations([{ ...entry, savedAt: new Date().toISOString() }, ...existing]);
}

export function recordValidation(
  date:           string,
  predictedBadge: ReadinessBadge,
  feedback:       WorkoutFeedback,
): ReadinessAccuracy {
  const actualBadge = deriveActualBadge(feedback);
  const entry: ReadinessAccuracy = {
    id: date,
    date,
    predictedBadge,
    actualBadge,
    correct:    assessPrediction(predictedBadge, actualBadge),
    sessionRPE: feedback.sessionRPE,
    savedAt:    new Date().toISOString(),
  };
  saveReadinessValidation(entry);
  return entry;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function daysBefore(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function accuracyRate(entries: ReadinessAccuracy[]): number {
  if (entries.length === 0) return 0;
  return entries.filter(e => e.correct).length / entries.length;
}

export function getAccuracyReport(): AccuracyReport {
  const all  = loadValidations();
  if (all.length === 0) return { last30Days: 0, last90Days: 0, lifetime: 0, totalSamples: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const cut30 = daysBefore(today, 30);
  const cut90 = daysBefore(today, 90);

  return {
    last30Days:   accuracyRate(all.filter(e => e.date >= cut30)),
    last90Days:   accuracyRate(all.filter(e => e.date >= cut90)),
    lifetime:     accuracyRate(all),
    totalSamples: all.length,
  };
}

export function getAllValidations(): ReadinessAccuracy[] {
  return loadValidations();
}
