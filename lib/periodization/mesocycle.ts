// ─── lib/periodization/mesocycle.ts ───────────────────────────────────────────
// Persists and updates the user's position within their training mesocycle.
// Storage key: axis_periodization_state

import type { GoalType } from "@/lib/exercises/goalBasedSelection";
import { getPeriodizationProfile } from "./goalProfiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MesocycleState {
  startDate:          string;   // YYYY-MM-DD — when tracking began
  goal:               GoalType;
  totalTrainingWeeks: number;   // weeks elapsed since startDate (1-indexed)
  mesocycleWeek:      number;   // position within current block (1-indexed)
  blockLengthWeeks:   number;   // from goal profile at init time
  lastDeloadWeek:     number;   // totalTrainingWeek of last deload (0 = none yet)
  lastUpdated:        string;   // YYYY-MM-DD
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "axis_periodization_state";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function load(): MesocycleState | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MesocycleState;
  } catch {
    return null;
  }
}

function persist(state: MesocycleState): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Week calculation ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function computeWeeks(startDate: string, today: string): number {
  const days = Math.max(0, daysBetween(startDate, today));
  return Math.floor(days / 7) + 1;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMesocycleState(): MesocycleState | null {
  return load();
}

/**
 * Initialises the mesocycle state if it doesn't exist or the goal has changed.
 * Updates week counters on every call (safe to call on every dashboard load).
 */
export function initOrUpdateMesocycle(today: string, goal: GoalType): MesocycleState {
  const existing = load();
  const profile  = getPeriodizationProfile(goal);

  // Reset when goal changes or no prior state
  if (!existing || existing.goal !== goal) {
    const fresh: MesocycleState = {
      startDate:          today,
      goal,
      totalTrainingWeeks: 1,
      mesocycleWeek:      1,
      blockLengthWeeks:   profile.blockLengthWeeks,
      lastDeloadWeek:     0,
      lastUpdated:        today,
    };
    persist(fresh);
    return fresh;
  }

  const totalTrainingWeeks = computeWeeks(existing.startDate, today);
  const mesocycleWeek      = ((totalTrainingWeeks - 1) % profile.blockLengthWeeks) + 1;

  const updated: MesocycleState = {
    ...existing,
    totalTrainingWeeks,
    mesocycleWeek,
    blockLengthWeeks: profile.blockLengthWeeks,
    lastUpdated:      today,
  };

  persist(updated);
  return updated;
}

/**
 * Records the current week as a deload week in stored state.
 * Called by the adaptive deload engine when an early deload is triggered.
 */
export function recordDeloadWeek(state: MesocycleState): MesocycleState {
  const updated: MesocycleState = {
    ...state,
    lastDeloadWeek: state.totalTrainingWeeks,
  };
  persist(updated);
  return updated;
}

export function weeksSinceLastDeload(state: MesocycleState): number {
  if (state.lastDeloadWeek === 0) return state.totalTrainingWeeks;
  return state.totalTrainingWeeks - state.lastDeloadWeek;
}
