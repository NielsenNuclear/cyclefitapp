// ─── lib/outcomes/successPatternDetection.ts ─────────────────────────────────
// 43C — Success Pattern Detection
// Identifies what behaviors were present during this user's peak performance
// windows — their personal "formula" for high-output weeks.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { AdherenceEntry }        from "@/lib/adherence/adherenceTracker";

const PEAK_THRESHOLD  = 75;  // readiness score for a "peak" day
const MIN_PEAK_DAYS   = 7;
const WINDOW_DAYS     = 28;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuccessPattern {
  label:       string;
  description: string;
  confidence:  "low" | "moderate" | "high";
}

export interface SuccessPatternReport {
  patterns:       SuccessPattern[];
  peakDayCount:   number;
  totalDaysAnalyzed: number;
  peakRate:       number;    // % of days above peak threshold
  bestDayOfWeek:  string | null;
  dataReady:      boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Computation ─────────────────────────────────────────────────────────────

export function detectSuccessPatterns(
  readinessHistory: ReadinessHistoryEntry[],
  adherenceHistory: AdherenceEntry[],
): SuccessPatternReport {
  const EMPTY: SuccessPatternReport = {
    patterns: [], peakDayCount: 0, totalDaysAnalyzed: 0,
    peakRate: 0, bestDayOfWeek: null, dataReady: false,
  };

  if (readinessHistory.length < WINDOW_DAYS) return EMPTY;

  const rdxByDate = new Map<string, number>();
  for (const e of readinessHistory) rdxByDate.set(e.date, e.score);

  const peakDays = readinessHistory.filter(e => e.score >= PEAK_THRESHOLD);
  if (peakDays.length < MIN_PEAK_DAYS) return EMPTY;

  const patterns: SuccessPattern[] = [];
  const adhByDate = new Map<string, AdherenceEntry>();
  for (const a of adherenceHistory) adhByDate.set(a.date, a);

  // Pattern 1: completion rate on peak days
  const peakDayDates    = new Set(peakDays.map(e => e.date));
  const completionOnPeak = adherenceHistory.filter(e => peakDayDates.has(e.date) &&
    (e.status === "completed" || e.status === "partially_completed")).length;
  const peakCompRate = peakDays.length > 0 ? completionOnPeak / peakDays.length : 0;

  if (peakCompRate >= 0.60) {
    patterns.push({
      label: "High completion on peak days",
      description: `${Math.round(peakCompRate * 100)}% of your high-readiness days resulted in completed workouts.`,
      confidence: peakCompRate >= 0.75 ? "high" : "moderate",
    });
  }

  // Pattern 2: best day of week for readiness
  const rdxByDay = new Array(7).fill(null).map(() => [] as number[]);
  for (const e of readinessHistory) {
    const wd = new Date(e.date).getDay();
    rdxByDay[wd].push(e.score);
  }
  const dayMeans = rdxByDay.map((scores, wd) => ({
    wd,
    mean: scores.length >= 3 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0,
    count: scores.length,
  })).filter(d => d.count >= 3);

  let bestDay: string | null = null;
  if (dayMeans.length >= 4) {
    const sorted = [...dayMeans].sort((a, b) => b.mean - a.mean);
    bestDay = DAY_NAMES[sorted[0].wd];
    patterns.push({
      label: `${bestDay} is your highest-readiness day`,
      description: `Your readiness is consistently highest on ${bestDay}s (avg ${Math.round(sorted[0].mean)}/100).`,
      confidence: sorted[0].count >= 8 ? "high" : "moderate",
    });
  }

  // Pattern 3: consecutive day pattern (rarely skip twice)
  const sortedAdh = [...adherenceHistory].sort((a, b) => a.date.localeCompare(b.date));
  let doubleSkips = 0;
  for (let i = 1; i < sortedAdh.length; i++) {
    if (sortedAdh[i].status === "skipped" && sortedAdh[i - 1].status === "skipped") doubleSkips++;
  }
  const skipRate = sortedAdh.length > 0 ? doubleSkips / sortedAdh.length : 0;
  if (skipRate < 0.10 && adherenceHistory.length >= 14) {
    patterns.push({
      label: "Rarely skips two days in a row",
      description: "You almost never miss consecutive days — a key marker of sustainable consistency.",
      confidence: adherenceHistory.length >= 30 ? "high" : "moderate",
    });
  }

  // Pattern 4: sleep-readiness correlation (if contributors available)
  const withContrib = readinessHistory.filter(e => e.contributors !== undefined);
  if (withContrib.length >= MIN_PEAK_DAYS) {
    const peakSleepMean = peakDays.filter(e => e.contributors).reduce((s, e) => s + (e.contributors?.sleep ?? 50), 0) /
      Math.max(1, peakDays.filter(e => e.contributors).length);
    if (peakSleepMean >= 70) {
      patterns.push({
        label: "High sleep quality precedes peak days",
        description: `Sleep quality averages ${Math.round(peakSleepMean)}/100 on your highest-readiness days.`,
        confidence: peakSleepMean >= 80 ? "high" : "moderate",
      });
    }
  }

  return {
    patterns:          patterns.slice(0, 4),
    peakDayCount:      peakDays.length,
    totalDaysAnalyzed: readinessHistory.length,
    peakRate:          Math.round((peakDays.length / readinessHistory.length) * 100),
    bestDayOfWeek:     bestDay,
    dataReady:         patterns.length > 0,
  };
}
