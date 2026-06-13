// ─── lib/cycle/cycleAccuracy.ts ───────────────────────────────────────────────
// Period history storage and cycle accuracy computation.
// Learns actual cycle length from observed inter-period gaps rather than
// relying solely on the user's reported onboarding value.

const STORAGE_KEY = "axis_period_history";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeriodEntry {
  startDate: string;  // YYYY-MM-DD
}

export interface CycleAccuracyReport {
  reportedLength:     number;  // from onboarding
  averageLength:      number;  // mean of observed inter-period gaps (1 dp)
  shortestLength:     number;  // shortest observed cycle
  longestLength:      number;  // longest observed cycle
  variability:        number;  // std dev of gaps in days (1 dp)
  predictionAccuracy: number;  // 0–1: how well reportedLength predicted actual dates (2 dp)
  cycleCount:         number;  // number of complete cycles observed (entries - 1)
  lastUpdated:        string;  // ISO date of most recent period entry
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadHistory(): PeriodEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(history: PeriodEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

// ─── Public storage API ───────────────────────────────────────────────────────

export function getPeriodHistory(): PeriodEntry[] {
  return loadHistory();
}

/**
 * Adds a period start date to history.
 * Deduplicates by date and keeps entries sorted ascending.
 * No-op if date is already recorded.
 */
export function logPeriod(date: string): void {
  const history = loadHistory();
  if (history.some(e => e.startDate === date)) return;
  history.push({ startDate: date });
  history.sort((a, b) => a.startDate.localeCompare(b.startDate));
  persistHistory(history);
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / msPerDay
  );
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * Derives cycle statistics from logged period history.
 * Returns null when fewer than 2 entries exist (no complete cycle observed yet).
 *
 * Prediction accuracy: for each observed gap, measures how closely the reported
 * length predicted it. 1.0 = perfect match; falls toward 0 as divergence grows.
 */
export function computeCycleAccuracy(
  history:        PeriodEntry[],
  reportedLength: number,
): CycleAccuracyReport | null {
  if (history.length < 2) return null;

  const sorted = [...history].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
  }

  const avg        = mean(gaps);
  const deviation  = stdDev(gaps, avg);

  const accuracyContributions = gaps.map(gap =>
    Math.max(0, 1 - Math.abs(gap - reportedLength) / reportedLength)
  );

  return {
    reportedLength,
    averageLength:      Math.round(avg * 10) / 10,
    shortestLength:     Math.min(...gaps),
    longestLength:      Math.max(...gaps),
    variability:        Math.round(deviation * 10) / 10,
    predictionAccuracy: Math.round(mean(accuracyContributions) * 100) / 100,
    cycleCount:         gaps.length,
    lastUpdated:        sorted[sorted.length - 1].startDate,
  };
}
