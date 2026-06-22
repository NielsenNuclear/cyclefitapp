// ─── lib/planning/macrocyclePlanner.ts ────────────────────────────────────────
// Phase 38B — Macrocycle Planner.
// Generates a 52-week annual training plan, divided into major phases.
// The plan is persisted so the "start date" is stable across sessions.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import type { WorkoutHistoryEntry } from "@/lib/history/workoutHistory";

const STORAGE_KEY    = "axis_macrocycle_plan";
const RETENTION_DAYS = 1825;   // 5 years — effectively permanent

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MacrocyclePhase {
  name:          string;
  focus:         string;
  startWeek:     number;
  endWeek:       number;
  durationWeeks: number;
}

export interface MacroCyclePlan {
  goalType:              GoalType;
  startDate:             string;          // YYYY-MM-DD when training was first logged
  totalWeeks:            number;          // 52
  phases:                MacrocyclePhase[];
  currentWeek:           number;          // 1-based week within the macrocycle
  currentPhase:          MacrocyclePhase;
  weekInPhase:           number;          // 1-based week within the current phase
  weeksRemainingInPhase: number;
  completionPercent:     number;          // 0–100 through the 52-week cycle
}

interface StoredPlan {
  goalType:  GoalType;
  startDate: string;
  savedAt:   string;
}

// ─── Phase structures ─────────────────────────────────────────────────────────

function buildPhases(goalType: GoalType): MacrocyclePhase[] {
  const defs: Array<{ name: string; focus: string; weeks: number }> = (() => {
    switch (goalType) {
      case "strength":
        return [
          { name: "Foundation",     focus: "Movement quality, base strength",          weeks: 8  },
          { name: "Accumulation",   focus: "Volume increase, technique refinement",     weeks: 12 },
          { name: "Intensification",focus: "Heavier loads, lower volume",              weeks: 10 },
          { name: "Peak",           focus: "Max strength expression",                   weeks: 6  },
          { name: "Transition",     focus: "Active recovery, deload",                   weeks: 4  },
          { name: "Reload",         focus: "Rebuild base for next cycle",               weeks: 12 },
        ];
      case "hypertrophy":
        return [
          { name: "Foundation",     focus: "Movement patterns, motor learning",         weeks: 8  },
          { name: "Volume",         focus: "High-rep accumulation, metabolic stress",   weeks: 14 },
          { name: "Specialisation", focus: "Weak-point training, intensification",      weeks: 10 },
          { name: "Deload",         focus: "Tissue recovery, nervous system reset",     weeks: 4  },
          { name: "Metabolite",     focus: "Pump training, blood-flow restriction",     weeks: 8  },
          { name: "Transition",     focus: "Recovery, next-phase planning",             weeks: 8  },
        ];
      case "fat_loss":
        return [
          { name: "Foundation",     focus: "Base fitness, movement efficiency",         weeks: 8  },
          { name: "Deficit",        focus: "Caloric reduction, metabolic conditioning", weeks: 16 },
          { name: "Maintenance",    focus: "Sustain results, prevent rebound",          weeks: 12 },
          { name: "New Baseline",   focus: "Consolidate new weight set-point",          weeks: 12 },
          { name: "Transition",     focus: "Reassess and plan next goal",               weeks: 4  },
        ];
      case "athletic_performance":
        return [
          { name: "Foundation",     focus: "General physical preparation",              weeks: 8  },
          { name: "GPP",            focus: "General conditioning, capacity building",   weeks: 12 },
          { name: "SPP",            focus: "Sport-specific strength & power",           weeks: 12 },
          { name: "Competition Prep",focus: "Peak performance tuning",                  weeks: 8  },
          { name: "Taper",          focus: "Reduce fatigue, sharpen performance",       weeks: 4  },
          { name: "Transition",     focus: "Active recovery between cycles",            weeks: 8  },
        ];
      default:  // general_fitness
        return [
          { name: "Foundation",     focus: "Habit building, base conditioning",         weeks: 12 },
          { name: "Development",    focus: "Progressive overload across all domains",   weeks: 20 },
          { name: "Consolidation",  focus: "Lock in gains, refine weaknesses",          weeks: 16 },
          { name: "Transition",     focus: "Active recovery, reassess goals",           weeks: 4  },
        ];
    }
  })();

  let cursor = 1;
  return defs.map(d => {
    const p: MacrocyclePhase = {
      name:          d.name,
      focus:         d.focus,
      startWeek:     cursor,
      endWeek:       cursor + d.weeks - 1,
      durationWeeks: d.weeks,
    };
    cursor += d.weeks;
    return p;
  });
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(): StoredPlan | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPlan) : null;
  } catch { return null; }
}

function save(plan: StoredPlan): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getOrBuildMacrocycle(
  goalType:   GoalType,
  today:      string,
  rawHistory: WorkoutHistoryEntry[],
): MacroCyclePlan {
  const phases     = buildPhases(goalType);
  const totalWeeks = phases.reduce((s, p) => s + p.durationWeeks, 0);

  // Determine (or persist) the start date
  let startDate: string;
  const stored = load();
  if (stored && stored.goalType === goalType) {
    startDate = stored.startDate;
  } else {
    const sorted = [...rawHistory]
      .filter(h => h.status === "completed" || h.status === "partially_completed")
      .sort((a, b) => a.id.localeCompare(b.id));
    startDate = sorted.length > 0 ? sorted[0].id : today;
    save({ goalType, startDate, savedAt: today });
  }

  // Current week within the macrocycle (1-based, wrapping after totalWeeks)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const daysDiff  = Math.floor((new Date(today).getTime() - new Date(startDate).getTime()) / 86_400_000);
  const weeksDiff = Math.max(0, Math.floor(daysDiff / 7));
  const currentWeek = (weeksDiff % totalWeeks) + 1;

  const currentPhase = phases.find(p => currentWeek >= p.startWeek && currentWeek <= p.endWeek) ?? phases[0];
  const weekInPhase           = currentWeek - currentPhase.startWeek + 1;
  const weeksRemainingInPhase = currentPhase.durationWeeks - weekInPhase;
  const completionPercent     = Math.round((currentWeek / totalWeeks) * 100);

  return {
    goalType,
    startDate,
    totalWeeks,
    phases,
    currentWeek,
    currentPhase,
    weekInPhase,
    weeksRemainingInPhase,
    completionPercent,
  };
}
