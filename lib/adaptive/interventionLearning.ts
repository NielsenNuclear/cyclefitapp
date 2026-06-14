// ─── lib/adaptive/interventionLearning.ts ────────────────────────────────────
// Tracks recommendations and their next-day outcomes so the system learns
// which interventions actually work for this specific user.
// Storage key: axis_intervention_log

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterventionOutcomeStatus =
  | "success"   // workout completed AND readiness held/improved
  | "failure"   // workout skipped AND readiness dropped
  | "neutral"   // mixed signals
  | "unknown";  // not yet scored (waiting for next-day data)

export interface InterventionRecord {
  id:               string;   // "{date}_{type}" — deduplication key
  date:             string;   // YYYY-MM-DD intervention was logged
  interventionType: string;   // e.g. "deload", "increase_load", "plateau_intensity"
  description:      string;   // human-readable rationale logged at the time
  outcome:          InterventionOutcomeStatus;
  workoutCompleted: boolean;  // filled in when scored
  readinessDelta:   number;   // today − yesterday readiness (filled in when scored)
  scoredDate?:      string;   // YYYY-MM-DD the outcome was determined
}

export interface InterventionOutcome {
  interventionType: string;
  successRate:      number;   // 0–1 (successes / scored records)
  sampleSize:       number;   // scored records for this type
  verdict:          "effective" | "ineffective" | "uncertain";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "axis_intervention_log";

// Readiness delta thresholds for scoring
const SUCCESS_DELTA  =   0;   // ≥ 0 = held/improved → positive signal
const FAILURE_DELTA  =  -5;   // ≤ −5 = worsened → negative signal

// Outcome verdict thresholds
const EFFECTIVE_RATE   = 0.65;
const INEFFECTIVE_RATE = 0.35;
const MIN_VERDICT_SAMPLE = 3;

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadRecords(): InterventionRecord[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterventionRecord[];
  } catch {
    return [];
  }
}

function persistRecords(records: InterventionRecord[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ─── Outcome scoring ──────────────────────────────────────────────────────────

function scoreOutcome(
  readinessDelta:   number,
  workoutCompleted: boolean,
): InterventionOutcomeStatus {
  if (workoutCompleted && readinessDelta >= SUCCESS_DELTA) return "success";
  if (!workoutCompleted && readinessDelta <= FAILURE_DELTA) return "failure";
  return "neutral";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Logs a single intervention for today (idempotent — same date+type is a no-op).
 */
export function logIntervention(
  interventionType: string,
  description:      string,
  date:             string = new Date().toISOString().slice(0, 10),
): void {
  const id      = `${date}_${interventionType}`;
  const records = loadRecords();
  if (records.some(r => r.id === id)) return;  // already logged today

  persistRecords([
    ...records,
    {
      id,
      date,
      interventionType,
      description,
      outcome:          "unknown",
      workoutCompleted: false,
      readinessDelta:   0,
    },
  ]);
}

/**
 * Scores any "unknown" records from a given date using next-day data.
 * Call once per dashboard load, passing yesterday's date + today's context.
 */
export function scoreInterventions(
  date:               string,   // YYYY-MM-DD of the interventions to score
  todayReadiness:     number,
  yesterdayReadiness: number,
  workoutCompleted:   boolean,
  scoredDate:         string,   // YYYY-MM-DD today (when scoring happens)
): void {
  const records    = loadRecords();
  const delta      = todayReadiness - yesterdayReadiness;
  const outcome    = scoreOutcome(delta, workoutCompleted);

  const updated = records.map(r => {
    if (r.date !== date || r.outcome !== "unknown") return r;
    return {
      ...r,
      outcome,
      workoutCompleted,
      readinessDelta: Math.round(delta * 10) / 10,
      scoredDate,
    };
  });

  persistRecords(updated);
}

/**
 * Returns all stored intervention records, newest first.
 */
export function getAllInterventionRecords(): InterventionRecord[] {
  return loadRecords().sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Aggregates scored records by intervention type into outcome summaries.
 * Types with fewer than MIN_VERDICT_SAMPLE scored records return "uncertain".
 */
export function getInterventionOutcomes(): InterventionOutcome[] {
  const scored = loadRecords().filter(
    r => r.outcome === "success" || r.outcome === "failure" || r.outcome === "neutral",
  );

  const grouped = new Map<string, InterventionRecord[]>();
  for (const r of scored) {
    const list = grouped.get(r.interventionType) ?? [];
    list.push(r);
    grouped.set(r.interventionType, list);
  }

  const outcomes: InterventionOutcome[] = [];

  for (const [interventionType, records] of grouped) {
    const successes  = records.filter(r => r.outcome === "success").length;
    const sampleSize = records.length;
    const successRate = Math.round((successes / sampleSize) * 100) / 100;

    let verdict: InterventionOutcome["verdict"] = "uncertain";
    if (sampleSize >= MIN_VERDICT_SAMPLE) {
      if (successRate >= EFFECTIVE_RATE)    verdict = "effective";
      else if (successRate <= INEFFECTIVE_RATE) verdict = "ineffective";
    }

    outcomes.push({ interventionType, successRate, sampleSize, verdict });
  }

  return outcomes.sort((a, b) => b.sampleSize - a.sampleSize);
}
