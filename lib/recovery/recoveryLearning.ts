// ─── lib/recovery/recoveryLearning.ts ────────────────────────────────────────
// Tracks which recovery strategies (rest day, sleep focus, deload, stress
// reduction) improve this user's recovery scores and readiness the following
// day. Idempotent per day — re-logging the same strategy updates rather than
// appends. Scoring happens the next morning once new scores are available.
// Storage key: axis_recovery_strategy_log

import type { RecoveryStrategyOutcome, StrategyVerdict } from "./recoveryTypes";

export type { RecoveryStrategyOutcome };

// ─── Internal entry ───────────────────────────────────────────────────────────

interface StrategyEntry {
  id:          string;             // `${date}_${strategy}` — idempotent key
  date:        string;             // YYYY-MM-DD when the strategy was applied
  strategy:    string;
  scored:      boolean;
  scoredDate?: string;
  outcome?:    "success" | "neutral" | "failure";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "axis_recovery_strategy_log";
const WINDOW_DAYS = 90;           // keep 3 months of strategy history

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadLog(): StrategyEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StrategyEntry[]) : [];
  } catch {
    return [];
  }
}

function persistLog(entries: StrategyEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.filter(e => e.date >= cutoffStr)),
  );
}

// ─── Strategy names (user-facing) ─────────────────────────────────────────────

const STRATEGY_LABELS: Record<string, string> = {
  sleep_focus:      "Sleep focus",
  stress_reduction: "Stress reduction",
  rest_day:         "Rest day",
  deload_week:      "Deload week",
};

export function strategyLabel(strategy: string): string {
  return STRATEGY_LABELS[strategy] ?? strategy.replace(/_/g, " ");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Records that a recovery strategy was applied on the given date.
 * Idempotent: calling twice on the same date + strategy is a no-op.
 *
 * Strategies: "sleep_focus" | "stress_reduction" | "rest_day" | "deload_week"
 */
export function logRecoveryStrategy(strategy: string, date?: string): void {
  const d   = date ?? new Date().toISOString().slice(0, 10);
  const id  = `${d}_${strategy}`;
  const log = loadLog();
  if (log.some(e => e.id === id)) return;   // already logged — idempotent
  persistLog([...log, { id, date: d, strategy, scored: false }]);
}

/**
 * Scores all unscored entries from `date` using today's and yesterday's signals.
 * Call once per day, after computing today's recovery score and readiness.
 *
 * @param date            The date whose strategies should be scored (yesterday's YYYY-MM-DD)
 * @param todayRecovery   Today's recovery score (0–100)
 * @param yesterdayRecovery Yesterday's recovery score (0–100)
 * @param todayReadiness  Today's readiness score (0–100)
 * @param yesterdayReadiness Yesterday's readiness score (0–100)
 * @param scoredDate      Today's date (written to scoredDate field for audit)
 */
export function scoreRecoveryStrategies(
  date:               string,
  todayRecovery:      number,
  yesterdayRecovery:  number,
  todayReadiness:     number,
  yesterdayReadiness: number,
  scoredDate:         string,
): void {
  const log = loadLog();
  const recoveryDelta  = todayRecovery  - yesterdayRecovery;
  const readinessDelta = todayReadiness - yesterdayReadiness;

  const outcome: "success" | "neutral" | "failure" =
    recoveryDelta >= 3 || readinessDelta >= 5      ? "success" :
    recoveryDelta <= -5 && readinessDelta <= -5    ? "failure" :
    "neutral";

  const updated = log.map(entry => {
    if (entry.date !== date || entry.scored) return entry;
    return { ...entry, scored: true, scoredDate, outcome };
  });

  persistLog(updated);
}

// ─── Aggregate outcomes ───────────────────────────────────────────────────────

function toVerdict(successRate: number, sampleSize: number): StrategyVerdict {
  if (sampleSize < 3)        return "uncertain";
  if (successRate >= 0.65)   return "effective";
  if (successRate <= 0.35)   return "ineffective";
  return "uncertain";
}

/**
 * Aggregates scored strategy entries into per-strategy outcome summaries.
 * Only includes strategies with at least 1 scored entry.
 * Sorted: effective first, then uncertain, then ineffective.
 */
export function getRecoveryStrategyOutcomes(): RecoveryStrategyOutcome[] {
  const log    = loadLog().filter(e => e.scored && e.outcome !== undefined);
  const byType = new Map<string, { successes: number; total: number }>();

  for (const entry of log) {
    const agg = byType.get(entry.strategy) ?? { successes: 0, total: 0 };
    agg.total++;
    if (entry.outcome === "success") agg.successes++;
    byType.set(entry.strategy, agg);
  }

  const VERDICT_ORDER: Record<StrategyVerdict, number> = {
    effective:   0,
    uncertain:   1,
    ineffective: 2,
  };

  return [...byType.entries()]
    .map(([strategy, { successes, total }]) => {
      const successRate = total === 0 ? 0 : successes / total;
      const verdict     = toVerdict(successRate, total);
      return {
        strategy,
        successRate: Math.round(successRate * 100) / 100,
        sampleSize:  total,
        verdict,
      };
    })
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]);
}
