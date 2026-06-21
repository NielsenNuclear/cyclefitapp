// ─── lib/adherence/motivationPatterns.ts ─────────────────────────────────────
// Phase 35H — Motivation Pattern Learning.
// Extends Phase 34 behavioral data with readiness/sleep/nutrition correlations.
// Discovers WHEN and UNDER WHAT CONDITIONS the user reliably trains.

import type { AdherenceEntry }        from "./adherenceTracker";
import type { DailyNutritionCheckin } from "@/lib/nutrition/nutritionCheckin";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { FatigueEntry }          from "@/lib/recovery/fatigueHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadinessCorrelation {
  highReadinessRate:      number;   // completion rate when readiness ≥ 70
  lowReadinessRate:       number;   // completion rate when readiness < 50
  highReadinessSample:    number;
  lowReadinessSample:     number;
}

export interface SleepCorrelation {
  goodSleepRate:    number;   // completion rate when sleep excellent/good
  poorSleepRate:    number;   // completion rate when sleep variable/poor
  goodSleepSample:  number;
  poorSleepSample:  number;
}

export interface NutritionCorrelation {
  proteinHitRate:    number;   // completion rate when protein was hit prior day
  proteinMissRate:   number;
  proteinHitSample:  number;
  proteinMissSample: number;
}

export interface MotivationPatterns {
  readinessCorrelation:  ReadinessCorrelation;
  sleepCorrelation:      SleepCorrelation;
  nutritionCorrelation:  NutritionCorrelation;
  observations:          string[];   // natural-language insights
  sampleSize:            number;
  dataMaturity:          "early" | "growing" | "mature";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCompleted(status: AdherenceEntry["status"]): boolean {
  return status === "completed" || status === "partially_completed";
}

function rateAndSample(
  entries: AdherenceEntry[],
  match: (e: AdherenceEntry) => boolean,
): { rate: number; sample: number } {
  const matched = entries.filter(match);
  const completed = matched.filter(e => isCompleted(e.status)).length;
  return {
    rate:   matched.length > 0 ? completed / matched.length : 0,
    sample: matched.length,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildMotivationPatterns(
  adherenceHistory:  AdherenceEntry[],
  readinessHistory:  ReadinessHistoryEntry[],
  fatigueHistory:    FatigueEntry[],
  nutritionCheckins: DailyNutritionCheckin[],
): MotivationPatterns {
  const resolved = adherenceHistory.filter(e => e.status !== "pending");

  if (resolved.length < 7) {
    return {
      readinessCorrelation:  { highReadinessRate: 0, lowReadinessRate: 0, highReadinessSample: 0, lowReadinessSample: 0 },
      sleepCorrelation:      { goodSleepRate: 0, poorSleepRate: 0, goodSleepSample: 0, poorSleepSample: 0 },
      nutritionCorrelation:  { proteinHitRate: 0, proteinMissRate: 0, proteinHitSample: 0, proteinMissSample: 0 },
      observations:          [],
      sampleSize:            0,
      dataMaturity:          "early",
    };
  }

  // Build date-keyed lookup maps
  const readinessByDate  = new Map(readinessHistory.map(e => [e.date, e.score]));
  const sleepByDate      = new Map(fatigueHistory.map(e => [e.date, e.sleepQuality as string]));
  const nutritionByDate  = new Map(nutritionCheckins.map(e => [e.date, e.hitProtein]));

  // Enrich adherence entries with that day's readiness/sleep/nutrition
  const enriched = resolved.map(e => ({
    ...e,
    readiness: readinessByDate.get(e.date),
    sleep:     sleepByDate.get(e.date),
    protein:   nutritionByDate.get(e.date),
  }));

  // ── Readiness correlation ─────────────────────────────────────────────────
  const highRdx = rateAndSample(enriched.filter(e => (e.readiness ?? 0) >= 70), () => true);
  const lowRdx  = rateAndSample(enriched.filter(e => (e.readiness ?? 101) < 50), () => true);
  const readinessCorrelation: ReadinessCorrelation = {
    highReadinessRate:   highRdx.rate,
    lowReadinessRate:    lowRdx.rate,
    highReadinessSample: highRdx.sample,
    lowReadinessSample:  lowRdx.sample,
  };

  // ── Sleep correlation ─────────────────────────────────────────────────────
  const goodSleep = rateAndSample(enriched.filter(e => e.sleep === "excellent" || e.sleep === "good"), () => true);
  const poorSleep = rateAndSample(enriched.filter(e => e.sleep === "variable" || e.sleep === "poor"), () => true);
  const sleepCorrelation: SleepCorrelation = {
    goodSleepRate:   goodSleep.rate,
    poorSleepRate:   poorSleep.rate,
    goodSleepSample: goodSleep.sample,
    poorSleepSample: poorSleep.sample,
  };

  // ── Nutrition correlation (prior-day protein → today's completion) ─────────
  // Match today's entry with the prior day's nutrition checkin
  const nutritionEnriched = resolved.map(e => {
    const priorDate = new Date(e.date);
    priorDate.setDate(priorDate.getDate() - 1);
    const prior = nutritionByDate.get(priorDate.toISOString().slice(0, 10));
    return { ...e, priorProtein: prior };
  });
  const proteinHit  = rateAndSample(nutritionEnriched.filter(e => e.priorProtein === true), () => true);
  const proteinMiss = rateAndSample(nutritionEnriched.filter(e => e.priorProtein === false), () => true);
  const nutritionCorrelation: NutritionCorrelation = {
    proteinHitRate:    proteinHit.rate,
    proteinMissRate:   proteinMiss.rate,
    proteinHitSample:  proteinHit.sample,
    proteinMissSample: proteinMiss.sample,
  };

  // ── Observations ─────────────────────────────────────────────────────────
  const observations: string[] = [];
  const MIN_SAMPLE = 5;

  if (highRdx.sample >= MIN_SAMPLE && lowRdx.sample >= MIN_SAMPLE) {
    const lift = highRdx.rate - lowRdx.rate;
    if (lift >= 0.20) {
      observations.push(
        `You complete ${Math.round(highRdx.rate * 100)}% of workouts when readiness is high, vs ${Math.round(lowRdx.rate * 100)}% when it's low.`,
      );
    }
  }
  if (goodSleep.sample >= MIN_SAMPLE && poorSleep.sample >= MIN_SAMPLE) {
    const lift = goodSleep.rate - poorSleep.rate;
    if (lift >= 0.15) {
      observations.push(
        `Good sleep → ${Math.round(goodSleep.rate * 100)}% completion. Poor sleep → ${Math.round(poorSleep.rate * 100)}%.`,
      );
    }
  }
  if (proteinHit.sample >= MIN_SAMPLE && proteinMiss.sample >= MIN_SAMPLE) {
    const lift = proteinHit.rate - proteinMiss.rate;
    if (lift >= 0.15) {
      observations.push(
        `Hitting protein the day before raises next-day completion by ${Math.round(lift * 100)} percentage points.`,
      );
    }
  }

  const dataMaturity: MotivationPatterns["dataMaturity"] =
    resolved.length < 14 ? "early"
    : resolved.length < 45 ? "growing"
    : "mature";

  return {
    readinessCorrelation,
    sleepCorrelation,
    nutritionCorrelation,
    observations,
    sampleSize:  resolved.length,
    dataMaturity,
  };
}
