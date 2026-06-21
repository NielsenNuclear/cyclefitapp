// ─── lib/adherence/streaks.ts ─────────────────────────────────────────────────
// Phase 35D — Multi-domain streak intelligence.
// Tracks current and longest streaks for training, check-ins, recovery, and
// nutrition — each domain independently. Longest streaks are stored so they
// survive if the streak breaks.

import type { AdherenceEntry }        from "./adherenceTracker";
import type { DailyNutritionCheckin } from "@/lib/nutrition/nutritionCheckin";
import type { DailyRecoveryLog }      from "@/lib/recovery/recoveryStrategyCatalog";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

const STORAGE_KEY = "axis_streak_history";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DomainStreak {
  current: number;
  longest: number;
}

export interface MultiDomainStreaks {
  training:  DomainStreak;
  checkins:  DomainStreak;
  recovery:  DomainStreak;
  nutrition: DomainStreak;
}

interface StoredLongest {
  training:  number;
  checkins:  number;
  recovery:  number;
  nutrition: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadLongest(): StoredLongest {
  if (!isClient()) return { training: 0, checkins: 0, recovery: 0, nutrition: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? (JSON.parse(raw) as StoredLongest)
      : { training: 0, checkins: 0, recovery: 0, nutrition: 0 };
  } catch {
    return { training: 0, checkins: 0, recovery: 0, nutrition: 0 };
  }
}

function persistLongest(l: StoredLongest): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
}

// ─── Generic streak calculator ────────────────────────────────────────────────

function calcStreak(activeDates: Set<string>): { current: number; longest: number } {
  if (activeDates.size === 0) return { current: 0, longest: 0 };

  // Sort descending to walk back from today
  const sorted = Array.from(activeDates).sort((a, b) => b.localeCompare(a));
  const latest = sorted[0];
  const today  = new Date().toISOString().slice(0, 10);

  // Current streak: walk back from today (or yesterday if today has no entry yet)
  let cursor = new Date(today);
  if (!activeDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak: walk sorted dates and find max consecutive run
  void latest; // used for sorting
  let longest = 0;
  let run     = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    prev.setDate(prev.getDate() - 1);
    if (prev.toISOString().slice(0, 10) === sorted[i]) {
      run++;
    } else {
      if (run > longest) longest = run;
      run = 1;
    }
  }
  if (run > longest) longest = run;

  return { current, longest };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeMultiDomainStreaks(
  adherenceHistory:  AdherenceEntry[],
  nutritionCheckins: DailyNutritionCheckin[],
  recoveryLogs:      DailyRecoveryLog[],
  readinessHistory:  ReadinessHistoryEntry[],
): MultiDomainStreaks {
  const training = calcStreak(new Set(
    adherenceHistory
      .filter(e => e.status === "completed" || e.status === "partially_completed")
      .map(e => e.date),
  ));
  const checkins = calcStreak(new Set(readinessHistory.map(e => e.date)));
  const recovery = calcStreak(new Set(recoveryLogs.map(e => e.date)));
  const nutrition = calcStreak(new Set(nutritionCheckins.map(e => e.date)));

  // Load and update stored longest values (so they survive after a streak breaks)
  const stored = loadLongest();
  const updated: StoredLongest = {
    training:  Math.max(stored.training,  training.longest),
    checkins:  Math.max(stored.checkins,  checkins.longest),
    recovery:  Math.max(stored.recovery,  recovery.longest),
    nutrition: Math.max(stored.nutrition, nutrition.longest),
  };
  if (isClient()) persistLongest(updated);

  return {
    training:  { current: training.current,  longest: updated.training  },
    checkins:  { current: checkins.current,  longest: updated.checkins  },
    recovery:  { current: recovery.current,  longest: updated.recovery  },
    nutrition: { current: nutrition.current, longest: updated.nutrition },
  };
}
