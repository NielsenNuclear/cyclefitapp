// ─── lib/recovery/recoveryValidation.ts ──────────────────────────────────────
// Phase 33F — Predicted vs actual recovery validation loop.
// Stores yesterday's predicted recovery score and today's actual score.
// Over time this calibrates the recovery forecast model.
// Storage key: axis_recovery_validation (180-day retention)

const STORAGE_KEY    = "axis_recovery_validation";
const RETENTION_DAYS = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryValidationEntry {
  date:           string;   // YYYY-MM-DD — the date predicted
  predictedScore: number;
  actualScore?:   number;   // filled in the next day
  delta?:         number;   // actualScore - predictedScore (positive = underestimated recovery)
  validatedDate?: string;   // YYYY-MM-DD when the actual was recorded
}

export interface RecoveryValidationAccuracy {
  meanAbsError:   number;   // mean |delta| across validated entries
  sampleSize:     number;
  trend:          "improving" | "stable" | "worsening";
  overestimating: boolean;  // model tends to predict too high (user recovers less than expected)
  insight:        string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoff(): string {
  const d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  return d.toISOString().slice(0, 10);
}

function load(): RecoveryValidationEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecoveryValidationEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: RecoveryValidationEntry[]): void {
  if (!isClient()) return;
  const cut = cutoff();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Records today's predicted recovery score for later validation.
 * Idempotent — same date is a no-op.
 */
export function recordRecoveryPrediction(date: string, predictedScore: number): void {
  const existing = load();
  if (existing.some(e => e.date === date)) return;
  persist([{ date, predictedScore }, ...existing]);
}

/**
 * Validates yesterday's prediction with today's actual score.
 * Should be called once per day after computing today's recovery score.
 */
export function validateRecoveryPrediction(
  date:        string,
  actualScore: number,
  today:       string,
): void {
  const entries = load();
  const updated = entries.map(e => {
    if (e.date !== date || e.actualScore !== undefined) return e;
    return {
      ...e,
      actualScore,
      delta:         actualScore - e.predictedScore,
      validatedDate: today,
    };
  });
  persist(updated);
}

/**
 * Computes forecast accuracy from validated entries.
 * Returns meaningful insights after 7+ validated pairs.
 */
export function getValidationAccuracy(): RecoveryValidationAccuracy {
  const validated = load().filter(e => e.delta !== undefined);
  const n = validated.length;

  if (n < 3) {
    return {
      meanAbsError:   0,
      sampleSize:     n,
      trend:          "stable",
      overestimating: false,
      insight:        "Not enough validation data yet. Accuracy improves over time.",
    };
  }

  const deltas   = validated.map(e => e.delta!);
  const absErr   = deltas.map(d => Math.abs(d));
  const meanAbs  = Math.round(absErr.reduce((s, v) => s + v, 0) / n);
  const meanDelta = deltas.reduce((s, v) => s + v, 0) / n;

  // Trend: compare last 7 errors to prior 7
  const recent = absErr.slice(-7);
  const prior  = absErr.slice(-14, -7);
  const recentMean = recent.reduce((s, v) => s + v, 0) / (recent.length || 1);
  const priorMean  = prior.length > 0 ? prior.reduce((s, v) => s + v, 0) / prior.length : recentMean;

  const trend: RecoveryValidationAccuracy["trend"] =
    recentMean < priorMean - 2 ? "improving"  :
    recentMean > priorMean + 2 ? "worsening"  : "stable";

  const overestimating = meanDelta < -3;  // predicted too high on average

  const insight = meanAbs <= 5
    ? `Recovery forecast is accurate within ±${meanAbs} points on average.`
    : overestimating
    ? `Forecast tends to be optimistic by ~${Math.abs(Math.round(meanDelta))} points. Axis is adjusting.`
    : `Forecast is within ${meanAbs} points on average. ${trend === "improving" ? "Accuracy is improving." : ""}`;

  return { meanAbsError: meanAbs, sampleSize: n, trend, overestimating, insight };
}
