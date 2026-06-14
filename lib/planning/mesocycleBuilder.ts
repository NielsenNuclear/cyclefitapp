// ─── lib/planning/mesocycleBuilder.ts ────────────────────────────────────────
// Generates a structured 4–6 week mesocycle roadmap by goal type.
// Pure function — no storage reads.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MesocycleWeek {
  weekNumber:       number;
  volumePercent:    number;   // multiplier relative to baseline (1.0 = current week)
  intensityPercent: number;   // RPE scaling multiplier
  focus:            string;   // phase label
  label:            string;   // "Week 1 — Build"
  isDeload:         boolean;
}

export interface Mesocycle {
  goalType:      GoalType;
  totalWeeks:    number;
  weeks:         MesocycleWeek[];
  currentWeek:   number;   // 1-indexed; which week the user is currently in
  generatedDate: string;
}

// ─── Week templates ───────────────────────────────────────────────────────────

interface WeekTemplate {
  volumePercent:    number;
  intensityPercent: number;
  focus:            string;
  isDeload:         boolean;
}

const TEMPLATES: Record<GoalType, WeekTemplate[]> = {
  hypertrophy: [
    { volumePercent: 0.80, intensityPercent: 0.90, focus: "Accumulation",    isDeload: false },
    { volumePercent: 0.90, intensityPercent: 0.92, focus: "Accumulation",    isDeload: false },
    { volumePercent: 1.00, intensityPercent: 0.95, focus: "Overreach",       isDeload: false },
    { volumePercent: 1.10, intensityPercent: 0.97, focus: "Peak Volume",     isDeload: false },
    { volumePercent: 0.60, intensityPercent: 0.80, focus: "Deload",          isDeload: true  },
  ],
  strength: [
    { volumePercent: 1.00, intensityPercent: 0.85, focus: "Accumulation",    isDeload: false },
    { volumePercent: 0.90, intensityPercent: 0.90, focus: "Intensification", isDeload: false },
    { volumePercent: 0.80, intensityPercent: 0.95, focus: "Intensification", isDeload: false },
    { volumePercent: 0.70, intensityPercent: 1.00, focus: "Peak",            isDeload: false },
    { volumePercent: 0.50, intensityPercent: 0.80, focus: "Deload",          isDeload: true  },
  ],
  fat_loss: [
    { volumePercent: 0.85, intensityPercent: 0.88, focus: "Foundation",      isDeload: false },
    { volumePercent: 0.90, intensityPercent: 0.90, focus: "Build",           isDeload: false },
    { volumePercent: 0.95, intensityPercent: 0.92, focus: "Push",            isDeload: false },
    { volumePercent: 1.00, intensityPercent: 0.93, focus: "Peak",            isDeload: false },
    { volumePercent: 0.60, intensityPercent: 0.80, focus: "Deload",          isDeload: true  },
  ],
  general_fitness: [
    { volumePercent: 0.85, intensityPercent: 0.88, focus: "Foundation",      isDeload: false },
    { volumePercent: 0.90, intensityPercent: 0.90, focus: "Build",           isDeload: false },
    { volumePercent: 0.95, intensityPercent: 0.92, focus: "Build",           isDeload: false },
    { volumePercent: 1.00, intensityPercent: 0.93, focus: "Peak",            isDeload: false },
    { volumePercent: 0.60, intensityPercent: 0.80, focus: "Deload",          isDeload: true  },
  ],
  athletic_performance: [
    { volumePercent: 0.90, intensityPercent: 0.90, focus: "Preparation",     isDeload: false },
    { volumePercent: 1.00, intensityPercent: 0.93, focus: "Accumulation",    isDeload: false },
    { volumePercent: 0.85, intensityPercent: 0.95, focus: "Intensification", isDeload: false },
    { volumePercent: 0.95, intensityPercent: 0.97, focus: "Intensification", isDeload: false },
    { volumePercent: 1.05, intensityPercent: 1.00, focus: "Peak",            isDeload: false },
    { volumePercent: 0.55, intensityPercent: 0.80, focus: "Deload",          isDeload: true  },
  ],
};

function weekLabel(weekNumber: number, focus: string, isDeload: boolean): string {
  if (isDeload) return `Week ${weekNumber} — Deload`;
  return `Week ${weekNumber} — ${focus}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds a goal-specific mesocycle plan.
 * currentWeek is 1-indexed and clamped to [1, totalWeeks].
 */
export function buildMesocycle(
  goalType:    GoalType,
  currentWeek: number,
): Mesocycle {
  const template = TEMPLATES[goalType];

  const weeks: MesocycleWeek[] = template.map((t, i) => ({
    weekNumber:       i + 1,
    volumePercent:    t.volumePercent,
    intensityPercent: t.intensityPercent,
    focus:            t.focus,
    label:            weekLabel(i + 1, t.focus, t.isDeload),
    isDeload:         t.isDeload,
  }));

  const totalWeeks = weeks.length;
  const clamped    = Math.max(1, Math.min(currentWeek, totalWeeks));

  return {
    goalType,
    totalWeeks,
    weeks,
    currentWeek:   clamped,
    generatedDate: new Date().toISOString().slice(0, 10),
  };
}
