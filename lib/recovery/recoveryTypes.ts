// ─── lib/recovery/recoveryTypes.ts ───────────────────────────────────────────
// Shared types for the Phase 21 Recovery Intelligence System.
// All sub-modules import from here.

// ─── Recovery Score ───────────────────────────────────────────────────────────

export type RecoveryCategory =
  | "Excellent"    // 80–100
  | "Good"         // 65–79
  | "Moderate"     // 50–64
  | "Compromised"  // 35–49
  | "Poor";        // 0–34

export interface RecoveryContributor {
  factor:       string;
  contribution: number;   // positive = helpful, negative = harmful
  note:         string;
}

export interface RecoveryScore {
  score:        number;
  category:     RecoveryCategory;
  contributors: RecoveryContributor[];
  date:         string;             // YYYY-MM-DD
}

// ─── Recovery Trend ───────────────────────────────────────────────────────────

export type RecoveryTrendStatus =
  | "improving"
  | "stable"
  | "declining"
  | "rapidly_declining";

export interface RecoveryTrend {
  status7d:   RecoveryTrendStatus;
  status14d:  RecoveryTrendStatus;
  status28d:  RecoveryTrendStatus;
  slope7d:    number;       // average daily change over 7 days (negative = declining)
  dataPoints: number;
}

// ─── Recovery Debt ────────────────────────────────────────────────────────────

export type DebtCategory =
  | "low"       // 0–14
  | "moderate"  // 15–29
  | "elevated"  // 30–49
  | "high"      // 50–69
  | "critical"; // 70–100

export type DebtTrend = "accumulating" | "stable" | "reducing";

export interface RecoveryDebt {
  debtScore:    number;
  category:     DebtCategory;
  trend:        DebtTrend;
  daysElevated: number;   // consecutive days at ≥ "elevated"
}

// ─── Burnout Risk ─────────────────────────────────────────────────────────────

export type BurnoutLevel = "low" | "moderate" | "high" | "severe";

export interface BurnoutFactor {
  name:   string;
  score:  number;   // 0–20 contribution to total burnout score
  detail: string;
}

export interface BurnoutRisk {
  score:   number;          // 0–100
  level:   BurnoutLevel;
  factors: BurnoutFactor[];
}

// ─── Symptom Escalation ───────────────────────────────────────────────────────

export type EscalationStatus = "escalating" | "stable" | "improving";

export interface SymptomEscalationEntry {
  symptomId:   string;
  symptomName: string;
  status:      EscalationStatus;
  cycleMeans:  number[];   // mean severity per recent cycle, oldest first
}

// ─── Health Trend ─────────────────────────────────────────────────────────────

export interface HealthTrend {
  improving: string[];
  stable:    string[];
  watch:     string[];
}

// ─── Recovery Plan ────────────────────────────────────────────────────────────

export type PlanUrgency = "none" | "low" | "moderate" | "high" | "critical";

export interface RecoveryPlan {
  urgency:         PlanUrgency;
  recommendations: string[];
  rationale:       string;
}

// ─── Recovery Learning ────────────────────────────────────────────────────────

export type StrategyVerdict = "effective" | "ineffective" | "uncertain";

export interface RecoveryStrategyOutcome {
  strategy:    string;
  successRate: number;     // 0–1
  sampleSize:  number;
  verdict:     StrategyVerdict;
}
