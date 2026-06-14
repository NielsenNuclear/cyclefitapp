// ─── lib/recovery/recoveryScore.ts ───────────────────────────────────────────
// Canonical Recovery Score 2.0 — retrospective measure of current recovery
// state (distinct from readiness, which is predictive).
// Saves one entry per day to axis_recovery_scores for trend analysis.

import type { SymptomEntry }       from "@/lib/symptoms/symptomHistory";
import type { TrainingLoadReport } from "@/lib/analytics/trainingLoad";
import type {
  RecoveryScore,
  RecoveryCategory,
  RecoveryContributor,
} from "./recoveryTypes";

export type { RecoveryScore };

// ─── Input ────────────────────────────────────────────────────────────────────

export interface RecoveryScoreInput {
  date:         string;                                    // YYYY-MM-DD
  sleepQuality: "excellent" | "good" | "variable" | "poor";
  stressLevel:  number;                                    // 1–10
  symptoms:     SymptomEntry[];                            // today's logged symptoms
  loadReport:   TrainingLoadReport;
  cyclePhase?:  string;                                    // minor modifier, optional
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "axis_recovery_scores";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadScores(): RecoveryScore[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecoveryScore[]) : [];
  } catch {
    return [];
  }
}

/** Upserts today's recovery score (one entry per calendar day). */
export function saveRecoveryScore(score: RecoveryScore): void {
  if (!isClient()) return;
  const others = loadScores().filter(s => s.date !== score.date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([score, ...others]));
}

/** Returns all stored recovery scores, newest first. */
export function getRecoveryScores(): RecoveryScore[] {
  return loadScores().sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Scoring tables ───────────────────────────────────────────────────────────

const SLEEP_DELTA: Record<string, number> = {
  excellent:  20,
  good:       10,
  variable:    0,
  poor:      -20,
};

function stressDelta(level: number): number {
  if (level <= 2) return  10;
  if (level <= 4) return   5;
  if (level <= 6) return   0;
  if (level <= 8) return -10;
  return -20;
}

// Recovery impact weight per symptom type — multiplied by severity (0–3).
// A weight of 5 → severity 3 contributes −15.
const SYMPTOM_WEIGHT: Record<string, number> = {
  fatigue:            5,
  energy:             5,    // low-energy symptom = fatigue analog
  motivation:         4,
  "sleep-quality":    4,    // as a *symptom*, separate from check-in sleep
  stress:             3.5,
  cramps:             3,
  headache:           3,
  "mood-changes":     2.5,
  bloating:           2,
  "breast-tenderness":1.5,
};
const DEFAULT_SYMPTOM_WEIGHT = 1.5;

// Minimum contribution for any logged symptom (even severity 0 = "present but minimal")
const MIN_SEVERITY_FACTOR = 0.6;

function symptomDelta(symptoms: SymptomEntry[]): { delta: number; contributors: RecoveryContributor[] } {
  const contributors: RecoveryContributor[] = [];
  let delta = 0;

  for (const s of symptoms) {
    const weight  = SYMPTOM_WEIGHT[s.symptomId] ?? DEFAULT_SYMPTOM_WEIGHT;
    const factor  = s.severity === 0 ? MIN_SEVERITY_FACTOR : s.severity;
    const contrib = -Math.round(weight * factor);
    delta += contrib;
    contributors.push({
      factor:       s.symptomId.replace(/-/g, " "),
      contribution: contrib,
      note:         `severity ${s.severity}`,
    });
  }

  return { delta, contributors };
}

const CYCLE_PHASE_DELTA: Record<string, number> = {
  "Menstrual Phase":     -5,
  "Pre-Menstrual Phase": -3,
  "Follicular Phase":     3,
  "Ovulation Phase":      5,
  "Luteal Phase":         0,
};

function loadDelta(loadReport: TrainingLoadReport): { delta: number; note: string } {
  let delta = 0;
  const notes: string[] = [];

  // Fatigue from current recovery status
  if (loadReport.recoveryStatus === "High Fatigue") {
    delta -= 10;
    notes.push("high training fatigue");
  } else if (loadReport.recoveryStatus === "Elevated Fatigue") {
    delta -= 5;
    notes.push("elevated training fatigue");
  } else if (loadReport.recoveryStatus === "Recovered") {
    delta += 5;
    notes.push("well recovered from training");
  }

  // Acute/chronic load spike (weeklyVolume vs previousWeekVolume)
  const prev = loadReport.previousWeekVolume;
  if (prev > 0) {
    const ratio = loadReport.weeklyVolume / prev;
    if (ratio > 1.3) {
      delta -= 10;
      notes.push("load spike this week");
    } else if (ratio > 1.15) {
      delta -= 5;
      notes.push("moderate load increase");
    }
  }

  return { delta, note: notes.join("; ") || "training load nominal" };
}

// ─── Category mapping ─────────────────────────────────────────────────────────

function toCategory(score: number): RecoveryCategory {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  if (score >= 35) return "Compromised";
  return "Poor";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes today's canonical recovery score from physiological signals.
 * Also persists it to axis_recovery_scores for trend analysis.
 */
export function computeRecoveryScore(input: RecoveryScoreInput): RecoveryScore {
  const BASE = 70;
  const contributors: RecoveryContributor[] = [];

  // ── Sleep ──────────────────────────────────────────────────────────────────
  const sleepDelta = SLEEP_DELTA[input.sleepQuality] ?? 0;
  contributors.push({
    factor:       "Sleep",
    contribution: sleepDelta,
    note:         input.sleepQuality,
  });

  // ── Stress ─────────────────────────────────────────────────────────────────
  const sDelta = stressDelta(input.stressLevel);
  contributors.push({
    factor:       "Stress",
    contribution: sDelta,
    note:         `level ${input.stressLevel}/10`,
  });

  // ── Symptoms ───────────────────────────────────────────────────────────────
  const { delta: symDelta, contributors: symContributors } = symptomDelta(input.symptoms);
  contributors.push(...symContributors);

  // ── Training Load ──────────────────────────────────────────────────────────
  const { delta: lDelta, note: lNote } = loadDelta(input.loadReport);
  contributors.push({
    factor:       "Training Load",
    contribution: lDelta,
    note:         lNote,
  });

  // ── Cycle Phase (minor) ───────────────────────────────────────────────────
  if (input.cyclePhase) {
    const pDelta = CYCLE_PHASE_DELTA[input.cyclePhase] ?? 0;
    if (pDelta !== 0) {
      contributors.push({
        factor:       "Cycle Phase",
        contribution: pDelta,
        note:         input.cyclePhase,
      });
    }
  }

  const rawScore = BASE + sleepDelta + sDelta + symDelta + lDelta +
    (input.cyclePhase ? (CYCLE_PHASE_DELTA[input.cyclePhase] ?? 0) : 0);

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const result: RecoveryScore = {
    score,
    category:     toCategory(score),
    contributors: contributors.filter(c => c.contribution !== 0),
    date:         input.date,
  };

  saveRecoveryScore(result);
  return result;
}
