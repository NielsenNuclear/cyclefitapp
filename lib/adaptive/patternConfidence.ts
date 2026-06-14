// ─── lib/adaptive/patternConfidence.ts ───────────────────────────────────────
// Computes per-pattern confidence scores for symptom × cycle-phase pairs.
// Each pattern carries confidence, sampleSize, and lastObserved so the system
// never overstates certainty — isReliable requires both a high rate AND
// enough supporting observations.

import type { SymptomEntry }  from "@/lib/symptoms/symptomHistory";
import type { PeriodEntry }   from "@/lib/cycle/cycleAccuracy";
import { SYMPTOM_CATALOG }    from "@/lib/symptoms/symptomCatalog";
import {
  toCycleDay,
  getPeriodStartForDate,
  toCyclePhaseName,
} from "@/lib/cycle/cycleUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatternConfidence {
  patternId:    string;   // stable ID: "{symptomId}_{phase_slug}"
  symptomId:    string;
  symptomName:  string;
  phase:        string;   // e.g. "Pre-Menstrual Phase"
  description:  string;   // human-readable, UI-ready
  confidence:   number;   // 0–1; cycles with pattern / total cycles
  sampleSize:   number;   // distinct cycles where symptom appeared in this phase
  cyclesTotal:  number;
  lastObserved: string;   // YYYY-MM-DD of most recent occurrence
  isReliable:   boolean;  // confidence >= RELIABLE_CONFIDENCE && sampleSize >= RELIABLE_SAMPLE
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const MIN_FREQUENCY      = 0.20;  // below this = noise, not a pattern
const RELIABLE_CONFIDENCE = 0.70;  // ≥70% of cycles
const RELIABLE_SAMPLE    = 5;     // must appear in at least 5 distinct cycles

// ─── Internal helpers ─────────────────────────────────────────────────────────

function phaseSlug(phase: string): string {
  return phase.toLowerCase().replace(/\s+/g, "_");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds a list of symptom × phase pattern confidences from the full
 * symptom and period history.
 *
 * Only patterns that appear in ≥ 20% of observed cycles are returned.
 * Results are sorted by confidence descending.
 * Returns an empty array when fewer than 2 cycles of data exist.
 */
export function buildPatternConfidences(
  symptomHistory: SymptomEntry[],
  periodHistory:  PeriodEntry[],
  cycleLength:    number,
): PatternConfidence[] {
  if (periodHistory.length < 2 || symptomHistory.length === 0) return [];

  const sortedPeriods = [...periodHistory].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const totalCycles = periodHistory.length - 1;

  const nameMap = new Map(SYMPTOM_CATALOG.map(s => [s.id, s.name]));

  // Group by (symptomId, phase) → distinct cycle starts + observed dates
  type Bucket = { cycleStarts: Set<string>; dates: string[] };
  const groups = new Map<string, Bucket>();

  for (const entry of symptomHistory) {
    const cd          = toCycleDay(entry.date, sortedPeriods, cycleLength);
    const periodStart = getPeriodStartForDate(entry.date, sortedPeriods);
    if (cd === null || periodStart === null) continue;

    const phase = toCyclePhaseName(cd, cycleLength);
    const key   = `${entry.symptomId}||${phase}`;

    const bucket = groups.get(key) ?? { cycleStarts: new Set(), dates: [] };
    bucket.cycleStarts.add(periodStart);
    bucket.dates.push(entry.date);
    groups.set(key, bucket);
  }

  const patterns: PatternConfidence[] = [];

  for (const [key, bucket] of groups) {
    const [symptomId, phase] = key.split("||");
    const sampleSize         = bucket.cycleStarts.size;
    const confidence         = Math.round((sampleSize / totalCycles) * 100) / 100;

    if (confidence < MIN_FREQUENCY) continue;

    const symptomName = nameMap.get(symptomId) ?? symptomId;
    const lastObserved = [...bucket.dates].sort((a, b) => b.localeCompare(a))[0];

    patterns.push({
      patternId:    `${symptomId}_${phaseSlug(phase)}`,
      symptomId,
      symptomName,
      phase,
      description:  `${symptomName} during ${phase}`,
      confidence,
      sampleSize,
      cyclesTotal:  totalCycles,
      lastObserved,
      isReliable:   confidence >= RELIABLE_CONFIDENCE && sampleSize >= RELIABLE_SAMPLE,
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}
