// ─── lib/recovery/symptomEscalation.ts ───────────────────────────────────────
// Detects worsening symptom patterns across cycles.
// Compares mean severity per cycle for each symptom, looking for consistent
// upward trends over the last 3 observed cycles.

import type { SymptomEntry }  from "@/lib/symptoms/symptomHistory";
import type { PeriodEntry }   from "@/lib/cycle/cycleAccuracy";
import { SYMPTOM_CATALOG }    from "@/lib/symptoms/symptomCatalog";
import { getPeriodStartForDate, toCycleDay } from "@/lib/cycle/cycleUtils";
import type { SymptomEscalationEntry, EscalationStatus } from "./recoveryTypes";

export type { SymptomEscalationEntry };

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SymptomEscalationInput {
  symptomHistory: SymptomEntry[];
  periodHistory:  PeriodEntry[];
  cycleLength:    number;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const MIN_CYCLES_REQUIRED = 2;    // need at least 2 observed cycles per symptom
const ESCALATING_SLOPE    = 0.4;  // mean severity increasing ≥ 0.4 per cycle
const IMPROVING_SLOPE     = -0.4; // mean severity decreasing ≥ 0.4 per cycle

// ─── Slope from last N cycle means ───────────────────────────────────────────

function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += i; sumY += values[i];
    sumXY += i * values[i]; sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

function statusFromSlope(slope: number, cycleMeans: number[]): EscalationStatus {
  // Also require the last observed mean to be higher/lower than the first
  // (slope alone can be driven by a single outlier cycle)
  const first = cycleMeans[0];
  const last  = cycleMeans[cycleMeans.length - 1];

  if (slope >= ESCALATING_SLOPE && last > first) return "escalating";
  if (slope <= IMPROVING_SLOPE  && last < first) return "improving";
  return "stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Detects escalating, stable, or improving symptom patterns across cycles.
 * Only includes symptoms observed in ≥ 2 cycles.
 * Results are sorted: escalating first, then stable, then improving.
 */
export function detectSymptomEscalation(
  input: SymptomEscalationInput,
): SymptomEscalationEntry[] {
  const { symptomHistory, periodHistory, cycleLength } = input;

  if (periodHistory.length < 2 || symptomHistory.length === 0) return [];

  const sortedPeriods = [...periodHistory].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const nameMap = new Map(SYMPTOM_CATALOG.map(s => [s.id, s.name]));

  // Group: symptomId → cycleStart → severity[]
  const grouped = new Map<string, Map<string, number[]>>();

  for (const entry of symptomHistory) {
    const cd          = toCycleDay(entry.date, sortedPeriods, cycleLength);
    const cycleStart  = getPeriodStartForDate(entry.date, sortedPeriods);
    if (cd === null || cycleStart === null) continue;

    const bySymptom = grouped.get(entry.symptomId) ?? new Map<string, number[]>();
    const byCycle   = bySymptom.get(cycleStart) ?? [];
    byCycle.push(entry.severity);
    bySymptom.set(cycleStart, byCycle);
    grouped.set(entry.symptomId, bySymptom);
  }

  const results: SymptomEscalationEntry[] = [];

  for (const [symptomId, byCycle] of grouped) {
    // Sort cycles chronologically and take the last 3 where symptom appeared
    const cycleMeans = [...byCycle.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-3)
      .map(([, severities]) => {
        const avg = severities.reduce((s, v) => s + v, 0) / severities.length;
        return Math.round(avg * 100) / 100;
      });

    if (cycleMeans.length < MIN_CYCLES_REQUIRED) continue;

    const slope  = linearSlope(cycleMeans);
    const status = statusFromSlope(slope, cycleMeans);

    results.push({
      symptomId,
      symptomName: nameMap.get(symptomId) ?? symptomId,
      status,
      cycleMeans,
    });
  }

  // Sort: escalating → stable → improving
  const ORDER: Record<EscalationStatus, number> = {
    escalating: 0,
    stable:     1,
    improving:  2,
  };

  return results.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}
