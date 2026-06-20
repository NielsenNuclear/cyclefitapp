// ─── lib/progression/trainingResponseProfile.ts ──────────────────────────────
// Builds a personalised training response profile from 50+ logged sessions.
// Identifies whether this user is a volume, intensity, or frequency responder.
// Derived on demand — no separate storage needed (computed from raw history).

import type { ExercisePerformanceEntry } from "./exercisePerformanceLog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VolumeStyle    = "high_volume" | "moderate_volume" | "low_volume" | "insufficient_data";
export type IntensityStyle = "high_intensity" | "moderate_intensity" | "low_intensity" | "insufficient_data";
export type FrequencyStyle = "high_frequency" | "moderate_frequency" | "low_frequency" | "insufficient_data";

export interface TrainingResponseProfile {
  totalSessions:          number;
  optimalVolumeStyle:     VolumeStyle;
  optimalIntensityStyle:  IntensityStyle;
  optimalFrequencyStyle:  FrequencyStyle;
  avgDaysBetweenSessions: number;
  insight:                string;
  confidence:             "early" | "growing" | "established";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function weekKey(dateStr: string): string {
  const d   = new Date(dateStr);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // align to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function medianOf(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ─── Main export ──────────────────────────────────────────────────────────────

const THRESHOLD = 50;

/**
 * Derives a training response profile from the full exercise performance history.
 *
 * Volume response: correlates prior-week set total with the following week's
 * session engagement (count delta). A positive correlation signals a volume
 * responder; a negative correlation signals a lower-volume responder.
 *
 * Intensity response: same pattern using prior-week average RPE.
 *
 * Frequency: average days between consecutive sessions per exercise
 * (gaps > 14 days excluded as deload/illness breaks).
 *
 * Requires 50+ entries for "growing" confidence; 100+ for "established".
 */
export function buildTrainingResponseProfile(
  history: ExercisePerformanceEntry[],
): TrainingResponseProfile {
  const n = history.length;

  if (n < THRESHOLD) {
    return {
      totalSessions:          n,
      optimalVolumeStyle:     "insufficient_data",
      optimalIntensityStyle:  "insufficient_data",
      optimalFrequencyStyle:  "insufficient_data",
      avgDaysBetweenSessions: 0,
      insight: n < 20
        ? `Log ${THRESHOLD - n} more exercise sessions to unlock your training response profile.`
        : `${n} sessions logged — almost there. Keep training to complete your response profile.`,
      confidence: n < 20 ? "early" : "growing",
    };
  }

  // ── Weekly aggregates ─────────────────────────────────────────────────────────
  const weekMap = new Map<string, { totalSets: number; totalRPE: number; count: number }>();
  for (const e of history) {
    const wk   = weekKey(e.date);
    const prev = weekMap.get(wk) ?? { totalSets: 0, totalRPE: 0, count: 0 };
    weekMap.set(wk, {
      totalSets: prev.totalSets + e.completedSets,
      totalRPE:  prev.totalRPE  + e.actualRPE,
      count:     prev.count + 1,
    });
  }

  const weeks = [...weekMap.entries()]
    .map(([wk, v]) => ({
      week:      wk,
      totalSets: v.totalSets,
      avgRPE:    v.totalRPE / v.count,
      count:     v.count,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  let optimalVolumeStyle:    VolumeStyle    = "moderate_volume";
  let optimalIntensityStyle: IntensityStyle = "moderate_intensity";

  if (weeks.length >= 4) {
    // Stimulus–response pairs: prior-week metrics → this-week session delta
    const pairs = weeks.slice(1).map((curr, i) => ({
      prevSets: weeks[i].totalSets,
      prevRPE:  weeks[i].avgRPE,
      growth:   curr.count - weeks[i].count,
    }));

    const medSets  = medianOf(pairs.map(p => p.prevSets));
    const hiVol    = pairs.filter(p => p.prevSets >= medSets);
    const loVol    = pairs.filter(p => p.prevSets <  medSets);
    const hiGrowth = hiVol.length ? hiVol.reduce((s, p) => s + p.growth, 0) / hiVol.length : 0;
    const loGrowth = loVol.length ? loVol.reduce((s, p) => s + p.growth, 0) / loVol.length : 0;

    optimalVolumeStyle =
      Math.abs(hiGrowth - loGrowth) < 0.25 ? "moderate_volume" :
      hiGrowth > loGrowth                   ? "high_volume"     : "low_volume";

    const medRPE   = medianOf(pairs.map(p => p.prevRPE));
    const hiInt    = pairs.filter(p => p.prevRPE >= medRPE);
    const loInt    = pairs.filter(p => p.prevRPE <  medRPE);
    const hiRGrowth = hiInt.length ? hiInt.reduce((s, p) => s + p.growth, 0) / hiInt.length : 0;
    const loRGrowth = loInt.length ? loInt.reduce((s, p) => s + p.growth, 0) / loInt.length : 0;

    optimalIntensityStyle =
      Math.abs(hiRGrowth - loRGrowth) < 0.25 ? "moderate_intensity" :
      hiRGrowth > loRGrowth                   ? "high_intensity"     : "low_intensity";
  }

  // ── Per-exercise frequency ────────────────────────────────────────────────────
  const exerciseDates = new Map<string, string[]>();
  for (const e of history) {
    const list = exerciseDates.get(e.exerciseName) ?? [];
    list.push(e.date);
    exerciseDates.set(e.exerciseName, list);
  }

  const intervals: number[] = [];
  for (const dates of exerciseDates.values()) {
    const sorted = [...dates].sort();
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86_400_000;
      if (diff > 0 && diff <= 14) intervals.push(diff); // exclude deload gaps
    }
  }

  const avgInterval = intervals.length > 0
    ? Math.round((intervals.reduce((s, d) => s + d, 0) / intervals.length) * 10) / 10
    : 7;

  const optimalFrequencyStyle: FrequencyStyle =
    avgInterval < 3.5 ? "high_frequency"   :
    avgInterval > 5.5 ? "low_frequency"    :
                        "moderate_frequency";

  // ── Insight string ────────────────────────────────────────────────────────────
  const volText =
    optimalVolumeStyle === "high_volume"   ? "respond best to higher volume (more sets per session)" :
    optimalVolumeStyle === "low_volume"    ? "make gains with focused low-volume sessions"            :
                                             "progress consistently across volume levels";

  const intText =
    optimalIntensityStyle === "high_intensity"  ? "drive best results with high-intensity effort (RPE 7+)" :
    optimalIntensityStyle === "low_intensity"   ? "accumulate gains better with moderate intensity"          :
                                                  "adapt well across all intensity ranges";

  const freqText = avgInterval > 0 ? ` Average training frequency: every ${avgInterval} days per exercise.` : "";

  const confidence: TrainingResponseProfile["confidence"] =
    n >= 100 ? "established" :
    n >= 50  ? "growing"     : "early";

  return {
    totalSessions:          n,
    optimalVolumeStyle,
    optimalIntensityStyle,
    optimalFrequencyStyle,
    avgDaysBetweenSessions: avgInterval,
    insight: `From ${n} logged sessions: you ${volText} and ${intText}.${freqText}`,
    confidence,
  };
}
