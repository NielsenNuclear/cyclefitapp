// ─── lib/symptoms/symptomAnalytics.ts ────────────────────────────────────────
// Aggregation helpers for symptom history.
// Pure logic — callers pass history in; no localStorage reads here.

import type { SymptomEntry } from "./symptomHistory";

// Returns symptom ids ranked by how often they appear with severity > 0.
export function getMostCommonSymptoms(
  history: SymptomEntry[],
  limit:   number,
): { symptomId: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const entry of history) {
    if (entry.severity > 0) {
      counts[entry.symptomId] = (counts[entry.symptomId] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([symptomId, count]) => ({ symptomId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Average severity for a symptom across all history entries where severity > 0.
export function getAverageSeverity(
  history:   SymptomEntry[],
  symptomId: string,
): number {
  const entries = history.filter(e => e.symptomId === symptomId && e.severity > 0);
  if (entries.length === 0) return 0;
  return entries.reduce((s, e) => s + e.severity, 0) / entries.length;
}

// Fraction of tracked days (within the last N calendar days) on which the
// symptom was recorded with severity > 0. Returns 0 when no data exists.
export function getSymptomFrequency(
  history:   SymptomEntry[],
  symptomId: string,
  days:      number,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const daysTracked = new Set(
    history.filter(e => e.date >= cutoffStr).map(e => e.date)
  );
  if (daysTracked.size === 0) return 0;

  const daysPresent = new Set(
    history
      .filter(e => e.symptomId === symptomId && e.severity > 0 && e.date >= cutoffStr)
      .map(e => e.date)
  );

  return daysPresent.size / daysTracked.size;
}
