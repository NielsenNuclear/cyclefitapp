import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import type { CycleSymptomEvent, LearnedPattern } from "./types";
import { aggregateSymptomsByCycle, countCompletedCycles } from "./cycleAggregation";

const MIN_CYCLES = 3;

// ─── Math helpers ─────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function populationStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function determineConfidence(supportingCycles: number): "low" | "medium" | "high" {
  if (supportingCycles >= 7) return "high";
  if (supportingCycles >= 4) return "medium";
  return "low";
}

// ─── Consistency score ────────────────────────────────────────────────────────
//
// Three factors, each 0–100:
//   frequencyScore    (40%) — how often across total completed cycles
//   dayConsistency    (40%) — how predictable the timing is (low std dev = high score)
//   severityConsistency (20%) — how stable the severity is
//
function computeConsistencyScore(
  cycleDays:       number[],
  severities:      number[],
  supportingCycles: number,
  totalCycles:     number,
): number {
  const frequencyScore = totalCycles > 0
    ? (supportingCycles / totalCycles) * 100
    : 0;

  const dayStd        = populationStdDev(cycleDays);
  const dayConsistency = Math.max(0, 100 - dayStd * 15);

  const sevStd              = populationStdDev(severities);
  const severityConsistency = Math.max(0, 100 - sevStd * 35);

  return Math.round(frequencyScore * 0.4 + dayConsistency * 0.4 + severityConsistency * 0.2);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Derives recurring symptom patterns from cycle-tagged history.
 *
 * Validation guarantees:
 *   - 1–2 completed cycles → []
 *   - ≥3 completed cycles → patterns for symptoms present in ≥3 of those cycles
 *   - Inconsistent timing/severity → low consistencyScore
 *   - Consistent timing/severity → high consistencyScore
 */
export function getLearnedPatterns(
  history:        SymptomEntry[],
  lastPeriodDate: string,
  cycleLength:    number,
): LearnedPattern[] {
  if (!lastPeriodDate || cycleLength <= 0 || history.length === 0) return [];

  const totalCycles = countCompletedCycles(history, lastPeriodDate, cycleLength);
  if (totalCycles < MIN_CYCLES) return [];

  const events: CycleSymptomEvent[] = aggregateSymptomsByCycle(
    history, lastPeriodDate, cycleLength
  );

  // Group events by symptomId
  const bySymptom = new Map<string, CycleSymptomEvent[]>();
  for (const event of events) {
    const list = bySymptom.get(event.symptomId) ?? [];
    list.push(event);
    bySymptom.set(event.symptomId, list);
  }

  const patterns: LearnedPattern[] = [];

  for (const [symptomId, symptomEvents] of bySymptom) {
    // Count distinct cycles this symptom appeared in
    const cyclesWithSymptom = new Set(symptomEvents.map(e => e.cycleNumber));
    const supportingCycles  = cyclesWithSymptom.size;

    if (supportingCycles < MIN_CYCLES) continue;

    const cycleDays  = symptomEvents.map(e => e.cycleDay);
    const severities = symptomEvents.map(e => e.severity);

    patterns.push({
      symptomId,
      averageCycleDay:  Math.round(mean(cycleDays) * 10) / 10,
      averageSeverity:  Math.round(mean(severities) * 10) / 10,
      consistencyScore: computeConsistencyScore(
        cycleDays, severities, supportingCycles, totalCycles
      ),
      supportingCycles,
      confidence: determineConfidence(supportingCycles),
    });
  }

  // Sort by consistency desc, then severity desc
  return patterns.sort(
    (a, b) => b.consistencyScore - a.consistencyScore || b.averageSeverity - a.averageSeverity
  );
}
