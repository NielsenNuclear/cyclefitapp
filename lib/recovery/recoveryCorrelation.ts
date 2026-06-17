// ─── lib/recovery/recoveryCorrelation.ts ──────────────────────────────────────
// Pearson correlation between daily fatigue inputs and recovery/readiness
// outcomes. Answers: "what actually predicts low readiness for this user?"
// Pure function — all inputs passed in; no localStorage reads here.

import type { FatigueEntry } from "./fatigueHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalName =
  | "sleep"
  | "stress"
  | "energy"
  | "training_load"
  | "symptom_count"
  | "symptom_severity";

export type CorrelationDirection = "positive" | "negative" | "none";
export type CorrelationStrength  = "strong" | "moderate" | "weak" | "none";

export interface SignalCorrelation {
  signal:      SignalName;
  label:       string;          // user-facing label
  r:           number;          // Pearson r (−1 to 1)
  rSquared:    number;          // variance explained (0–1)
  direction:   CorrelationDirection;
  strength:    CorrelationStrength;
  sampleSize:  number;
  insight:     string;          // human-readable finding
}

export interface CorrelationReport {
  correlations:       SignalCorrelation[];   // sorted by |r| desc
  topPredictor:       SignalCorrelation | null;
  lowReadinessDays:   number;               // days where recovery < LOW_THRESHOLD
  totalDays:          number;
  hasEnoughData:      boolean;
  minSampleRequired:  number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SAMPLE        = 7;    // fewer than this → skip correlation, mark insufficient
const LOW_THRESHOLD     = 55;   // recovery score below this = "low readiness day"

// ─── Pearson r ────────────────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num    += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : Math.round((num / denom) * 1000) / 1000;
}

function strengthFromR(absR: number): CorrelationStrength {
  if (absR >= 0.50) return "strong";
  if (absR >= 0.30) return "moderate";
  if (absR >= 0.15) return "weak";
  return "none";
}

function directionFromR(r: number): CorrelationDirection {
  if (r >=  0.15) return "positive";
  if (r <= -0.15) return "negative";
  return "none";
}

// ─── Signal extractors ────────────────────────────────────────────────────────
// Each extracts a numeric array from FatigueEntry[] for correlation against
// the outcome (next-day recovery score).

type Extractor = (e: FatigueEntry) => number;

const EXTRACTORS: Record<SignalName, Extractor> = {
  sleep:            e => e.sleepScore,
  stress:           e => e.stressLevel,
  energy:           e => e.energyLevel,
  training_load:    e => e.trainingLoad,
  symptom_count:    e => e.symptomCount,
  symptom_severity: e => e.symptomSeverity,
};

const SIGNAL_LABELS: Record<SignalName, string> = {
  sleep:            "Sleep quality",
  stress:           "Stress level",
  energy:           "Energy level",
  training_load:    "Training load",
  symptom_count:    "Symptom count",
  symptom_severity: "Symptom severity",
};

// ─── Insight generator ────────────────────────────────────────────────────────

function buildInsight(
  sig:    SignalName,
  r:      number,
  pct:    number,    // |r|² as %
  dir:    CorrelationDirection,
  str:    CorrelationStrength,
): string {
  if (str === "none") return "";

  const label = SIGNAL_LABELS[sig].toLowerCase();
  const dirPhrase =
    sig === "stress" || sig === "training_load" || sig === "symptom_count" || sig === "symptom_severity"
      ? (dir === "positive" ? "worsens" : "improves")
      : (dir === "positive" ? "improves" : "worsens");

  return `${label.charAt(0).toUpperCase() + label.slice(1)} ${dirPhrase} next-day recovery ` +
    `(explains ~${pct}% of variation).`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Correlates each fatigue input signal against the next-day recovery score.
 * Uses a same-day outcome (recoveryScore) rather than truly next-day, since
 * check-in data and score computation happen on the same calendar day.
 *
 * Entries without a recoveryScore are excluded from correlation pairs.
 */
export function computeCorrelations(entries: FatigueEntry[]): CorrelationReport {
  const valid = entries
    .filter(e => e.recoveryScore !== undefined && e.recoveryScore !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalDays       = valid.length;
  const lowReadinessDays = valid.filter(e => (e.recoveryScore ?? 100) < LOW_THRESHOLD).length;
  const hasEnoughData   = totalDays >= MIN_SAMPLE;

  if (!hasEnoughData) {
    return {
      correlations:      [],
      topPredictor:      null,
      lowReadinessDays,
      totalDays,
      hasEnoughData:     false,
      minSampleRequired: MIN_SAMPLE,
    };
  }

  const outcomes = valid.map(e => e.recoveryScore as number);

  const correlations: SignalCorrelation[] = (Object.keys(EXTRACTORS) as SignalName[])
    .map(signal => {
      const xs = valid.map(EXTRACTORS[signal]);
      const r       = pearson(xs, outcomes);
      const absR    = Math.abs(r);
      const rSq     = Math.round(absR * absR * 100);  // as %
      const dir     = directionFromR(r);
      const str     = strengthFromR(absR);

      // Invert stress/load/symptoms for the insight (high stress → bad outcome)
      // r will naturally be negative for those; the insight builder handles direction
      return {
        signal,
        label:      SIGNAL_LABELS[signal],
        r,
        rSquared:   Math.round(absR * absR * 1000) / 1000,
        direction:  dir,
        strength:   str,
        sampleSize: totalDays,
        insight:    buildInsight(signal, r, rSq, dir, str),
      } satisfies SignalCorrelation;
    })
    .filter(c => c.strength !== "none")
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return {
    correlations,
    topPredictor:      correlations[0] ?? null,
    lowReadinessDays,
    totalDays,
    hasEnoughData:     true,
    minSampleRequired: MIN_SAMPLE,
  };
}

/**
 * How often the user has low recovery on the day after N consecutive training
 * sessions. Used for the "3 consecutive sessions reduce readiness by X%"
 * insight in FatigueInsightsCard.
 */
export function consecutiveSessionImpact(
  entries:    FatigueEntry[],
  runLength:  number = 3,
): { avgRecoveryAfterRun: number; avgBaselineRecovery: number; delta: number; sampleSize: number } {
  const sorted = [...entries]
    .filter(e => e.recoveryScore !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  const afterRun: number[]  = [];
  const baseline: number[]  = [];

  for (let i = runLength; i < sorted.length; i++) {
    const run = sorted.slice(i - runLength, i);
    const allLoaded = run.every(e => e.trainingLoad > 0);
    const score = sorted[i].recoveryScore as number;

    if (allLoaded) {
      afterRun.push(score);
    } else {
      baseline.push(score);
    }
  }

  if (afterRun.length === 0 || baseline.length === 0) {
    return { avgRecoveryAfterRun: 0, avgBaselineRecovery: 0, delta: 0, sampleSize: 0 };
  }

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const avgRun  = Math.round(avg(afterRun));
  const avgBase = Math.round(avg(baseline));

  return {
    avgRecoveryAfterRun: avgRun,
    avgBaselineRecovery: avgBase,
    delta:               avgRun - avgBase,
    sampleSize:          afterRun.length,
  };
}
