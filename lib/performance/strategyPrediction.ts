// ─── lib/performance/strategyPrediction.ts ───────────────────────────────────
// Estimates expected success probability for each training modality today,
// given readiness, phase, recovery debt, and symptom load.
// Pure function — all inputs passed in.

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingModality =
  | "heavy_strength"
  | "moderate_strength"
  | "hypertrophy"
  | "intervals"
  | "recovery_work";

const MODALITY_LABELS: Record<TrainingModality, string> = {
  heavy_strength:    "Heavy Strength",
  moderate_strength: "Moderate Strength",
  hypertrophy:       "Hypertrophy",
  intervals:         "Intervals",
  recovery_work:     "Recovery Work",
};

export interface StrategyPrediction {
  modality:    TrainingModality;
  label:       string;
  prob:        number;   // 0–100 estimated success rate
}

export interface StrategyPredictionReport {
  predictions: StrategyPrediction[];   // sorted best-first
  recommended: TrainingModality;
  bestProb:    number;
}

// ─── Base rates ───────────────────────────────────────────────────────────────
// Calibrated from typical female athlete training response data.
// Readiness modifies these rates; phase, debt, and symptoms shift them further.

const BASE_PROB: Record<TrainingModality, number> = {
  heavy_strength:    60,
  moderate_strength: 70,
  hypertrophy:       65,
  intervals:         55,
  recovery_work:     88,
};

// ─── Modifiers ────────────────────────────────────────────────────────────────

// Readiness modifier: linear from -25 (readiness 0) to +25 (readiness 100)
function readinessMod(readiness: number): number {
  return Math.round((readiness - 50) * 0.50);
}

// Phase modifiers per modality
const PHASE_MODS: Record<string, Partial<Record<TrainingModality, number>>> = {
  Follicular:    { heavy_strength: +8,  moderate_strength: +5,  hypertrophy: +5,  intervals: +5 },
  Ovulatory:     { heavy_strength: +12, moderate_strength: +8,  hypertrophy: +6,  intervals: +8 },
  Luteal:        { heavy_strength: -5,  intervals: -8,  recovery_work: +5 },
  "Late Luteal": { heavy_strength: -12, intervals: -12, hypertrophy: -5, recovery_work: +10 },
  Menstrual:     { heavy_strength: -8,  intervals: -10, hypertrophy: -5, recovery_work: +8 },
};

// Debt modifier: scales with debt severity
function debtMod(debtScore: number, modality: TrainingModality): number {
  if (debtScore < 20) return 0;
  const sensitivity: Record<TrainingModality, number> = {
    heavy_strength:    0.30,
    moderate_strength: 0.15,
    hypertrophy:       0.20,
    intervals:         0.35,
    recovery_work:     0.05,
  };
  return -Math.round(debtScore * (sensitivity[modality] ?? 0.20));
}

// Symptom modifier: mean severity 0-3 → up to -15 penalty for intense training
function symptomMod(meanSeverity: number, modality: TrainingModality): number {
  if (meanSeverity === 0) return 0;
  const sensitivity: Record<TrainingModality, number> = {
    heavy_strength:    6,
    moderate_strength: 3,
    hypertrophy:       4,
    intervals:         7,
    recovery_work:     1,
  };
  return -Math.round(meanSeverity * (sensitivity[modality] ?? 4));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeStrategyPrediction(
  readinessScore: number,
  phaseName:      string,
  debtScore:      number,
  meanSymptomSeverity: number,
): StrategyPredictionReport {
  const phaseMods = PHASE_MODS[phaseName] ?? {};
  const rdxMod    = readinessMod(readinessScore);

  const predictions: StrategyPrediction[] = (Object.keys(BASE_PROB) as TrainingModality[]).map(m => {
    const prob = Math.min(99, Math.max(5,
      BASE_PROB[m] +
      rdxMod +
      (phaseMods[m] ?? 0) +
      debtMod(debtScore, m) +
      symptomMod(meanSymptomSeverity, m),
    ));
    return { modality: m, label: MODALITY_LABELS[m], prob };
  });

  predictions.sort((a, b) => b.prob - a.prob);

  return {
    predictions,
    recommended: predictions[0].modality,
    bestProb:    predictions[0].prob,
  };
}
