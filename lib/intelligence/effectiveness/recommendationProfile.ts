// ─── lib/intelligence/effectiveness/recommendationProfile.ts ─────────────────
// Phase 58D — Recommendation Effectiveness Profile
// Aggregates evaluated events per recommendation type into a persistent profile.

import {
  getEvaluatedEvents,
  type RecommendationType,
  type RecommendationEvent,
} from "./recommendationRegistry";

const STORAGE_KEY    = "axis_rec_profile_v1";
const MIN_SAMPLES    = 3;
const EXPIRY_DAYS    = 14;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TypeEffectiveness {
  recommendationType: RecommendationType;
  averageScore:       number;
  sampleSize:         number;
  helpfulCount:       number;
  neutralCount:       number;
  harmfulCount:       number;
  trend:              "improving" | "stable" | "declining";
}

export interface RecommendationProfile {
  byType:               TypeEffectiveness[];
  overallEffectiveness: number;              // 0-1
  mostEffective:        RecommendationType | null;
  leastEffective:       RecommendationType | null;
  totalEvaluated:       number;
  dataReady:            boolean;
  lastUpdated:          string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_TYPES: RecommendationType[] = [
  "volume_increase", "volume_decrease", "volume_maintain",
  "deload", "recovery_focus", "workout_mode_change",
];

function computeTypeTrend(events: RecommendationEvent[]): "improving" | "stable" | "declining" {
  const scored = events.filter(e => e.effectivenessScore !== undefined);
  if (scored.length < 4) return "stable";
  const half    = Math.floor(scored.length / 2);
  const oldMean = scored.slice(0, half).reduce((s, e) => s + (e.effectivenessScore ?? 0), 0) / half;
  const newMean = scored.slice(half).reduce((s, e) => s + (e.effectivenessScore ?? 0), 0) / (scored.length - half);
  if (newMean > oldMean + 0.05) return "improving";
  if (newMean < oldMean - 0.05) return "declining";
  return "stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildRecommendationProfile(today: string): RecommendationProfile {
  const evaluated = getEvaluatedEvents();

  const byType: TypeEffectiveness[] = ALL_TYPES.map(type => {
    const events = evaluated.filter(e => e.recommendationType === type);
    if (events.length === 0) {
      return {
        recommendationType: type, averageScore: 0, sampleSize: 0,
        helpfulCount: 0, neutralCount: 0, harmfulCount: 0, trend: "stable",
      };
    }
    const scores       = events.map(e => e.effectivenessScore ?? 0);
    const averageScore = scores.reduce((s, v) => s + v, 0) / scores.length;
    return {
      recommendationType: type,
      averageScore:       Math.round(averageScore * 1000) / 1000,
      sampleSize:         events.length,
      helpfulCount:       events.filter(e => e.outcome === "helpful").length,
      neutralCount:       events.filter(e => e.outcome === "neutral").length,
      harmfulCount:       events.filter(e => e.outcome === "harmful").length,
      trend:              computeTypeTrend(events),
    };
  });

  const active = byType.filter(t => t.sampleSize >= MIN_SAMPLES);
  const overallEffectiveness = active.length > 0
    ? active.reduce((s, t) => s + t.averageScore, 0) / active.length
    : 0;

  const sorted       = [...active].sort((a, b) => b.averageScore - a.averageScore);
  const mostEffective  = sorted[0]?.recommendationType ?? null;
  const leastEffective = sorted.at(-1)?.recommendationType ?? null;

  return {
    byType,
    overallEffectiveness: Math.round(overallEffectiveness * 1000) / 1000,
    mostEffective:        mostEffective !== leastEffective ? mostEffective   : null,
    leastEffective:       mostEffective !== leastEffective ? leastEffective  : null,
    totalEvaluated:       evaluated.length,
    dataReady:            active.length >= 1,
    lastUpdated:          today,
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

export function saveRecommendationProfile(profile: RecommendationProfile): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
}

export function loadRecommendationProfile(): RecommendationProfile | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as RecommendationProfile;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);
    if (p.lastUpdated < cutoff.toISOString().slice(0, 10)) return null;
    return p;
  } catch { return null; }
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export const REC_TYPE_LABELS: Record<RecommendationType, string> = {
  volume_increase:     "Volume increases",
  volume_decrease:     "Volume reductions",
  volume_maintain:     "Volume maintenance",
  deload:              "Deload weeks",
  recovery_focus:      "Recovery sessions",
  workout_mode_change: "Condensed sessions",
};
