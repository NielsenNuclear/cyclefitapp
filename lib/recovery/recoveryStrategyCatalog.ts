// ─── lib/recovery/recoveryStrategyCatalog.ts ─────────────────────────────────
// Phase 33D — Expanded recovery strategy catalog.
// The existing recoveryLearning.ts tracks 4 inferred strategies (sleep_focus,
// stress_reduction, rest_day, deload_week). This module adds the user-selectable
// catalog of active recovery modalities and their storage.
// User-selected logs feed back into recoveryLearning.ts scoring via the same
// axis_recovery_strategy_log key — fully backward-compatible.

import { logRecoveryStrategy, getRecoveryStrategyOutcomes } from "./recoveryLearning";
export { getRecoveryStrategyOutcomes };

// ─── Catalog ──────────────────────────────────────────────────────────────────

export interface RecoveryStrategyItem {
  id:          string;
  label:       string;
  category:    "active" | "passive" | "lifestyle";
  description: string;
}

export const RECOVERY_STRATEGY_CATALOG: RecoveryStrategyItem[] = [
  {
    id:          "walking",
    label:       "Walking",
    category:    "active",
    description: "Light walk to promote circulation without adding stress.",
  },
  {
    id:          "stretching",
    label:       "Stretching",
    category:    "active",
    description: "Static or dynamic stretching for muscle relaxation.",
  },
  {
    id:          "breathwork",
    label:       "Breathwork",
    category:    "passive",
    description: "Controlled breathing to activate the parasympathetic nervous system.",
  },
  {
    id:          "yoga",
    label:       "Yoga",
    category:    "active",
    description: "Low-intensity movement combining breath, stretch, and mindfulness.",
  },
  {
    id:          "sauna",
    label:       "Sauna",
    category:    "passive",
    description: "Heat therapy to increase circulation and reduce muscle soreness.",
  },
  {
    id:          "massage",
    label:       "Massage",
    category:    "passive",
    description: "Soft tissue work to reduce tension and improve local circulation.",
  },
  {
    id:          "mobility",
    label:       "Mobility Work",
    category:    "active",
    description: "Targeted joint mobility drills for movement quality.",
  },
  {
    id:          "cold_exposure",
    label:       "Cold Therapy",
    category:    "passive",
    description: "Cold shower, ice bath, or cold immersion for inflammation management.",
  },
  {
    id:          "sleep_focus",
    label:       "Sleep Focus",
    category:    "lifestyle",
    description: "Prioritised sleep — early bedtime, no screens before sleep.",
  },
  {
    id:          "rest_day",
    label:       "Full Rest",
    category:    "lifestyle",
    description: "Complete rest — no structured training or active recovery.",
  },
  {
    id:          "stress_reduction",
    label:       "Stress Reduction",
    category:    "lifestyle",
    description: "Deliberate activities to lower psychological stress (meditation, journaling).",
  },
  {
    id:          "hydration_focus",
    label:       "Hydration Focus",
    category:    "lifestyle",
    description: "Prioritised fluid intake throughout the day.",
  },
];

// ─── Storage key for user-logged daily strategies ─────────────────────────────

const DAILY_LOG_KEY    = "axis_recovery_daily_strategies";
const RETENTION_DAYS   = 90;

export interface DailyRecoveryLog {
  date:       string;    // YYYY-MM-DD
  strategies: string[];  // strategy IDs selected by user
  loggedAt:   string;    // ISO timestamp
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoffDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  return d.toISOString().slice(0, 10);
}

function loadDaily(): DailyRecoveryLog[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(DAILY_LOG_KEY);
    return raw ? (JSON.parse(raw) as DailyRecoveryLog[]) : [];
  } catch {
    return [];
  }
}

function persistDaily(entries: DailyRecoveryLog[]): void {
  if (!isClient()) return;
  const cut = cutoffDate();
  try {
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves the strategies the user performed today.
 * Idempotent — same date overwrites.
 * Also feeds each strategy into the existing recoveryLearning.ts log
 * so the effectiveness engine scores them automatically.
 */
export function logDailyRecoveryStrategies(strategies: string[], date?: string): void {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const others = loadDaily().filter(e => e.date !== d);
  persistDaily([{ date: d, strategies, loggedAt: new Date().toISOString() }, ...others]);

  // Feed into existing effectiveness engine
  for (const s of strategies) {
    logRecoveryStrategy(s, d);
  }
}

/**
 * Returns the strategies logged for a specific date.
 */
export function getDailyRecoveryLog(date: string): DailyRecoveryLog | null {
  return loadDaily().find(e => e.date === date) ?? null;
}

/**
 * Full history, newest first.
 */
export function getRecoveryStrategyHistory(): DailyRecoveryLog[] {
  return loadDaily().sort((a, b) => b.date.localeCompare(a.date));
}
