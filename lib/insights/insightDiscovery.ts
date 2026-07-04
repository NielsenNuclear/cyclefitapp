// ─── lib/insights/insightDiscovery.ts ────────────────────────────────────────
// Phase 63A — Insight Discovery Engine
// Proactively scans all stored signals to surface patterns the athlete
// wouldn't notice by looking at individual numbers.
// Every insight must end with an actionable next step.

import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";
import type { RecoveryScore }         from "@/lib/recovery/recoveryScore";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { AdaptationInsight }     from "@/lib/athlete/adaptationInsights";
import type { CorrelationSignal }     from "./correlationEngine";
import type { ExerciseMetrics }       from "./exerciseAnalytics";
import type { TrainingEfficiencyReport } from "./trainingEfficiency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscoveredInsightCategory =
  | "recovery"
  | "performance"
  | "adherence"
  | "scheduling"
  | "volume"
  | "correlation"
  | "efficiency";

export type InsightPriority = "high" | "medium" | "low";

export interface DiscoveredInsight {
  id:         string;
  headline:   string;          // one-line hook ("You recover 20% faster after upper-body sessions")
  detail:     string;          // supporting evidence
  action:     string;          // "What next?" — always present
  category:   DiscoveredInsightCategory;
  priority:   InsightPriority;
  freshness:  "new" | "recurring";  // new = first time surfaced; recurring = persistent pattern
  dataBasis:  number;          // number of data points supporting this
}

export interface InsightDiscoveryReport {
  insights:           DiscoveredInsight[];
  weeklyHighlight:    DiscoveredInsight | null;  // top insight for this week
  totalInsights:      number;
  dataReady:          boolean;
}

// ─── Builder helpers ──────────────────────────────────────────────────────────

function fromAdaptationInsight(
  a: AdaptationInsight,
): DiscoveredInsight {
  return {
    id:        `adapt_${a.id}`,
    headline:  a.text,
    detail:    a.why,
    action:    a.actionable,
    category:  a.category as DiscoveredInsightCategory,
    priority:  a.strength === "strong" ? "high" : a.strength === "pattern" ? "medium" : "low",
    freshness: "recurring",
    dataBasis: 0,
  };
}

function fromCorrelation(c: CorrelationSignal): DiscoveredInsight {
  return {
    id:        `corr_${c.id}`,
    headline:  c.observation,
    detail:    `Based on ${c.sampleSize} matched data points. Relationship strength: ${c.strength}.`,
    action:    c.direction === "negative" && c.labelB.toLowerCase().includes("recovery")
      ? "Consider adding a lighter session after high-volume weeks."
      : "Keep tracking to strengthen this pattern over time.",
    category:  "correlation",
    priority:  c.strength === "strong" ? "high" : "medium",
    freshness: "recurring",
    dataBasis: c.sampleSize,
  };
}

function efficiencyInsight(e: TrainingEfficiencyReport): DiscoveredInsight | null {
  if (!e.dataReady) return null;
  if (e.efficiencyTrend === "improving") {
    return {
      id:        "efficiency-improving",
      headline:  "Your training efficiency is improving.",
      detail:    `Sets per hour: ${e.avgSetsPerHour} avg, ${e.peakSetsPerHour} peak. Trend: improving.`,
      action:    "Momentum is building — continue the current structure.",
      category:  "efficiency",
      priority:  "medium",
      freshness: "new",
      dataBasis: e.sampleCount,
    };
  }
  if (e.efficiencyTrend === "declining") {
    return {
      id:        "efficiency-declining",
      headline:  "Session efficiency has been declining recently.",
      detail:    `Sets per hour has dropped in recent sessions vs your historical average.`,
      action:    "Review session length and rest periods — fatigue accumulation may be the cause.",
      category:  "efficiency",
      priority:  "high",
      freshness: "new",
      dataBasis: e.sampleCount,
    };
  }
  return null;
}

function topExerciseInsight(exercises: ExerciseMetrics[]): DiscoveredInsight | null {
  if (exercises.length === 0) return null;
  const top = exercises[0];
  if (top.timesAppeared < 5) return null;
  return {
    id:        `top-exercise-${top.name.toLowerCase().replace(/\s+/g, "-")}`,
    headline:  `${top.name} is your highest-productivity exercise.`,
    detail:    `${top.timesAppeared} sessions, ${Math.round(top.completionRate * 100)}% completion, avg ${top.avgSetsLogged} sets.`,
    action:    "Keep it as a foundation movement — consistency here compounds.",
    category:  "performance",
    priority:  "medium",
    freshness: "recurring",
    dataBasis: top.timesAppeared,
  };
}

function restDayReadinessInsight(
  workoutHistory:   WorkoutHistoryEntry[],
  readinessHistory: ReadinessHistoryEntry[],
): DiscoveredInsight | null {
  if (workoutHistory.length < 10 || readinessHistory.length < 14) return null;

  const sessionDates = new Set(
    workoutHistory
      .filter(e => e.status === "completed" || e.status === "partially_completed")
      .map(e => e.id)
  );

  const rdxAfterRest: number[]    = [];
  const rdxAfterSession: number[] = [];

  readinessHistory.forEach(entry => {
    const prev = new Date(entry.date + "T12:00:00");
    prev.setDate(prev.getDate() - 1);
    const prevStr = prev.toISOString().slice(0, 10);
    if (sessionDates.has(prevStr)) {
      rdxAfterSession.push(entry.score);
    } else {
      rdxAfterRest.push(entry.score);
    }
  });

  if (rdxAfterRest.length < 4 || rdxAfterSession.length < 4) return null;

  const avgAfterRest    = rdxAfterRest.reduce((s, v) => s + v, 0) / rdxAfterRest.length;
  const avgAfterSession = rdxAfterSession.reduce((s, v) => s + v, 0) / rdxAfterSession.length;
  const delta = Math.round(avgAfterRest - avgAfterSession);

  if (Math.abs(delta) < 5) return null;

  if (delta > 0) {
    return {
      id:        "rest-day-readiness",
      headline:  `Rest days boost your readiness by ~${delta} points.`,
      detail:    `Readiness averages ${Math.round(avgAfterRest)} after rest days vs ${Math.round(avgAfterSession)} after sessions.`,
      action:    "Protect your scheduled rest days — they're doing measurable work.",
      category:  "recovery",
      priority:  "high",
      freshness: "recurring",
      dataBasis: rdxAfterRest.length + rdxAfterSession.length,
    };
  }
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildInsightDiscoveryReport(
  workoutHistory:       WorkoutHistoryEntry[],
  recoveryScores:       RecoveryScore[],
  readinessHistory:     ReadinessHistoryEntry[],
  adaptationInsights:   AdaptationInsight[],
  correlations:         CorrelationSignal[],
  exerciseMetrics:      ExerciseMetrics[],
  efficiency:           TrainingEfficiencyReport,
): InsightDiscoveryReport {
  const all: Array<DiscoveredInsight | null> = [
    ...adaptationInsights.map(fromAdaptationInsight),
    ...correlations.map(fromCorrelation),
    efficiencyInsight(efficiency),
    topExerciseInsight(exerciseMetrics),
    restDayReadinessInsight(workoutHistory, readinessHistory),
  ];

  const valid = all.filter(Boolean) as DiscoveredInsight[];

  // Deduplicate by id
  const seen = new Set<string>();
  const deduped = valid.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  // Sort: high priority first, then by dataBasis
  const priorityOrder: Record<InsightPriority, number> = { high: 3, medium: 2, low: 1 };
  deduped.sort((a, b) =>
    priorityOrder[b.priority] - priorityOrder[a.priority] ||
    b.dataBasis - a.dataBasis
  );

  const weeklyHighlight = deduped[0] ?? null;

  return {
    insights:        deduped,
    weeklyHighlight,
    totalInsights:   deduped.length,
    dataReady:       deduped.length > 0,
  };
}
