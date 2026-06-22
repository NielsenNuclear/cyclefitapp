// ─── lib/planning/seasonalityAnalysis.ts ──────────────────────────────────────
// Phase 38G — Readiness seasonality patterns across months.
// Identifies which calendar months produce the best/worst readiness scores
// so the long-term plan can lean into high-readiness periods.
// Pure function — no storage, no React.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyReadiness {
  month:        number;   // 0 = Jan … 11 = Dec
  monthName:    string;
  avgReadiness: number;
  sessionCount: number;
}

export type SeasonalPatternType =
  | "peak_month"
  | "low_month"
  | "consistent"
  | "high_variance";

export interface SeasonalPattern {
  type:        SeasonalPatternType;
  label:       string;
  description: string;
}

export interface SeasonalityReport {
  monthlyAverages: MonthlyReadiness[];
  bestMonth:       MonthlyReadiness | null;
  worstMonth:      MonthlyReadiness | null;
  patterns:        SeasonalPattern[];
  insight:         string;
  dataReady:       boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildSeasonalityReport(
  readinessHistory: ReadinessHistoryEntry[],
  today: string,
): SeasonalityReport {
  const empty: SeasonalityReport = {
    monthlyAverages: [],
    bestMonth:       null,
    worstMonth:      null,
    patterns:        [],
    insight:         "Log 90+ days of readiness data to see seasonality patterns.",
    dataReady:       false,
  };

  if (!readinessHistory || readinessHistory.length === 0) return empty;

  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const threshold = ninetyDaysAgo.toISOString().slice(0, 10);

  const hasEnoughData = readinessHistory.some(e => e.date <= threshold);
  if (!hasEnoughData) return empty;

  // Group scores by calendar month
  const byMonth: Record<number, number[]> = {};
  for (const entry of readinessHistory) {
    const month = new Date(entry.date).getMonth();
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(entry.score);
  }

  const monthlyAverages: MonthlyReadiness[] = Object.entries(byMonth).map(([m, scores]) => ({
    month:        parseInt(m),
    monthName:    MONTH_NAMES[parseInt(m)],
    avgReadiness: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    sessionCount: scores.length,
  })).sort((a, b) => a.month - b.month);

  const qualified = monthlyAverages.filter(m => m.sessionCount >= 3);
  if (qualified.length < 2) return { ...empty, monthlyAverages, dataReady: true };

  const best  = qualified.reduce((mx, m) => m.avgReadiness > mx.avgReadiness ? m : mx, qualified[0]);
  const worst = qualified.reduce((mn, m) => m.avgReadiness < mn.avgReadiness ? m : mn, qualified[0]);

  const allAvgs  = qualified.map(m => m.avgReadiness);
  const spread   = best.avgReadiness - worst.avgReadiness;
  const variance = stdDev(allAvgs);

  const patterns: SeasonalPattern[] = [];

  if (spread >= 15) {
    patterns.push({
      type:        "high_variance",
      label:       "High Monthly Variation",
      description: `Your readiness varies by ${spread} points across months — seasonal factors are influencing your recovery.`,
    });
  }

  if (best.avgReadiness >= 65) {
    patterns.push({
      type:        "peak_month",
      label:       `Peak: ${best.monthName}`,
      description: `${best.monthName} is historically your highest-readiness month (avg ${best.avgReadiness}). Schedule high-intensity phases here.`,
    });
  }

  if (worst.avgReadiness <= 50 && spread >= 10) {
    patterns.push({
      type:        "low_month",
      label:       `Recovery: ${worst.monthName}`,
      description: `${worst.monthName} tends to be your lowest-readiness month (avg ${worst.avgReadiness}). Plan deloads or easier training during this period.`,
    });
  }

  if (variance < 5 && qualified.length >= 4) {
    patterns.push({
      type:        "consistent",
      label:       "Consistent Year-Round",
      description: "Your readiness is remarkably stable across months — seasonal factors have minimal impact on your training.",
    });
  }

  const insight =
    patterns.length === 0
      ? `Your monthly readiness averages range from ${worst.avgReadiness} to ${best.avgReadiness} — more data will reveal clearer patterns.`
      : patterns[0].description;

  return { monthlyAverages, bestMonth: best, worstMonth: worst, patterns, insight, dataReady: true };
}
