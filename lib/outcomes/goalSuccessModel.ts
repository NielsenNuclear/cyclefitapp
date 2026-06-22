// ─── lib/outcomes/goalSuccessModel.ts ────────────────────────────────────────
// 43A — Goal Success Modeling
// Tracks what the user's training actually looks like during successful periods
// vs unsuccessful ones, learning what conditions correlate with goal progress.

import type { GoalVelocity }      from "@/lib/performance/goalVelocity";
import type { ConsistencyScore }  from "@/lib/adherence/consistency";
import type { AdherenceEntry }    from "@/lib/adherence/adherenceTracker";
import type { NutritionPattern }  from "@/lib/nutrition/nutritionPatterns";

const STORAGE_KEY    = "axis_outcome_success_log";
const RETENTION_DAYS = 1825;
const MIN_WEEKS      = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuccessTier = "accelerating" | "on_track" | "stalled" | "declining";

export interface GoalSuccessSnapshot {
  date:                string;
  velocityRate:        number;     // weeklyRatePercent
  consistencyScore:    number;     // 0–100
  completionRate:      number;     // 0–100: workout completions in last 28 days
  nutritionCompliance: number;     // 0–1 mean protein+hydration compliance
  recoveryCompliance:  number;     // 0–100 (consistency recovery sub-score)
  tier:                SuccessTier;
}

export interface GoalSuccessModel {
  recentSnapshots:    GoalSuccessSnapshot[];
  successProfile:     Partial<GoalSuccessSnapshot>;   // mean values during on_track+ periods
  failureProfile:     Partial<GoalSuccessSnapshot>;   // mean values during stalled/declining
  currentTier:        SuccessTier;
  dataReady:          boolean;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): GoalSuccessSnapshot[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GoalSuccessSnapshot[]) : [];
  } catch { return []; }
}

function persist(entries: GoalSuccessSnapshot[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveTier(velocity: number, consistency: number): SuccessTier {
  if (velocity > 1.5 && consistency >= 70) return "accelerating";
  if (velocity >= 0.5 && consistency >= 50) return "on_track";
  if (velocity >= 0 && consistency >= 30)   return "stalled";
  return "declining";
}

function colMean(snaps: GoalSuccessSnapshot[], key: keyof GoalSuccessSnapshot): number {
  const vals = snaps.map(s => s[key] as number).filter(v => typeof v === "number");
  return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordSuccessSnapshot(
  date:             string,
  velocity:         GoalVelocity,
  consistency:      ConsistencyScore,
  adherenceHistory: AdherenceEntry[],
  nutritionPattern: NutritionPattern | undefined,
): void {
  const recent28 = adherenceHistory.filter(e => {
    const cutoff = new Date(date);
    cutoff.setDate(cutoff.getDate() - 28);
    return e.date >= cutoff.toISOString().slice(0, 10);
  });
  const completionRate = recent28.length > 0
    ? Math.round((recent28.filter(e => e.status === "completed" || e.status === "partially_completed").length / recent28.length) * 100)
    : 0;

  const nutritionCompliance = nutritionPattern
    ? Math.round(((nutritionPattern.proteinComplianceRate + nutritionPattern.hydrationComplianceRate) / 2) * 100) / 100
    : 0;

  const snap: GoalSuccessSnapshot = {
    date,
    velocityRate:        velocity.weeklyRatePercent,
    consistencyScore:    consistency.composite,
    completionRate,
    nutritionCompliance,
    recoveryCompliance:  consistency.recovery,
    tier:                deriveTier(velocity.weeklyRatePercent, consistency.composite),
  };

  const existing = load().filter(e => e.date !== date);
  persist([snap, ...existing]);
}

export function buildGoalSuccessModel(): GoalSuccessModel {
  const snapshots = load();
  const EMPTY: GoalSuccessModel = {
    recentSnapshots: [], successProfile: {}, failureProfile: {},
    currentTier: "stalled", dataReady: false,
  };

  if (snapshots.length < MIN_WEEKS) return EMPTY;

  const successSnaps = snapshots.filter(s => s.tier === "accelerating" || s.tier === "on_track");
  const failSnaps    = snapshots.filter(s => s.tier === "stalled" || s.tier === "declining");

  const successProfile: Partial<GoalSuccessSnapshot> = successSnaps.length >= 2 ? {
    consistencyScore:    colMean(successSnaps, "consistencyScore"),
    completionRate:      colMean(successSnaps, "completionRate"),
    nutritionCompliance: colMean(successSnaps, "nutritionCompliance"),
    recoveryCompliance:  colMean(successSnaps, "recoveryCompliance"),
  } : {};

  const failureProfile: Partial<GoalSuccessSnapshot> = failSnaps.length >= 2 ? {
    consistencyScore:    colMean(failSnaps, "consistencyScore"),
    completionRate:      colMean(failSnaps, "completionRate"),
    nutritionCompliance: colMean(failSnaps, "nutritionCompliance"),
    recoveryCompliance:  colMean(failSnaps, "recoveryCompliance"),
  } : {};

  return {
    recentSnapshots: snapshots.slice(0, 12),
    successProfile,
    failureProfile,
    currentTier:     snapshots[0]?.tier ?? "stalled",
    dataReady:       true,
  };
}
