// ─── lib/autoregulation/readinessConfidence.ts ───────────────────────────────
// Phase 37E — Adds a confidence interval to the readiness score.
// Confidence reflects data richness: how well Axis knows the user today.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ReadinessConfidence {
  readinessScore:  number;          // passed through from Phase 16
  confidence:      number;          // 0–100
  confidenceLevel: ConfidenceLevel;
  factors:         string[];        // what contributes to or limits confidence
}

export interface ReadinessConfidenceInput {
  readinessScore:       number;
  checkinHistoryCount:  number;     // total stored readiness history entries
  hasTodayCheckin:      boolean;    // did the user do a check-in today?
  cycleDataConfidence:  number;     // 0–100 from pattern confidences
  symptomHistoryCount:  number;     // total stored symptom entries
  recoveryHistoryCount: number;     // total stored recovery logs
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeReadinessConfidence(input: ReadinessConfidenceInput): ReadinessConfidence {
  const factors: string[] = [];
  let confidence = 0;

  // Today's check-in (most important single signal)
  if (input.hasTodayCheckin) {
    confidence += 30;
    factors.push("Today's check-in data available");
  } else {
    factors.push("No check-in yet — using baseline defaults");
  }

  // Readiness history depth
  if (input.checkinHistoryCount >= 30) {
    confidence += 25;
    factors.push("Extensive readiness history (30+ days)");
  } else if (input.checkinHistoryCount >= 14) {
    confidence += 15;
    factors.push("Moderate readiness history (14+ days)");
  } else if (input.checkinHistoryCount >= 7) {
    confidence += 8;
  }

  // Cycle intelligence confidence
  if (input.cycleDataConfidence >= 70) {
    confidence += 20;
    factors.push("High cycle pattern confidence");
  } else if (input.cycleDataConfidence >= 40) {
    confidence += 10;
    factors.push("Moderate cycle pattern confidence");
  } else {
    factors.push("Limited cycle data — confidence lower");
  }

  // Symptom history enriches the model
  if (input.symptomHistoryCount >= 20) {
    confidence += 15;
    factors.push("Rich symptom history");
  } else if (input.symptomHistoryCount >= 7) {
    confidence += 8;
  }

  // Recovery logs
  if (input.recoveryHistoryCount >= 14) {
    confidence += 10;
    factors.push("Consistent recovery logging");
  } else if (input.recoveryHistoryCount >= 5) {
    confidence += 5;
  }

  const clamped = Math.min(100, Math.round(confidence));
  const level: ConfidenceLevel =
    clamped >= 70 ? "high"
    : clamped >= 40 ? "medium"
    : "low";

  return {
    readinessScore:  input.readinessScore,
    confidence:      clamped,
    confidenceLevel: level,
    factors:         factors.slice(0, 3),
  };
}
