// ─── lib/planning/trainingBlocks.ts ───────────────────────────────────────────
// Training block (mesocycle) management.
// A block is 3–6 weeks of structured training with a specific goal.

import type { GoalType } from "@/lib/exercises/goalBasedSelection";

const BLOCK_KEY = "axis_training_block";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockGoal =
  | "Strength"
  | "Hypertrophy"
  | "Fat Loss"
  | "General Fitness"
  | "Performance"
  | "Recovery";

export interface TrainingBlock {
  startDate:          string;     // ISO date — first day of block
  durationWeeks:      number;     // planned total weeks
  primaryGoal:        BlockGoal;
  currentWeek:        number;     // derived: 1-indexed week number from startDate
  totalWeeks:         number;     // alias for durationWeeks
  plannedProgression: string;     // plain-English progression description
}

// Stored shape — currentWeek and totalWeeks are derived on read
interface StoredBlock {
  startDate:          string;
  durationWeeks:      number;
  primaryGoal:        BlockGoal;
  plannedProgression: string;
}

// ─── Block configuration ──────────────────────────────────────────────────────

const BLOCK_CONFIG: Record<BlockGoal, { durationWeeks: number; progression: string }> = {
  Strength:          {
    durationWeeks: 6,
    progression:   "Progressive load increase targeting 85–90% of working max by week 5, with a deload in week 6.",
  },
  Hypertrophy:       {
    durationWeeks: 5,
    progression:   "Volume ramps up weeks 1–4 (3→5 working sets per exercise), with a lighter consolidation week 5.",
  },
  "Fat Loss":        {
    durationWeeks: 6,
    progression:   "Maintained strength volume with metabolic conditioning emphasis; high-rep finishers support caloric output.",
  },
  "General Fitness": {
    durationWeeks: 4,
    progression:   "Balanced intensity rotating across movement patterns; consistent effort level throughout the block.",
  },
  Performance:       {
    durationWeeks: 6,
    progression:   "Periodized loading: accumulation (weeks 1–3), intensification (weeks 4–5), peaking (week 6).",
  },
  Recovery:          {
    durationWeeks: 3,
    progression:   "50% volume reduction, light movement only. Priority on sleep, nutrition, and active recovery.",
  },
};

// Maps onboarding GoalType → default BlockGoal
const GOAL_TO_BLOCK: Record<GoalType, BlockGoal> = {
  strength:            "Strength",
  hypertrophy:         "Hypertrophy",
  fat_loss:            "Fat Loss",
  general_fitness:     "General Fitness",
  athletic_performance: "Performance",
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadStored(): StoredBlock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BLOCK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredBlock;
  } catch {
    return null;
  }
}

function persist(block: StoredBlock): void {
  try {
    localStorage.setItem(BLOCK_KEY, JSON.stringify(block));
  } catch {}
}

// ─── Derived fields ───────────────────────────────────────────────────────────

function computeCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  const days  = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(days / 7) + 1);
}

function hydrateBlock(stored: StoredBlock): TrainingBlock {
  return {
    ...stored,
    currentWeek: computeCurrentWeek(stored.startDate),
    totalWeeks:  stored.durationWeeks,
  };
}

function isExpired(stored: StoredBlock): boolean {
  return computeCurrentWeek(stored.startDate) > stored.durationWeeks;
}

function newStoredBlock(goal: BlockGoal): StoredBlock {
  const config = BLOCK_CONFIG[goal];
  return {
    startDate:          new Date().toISOString().slice(0, 10),
    durationWeeks:      config.durationWeeks,
    primaryGoal:        goal,
    plannedProgression: config.progression,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the active training block, creating one if none exists or the
 * previous block has expired. The new block goal is derived from the user's
 * onboarding goal type.
 */
export function getOrCreateBlock(goalType: GoalType): TrainingBlock {
  const stored = loadStored();
  if (stored && !isExpired(stored)) return hydrateBlock(stored);

  const goal     = GOAL_TO_BLOCK[goalType] ?? "General Fitness";
  const created  = newStoredBlock(goal);
  persist(created);
  return hydrateBlock(created);
}

/**
 * Returns the current active block without creating one.
 * Returns null if no block exists or it has expired.
 */
export function getCurrentBlock(): TrainingBlock | null {
  const stored = loadStored();
  if (!stored || isExpired(stored)) return null;
  return hydrateBlock(stored);
}

/**
 * Manually starts a new block with the given goal (e.g., user changes focus).
 * Overwrites any existing block.
 */
export function startBlock(goal: BlockGoal): TrainingBlock {
  const created = newStoredBlock(goal);
  persist(created);
  return hydrateBlock(created);
}

/**
 * How many days are left in the current block (0 if expired).
 */
export function daysRemainingInBlock(block: TrainingBlock): number {
  const start = new Date(block.startDate);
  const end   = new Date(start);
  end.setDate(start.getDate() + block.durationWeeks * 7);
  const today = new Date();
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}
