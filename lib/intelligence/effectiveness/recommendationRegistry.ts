// ─── lib/intelligence/effectiveness/recommendationRegistry.ts ────────────────
// Phase 58A — Recommendation Registry
// Stores every recommendation event for later effectiveness evaluation.
// One event registered per session; evaluated after the 7-day outcome window.

const STORAGE_KEY    = "axis_rec_effectiveness_v1";
const MAX_RECORDS    = 500;
const RETENTION_DAYS = 90;
const EVAL_HORIZON   = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecommendationType =
  | "volume_increase"
  | "volume_decrease"
  | "volume_maintain"
  | "deload"
  | "recovery_focus"
  | "workout_mode_change";

export interface OutcomeMetrics {
  readinessDelta:  number;     // mean readiness score change (vs day-of)
  recoveryDelta:   number;     // mean recovery score change
  completionRate:  number;     // 0-1, workouts completed in window
  adherenceDelta:  number;     // adherence rate delta vs prior 7 days
  sampleSize:      number;     // days of data in evaluation window
}

export interface RecommendationEvent {
  id:                    string;
  timestamp:             string;             // YYYY-MM-DD when registered
  recommendationType:    RecommendationType;
  triggerFactors:        string[];
  volumeScale:           number;
  workoutMode:           string;
  readinessAtDecision:   number;
  recoveryAtDecision:    number;
  evaluationDueDate:     string;             // YYYY-MM-DD
  evaluated:             boolean;
  effectivenessScore?:   number;             // 0-1
  outcome?:              "helpful" | "neutral" | "harmful";
  outcomeMetrics?:       OutcomeMetrics;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

export function loadRecommendationRegistry(): RecommendationEvent[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as RecommendationEvent[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cut = cutoff.toISOString().slice(0, 10);
    return all.filter(e => e.timestamp >= cut);
  } catch { return []; }
}

export function saveRecommendationRegistry(events: RecommendationEvent[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_RECORDS)));
  } catch {}
}

// ─── Classification helpers ───────────────────────────────────────────────────

export function classifyRecommendationType(
  volumeScale:  number,
  isDeload:     boolean,
  workoutMode:  string,
): RecommendationType {
  if (isDeload) return "deload";
  if (workoutMode === "recovery") return "recovery_focus";
  if (workoutMode === "minimum_effective") return "recovery_focus";
  if (workoutMode === "condensed") return "workout_mode_change";
  if (volumeScale >= 1.05) return "volume_increase";
  if (volumeScale <= 0.92) return "volume_decrease";
  return "volume_maintain";
}

export function deriveTriggerFactors(
  readinessScore:   number,
  recoveryScore:    number,
  burnoutScore:     number,
  fatigueScore:     number,
  adherenceRisk:    string,
  symptomCount:     number,
): string[] {
  const factors: string[] = [];
  if (readinessScore < 55)  factors.push("low_readiness");
  if (readinessScore > 80)  factors.push("high_readiness");
  if (recoveryScore  < 55)  factors.push("poor_recovery");
  if (recoveryScore  > 80)  factors.push("strong_recovery");
  if (burnoutScore   > 60)  factors.push("burnout_risk");
  if (fatigueScore   > 60)  factors.push("high_fatigue");
  if (adherenceRisk !== "low") factors.push("adherence_risk");
  if (symptomCount   > 2)   factors.push("symptoms");
  return factors;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerRecommendationEvent(
  type:            RecommendationType,
  triggerFactors:  string[],
  volumeScale:     number,
  workoutMode:     string,
  readiness:       number,
  recovery:        number,
  today:           string,
): RecommendationEvent {
  const dueDate = (() => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() + EVAL_HORIZON);
    return d.toISOString().slice(0, 10);
  })();

  const event: RecommendationEvent = {
    id:                    `rec_${today}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp:             today,
    recommendationType:    type,
    triggerFactors,
    volumeScale,
    workoutMode,
    readinessAtDecision:   readiness,
    recoveryAtDecision:    recovery,
    evaluationDueDate:     dueDate,
    evaluated:             false,
  };

  const existing = loadRecommendationRegistry();
  // One event per day (idempotent)
  const deduped = existing.filter(e => e.timestamp !== today);
  saveRecommendationRegistry([...deduped, event]);
  return event;
}

export function getPendingEvaluations(today: string): RecommendationEvent[] {
  return loadRecommendationRegistry().filter(
    e => !e.evaluated && e.evaluationDueDate <= today,
  );
}

export function markEventEvaluated(
  id:          string,
  score:       number,
  outcome:     RecommendationEvent["outcome"],
  metrics:     OutcomeMetrics,
): void {
  const all = loadRecommendationRegistry();
  const updated = all.map(e =>
    e.id === id
      ? { ...e, evaluated: true, effectivenessScore: score, outcome, outcomeMetrics: metrics }
      : e,
  );
  saveRecommendationRegistry(updated);
}

export function getEvaluatedEvents(): RecommendationEvent[] {
  return loadRecommendationRegistry().filter(e => e.evaluated);
}
