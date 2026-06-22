// ─── lib/planning/milestoneEngine.ts ──────────────────────────────────────────
// Phase 38D — Milestone Engine.
// Checks the current state against a set of predefined achievement milestones
// and returns achieved + upcoming milestones with progress percentages.

import type { ExercisePerformanceEntry } from "@/lib/progression/exercisePerformanceLog";
import type { ConsistencyScore } from "@/lib/adherence/consistency";
import type { AdherenceEntry } from "@/lib/adherence/adherenceTracker";
import { getAllPersonalBests } from "@/lib/performance/personalBests";

const STORAGE_KEY    = "axis_milestones";
const RETENTION_DAYS = 3650;   // lifetime retention

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneCategory = "consistency" | "strength" | "data" | "training_age";

export interface Milestone {
  id:           string;
  category:     MilestoneCategory;
  label:        string;
  description:  string;
  achievedDate: string | null;
  progress:     number;   // 0–100
}

export interface MilestoneStatus {
  achieved:          Milestone[];
  upcoming:          Milestone[];
  nextMilestone:     Milestone | null;
  totalCount:        number;
  achievedCount:     number;
  completionPercent: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

interface StoredAchievement {
  id:          string;
  achievedDate: string;
}

function loadAchievements(): StoredAchievement[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: StoredAchievement[] = JSON.parse(raw);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const threshold = cutoff.toISOString().slice(0, 10);
    return all.filter(e => e.achievedDate >= threshold);
  } catch { return []; }
}

function saveAchievements(list: StoredAchievement[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function markAchieved(id: string, date: string): void {
  const list = loadAchievements();
  if (list.some(e => e.id === id)) return;
  list.push({ id, achievedDate: date });
  saveAchievements(list);
}

// ─── Milestone definitions ────────────────────────────────────────────────────

interface MilestoneDef {
  id:          string;
  category:    MilestoneCategory;
  label:       string;
  description: string;
  check:       (ctx: CheckCtx) => { achieved: boolean; progress: number };
}

interface CheckCtx {
  totalWorkouts:     number;
  perfHistory:       ExercisePerformanceEntry[];
  consistency:       ConsistencyScore;
  adherenceHistory:  AdherenceEntry[];
  hasPR:             boolean;
}

const MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: "first_workout", category: "training_age", label: "First Workout",
    description: "Log your first workout session.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 1, progress: ctx.totalWorkouts >= 1 ? 100 : 0 }),
  },
  {
    id: "ten_workouts", category: "training_age", label: "10 Sessions Strong",
    description: "Complete 10 workout sessions.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 10, progress: Math.min(100, Math.round((ctx.totalWorkouts / 10) * 100)) }),
  },
  {
    id: "twentyfive_workouts", category: "training_age", label: "25-Session Club",
    description: "Complete 25 workout sessions.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 25, progress: Math.min(100, Math.round((ctx.totalWorkouts / 25) * 100)) }),
  },
  {
    id: "fifty_workouts", category: "training_age", label: "50 Sessions",
    description: "Complete 50 workout sessions — a real training habit.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 50, progress: Math.min(100, Math.round((ctx.totalWorkouts / 50) * 100)) }),
  },
  {
    id: "hundred_workouts", category: "training_age", label: "Century Club",
    description: "Complete 100 workout sessions.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 100, progress: Math.min(100, Math.round((ctx.totalWorkouts / 100) * 100)) }),
  },
  {
    id: "twofifty_workouts", category: "training_age", label: "250 Sessions",
    description: "250 completed sessions — you've built a lifelong habit.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 250, progress: Math.min(100, Math.round((ctx.totalWorkouts / 250) * 100)) }),
  },
  {
    id: "first_pr", category: "strength", label: "First Personal Record",
    description: "Set a personal best on any logged exercise.",
    check: ctx => ({ achieved: ctx.hasPR, progress: ctx.hasPR ? 100 : 0 }),
  },
  {
    id: "consistency_champion", category: "consistency", label: "Consistency Champion",
    description: "Reach a composite consistency score of 70 or higher.",
    check: ctx => {
      const score = ctx.consistency?.composite ?? 0;
      return { achieved: score >= 70, progress: Math.min(100, Math.round((score / 70) * 100)) };
    },
  },
  {
    id: "streak_week", category: "consistency", label: "Full Week",
    description: "Train on your target days for an entire week.",
    check: ctx => {
      const last7 = ctx.adherenceHistory
        .filter(e => {
          const d = new Date(); d.setDate(d.getDate() - 7);
          return e.date >= d.toISOString().slice(0, 10);
        })
        .filter(e => e.status === "completed" || e.status === "partially_completed");
      const achieved = last7.length >= 3;
      return { achieved, progress: Math.min(100, Math.round((last7.length / 3) * 100)) };
    },
  },
  {
    id: "data_collector", category: "data", label: "Data Collector",
    description: "Log performance data (weight × reps) for 10 or more exercises.",
    check: ctx => {
      const distinct = new Set(ctx.perfHistory.filter(e => e.weight > 0).map(e => e.exerciseName)).size;
      return { achieved: distinct >= 10, progress: Math.min(100, Math.round((distinct / 10) * 100)) };
    },
  },
  {
    id: "veteran", category: "training_age", label: "Veteran",
    description: "500 completed sessions — elite training history.",
    check: ctx => ({ achieved: ctx.totalWorkouts >= 500, progress: Math.min(100, Math.round((ctx.totalWorkouts / 500) * 100)) }),
  },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeMilestones(
  perfHistory:      ExercisePerformanceEntry[],
  totalWorkouts:    number,
  consistency:      ConsistencyScore,
  adherenceHistory: AdherenceEntry[],
  today:            string,
): MilestoneStatus {
  const personalBestsAll = getAllPersonalBests(today);
  const hasPR = personalBestsAll.some(pb =>
    pb.lifetime !== null && (pb.lifetime.weight > 0 || pb.lifetime.reps > 0),
  );

  const ctx: CheckCtx = { totalWorkouts, perfHistory, consistency, adherenceHistory, hasPR };

  const existingAchievements = loadAchievements();
  const achievedIds          = new Set(existingAchievements.map(a => a.id));

  const achieved: Milestone[] = [];
  const upcoming: Milestone[] = [];

  for (const def of MILESTONE_DEFS) {
    const { achieved: isAchieved, progress } = def.check(ctx);

    if (isAchieved && !achievedIds.has(def.id)) {
      markAchieved(def.id, today);
      achievedIds.add(def.id);
    }

    const achievedDate = achievedIds.has(def.id)
      ? (existingAchievements.find(a => a.id === def.id)?.achievedDate ?? today)
      : null;

    const milestone: Milestone = {
      id:           def.id,
      category:     def.category,
      label:        def.label,
      description:  def.description,
      achievedDate: isAchieved ? achievedDate : null,
      progress:     isAchieved ? 100 : progress,
    };

    if (isAchieved) achieved.push(milestone);
    else            upcoming.push(milestone);
  }

  // Sort upcoming by progress descending (closest to completion first)
  upcoming.sort((a, b) => b.progress - a.progress);

  const total             = MILESTONE_DEFS.length;
  const achievedCount     = achieved.length;
  const completionPercent = Math.round((achievedCount / total) * 100);

  return {
    achieved,
    upcoming,
    nextMilestone:     upcoming[0] ?? null,
    totalCount:        total,
    achievedCount,
    completionPercent,
  };
}
