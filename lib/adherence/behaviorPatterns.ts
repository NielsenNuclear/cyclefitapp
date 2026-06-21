// ─── lib/adherence/behaviorPatterns.ts ───────────────────────────────────────
// Phase 34D — Behavior patterns.
// Identifies the user's best and worst weekdays, and per-phase / per-block
// completion rates so the coach can time recommendations intelligently.

import type { AdherenceEntry } from "./adherenceTracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekdayPattern {
  weekday:      number;      // 0 = Sunday … 6 = Saturday
  label:        string;      // "Sunday" … "Saturday"
  completionRate: number;    // 0–1
  sampleSize:   number;
}

export interface PhasePattern {
  phase:          string;    // "Follicular" | "Ovulatory" | "Luteal" | "Late Luteal" | "Menstrual"
  completionRate: number;
  sampleSize:     number;
}

export interface BlockPattern {
  block:          string;    // "accumulation" | "intensification" | "peak" | "deload"
  completionRate: number;
  sampleSize:     number;
}

export interface BehaviorPatterns {
  weekdayPatterns: WeekdayPattern[];
  phasePatterns:   PhasePattern[];
  blockPatterns:   BlockPattern[];
  bestWeekday:     WeekdayPattern | null;
  worstWeekday:    WeekdayPattern | null;
  sampleSize:      number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MIN_SAMPLE = 3;  // minimum entries to compute a reliable rate

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCompleted(status: AdherenceEntry["status"]): boolean {
  return status === "completed" || status === "partially_completed";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildBehaviorPatterns(history: AdherenceEntry[]): BehaviorPatterns {
  if (history.length === 0) {
    return {
      weekdayPatterns: [],
      phasePatterns:   [],
      blockPatterns:   [],
      bestWeekday:     null,
      worstWeekday:    null,
      sampleSize:      0,
    };
  }

  // ── Weekday patterns ───────────────────────────────────────────────────────
  const weekdayBuckets = new Map<number, AdherenceEntry[]>();
  for (const e of history) {
    const bucket = weekdayBuckets.get(e.weekday) ?? [];
    bucket.push(e);
    weekdayBuckets.set(e.weekday, bucket);
  }

  const weekdayPatterns: WeekdayPattern[] = Array.from(weekdayBuckets.entries())
    .map(([weekday, entries]) => {
      const completed = entries.filter(e => isCompleted(e.status)).length;
      return {
        weekday,
        label:          WEEKDAY_LABELS[weekday],
        completionRate: completed / entries.length,
        sampleSize:     entries.length,
      };
    })
    .sort((a, b) => a.weekday - b.weekday);

  const qualifiedWeekdays = weekdayPatterns.filter(p => p.sampleSize >= MIN_SAMPLE);
  const bestWeekday  = qualifiedWeekdays.length > 0
    ? [...qualifiedWeekdays].sort((a, b) => b.completionRate - a.completionRate)[0]
    : null;
  const worstWeekday = qualifiedWeekdays.length > 1
    ? [...qualifiedWeekdays].sort((a, b) => a.completionRate - b.completionRate)[0]
    : null;

  // ── Phase patterns ─────────────────────────────────────────────────────────
  const phaseBuckets = new Map<string, AdherenceEntry[]>();
  for (const e of history) {
    if (!e.cyclePhase) continue;
    const bucket = phaseBuckets.get(e.cyclePhase) ?? [];
    bucket.push(e);
    phaseBuckets.set(e.cyclePhase, bucket);
  }

  const phasePatterns: PhasePattern[] = Array.from(phaseBuckets.entries()).map(([phase, entries]) => {
    const completed = entries.filter(e => isCompleted(e.status)).length;
    return { phase, completionRate: completed / entries.length, sampleSize: entries.length };
  });

  // ── Training block patterns ────────────────────────────────────────────────
  const blockBuckets = new Map<string, AdherenceEntry[]>();
  for (const e of history) {
    if (!e.trainingBlock) continue;
    const bucket = blockBuckets.get(e.trainingBlock) ?? [];
    bucket.push(e);
    blockBuckets.set(e.trainingBlock, bucket);
  }

  const blockPatterns: BlockPattern[] = Array.from(blockBuckets.entries()).map(([block, entries]) => {
    const completed = entries.filter(e => isCompleted(e.status)).length;
    return { block, completionRate: completed / entries.length, sampleSize: entries.length };
  });

  return {
    weekdayPatterns,
    phasePatterns,
    blockPatterns,
    bestWeekday,
    worstWeekday,
    sampleSize: history.length,
  };
}

// Returns completion rate for a specific weekday (0 = Sunday, etc.)
export function getWeekdayCompletionRate(patterns: BehaviorPatterns, weekday: number): number | null {
  const p = patterns.weekdayPatterns.find(w => w.weekday === weekday);
  if (!p || p.sampleSize < MIN_SAMPLE) return null;
  return p.completionRate;
}
