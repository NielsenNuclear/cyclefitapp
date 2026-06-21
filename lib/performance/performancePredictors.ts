// ─── lib/performance/performancePredictors.ts ────────────────────────────────
// Phase 36G — Correlates training context with performance gains.
// Identifies which conditions (readiness, cycle phase, mesocycle) predict
// the best strength improvements.

import { getPerformanceDatabase, type PerformanceRecord } from "./performanceDatabase";
import { epley1RM } from "./strengthEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PredictorFactor =
  | "high_readiness"
  | "follicular_phase"
  | "build_mesocycle"
  | "low_readiness"
  | "luteal_phase"
  | "deload_mesocycle";

export interface PerformancePredictor {
  factor:            PredictorFactor;
  label:             string;
  avgGainPercent:    number;   // mean session-over-session 1RM % change under this condition
  sampleSize:        number;
  isPositive:        boolean;
}

export interface PerformancePredictors {
  predictors:    PerformancePredictor[];
  topPositive:   PerformancePredictor | null;
  topNegative:   PerformancePredictor | null;
  insight:       string;
  dataMaturity:  "low" | "medium" | "high";
  sampleSize:    number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FACTOR_LABELS: Record<PredictorFactor, string> = {
  high_readiness:    "High readiness (≥70)",
  follicular_phase:  "Follicular / ovulation phase",
  build_mesocycle:   "Build / accumulation block",
  low_readiness:     "Low readiness (<50)",
  luteal_phase:      "Luteal phase",
  deload_mesocycle:  "Deload block",
};

function sessionOverSessionGain(records: PerformanceRecord[]): number[] {
  // records are newest-first; gain[i] = (records[i].1RM - records[i+1].1RM) / records[i+1].1RM
  const gains: number[] = [];
  for (let i = 0; i < records.length - 1; i++) {
    const recent  = epley1RM(records[i].weight, records[i].actualReps);
    const prior   = epley1RM(records[i + 1].weight, records[i + 1].actualReps);
    if (prior > 0) gains.push((recent - prior) / prior * 100);
  }
  return gains;
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function computePredictor(
  factor:   PredictorFactor,
  records:  PerformanceRecord[],
  predicate: (r: PerformanceRecord) => boolean,
): PerformancePredictor | null {
  // Filter to sessions matching the condition AND compute gain vs preceding session
  const matching: number[] = [];

  for (let i = 0; i < records.length - 1; i++) {
    if (!predicate(records[i])) continue;
    const recent = epley1RM(records[i].weight, records[i].actualReps);
    const prior  = epley1RM(records[i + 1].weight, records[i + 1].actualReps);
    if (prior > 0) matching.push((recent - prior) / prior * 100);
  }

  if (matching.length < 3) return null;

  const avgGain = Math.round(mean(matching) * 10) / 10;

  return {
    factor,
    label:          FACTOR_LABELS[factor],
    avgGainPercent: avgGain,
    sampleSize:     matching.length,
    isPositive:     avgGain >= 0,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPerformancePredictors(): PerformancePredictors {
  const all = getPerformanceDatabase().filter(r => r.weight > 0 && r.actualReps > 0);

  const empty: PerformancePredictors = {
    predictors: [], topPositive: null, topNegative: null,
    insight: "Log at least a few weeks of weighted sessions to unlock performance insights.",
    dataMaturity: "low", sampleSize: 0,
  };

  if (all.length < 8) return empty;

  // Group by exercise then assess predictors within each exercise, pool all gains
  const byExercise = new Map<string, PerformanceRecord[]>();
  for (const r of all) {
    const list = byExercise.get(r.exerciseName) ?? [];
    list.push(r);
    byExercise.set(r.exerciseName, list);
  }

  const predicateDefs: Array<{ factor: PredictorFactor; fn: (r: PerformanceRecord) => boolean }> = [
    { factor: "high_readiness",   fn: r => r.readinessScore >= 70 },
    { factor: "low_readiness",    fn: r => r.readinessScore > 0 && r.readinessScore < 50 },
    { factor: "follicular_phase", fn: r => ["Follicular", "Ovulation"].includes(r.cyclePhase) },
    { factor: "luteal_phase",     fn: r => r.cyclePhase === "Luteal" },
    { factor: "build_mesocycle",  fn: r => ["build", "accumulation"].includes(r.mesocyclePhase) },
    { factor: "deload_mesocycle", fn: r => r.mesocyclePhase === "deload" },
  ];

  // Pool gains across all exercises per factor
  const pooled: Record<PredictorFactor, number[]> = {
    high_readiness: [], low_readiness: [], follicular_phase: [],
    luteal_phase: [], build_mesocycle: [], deload_mesocycle: [],
  };

  for (const [, exRecords] of byExercise) {
    const sorted = [...exRecords].sort((a, b) => b.date.localeCompare(a.date));
    for (const def of predicateDefs) {
      for (let i = 0; i < sorted.length - 1; i++) {
        if (!def.fn(sorted[i])) continue;
        const recent = epley1RM(sorted[i].weight, sorted[i].actualReps);
        const prior  = epley1RM(sorted[i + 1].weight, sorted[i + 1].actualReps);
        if (prior > 0) pooled[def.factor].push((recent - prior) / prior * 100);
      }
    }
  }

  const predictors: PerformancePredictor[] = [];
  for (const def of predicateDefs) {
    const gains = pooled[def.factor];
    if (gains.length < 3) continue;
    const avgGain = Math.round(mean(gains) * 10) / 10;
    predictors.push({
      factor:         def.factor,
      label:          FACTOR_LABELS[def.factor],
      avgGainPercent: avgGain,
      sampleSize:     gains.length,
      isPositive:     avgGain >= 0,
    });
  }

  predictors.sort((a, b) => Math.abs(b.avgGainPercent) - Math.abs(a.avgGainPercent));

  const topPositive = predictors.find(p => p.isPositive) ?? null;
  const topNegative = predictors.find(p => !p.isPositive) ?? null;

  const insight = topPositive
    ? `You perform best during ${topPositive.label.toLowerCase()} — average ${topPositive.avgGainPercent}% session gain.`
    : "Keep logging to discover your performance patterns.";

  const sampleSize = all.length;
  const dataMaturity: "low" | "medium" | "high" =
    sampleSize >= 60 ? "high"
    : sampleSize >= 20 ? "medium"
    : "low";

  return { predictors, topPositive, topNegative, insight, dataMaturity, sampleSize };
}
