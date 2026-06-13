// ─── lib/cycle/symptomClusters.ts ────────────────────────────────────────────
// Groups symptoms into phase clusters based on when they peak in the cycle.
// Uses window-based merging (no k-means) — appropriate for ≤25 symptoms.

import type { SymptomTimeline } from "./symptomTimeline";
import { toCyclePhaseName } from "./cycleUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SymptomCluster {
  label:       string;    // menstrual / follicular / ovulation / luteal / pre-menstrual phase
  centroidDay: number;    // mean peakDay of all symptoms in cluster
  symptoms:    string[];  // symptomName values
  strength:    number;    // mean frequency across cluster members (0–1, 2 dp)
}

// ─── Main export ──────────────────────────────────────────────────────────────

const MERGE_WINDOW_DAYS = 5;
const MIN_CLUSTER_SIZE  = 2;

/**
 * Clusters symptom timeline entries by proximity of their peakDay values.
 *
 * Consecutive symptoms (sorted by peakDay) are merged into the same cluster
 * when their peakDays are within MERGE_WINDOW_DAYS of each other. Clusters
 * with fewer than MIN_CLUSTER_SIZE symptoms are discarded as too thin to name.
 * Results are sorted by centroidDay ascending (chronological through the cycle).
 */
export function buildSymptomClusters(
  timeline:    SymptomTimeline,
  cycleLength: number,
): SymptomCluster[] {
  if (timeline.entries.length < MIN_CLUSTER_SIZE) return [];

  const sorted = [...timeline.entries].sort((a, b) => a.peakDay - b.peakDay);

  // Window-based merge pass
  const rawClusters: Array<typeof sorted> = [];
  let current: typeof sorted = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    if (sorted[i].peakDay - prev.peakDay <= MERGE_WINDOW_DAYS) {
      current.push(sorted[i]);
    } else {
      rawClusters.push(current);
      current = [sorted[i]];
    }
  }
  rawClusters.push(current);

  const clusters: SymptomCluster[] = [];

  for (const group of rawClusters) {
    if (group.length < MIN_CLUSTER_SIZE) continue;

    const centroidDay = Math.round(
      group.reduce((s, e) => s + e.peakDay, 0) / group.length,
    );
    const strength = Math.round(
      (group.reduce((s, e) => s + e.frequency, 0) / group.length) * 100,
    ) / 100;

    clusters.push({
      label:       toCyclePhaseName(centroidDay, cycleLength),
      centroidDay,
      symptoms:    group.map(e => e.symptomName),
      strength,
    });
  }

  return clusters.sort((a, b) => a.centroidDay - b.centroidDay);
}
