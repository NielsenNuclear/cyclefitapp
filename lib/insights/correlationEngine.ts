// ─── lib/insights/correlationEngine.ts ───────────────────────────────────────
// Phase 63E — Correlation Engine
// Finds statistically meaningful relationships between tracked signals.
// IMPORTANT: Reports correlation only — never implies causation.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { RecoveryScore }         from "@/lib/recovery/recoveryScore";
import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CorrelationStrength = "weak" | "moderate" | "strong";
export type CorrelationDirection = "positive" | "negative";

export interface CorrelationSignal {
  id:          string;
  labelA:      string;      // signal A
  labelB:      string;      // signal B
  direction:   CorrelationDirection;
  strength:    CorrelationStrength;
  r:           number;      // Pearson r (shown internally, NOT surfaced to users)
  observation: string;      // user-facing: "Higher sleep quality tends to follow higher readiness"
  sampleSize:  number;
  caveat:      string;      // always remind: "This is an observed pattern, not a proven cause."
}

export interface CorrelationReport {
  signals:    CorrelationSignal[];
  dataReady:  boolean;
  minSamples: number;
}

// ─── Pearson r ────────────────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 5) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    num    += (xs[i] - meanX) * (ys[i] - meanY);
    denomX += (xs[i] - meanX) ** 2;
    denomY += (ys[i] - meanY) ** 2;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

function strengthLabel(r: number): CorrelationStrength {
  const abs = Math.abs(r);
  if (abs >= 0.5) return "strong";
  if (abs >= 0.3) return "moderate";
  return "weak";
}

function isSignificant(r: number, n: number): boolean {
  // rough: |r| > 2/sqrt(n) for p < 0.05
  return Math.abs(r) > 2 / Math.sqrt(n);
}

// ─── Individual correlations ──────────────────────────────────────────────────

function recoveryToReadiness(
  recoveryScores:   RecoveryScore[],
  readinessHistory: ReadinessHistoryEntry[],
): CorrelationSignal | null {
  // Match same dates
  const rdxMap: Record<string, number> = {};
  readinessHistory.forEach(e => { rdxMap[e.date] = e.score; });
  const pairs = recoveryScores
    .filter(s => rdxMap[s.date] !== undefined)
    .map(s => ({ rec: s.score, rdx: rdxMap[s.date] }));
  if (pairs.length < 7) return null;
  const r = pearson(pairs.map(p => p.rec), pairs.map(p => p.rdx));
  if (!isSignificant(r, pairs.length)) return null;
  const dir: CorrelationDirection = r > 0 ? "positive" : "negative";
  return {
    id:          "recovery-readiness",
    labelA:      "Recovery",
    labelB:      "Readiness",
    direction:   dir,
    strength:    strengthLabel(r),
    r:           Math.round(r * 100) / 100,
    observation: r > 0
      ? "Higher recovery scores tend to accompany higher readiness the same day."
      : "Recovery and readiness move somewhat independently for you.",
    sampleSize:  pairs.length,
    caveat:      "Observed pattern across your logged data — not a proven causal link.",
  };
}

function weeklyVolumeToRecovery(
  workoutHistory: WorkoutHistoryEntry[],
  recoveryScores: RecoveryScore[],
): CorrelationSignal | null {
  // Build weekly volume buckets
  const weekVol: Record<string, number> = {};
  workoutHistory.filter(e => e.status !== "pending").forEach(e => {
    const weekStart = (() => {
      const d = new Date(e.id + "T12:00:00");
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    })();
    weekVol[weekStart] = (weekVol[weekStart] ?? 0) +
      e.exercises.reduce((s, ex) => s + ex.sets, 0);
  });

  // Recovery for the Sunday of that week
  const pairs: Array<{ vol: number; rec: number }> = [];
  recoveryScores.forEach(s => {
    const d = new Date(s.date + "T12:00:00");
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    const weekKey = sunday.toISOString().slice(0, 10);
    if (weekVol[weekKey] !== undefined) {
      pairs.push({ vol: weekVol[weekKey], rec: s.score });
    }
  });
  if (pairs.length < 7) return null;
  const r = pearson(pairs.map(p => p.vol), pairs.map(p => p.rec));
  if (!isSignificant(r, pairs.length)) return null;
  const dir: CorrelationDirection = r > 0 ? "positive" : "negative";
  return {
    id:          "volume-recovery",
    labelA:      "Weekly volume",
    labelB:      "Recovery",
    direction:   dir,
    strength:    strengthLabel(r),
    r:           Math.round(r * 100) / 100,
    observation: r < 0
      ? "Higher-volume weeks tend to be followed by lower recovery scores."
      : "Your recovery holds up well even in high-volume weeks.",
    sampleSize:  pairs.length,
    caveat:      "Observed pattern across your logged data — not a proven causal link.",
  };
}

function sessionFrequencyToReadiness(
  workoutHistory:   WorkoutHistoryEntry[],
  readinessHistory: ReadinessHistoryEntry[],
): CorrelationSignal | null {
  // Sessions in 3 days prior vs readiness today
  const rdxSorted = [...readinessHistory].sort((a, b) => a.date.localeCompare(b.date));
  const histSet   = new Set(
    workoutHistory
      .filter(e => e.status === "completed" || e.status === "partially_completed")
      .map(e => e.id)
  );

  const pairs: Array<{ sessions3d: number; rdx: number }> = [];
  rdxSorted.forEach(entry => {
    let count = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(entry.date + "T12:00:00");
      d.setDate(d.getDate() - i);
      if (histSet.has(d.toISOString().slice(0, 10))) count++;
    }
    pairs.push({ sessions3d: count, rdx: entry.score });
  });
  if (pairs.length < 10) return null;
  const r = pearson(pairs.map(p => p.sessions3d), pairs.map(p => p.rdx));
  if (!isSignificant(r, pairs.length)) return null;
  const dir: CorrelationDirection = r > 0 ? "positive" : "negative";
  return {
    id:          "frequency-readiness",
    labelA:      "Sessions (prior 3 days)",
    labelB:      "Readiness",
    direction:   dir,
    strength:    strengthLabel(r),
    r:           Math.round(r * 100) / 100,
    observation: r < 0
      ? "Cramming more sessions in a short window tends to reduce your readiness."
      : "Consistent recent training is associated with higher readiness for you.",
    sampleSize:  pairs.length,
    caveat:      "Observed pattern across your logged data — not a proven causal link.",
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeCorrelations(
  workoutHistory:   WorkoutHistoryEntry[],
  recoveryScores:   RecoveryScore[],
  readinessHistory: ReadinessHistoryEntry[],
): CorrelationReport {
  const MIN = 7;
  const n = Math.min(recoveryScores.length, readinessHistory.length);

  if (n < MIN) {
    return { signals: [], dataReady: false, minSamples: MIN };
  }

  const candidates = [
    recoveryToReadiness(recoveryScores, readinessHistory),
    weeklyVolumeToRecovery(workoutHistory, recoveryScores),
    sessionFrequencyToReadiness(workoutHistory, readinessHistory),
  ].filter(Boolean) as CorrelationSignal[];

  // Sort by strength
  const order: Record<CorrelationStrength, number> = { strong: 3, moderate: 2, weak: 1 };
  candidates.sort((a, b) => order[b.strength] - order[a.strength]);

  return { signals: candidates, dataReady: candidates.length > 0, minSamples: MIN };
}
