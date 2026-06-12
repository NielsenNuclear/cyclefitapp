// ─── lib/adaptive/recoveryLearning.ts ────────────────────────────────────────
// Learns how the user actually recovers vs what Axis predicted, per cycle phase.

import type { PhaseName } from "@/types/recommendation";
import type { WorkoutFeedback, RecoveryRating } from "@/lib/workoutExecution/feedback";
import type { ReadinessAccuracy } from "@/lib/adaptive/readinessValidation";

const LEARNING_KEY = "axis_recovery_learning";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryResponsePattern {
  phase:            PhaseName;
  expectedRecovery: number;    // population mean recovery score (0–100)
  actualRecovery:   number;    // user mean recovery score derived from feedback
  deviation:        number;    // actualRecovery - expectedRecovery (positive = better than expected)
  sampleCount:      number;
}

// ─── Recovery rating → numeric score ─────────────────────────────────────────

const RECOVERY_SCORES: Record<RecoveryRating, number> = {
  fully_recovered:    100,
  slight_fatigue:      67,
  moderate_fatigue:    33,
  significant_fatigue:  0,
};

// Population baseline recovery expectation per phase (0–100)
const PHASE_BASELINES: Partial<Record<PhaseName, number>> = {
  Menstrual:    50,
  Follicular:   75,
  Ovulatory:    80,
  Luteal:       65,
  "Late Luteal": 45,
};

// ─── Stored entry ─────────────────────────────────────────────────────────────

interface RecoveryObservation {
  date:          string;
  phase:         PhaseName;
  recoveryScore: number;
  sessionRPE:    number;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function loadObservations(): RecoveryObservation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistObservations(obs: RecoveryObservation[]): void {
  try {
    localStorage.setItem(LEARNING_KEY, JSON.stringify(obs));
  } catch {}
}

/**
 * Record a new recovery observation from workout feedback + the predicted phase.
 * Called after the user submits session feedback.
 */
export function recordRecoveryObservation(
  feedback:    WorkoutFeedback,
  phase:       PhaseName,
): void {
  const recoveryScore = RECOVERY_SCORES[feedback.recoveryRating];
  const observation: RecoveryObservation = {
    date:  feedback.date,
    phase,
    recoveryScore,
    sessionRPE: feedback.sessionRPE,
  };
  const existing = loadObservations().filter(o => o.date !== observation.date);
  persistObservations([observation, ...existing]);
}

// ─── Pattern computation ──────────────────────────────────────────────────────

/**
 * Computes per-phase recovery response patterns from the full observation history.
 * Requires ≥3 observations per phase to report a pattern.
 */
export function getRecoveryResponsePatterns(): RecoveryResponsePattern[] {
  const observations = loadObservations();
  if (observations.length === 0) return [];

  const byPhase = new Map<PhaseName, RecoveryObservation[]>();

  for (const obs of observations) {
    const list = byPhase.get(obs.phase) ?? [];
    list.push(obs);
    byPhase.set(obs.phase, list);
  }

  const patterns: RecoveryResponsePattern[] = [];

  for (const [phase, obs] of byPhase) {
    if (obs.length < 3) continue;

    const actualRecovery   = obs.reduce((s, o) => s + o.recoveryScore, 0) / obs.length;
    const expectedRecovery = PHASE_BASELINES[phase] ?? 60;

    patterns.push({
      phase,
      expectedRecovery,
      actualRecovery:  Math.round(actualRecovery),
      deviation:       Math.round(actualRecovery - expectedRecovery),
      sampleCount:     obs.length,
    });
  }

  // Sort by absolute deviation descending (most deviant phase first)
  return patterns.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

/**
 * Returns validation entries that contributed to accuracy data,
 * useful for feeding into coaching memory in Phase 15F.
 */
export function getRecoveryDeviationSummary(
  validations: ReadinessAccuracy[],
): { overPerforming: string[]; underPerforming: string[] } {
  const over:  string[] = [];
  const under: string[] = [];

  for (const v of validations) {
    if (!v.correct) {
      const predicted = v.predictedBadge;
      const actual    = v.actualBadge;
      // Predicted harder than actual → user did better than expected
      const ORDER = ["Push", "Maintain", "Watch", "Recover"] as const;
      if (ORDER.indexOf(predicted) < ORDER.indexOf(actual)) {
        under.push(v.date);
      } else {
        over.push(v.date);
      }
    }
  }

  return { overPerforming: over, underPerforming: under };
}
