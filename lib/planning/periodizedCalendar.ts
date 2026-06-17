// ─── lib/planning/periodizedCalendar.ts ──────────────────────────────────────
// Generates a 4-week forward planning view from all available signals.
// Pure function — no localStorage reads.

import type { TrainingBlock } from "@/lib/planning/trainingBlocks";
import type { WeeklyPlan } from "@/lib/planning/weeklyPlanner";
import type { DeloadRecommendation } from "@/lib/recovery/deloadDetection";
import type { RecoveryCapacity } from "@/lib/adaptive/recoveryCapacity";
import type { LearnedPattern } from "@/lib/cycleLearning/types";
import { computeCycleForecast } from "@/lib/forecasting/forecastCycle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeekLabel = "Foundation" | "Build" | "Push" | "Deload" | "Recovery";

export interface CalendarWeek {
  weekOffset:  number;       // 0 = current week
  weekStart:   string;       // ISO date — Monday
  blockWeek:   number;       // block week number for this calendar week
  label:       WeekLabel;
  intensity:   "low" | "moderate" | "high";
  sessions:    number;
  notes:       string[];
}

export interface PeriodizedCalendar {
  weeks: CalendarWeek[];     // always 4 entries
}

export interface CalendarInput {
  trainingBlock:    TrainingBlock;
  weeklyPlan:       WeeklyPlan;
  deloadRec:        DeloadRecommendation;
  recoveryCapacity: RecoveryCapacity;
  learnedPatterns:  LearnedPattern[];
  currentCycleDay:  number;
  cycleLength:      number;
  sessionsPerWeek:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function deriveLabel(
  blockWeek: number,
  totalWeeks: number,
  isDeload: boolean,
  isRecovery: boolean,
): WeekLabel {
  if (isDeload)                       return "Deload";
  if (isRecovery)                     return "Recovery";
  if (blockWeek >= totalWeeks)        return "Deload";
  if (blockWeek === totalWeeks - 1)   return "Push";
  if (blockWeek === 1)                return "Foundation";
  return "Build";
}

function intensityForLabel(
  label: WeekLabel,
  blockWeek: number,
  totalWeeks: number,
): CalendarWeek["intensity"] {
  if (label === "Deload" || label === "Recovery") return "low";
  if (label === "Push")                           return "high";
  if (label === "Foundation")                     return "moderate";
  // Build — ramp up in the second half of the block
  const midpoint = Math.ceil(totalWeeks / 2);
  return blockWeek > midpoint ? "high" : "moderate";
}

function sessionsForLabel(label: WeekLabel, baseline: number): number {
  if (label === "Deload")    return Math.max(1, baseline - 2);
  if (label === "Recovery")  return Math.max(1, Math.floor(baseline / 2));
  if (label === "Push")      return baseline;
  return baseline;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computePeriodizedCalendar(input: CalendarInput): PeriodizedCalendar {
  const {
    trainingBlock,
    weeklyPlan,
    deloadRec,
    recoveryCapacity,
    learnedPatterns,
    currentCycleDay,
    cycleLength,
    sessionsPerWeek,
  } = input;

  // Compute 28-day cycle forecast for annotating future weeks
  const extendedForecast = computeCycleForecast(
    learnedPatterns, currentCycleDay, cycleLength, 28
  );

  const weeks: CalendarWeek[] = [];

  for (let offset = 0; offset < 4; offset++) {
    const weekStart  = addDays(weeklyPlan.weekStart, offset * 7);
    const blockWeek  = trainingBlock.currentWeek + offset;

    // Deload: only apply the detected deload to current week (week 0)
    const isDeload   = offset === 0 && deloadRec.needed;
    // Recovery: if capacity is low and we're in a Build week and not week 0
    const isRecovery = !isDeload && offset > 0 && recoveryCapacity.level === "low" && blockWeek % 4 === 0;

    const label      = deriveLabel(blockWeek, trainingBlock.totalWeeks, isDeload, isRecovery);
    const intensity  = offset === 0
      ? weeklyPlan.plannedIntensity
      : intensityForLabel(label, blockWeek, trainingBlock.totalWeeks);
    const sessions   = offset === 0
      ? weeklyPlan.targetSessions
      : sessionsForLabel(label, sessionsPerWeek);

    // Collect cycle notes for this week's day range
    const dayMin = offset * 7;
    const dayMax = offset * 7 + 6;
    const notes: string[] = [];

    const watchDays = extendedForecast.readinessDays.filter(
      d => d.daysFromNow >= dayMin && d.daysFromNow <= dayMax &&
           (d.readinessForecast === "watch" || d.readinessForecast === "recover")
    );
    if (watchDays.length > 0) {
      const worst = watchDays.find(d => d.readinessForecast === "recover") ?? watchDays[0];
      const label = worst.readinessForecast === "recover" ? "low readiness" : "reduced readiness";
      notes.push(`Expect ${label} around ${formatDate(addDays(weekStart, worst.daysFromNow - dayMin))}`);
    }

    if (offset === 0 && deloadRec.needed && deloadRec.rationale) {
      notes.push(deloadRec.rationale);
    }

    weeks.push({ weekOffset: offset, weekStart, blockWeek, label, intensity, sessions, notes });
  }

  return { weeks };
}
