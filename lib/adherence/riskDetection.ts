// ─── lib/adherence/riskDetection.ts ──────────────────────────────────────────
// Phase 35B — Sustained adherence risk detection.
// Different from Phase 34's adherenceRisk.ts (daily skip risk).
// This detects medium-term adherence failure: multi-day drop-offs, disengagement,
// and the patterns that predict users quitting the habit altogether.

import type { AdherenceEntry }          from "./adherenceTracker";
import type { DailyNutritionCheckin }   from "@/lib/nutrition/nutritionCheckin";
import type { DailyRecoveryLog }        from "@/lib/recovery/recoveryStrategyCatalog";
import type { ReadinessHistoryEntry }   from "@/lib/readiness/readinessHistory";
import type { StoredConsistencyEntry }  from "./consistency";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdherenceRiskLevel = "low" | "medium" | "high";

export interface AdherenceRiskReport {
  level:    AdherenceRiskLevel;
  riskScore: number;    // 0–1 composite
  reasons:  string[];
  triggers: string[];   // machine-readable codes for rescue mode decisions
}

// ─── Detection logic ──────────────────────────────────────────────────────────

function windowCutoff(today: string, days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function detectAdherenceRisk(
  today:              string,
  adherenceHistory:   AdherenceEntry[],
  nutritionCheckins:  DailyNutritionCheckin[],
  recoveryLogs:       DailyRecoveryLog[],
  readinessHistory:   ReadinessHistoryEntry[],
  consistencyHistory: StoredConsistencyEntry[],
): AdherenceRiskReport {
  const reasons: string[]  = [];
  const triggers: string[] = [];
  let riskScore = 0;

  const cut7  = windowCutoff(today, 7);
  const cut14 = windowCutoff(today, 14);

  // ── Trigger 1: 3+ skips in 7 days ────────────────────────────────────────
  const skips7d = adherenceHistory.filter(
    e => e.date >= cut7 && e.date <= today && e.status === "skipped",
  ).length;
  if (skips7d >= 3) {
    riskScore += 0.35;
    triggers.push("missed_workouts");
    reasons.push(`${skips7d} workouts skipped in the last 7 days.`);
  } else if (skips7d === 2) {
    riskScore += 0.15;
    triggers.push("reduced_workouts");
    reasons.push("2 workouts skipped this week — watch for a third.");
  }

  // ── Trigger 2: 4+ days without a readiness entry (check-in gap) ──────────
  const recentReadiness = readinessHistory
    .filter(e => e.date >= cut7 && e.date <= today)
    .map(e => e.date);
  const engagementDays = new Set(recentReadiness).size;
  if (engagementDays <= 3) {
    riskScore += 0.20;
    triggers.push("missing_checkins");
    reasons.push("You've been away from the app for several days.");
  }

  // ── Trigger 3: Nutrition compliance < 40% ────────────────────────────────
  const nc7 = nutritionCheckins.filter(e => e.date >= cut7 && e.date <= today);
  if (nc7.length >= 3) {
    const proteinRate = nc7.filter(e => e.hitProtein).length / nc7.length;
    if (proteinRate < 0.40) {
      riskScore += 0.15;
      triggers.push("nutrition_drop");
      reasons.push("Protein target hit on fewer than 40% of logged days.");
    }
  }

  // ── Trigger 4: No recovery actions logged in 7 days ──────────────────────
  const rec7 = recoveryLogs.filter(e => e.date >= cut7 && e.date <= today);
  if (rec7.length === 0 && adherenceHistory.filter(e => e.date >= cut14).length >= 5) {
    riskScore += 0.10;
    triggers.push("recovery_drop");
    reasons.push("No recovery strategies logged in the past week.");
  }

  // ── Trigger 5: Consistency trend declining ────────────────────────────────
  const recentConsistency = consistencyHistory
    .filter(e => e.date >= cut14 && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (recentConsistency.length >= 7) {
    const firstHalf  = recentConsistency.slice(0, Math.floor(recentConsistency.length / 2));
    const secondHalf = recentConsistency.slice(Math.floor(recentConsistency.length / 2));
    const firstAvg   = firstHalf.reduce((s, e) => s + e.composite, 0)  / firstHalf.length;
    const secondAvg  = secondHalf.reduce((s, e) => s + e.composite, 0) / secondHalf.length;
    if (secondAvg < firstAvg - 10) {
      riskScore += 0.20;
      triggers.push("consistency_decline");
      reasons.push(`Consistency score has dropped ${Math.round(firstAvg - secondAvg)} points over 2 weeks.`);
    }
  }

  // ── Classify ─────────────────────────────────────────────────────────────
  riskScore = Math.min(1, riskScore);
  const level: AdherenceRiskLevel =
    riskScore >= 0.50 ? "high"
    : riskScore >= 0.25 ? "medium"
    : "low";

  if (reasons.length === 0) {
    reasons.push("Adherence patterns look healthy — no sustained risk signals.");
  }

  return { level, riskScore, reasons, triggers };
}
