// ─── lib/physiology/phaseResponseModel.ts ────────────────────────────────────
// 40A — Individual Phase Response Modeling
// Learns which cycle phase THIS user actually performs best in, replacing
// population assumptions (ovulation = peak) with observed personal patterns.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { AdherenceEntry }        from "@/lib/adherence/adherenceTracker";
import type { SymptomEntry }          from "@/lib/symptoms/symptomHistory";
import type { PeriodEntry }           from "@/lib/cycle/cycleAccuracy";
import {
  toCycleDay,
  getPeriodStartForDate,
  toCyclePhaseName,
} from "@/lib/cycle/cycleUtils";

const STORAGE_KEY    = "axis_phase_response";
const RETENTION_DAYS = 1825;
const MIN_OBS        = 3;
const POPULATION_PEAK = "Ovulation Phase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhaseStats {
  phase:          string;
  meanReadiness:  number;
  meanSymptoms:   number;
  completionRate: number;
  observations:   number;
}

export interface PhaseResponseProfile {
  bestPhase:              string | null;
  worstPhase:             string | null;
  strongestPhase:         string | null;
  highestRecoveryPhase:   string | null;
  phaseProfiles:          PhaseStats[];
  deviatesFromPopulation: boolean;
  personalizedInsight:    string;
  dataReady:              boolean;
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function computePhaseResponseProfile(
  readinessHistory: ReadinessHistoryEntry[],
  adherenceHistory: AdherenceEntry[],
  symptomHistory:   SymptomEntry[],
  periodHistory:    PeriodEntry[],
  cycleLength:      number,
): PhaseResponseProfile {
  const EMPTY: PhaseResponseProfile = {
    bestPhase: null, worstPhase: null, strongestPhase: null,
    highestRecoveryPhase: null, phaseProfiles: [],
    deviatesFromPopulation: false,
    personalizedInsight: "Not enough cycle data yet.",
    dataReady: false,
  };

  if (periodHistory.length < 2 || readinessHistory.length < 10) return EMPTY;

  const sorted = [...periodHistory].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const symptomsByDate = new Map<string, number>();
  for (const s of symptomHistory) {
    symptomsByDate.set(s.date, (symptomsByDate.get(s.date) ?? 0) + 1);
  }

  const adherenceByDate = new Map<string, string>();
  for (const a of adherenceHistory) adherenceByDate.set(a.date, a.status);

  const buckets = new Map<string, {
    readiness: number[];
    symptoms:  number[];
    completions: number;
    total:       number;
  }>();

  for (const entry of readinessHistory) {
    const cd = toCycleDay(entry.date, sorted, cycleLength);
    const ps = getPeriodStartForDate(entry.date, sorted);
    if (cd === null || ps === null) continue;

    const phase = toCyclePhaseName(cd, cycleLength);
    if (!buckets.has(phase)) {
      buckets.set(phase, { readiness: [], symptoms: [], completions: 0, total: 0 });
    }
    const b = buckets.get(phase)!;
    b.readiness.push(entry.score);
    b.symptoms.push(symptomsByDate.get(entry.date) ?? 0);
    const status = adherenceByDate.get(entry.date) ?? "pending";
    if (status === "completed" || status === "partially_completed") b.completions++;
    b.total++;
  }

  const phaseProfiles: PhaseStats[] = [];
  for (const [phase, b] of buckets.entries()) {
    if (b.readiness.length < MIN_OBS) continue;
    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    phaseProfiles.push({
      phase,
      meanReadiness:  Math.round(mean(b.readiness)),
      meanSymptoms:   Math.round(mean(b.symptoms) * 10) / 10,
      completionRate: b.total > 0 ? Math.round((b.completions / b.total) * 100) : 0,
      observations:   b.readiness.length,
    });
  }

  if (phaseProfiles.length < 2) return EMPTY;

  const byReadiness   = [...phaseProfiles].sort((a, b) => b.meanReadiness - a.meanReadiness);
  const byCompletion  = [...phaseProfiles].sort((a, b) => b.completionRate - a.completionRate);
  const bySymptoms    = [...phaseProfiles].sort((a, b) => a.meanSymptoms - b.meanSymptoms);

  const bestPhase            = byReadiness[0].phase;
  const worstPhase           = byReadiness[byReadiness.length - 1].phase;
  const strongestPhase       = byCompletion[0].phase;
  const highestRecoveryPhase = bySymptoms[0].phase;
  const deviatesFromPopulation = bestPhase !== POPULATION_PEAK;

  const personalizedInsight = deviatesFromPopulation
    ? `Your personal peak is ${bestPhase}, not ${POPULATION_PEAK} as most research suggests. Axis now trusts your data over the average.`
    : `Your training peaks align with the population — ${bestPhase} is your highest-readiness phase.`;

  return {
    bestPhase, worstPhase, strongestPhase, highestRecoveryPhase,
    phaseProfiles: byReadiness, deviatesFromPopulation,
    personalizedInsight, dataReady: true,
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

interface Stored { computed: PhaseResponseProfile; date: string }

export function savePhaseResponseProfile(profile: PhaseResponseProfile): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ computed: profile, date: new Date().toISOString().slice(0, 10) }));
  } catch {}
}

export function loadPhaseResponseProfile(): PhaseResponseProfile | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    if (parsed.date < cutoff.toISOString().slice(0, 10)) return null;
    return parsed.computed;
  } catch { return null; }
}
