// ─── lib/physiology/readinessPredictorRanking.ts ─────────────────────────────
// 40C — Readiness Predictor Ranking
// Determines which signals (sleep, stress, cycle, etc.) explain the most
// readiness variance for THIS individual — not the population.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

const MIN_SAMPLE    = 14;
const STORAGE_KEY   = "axis_predictor_ranking_v1";
const RETENTION_DAYS = 90;

// ─── Persistence ─────────────────────────────────────────────────────────────

interface PersistedRankingData {
  profile:     PredictorRankingProfile;
  sampleCount: number;
  savedAt:     string;
}

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessFactor =
  | "sleep"
  | "stress"
  | "cycle"
  | "energy"
  | "trainingLoad"
  | "adherence";

export interface PredictorEntry {
  factor:     ReadinessFactor;
  label:      string;
  weight:     number;   // raw covariance contribution
  normalized: number;   // as integer percentage of total (0–100)
}

export interface PredictorRankingProfile {
  rankings:       PredictorEntry[];
  dominantFactor: ReadinessFactor | null;
  summary:        string;
  dataReady:      boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const FACTOR_LABELS: Record<ReadinessFactor, string> = {
  sleep:        "Sleep quality",
  stress:       "Stress level",
  cycle:        "Cycle phase",
  energy:       "Energy availability",
  trainingLoad: "Training load",
  adherence:    "Consistency",
};

function covarianceContribution(contributors: number[], scores: number[]): number {
  const n  = contributors.length;
  if (n < 2) return 0;
  const mc = contributors.reduce((s, v) => s + v, 0) / n;
  const ms = scores.reduce((s, v) => s + v, 0) / n;
  return Math.abs(contributors.reduce((s, c, i) => s + (c - mc) * (scores[i] - ms), 0) / n);
}

export function savePredictorRanking(profile: PredictorRankingProfile, sampleCount: number): void {
  if (!isClient() || !profile.dataReady) return;
  try {
    const data: PersistedRankingData = {
      profile, sampleCount,
      savedAt: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function loadPersistedPredictorRanking(): PersistedRankingData | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedRankingData;
    const savedDate = new Date(data.savedAt + "T12:00:00");
    const cutoff    = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    if (savedDate < cutoff) { localStorage.removeItem(STORAGE_KEY); return null; }
    return data;
  } catch { return null; }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computePredictorRanking(
  history: ReadinessHistoryEntry[],
): PredictorRankingProfile {
  const EMPTY: PredictorRankingProfile = {
    rankings: [], dominantFactor: null,
    summary: "Not enough data to rank predictors yet.", dataReady: false,
  };

  const entries = history.filter(e => e.contributors !== undefined);
  if (entries.length < MIN_SAMPLE) return EMPTY;

  const scores  = entries.map(e => e.score);
  const factors: ReadinessFactor[] = [
    "sleep", "stress", "cycle", "energy", "trainingLoad", "adherence",
  ];

  const rawWeights: Record<string, number> = {};
  for (const f of factors) {
    rawWeights[f] = covarianceContribution(entries.map(e => e.contributors![f]), scores);
  }

  const total = Object.values(rawWeights).reduce((s, v) => s + v, 0);
  if (total === 0) return EMPTY;

  const rankings: PredictorEntry[] = factors
    .map(f => ({
      factor:     f,
      label:      FACTOR_LABELS[f],
      weight:     Math.round((rawWeights[f] / total) * 1000) / 10,
      normalized: Math.round((rawWeights[f] / total) * 100),
    }))
    .sort((a, b) => b.normalized - a.normalized);

  const dominantFactor = rankings[0].factor;
  const summary = `${FACTOR_LABELS[dominantFactor]} explains ~${rankings[0].normalized}% of your readiness variance — your strongest personal signal.`;

  return { rankings, dominantFactor, summary, dataReady: true };
}
