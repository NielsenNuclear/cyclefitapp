// ─── lib/insights/trainingEfficiency.ts ──────────────────────────────────────
// Phase 63H — Training Efficiency Metrics
// Quantifies the relationship between training investment and outputs:
// volume per minute, consistency trajectory, and recovery cost per session.

import type { WorkoutHistoryEntry }  from "@/lib/history/workoutHistory";
import type { RecoveryScore }        from "@/lib/recovery/recoveryScore";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingEfficiencyReport {
  // Volume efficiency
  avgSetsPerHour:          number;    // sets per 60 min of training
  peakSetsPerHour:         number;    // best single-session efficiency

  // Recovery cost
  avgReadinessDrop12h:     number;    // avg readiness delta day after session
  avgRecoveryDrop12h:      number;    // avg recovery delta day after session
  highCostSplitTypes:      string[];  // splits that most reduce next-day readiness

  // Consistency efficiency
  trainingDensity:         number;    // % of days with a completed session (last 30d)
  streakEfficiency:        number;    // sessions per streak-day (0–1)

  // Trend
  efficiencyTrend: "improving" | "stable" | "declining" | "unknown";

  dataReady:  boolean;
  sampleCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setsPerHour(e: WorkoutHistoryEntry): number {
  if (e.estimatedDurationMin === 0) return 0;
  const totalSets = e.exercises.reduce((s, ex) => s + ex.sets, 0);
  return (totalSets / e.estimatedDurationMin) * 60;
}

function nextDayScore(
  date: string,
  scores: Array<{ date: string; score: number }>,
): number | null {
  const next = new Date(date + "T12:00:00");
  next.setDate(next.getDate() + 1);
  const nextStr = next.toISOString().slice(0, 10);
  return scores.find(s => s.date === nextStr)?.score ?? null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeTrainingEfficiency(
  workoutHistory:   WorkoutHistoryEntry[],
  recoveryScores:   RecoveryScore[],
  readinessHistory: ReadinessHistoryEntry[],
): TrainingEfficiencyReport {
  const EMPTY: TrainingEfficiencyReport = {
    avgSetsPerHour: 0, peakSetsPerHour: 0,
    avgReadinessDrop12h: 0, avgRecoveryDrop12h: 0,
    highCostSplitTypes: [], trainingDensity: 0,
    streakEfficiency: 0, efficiencyTrend: "unknown",
    dataReady: false, sampleCount: 0,
  };

  const completed = workoutHistory.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  );
  if (completed.length < 5) return EMPTY;

  // ── Sets per hour ─────────────────────────────────────────────────────────

  const hourlyRates = completed.map(setsPerHour).filter(v => v > 0);
  const avgSph  = hourlyRates.length > 0
    ? hourlyRates.reduce((s, v) => s + v, 0) / hourlyRates.length : 0;
  const peakSph = hourlyRates.length > 0 ? Math.max(...hourlyRates) : 0;

  // ── Post-session recovery cost ────────────────────────────────────────────

  const rdxMap: Record<string, number> = {};
  readinessHistory.forEach(e => { rdxMap[e.date] = e.score; });
  const recMap: Record<string, number> = {};
  recoveryScores.forEach(s => { recMap[s.date] = s.score; });

  const rdxDrops:  number[] = [];
  const recDrops:  number[] = [];
  const splitCostMap: Record<string, number[]> = {};

  completed.forEach(session => {
    const dayOf   = session.id;
    const dayBefore = (() => {
      const d = new Date(dayOf + "T12:00:00");
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const dayAfter = (() => {
      const d = new Date(dayOf + "T12:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const rdxBefore = rdxMap[dayOf] ?? rdxMap[dayBefore];
    const rdxAfter  = rdxMap[dayAfter];
    if (rdxBefore !== undefined && rdxAfter !== undefined) {
      const drop = rdxBefore - rdxAfter;
      rdxDrops.push(drop);
      if (!splitCostMap[session.splitType]) splitCostMap[session.splitType] = [];
      splitCostMap[session.splitType].push(drop);
    }

    const recBefore = recMap[dayOf] ?? recMap[dayBefore];
    const recAfter  = recMap[dayAfter];
    if (recBefore !== undefined && recAfter !== undefined) {
      recDrops.push(recBefore - recAfter);
    }
  });

  const avgRdxDrop = rdxDrops.length > 0
    ? rdxDrops.reduce((s, v) => s + v, 0) / rdxDrops.length : 0;
  const avgRecDrop = recDrops.length > 0
    ? recDrops.reduce((s, v) => s + v, 0) / recDrops.length : 0;

  // Splits with above-average readiness drop
  const highCostSplits = Object.entries(splitCostMap)
    .map(([split, drops]) => ({
      split,
      avg: drops.reduce((s, v) => s + v, 0) / drops.length,
    }))
    .filter(s => s.avg > avgRdxDrop + 3)
    .sort((a, b) => b.avg - a.avg)
    .map(s => s.split.replace(/_/g, " "));

  // ── Training density (last 30 days) ───────────────────────────────────────

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent30 = completed.filter(e => e.id >= cutoffStr);
  const density  = Math.round((recent30.length / 30) * 100);

  // ── Efficiency trend (sph recent vs older) ────────────────────────────────

  const sortedCompleted = [...completed].sort((a, b) => a.id.localeCompare(b.id));
  const recentHalf = sortedCompleted.slice(-Math.ceil(completed.length / 2)).map(setsPerHour).filter(v => v > 0);
  const olderHalf  = sortedCompleted.slice(0, Math.floor(completed.length / 2)).map(setsPerHour).filter(v => v > 0);
  let efficiencyTrend: TrainingEfficiencyReport["efficiencyTrend"] = "unknown";
  if (recentHalf.length > 2 && olderHalf.length > 2) {
    const avgRecent = recentHalf.reduce((s, v) => s + v, 0) / recentHalf.length;
    const avgOlder  = olderHalf.reduce((s, v) => s + v, 0) / olderHalf.length;
    const delta = avgRecent - avgOlder;
    efficiencyTrend = delta > 1 ? "improving" : delta < -1 ? "declining" : "stable";
  }

  return {
    avgSetsPerHour:      Math.round(avgSph * 10) / 10,
    peakSetsPerHour:     Math.round(peakSph * 10) / 10,
    avgReadinessDrop12h: Math.round(avgRdxDrop * 10) / 10,
    avgRecoveryDrop12h:  Math.round(avgRecDrop * 10) / 10,
    highCostSplitTypes:  highCostSplits,
    trainingDensity:     density,
    streakEfficiency:    Math.round((recent30.length / Math.max(1, density)) * 100) / 100,
    efficiencyTrend,
    dataReady:           completed.length >= 5,
    sampleCount:         completed.length,
  };
}
