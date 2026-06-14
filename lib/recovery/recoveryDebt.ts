// ─── lib/recovery/recoveryDebt.ts ────────────────────────────────────────────
// Rolling recovery debt accumulator. Tracks cumulative physiological stress
// load across days — a high debt signals that the user has been in a
// sustained deficit between stress and recovery.
// Storage key: axis_recovery_debt_log

import type { SymptomEntry }       from "@/lib/symptoms/symptomHistory";
import type { TrainingLoadReport } from "@/lib/analytics/trainingLoad";
import type { RecoveryDebt, DebtCategory, DebtTrend } from "./recoveryTypes";

export type { RecoveryDebt };

// ─── Storage types ────────────────────────────────────────────────────────────

interface DebtEntry {
  date:      string;   // YYYY-MM-DD
  debtScore: number;   // cumulative 0–100
  delta:     number;   // net change on this day
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY   = "axis_recovery_debt_log";
const NATURAL_DECAY = 2;    // baseline daily recovery credit even on busy days
const WINDOW_DAYS   = 28;   // oldest entries older than this are pruned

// Debt category thresholds
const DEBT_THRESHOLDS: { max: number; category: DebtCategory }[] = [
  { max:  15, category: "low"      },
  { max:  30, category: "moderate" },
  { max:  50, category: "elevated" },
  { max:  70, category: "high"     },
  { max: 100, category: "critical" },
];

const ELEVATED_THRESHOLD = 30;   // "elevated" and above

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadLog(): DebtEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DebtEntry[]) : [];
  } catch {
    return [];
  }
}

function persistLog(entries: DebtEntry[]): void {
  if (!isClient()) return;
  // Prune entries older than WINDOW_DAYS
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.filter(e => e.date >= cutoffStr)),
  );
}

// ─── Daily delta computation ──────────────────────────────────────────────────

const SLEEP_DELTA: Record<string, number> = {
  excellent: -5,
  good:       0,
  variable:  +3,
  poor:      +8,
};

function stressDebt(level: number): number {
  if (level <= 2) return -3;
  if (level <= 4) return  0;
  if (level <= 6) return +5;
  if (level <= 8) return +10;
  return +15;
}

function trainingDebt(
  workoutCompleted:  boolean,
  recoveryStatus:    TrainingLoadReport["recoveryStatus"],
  isDeloadWeek:      boolean,
): number {
  if (isDeloadWeek) return -5;
  if (!workoutCompleted) return 0;
  if (recoveryStatus === "High Fatigue")     return +8;
  if (recoveryStatus === "Elevated Fatigue") return +5;
  if (recoveryStatus === "Normal")           return +3;
  return 0;  // "Recovered" — training at this level doesn't add debt
}

function symptomDebt(symptoms: SymptomEntry[]): number {
  const SEVERITY_COST: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 5 };
  const total = symptoms.reduce((sum, s) => sum + (SEVERITY_COST[s.severity] ?? 1), 0);
  return Math.min(total, 10);  // cap at +10
}

// ─── Categorisation ───────────────────────────────────────────────────────────

function toCategory(score: number): DebtCategory {
  return DEBT_THRESHOLDS.find(t => score <= t.max)?.category ?? "critical";
}

function toTrend(entries: DebtEntry[]): DebtTrend {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 4) return "stable";

  const recent = sorted.slice(-3).map(e => e.debtScore);
  const prior  = sorted.slice(-6, -3).map(e => e.debtScore);
  if (prior.length < 2) return "stable";

  const meanRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const meanPrior  = prior.reduce((s, v) => s + v, 0)  / prior.length;
  const delta      = meanRecent - meanPrior;

  if (delta > +3) return "accumulating";
  if (delta < -3) return "reducing";
  return "stable";
}

function countDaysElevated(entries: DebtEntry[]): number {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const e of sorted) {
    if (e.debtScore >= ELEVATED_THRESHOLD) count++;
    else break;
  }
  return count;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RecoveryDebtInput {
  date:             string;
  sleepQuality:     "excellent" | "good" | "variable" | "poor";
  stressLevel:      number;
  symptoms:         SymptomEntry[];
  loadReport:       TrainingLoadReport;
  workoutCompleted: boolean;
  isDeloadWeek:     boolean;
}

/**
 * Updates the rolling debt log for today and returns the current debt state.
 * Idempotent per date — re-running on the same day updates rather than appends.
 */
export function updateRecoveryDebt(input: RecoveryDebtInput): RecoveryDebt {
  const log       = loadLog();
  const sortedLog = [...log].sort((a, b) => b.date.localeCompare(a.date));

  // Yesterday's debt is the starting point for today
  const prevEntry    = sortedLog.find(e => e.date < input.date);
  const previousDebt = prevEntry?.debtScore ?? 0;

  // Compute today's delta
  const sleepD    = SLEEP_DELTA[input.sleepQuality] ?? 0;
  const stressD   = stressDebt(input.stressLevel);
  const trainingD = trainingDebt(
    input.workoutCompleted,
    input.loadReport.recoveryStatus,
    input.isDeloadWeek,
  );
  const symptomD  = symptomDebt(input.symptoms);
  const delta     = sleepD + stressD + trainingD + symptomD - NATURAL_DECAY;

  const newDebt = Math.min(100, Math.max(0, Math.round(previousDebt + delta)));

  // Upsert today's entry
  const withoutToday = log.filter(e => e.date !== input.date);
  const updated      = [...withoutToday, { date: input.date, debtScore: newDebt, delta }];
  persistLog(updated);

  const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date));

  return {
    debtScore:    newDebt,
    category:     toCategory(newDebt),
    trend:        toTrend(sorted),
    daysElevated: countDaysElevated(sorted),
  };
}

/** Returns the current debt state without updating (read-only). */
export function getCurrentDebt(): RecoveryDebt | null {
  const log = loadLog();
  if (log.length === 0) return null;
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  return {
    debtScore:    latest.debtScore,
    category:     toCategory(latest.debtScore),
    trend:        toTrend(sorted),
    daysElevated: countDaysElevated(sorted),
  };
}
