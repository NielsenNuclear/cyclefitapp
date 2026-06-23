// ─── lib/intelligence/pipelineTrace.ts ────────────────────────────────────────
// Phase 56 — Pipeline Trace
// Developer-level record of inputs → modifiers → outputs for the latest
// recommendation pipeline execution. Not user-facing.

const STORAGE_KEY = "axis_pipeline_trace";

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineTrace {
  timestamp: string;

  inputs: {
    readiness:      number;
    recoveryScore:  number;
    cyclePhase:     string;
    adherenceRisk:  string;
    uncertainty:    number;    // uncertainty volumeModifier
    burnoutRisk:    number;
    fatigueScore:   number;
    symptomCount:   number;
  };

  modifiers: {
    readinessScale:   number;   // derived from readiness category
    recoveryScale:    number;   // 1.0 - (recoveryDebt contribution)
    cycleScale:       number;   // phase-based modifier
    adherenceScale:   number;   // finalAdherenceScale
    uncertaintyScale: number;   // prevSessionUncertainty.volumeModifier
  };

  outputs: {
    volumeScale:         number;
    workoutMode:         string;
    recommendationLevel: string;
  };
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function readinessCategoryToScale(category: string): number {
  switch (category) {
    case "optimal":  return 1.10;
    case "ready":    return 1.00;
    case "moderate": return 0.90;
    default:         return 0.80;
  }
}

function cyclePhaseToScale(phase: string): number {
  const p = phase.toLowerCase();
  if (p.includes("ovulat"))     return 1.05;
  if (p.includes("follicular")) return 1.02;
  if (p.includes("menstrual"))  return 0.95;
  if (p.includes("luteal"))     return 0.97;
  return 1.00;
}

export interface PipelineTraceInput {
  readiness:           number;
  readinessCategory:   string;
  recoveryScore:       number;
  recoveryDebtScore:   number;
  cyclePhase:          string;
  adherenceRisk:       string;
  adherenceScale:      number;
  uncertaintyModifier: number;
  burnoutRiskScore:    number;
  fatigueScore:        number;
  symptomCount:        number;
  finalVolumeScale:    number;
  workoutMode:         string;
  recommendationLevel: string;
  todayDate:           string;
}

export function buildPipelineTrace(input: PipelineTraceInput): PipelineTrace {
  return {
    timestamp: input.todayDate,
    inputs: {
      readiness:     input.readiness,
      recoveryScore: input.recoveryScore,
      cyclePhase:    input.cyclePhase,
      adherenceRisk: input.adherenceRisk,
      uncertainty:   input.uncertaintyModifier,
      burnoutRisk:   input.burnoutRiskScore,
      fatigueScore:  input.fatigueScore,
      symptomCount:  input.symptomCount,
    },
    modifiers: {
      readinessScale:   readinessCategoryToScale(input.readinessCategory),
      recoveryScale:    Math.max(0.75, 1 - input.recoveryDebtScore * 0.003),
      cycleScale:       cyclePhaseToScale(input.cyclePhase),
      adherenceScale:   input.adherenceScale,
      uncertaintyScale: input.uncertaintyModifier,
    },
    outputs: {
      volumeScale:         input.finalVolumeScale,
      workoutMode:         input.workoutMode,
      recommendationLevel: input.recommendationLevel,
    },
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export function savePipelineTrace(trace: PipelineTrace): void {
  if (!isClient()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trace)); } catch {}
}

export function loadPipelineTrace(): PipelineTrace | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PipelineTrace) : null;
  } catch { return null; }
}
