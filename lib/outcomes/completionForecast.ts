// ─── lib/outcomes/completionForecast.ts ──────────────────────────────────────
// 43G — Goal Completion Forecast
// Projects 30 / 90 / 180 day goal completion probability from current velocity,
// success tier, and active bottlenecks.

import type { GoalSuccessModel } from "./goalSuccessModel";
import type { GoalVelocity }     from "@/lib/performance/goalVelocity";
import type { BottleneckReport } from "./bottleneckDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecastPeriod {
  days:           30 | 90 | 180;
  label:          string;
  probability:    number;                         // 0–100
  eta:            string | null;                  // ISO date if in window
  confidence:     "low" | "moderate" | "high";
  limitingFactor: string | null;
}

export interface CompletionForecast {
  periods:           [ForecastPeriod, ForecastPeriod, ForecastPeriod];
  currentVelocity:   number;
  projectedEtaWeeks: number | null;
  dataReady:         boolean;
  updatedAt:         string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function tierBase(tier: string): number {
  switch (tier) {
    case "accelerating": return 88;
    case "on_track":     return 72;
    case "stalled":      return 48;
    case "declining":    return 28;
    default:             return 50;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeCompletionForecast(
  successModel: GoalSuccessModel,
  velocity:     GoalVelocity,
  bottlenecks:  BottleneckReport,
): CompletionForecast {
  const today = new Date().toISOString().slice(0, 10);

  if (!successModel.dataReady) {
    const stub: ForecastPeriod = {
      days: 30, label: "30-day", probability: 0, eta: null,
      confidence: "low", limitingFactor: null,
    };
    return {
      periods:           [stub, { ...stub, days: 90, label: "90-day" }, { ...stub, days: 180, label: "180-day" }],
      currentVelocity:   0,
      projectedEtaWeeks: null,
      dataReady:         false,
      updatedAt:         today,
    };
  }

  const base     = tierBase(successModel.currentTier);
  const penalty  =
    bottlenecks.allBottlenecks.filter(b => b.severity === "severe").length   * 12 +
    bottlenecks.allBottlenecks.filter(b => b.severity === "moderate").length * 6;
  const limiting = bottlenecks.primaryBottleneck?.label ?? null;
  const snaps    = successModel.recentSnapshots.length;

  function make(days: 30 | 90 | 180): ForecastPeriod {
    // More runway → slightly higher probability (sustained effort assumption)
    const timeBuff = days === 30 ? 0 : days === 90 ? 8 : 15;
    const prob     = Math.max(8, Math.min(92, base + timeBuff - penalty));
    const conf: "low" | "moderate" | "high" =
      days === 30  && snaps >= 8  ? "moderate"
      : days === 90  && snaps >= 16 ? "moderate"
      : days === 180 && snaps >= 24 ? "moderate"
      : "low";

    // Only show an ETA date if projected completion falls within this window
    const etaWeeks  = velocity.etaWeeks;
    const etaDays   = etaWeeks !== null ? etaWeeks * 7 : null;
    const eta       = etaDays !== null && etaDays <= days ? addDays(Math.round(etaDays)) : null;

    return { days, label: `${days}-day`, probability: prob, eta, confidence: conf, limitingFactor: limiting };
  }

  return {
    periods:           [make(30), make(90), make(180)],
    currentVelocity:   velocity.weeklyRatePercent,
    projectedEtaWeeks: velocity.etaWeeks,
    dataReady:         true,
    updatedAt:         today,
  };
}
