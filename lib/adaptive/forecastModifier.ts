// ─── lib/adaptive/forecastModifier.ts ─────────────────────────────────────────
// Converts future symptom forecasts into proactive coaching adjustments.
// Pure function — callers pass all data in; no localStorage reads here.

import type { ForecastEvent } from "@/lib/forecasting/forecastSymptoms";
import type { DailyRecommendation, ReadinessBadge, IntensityLevel } from "@/types/recommendation";
import { SYMPTOM_BY_ID } from "@/lib/symptoms/symptomCatalog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BurdenTier = "low" | "moderate" | "high" | "very_high";

export interface ForecastBurden {
  score:              number;
  tier:               BurdenTier;
  contributingEvents: ForecastEvent[];
}

// ─── Symptom weights ──────────────────────────────────────────────────────────

export const SYMPTOM_WEIGHTS: Record<string, number> = {
  "fatigue":             3,
  "sleep-quality":       3,
  "night-sweats":        3,
  "cramps":              2,
  "headache":            2,
  "bloating":            1,
  "digestive-issues":    1,
  "nausea":              1,
  "mood-changes":        1,
  "stress":              1,
  "irritability":        1,
  "anxiety":             1,
  "depression-symptoms": 1,
};

const DEFAULT_WEIGHT = 1;

// ─── Constants ────────────────────────────────────────────────────────────────

// confidence >= 0.5 = "medium" tier in forecastSymptoms scale
const MIN_CONFIDENCE = 0.5;
const MAX_WINDOW_DAYS = 7;

const INTENSITY_ORDER: IntensityLevel[] = [
  "Low", "Light to Moderate", "Moderate", "Moderate to High", "High",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function windowMultiplier(daysUntil: number): number {
  if (daysUntil <= 2) return 1.0;  // Strong
  if (daysUntil <= 5) return 0.6;  // Moderate
  if (daysUntil <= 7) return 0.3;  // Advisory
  return 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function tierFromScore(score: number): BurdenTier {
  if (score >= 10) return "very_high";
  if (score >= 6)  return "high";
  if (score >= 3)  return "moderate";
  return "low";
}

// ─── Forecast burden computation ──────────────────────────────────────────────

export function computeForecastBurden(events: ForecastEvent[]): ForecastBurden {
  if (events.length === 0) {
    return { score: 0, tier: "low", contributingEvents: [] };
  }

  const eligible = events.filter(
    e => e.confidence >= MIN_CONFIDENCE
      && e.daysUntilStart >= 1
      && e.daysUntilStart <= MAX_WINDOW_DAYS,
  );

  if (eligible.length === 0) {
    return { score: 0, tier: "low", contributingEvents: [] };
  }

  // Deduplicate per symptomId — keep highest-scoring event
  const bySymptom: Record<string, { event: ForecastEvent; eventScore: number }> = {};
  for (const e of eligible) {
    const weight     = SYMPTOM_WEIGHTS[e.symptomId] ?? DEFAULT_WEIGHT;
    const mult       = windowMultiplier(e.daysUntilStart);
    const eventScore = weight * e.expectedSeverity * e.confidence * mult;
    const existing   = bySymptom[e.symptomId];
    if (!existing || eventScore > existing.eventScore) {
      bySymptom[e.symptomId] = { event: e, eventScore };
    }
  }

  const entries = Object.values(bySymptom);
  const score   = entries.reduce((s, { eventScore }) => s + eventScore, 0);
  const contributingEvents = entries
    .filter(({ eventScore }) => eventScore > 0)
    .map(({ event }) => event)
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart);

  return { score, tier: tierFromScore(score), contributingEvents };
}

// ─── Badge and intensity adjustment ──────────────────────────────────────────

function targetBadge(current: ReadinessBadge, tier: BurdenTier): ReadinessBadge {
  switch (tier) {
    case "low":       return current;
    case "moderate":  return current === "Push"                           ? "Maintain" : current;
    case "high":      return current === "Push" || current === "Maintain" ? "Watch"    : current;
    case "very_high": return "Recover";
  }
}

function shiftIntensity(current: IntensityLevel, stepsDown: number): IntensityLevel {
  const idx    = INTENSITY_ORDER.indexOf(current);
  const newIdx = clamp(idx - stepsDown, 0, INTENSITY_ORDER.length - 1);
  return INTENSITY_ORDER[newIdx];
}

const INTENSITY_STEPS: Record<BurdenTier, number> = {
  low:       0,
  moderate:  1,
  high:      2,
  very_high: 3,
};

// ─── Apply forecast modifier ──────────────────────────────────────────────────

export function applyForecastModifier(
  rec:    DailyRecommendation,
  burden: ForecastBurden,
): DailyRecommendation {
  const { tier, score, contributingEvents } = burden;

  // Low burden with no contributing events: no-op
  if (tier === "low" && contributingEvents.length === 0) return rec;

  // Low burden: advisory explanation only — no structural change
  if (tier === "low") {
    const soonest = contributingEvents[0];
    const name    = SYMPTOM_BY_ID[soonest.symptomId]?.name ?? soonest.symptomId;
    const dayText = soonest.daysUntilStart === 1 ? "tomorrow" : `in ${soonest.daysUntilStart} days`;
    return {
      ...rec,
      explanationPoints: [
        ...rec.explanationPoints,
        {
          signal:      "Forecast advisory",
          observation: `${name} commonly appears ${dayText} based on your patterns.`,
          implication: "No adjustment made today — monitoring the upcoming symptom window.",
          weight:      "Advisory" as const,
        },
      ],
    };
  }

  // Structural tiers: adjust badge and intensity
  const newBadge     = targetBadge(rec.training.badge, tier);
  const newIntensity = shiftIntensity(rec.training.intensity, INTENSITY_STEPS[tier]);

  // Per-symptom explanation points
  const newPoints = [...rec.explanationPoints];

  for (const event of contributingEvents) {
    const name    = SYMPTOM_BY_ID[event.symptomId]?.name ?? event.symptomId;
    const dayText = event.daysUntilStart === 1 ? "tomorrow" : `in ${event.daysUntilStart} days`;
    newPoints.push({
      signal:      "Symptom forecast",
      observation: `Based on your historical patterns, ${name.toLowerCase()} commonly appears ${dayText} (${Math.round(event.confidence * 100)}% confidence).`,
      implication: "Training load reduced proactively to improve recovery before an expected symptom window.",
      weight:      "Secondary" as const,
    });
  }

  // Summary adjustment point
  if (newBadge !== rec.training.badge || newIntensity !== rec.training.intensity) {
    const tierLabel = { moderate: "Moderate", high: "High", very_high: "Very high" }[tier] ?? tier;
    newPoints.push({
      signal:      "Forecast adjustment",
      observation: `${tierLabel} forecast burden (score ${score.toFixed(1)}) across ${contributingEvents.length} predicted symptom${contributingEvents.length !== 1 ? "s" : ""}.`,
      implication: `Recommendation shifted from ${rec.training.badge} to ${newBadge} — workout adjusted to match.`,
      weight:      "Primary" as const,
    });
  }

  return {
    ...rec,
    training: {
      ...rec.training,
      badge:     newBadge,
      intensity: newIntensity,
    },
    explanationPoints: newPoints,
  };
}
