// ─── lib/athlete/recoverySignature.ts ────────────────────────────────────────
// Phase 62C — Recovery Signature
// Characterises how this athlete recovers: average, fastest, slowest, and
// variability. Also detects which weekdays tend to produce best recovery.

import type { RecoveryScore } from "@/lib/recovery/recoveryScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoverySignature {
  avgScore:         number;    // mean recovery score (0–100)
  peakScore:        number;    // best recorded recovery
  floorScore:       number;    // lowest recorded recovery
  variability:      number;    // standard deviation — higher = more erratic
  stabilityLabel:   "erratic" | "variable" | "consistent" | "very consistent";
  bestDayOfWeek:    string | null;  // e.g. "Thursday" — day with highest avg recovery
  worstDayOfWeek:   string | null;
  trend7d:          "improving" | "stable" | "declining" | "unknown";
  percentageAbove70: number;   // % of days with recovery ≥ 70
  dataReady:        boolean;
  sampleCount:      number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function stabilityLabel(sd: number): RecoverySignature["stabilityLabel"] {
  if (sd < 5)  return "very consistent";
  if (sd < 10) return "consistent";
  if (sd < 18) return "variable";
  return "erratic";
}

function trend7d(recent: number[], older: number[]): RecoverySignature["trend7d"] {
  if (recent.length < 3 || older.length < 3) return "unknown";
  const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgOlder  = older.reduce((s, v) => s + v, 0) / older.length;
  const delta = avgRecent - avgOlder;
  if (delta > 4)  return "improving";
  if (delta < -4) return "declining";
  return "stable";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeRecoverySignature(scores: RecoveryScore[]): RecoverySignature {
  const EMPTY: RecoverySignature = {
    avgScore: 0, peakScore: 0, floorScore: 0,
    variability: 0, stabilityLabel: "variable",
    bestDayOfWeek: null, worstDayOfWeek: null,
    trend7d: "unknown", percentageAbove70: 0,
    dataReady: false, sampleCount: 0,
  };

  if (scores.length < 7) return EMPTY;

  const sorted   = [...scores].sort((a, b) => a.date.localeCompare(b.date));
  const values   = sorted.map(s => s.score);
  const avg      = values.reduce((s, v) => s + v, 0) / values.length;
  const sd       = stdDev(values);

  // Day-of-week averages
  const byDay = Array.from({ length: 7 }, () => [] as number[]);
  sorted.forEach(s => {
    const dow = new Date(s.date + "T12:00:00").getDay();
    byDay[dow].push(s.score);
  });
  const dayAvgs = byDay.map(arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const validDays = dayAvgs.map((v, i) => v !== null ? { dow: i, avg: v } : null).filter(Boolean) as { dow: number; avg: number }[];
  validDays.sort((a, b) => b.avg - a.avg);
  const bestDow  = validDays.length > 0 ? DAYS[validDays[0].dow] : null;
  const worstDow = validDays.length > 0 ? DAYS[validDays[validDays.length - 1].dow] : null;

  // 7d trend
  const recent7 = values.slice(-7);
  const prior7  = values.slice(-14, -7);

  return {
    avgScore:          Math.round(avg),
    peakScore:         Math.max(...values),
    floorScore:        Math.min(...values),
    variability:       Math.round(sd),
    stabilityLabel:    stabilityLabel(sd),
    bestDayOfWeek:     bestDow,
    worstDayOfWeek:    worstDow,
    trend7d:           trend7d(recent7, prior7),
    percentageAbove70: Math.round((values.filter(v => v >= 70).length / values.length) * 100),
    dataReady:         true,
    sampleCount:       scores.length,
  };
}
