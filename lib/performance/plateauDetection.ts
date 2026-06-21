// ─── lib/performance/plateauDetection.ts ─────────────────────────────────────
// Phase 36D — Plateau detection across strength and volume dimensions.
// Strength plateau: no meaningful 1RM gain over 4 weeks.
// Volume plateau: no meaningful volume increase over 6 weeks.

import { getPerformanceDatabaseForExercise, getPerformanceDatabase } from "./performanceDatabase";
import { epley1RM } from "./strengthEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlateauType = "strength" | "volume" | "adherence";

export interface PlateauAlert {
  exerciseName: string;
  type:         PlateauType;
  weeksDuration: number;
  severity:     "mild" | "significant" | "severe";
  suggestion:   string;
}

export interface PlateauReport {
  plateaus:      PlateauAlert[];
  exercisesAtRisk: string[];
  overallStatus: "clear" | "warning" | "plateau";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STRENGTH_PLATEAU_WEEKS = 4;
const VOLUME_PLATEAU_WEEKS   = 6;
const IMPROVE_THRESH         = 0.03;

function weeksBetween(dateA: string, dateB: string): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return (new Date(dateA).getTime() - new Date(dateB).getTime()) / msPerWeek;
}

function checkStrengthPlateau(exerciseName: string, today: string): PlateauAlert | null {
  const records = getPerformanceDatabaseForExercise(exerciseName)
    .filter(r => r.weight > 0 && r.actualReps > 0);

  if (records.length < 4) return null;

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - STRENGTH_PLATEAU_WEEKS * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const inWindow = records.filter(r => r.date >= cutoffStr);
  if (inWindow.length < 2) return null;

  const maxRecent   = Math.max(...inWindow.map(r => epley1RM(r.weight, r.actualReps)));
  const baseline    = records.find(r => r.date <= cutoffStr);
  if (!baseline) return null;

  const baselineE1RM = epley1RM(baseline.weight, baseline.actualReps);
  if (baselineE1RM === 0) return null;

  const gain = (maxRecent - baselineE1RM) / baselineE1RM;
  if (gain >= IMPROVE_THRESH) return null;

  const weeks = Math.round(weeksBetween(today, records[records.length - 1].date));
  const severity =
    weeks >= 8 ? "severe"
    : weeks >= 6 ? "significant"
    : "mild";

  return {
    exerciseName,
    type:         "strength",
    weeksDuration: Math.min(weeks, STRENGTH_PLATEAU_WEEKS),
    severity,
    suggestion:
      severity === "severe"
        ? "Deload for 1 week, then introduce a variation of this exercise"
        : severity === "significant"
        ? "Try a different rep scheme or increase rest periods"
        : "Consider slight load increase or technique refinement",
  };
}

function checkVolumePlateau(exerciseName: string, today: string): PlateauAlert | null {
  const records = getPerformanceDatabaseForExercise(exerciseName);
  if (records.length < 4) return null;

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - VOLUME_PLATEAU_WEEKS * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const inWindow = records.filter(r => r.date >= cutoffStr);
  if (inWindow.length < 2) return null;

  const volOf = (r: typeof records[0]) => (r.weight + 1) * r.actualReps * r.completedSets;
  const maxRecent = Math.max(...inWindow.map(volOf));
  const baseline  = records.find(r => r.date <= cutoffStr);
  if (!baseline) return null;

  const gain = (maxRecent - volOf(baseline)) / volOf(baseline);
  if (gain >= IMPROVE_THRESH) return null;

  return {
    exerciseName,
    type:          "volume",
    weeksDuration: VOLUME_PLATEAU_WEEKS,
    severity:      "mild",
    suggestion:    "Add 1–2 sets per session or introduce a progression week",
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectPlateaus(today: string): PlateauReport {
  const all   = getPerformanceDatabase();
  const names = [...new Set(all.map(r => r.exerciseName))];

  const plateaus: PlateauAlert[] = [];
  const atRisk:   string[]       = [];

  for (const name of names) {
    const sp = checkStrengthPlateau(name, today);
    if (sp) plateaus.push(sp);

    const vp = checkVolumePlateau(name, today);
    if (vp && !sp) plateaus.push(vp);

    const records = getPerformanceDatabaseForExercise(name);
    if (records.length >= 2) {
      const daysSinceLast = (new Date(today).getTime() - new Date(records[0].date).getTime()) / 86400000;
      if (daysSinceLast > 21) atRisk.push(name);
    }
  }

  const overallStatus =
    plateaus.some(p => p.severity === "severe" || p.severity === "significant") ? "plateau"
    : plateaus.length > 0 ? "warning"
    : "clear";

  return { plateaus, exercisesAtRisk: atRisk, overallStatus };
}
