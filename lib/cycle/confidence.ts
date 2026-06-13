// ─── lib/cycle/confidence.ts ──────────────────────────────────────────────────
// Canonical confidence scoring for cycle intelligence estimates.
// All cycle modules use the same thresholds via this function.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "none" | "low" | "moderate" | "high";

export interface ConfidenceScore {
  level:          ConfidenceLevel;
  cyclesObserved: number;
  description:    string;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const THRESHOLDS: Array<{ min: number; level: ConfidenceLevel; description: string }> = [
  { min: 5, level: "high",     description: "5+ cycles observed — estimates are well-calibrated to your personal patterns." },
  { min: 2, level: "moderate", description: "2–4 cycles observed — estimates are improving as more data is collected." },
  { min: 1, level: "low",      description: "1 cycle observed — estimates are based on limited personal data." },
  { min: 0, level: "none",     description: "No complete cycles observed yet — log period dates to unlock cycle insights." },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeConfidenceScore(cyclesObserved: number): ConfidenceScore {
  const match = THRESHOLDS.find(t => cyclesObserved >= t.min) ?? THRESHOLDS[THRESHOLDS.length - 1];
  return { level: match.level, cyclesObserved, description: match.description };
}
