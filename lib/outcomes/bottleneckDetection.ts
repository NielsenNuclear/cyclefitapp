// ─── lib/outcomes/bottleneckDetection.ts ─────────────────────────────────────
// 43D — Bottleneck Detection Engine
// Identifies WHAT is limiting this user's progress right now.
// Looks at sleep, stress, protein, hydration, recovery, and consistency
// and ranks them by measured readiness drag.

import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { NutritionPattern }      from "@/lib/nutrition/nutritionPatterns";
import type { BehaviorKey }           from "./behaviorImpactRanking";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BottleneckEntry {
  category:               BehaviorKey;
  label:                  string;
  severity:               "mild" | "moderate" | "severe";
  currentScore:           number;   // 0–100
  threshold:              number;   // target
  evidence:               string;
  estimatedReadinessDrag: number;   // readiness pts lost due to this gap
}

export interface BottleneckReport {
  primaryBottleneck: BottleneckEntry | null;
  allBottlenecks:    BottleneckEntry[];
  confidence:        "low" | "moderate" | "high";
  dataReady:         boolean;
  summaryLine:       string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avgContributor(
  history: ReadinessHistoryEntry[],
  key: "sleep" | "stress" | "energy" | "adherence" | "trainingLoad",
  days = 14,
): number {
  const slice = history.slice(0, days);
  const vals  = slice
    .map(e => e.contributors?.[key])
    .filter((v): v is number => typeof v === "number");
  return vals.length > 0
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 50;
}

function severity(score: number, mild: number, moderate: number): "mild" | "moderate" | "severe" {
  if (score < moderate) return "severe";
  if (score < mild)     return "moderate";
  return "mild";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectBottlenecks(
  readinessHistory: ReadinessHistoryEntry[],
  nutritionPattern: NutritionPattern | undefined,
  recoveryScore:    number,     // 0–100 (Phase 21 recovery score)
  consistencyScore: number,     // 0–100 (Phase 35 composite)
): BottleneckReport {
  if (readinessHistory.length < 7) {
    return {
      primaryBottleneck: null,
      allBottlenecks:    [],
      confidence:        "low",
      dataReady:         false,
      summaryLine:       "Not enough history to identify bottlenecks yet.",
    };
  }

  const avgSleep       = avgContributor(readinessHistory, "sleep");
  const avgStressScore = avgContributor(readinessHistory, "stress"); // high = low stress
  const proteinScore   = nutritionPattern ? Math.round(nutritionPattern.proteinComplianceRate   * 100) : 50;
  const hydrationScore = nutritionPattern ? Math.round(nutritionPattern.hydrationComplianceRate * 100) : 50;

  const candidates: BottleneckEntry[] = [];

  // Sleep (contributor score, low = poor sleep)
  if (avgSleep < 60) {
    candidates.push({
      category:               "sleep",
      label:                  "Sleep quality",
      severity:               severity(avgSleep, 55, 40),
      currentScore:           avgSleep,
      threshold:              72,
      evidence:               `14-day avg sleep score ${avgSleep}/100`,
      estimatedReadinessDrag: Math.round((60 - avgSleep) * 0.45),
    });
  }

  // Stress (contributor.stress is inverted: low = high stress)
  if (avgStressScore < 50) {
    candidates.push({
      category:               "stress_management",
      label:                  "Stress management",
      severity:               severity(avgStressScore, 45, 30),
      currentScore:           avgStressScore,
      threshold:              65,
      evidence:               `14-day avg stress score ${avgStressScore}/100 (lower = more stress)`,
      estimatedReadinessDrag: Math.round((50 - avgStressScore) * 0.35),
    });
  }

  // Protein
  if (proteinScore < 70) {
    candidates.push({
      category:               "protein",
      label:                  "Protein intake",
      severity:               severity(proteinScore, 60, 45),
      currentScore:           proteinScore,
      threshold:              80,
      evidence:               `Protein compliance ${proteinScore}% (target ≥80%)`,
      estimatedReadinessDrag: Math.round((70 - proteinScore) * 0.22),
    });
  }

  // Hydration
  if (hydrationScore < 65) {
    candidates.push({
      category:               "hydration",
      label:                  "Hydration",
      severity:               severity(hydrationScore, 55, 40),
      currentScore:           hydrationScore,
      threshold:              75,
      evidence:               `Hydration compliance ${hydrationScore}% (target ≥75%)`,
      estimatedReadinessDrag: Math.round((65 - hydrationScore) * 0.18),
    });
  }

  // Recovery
  if (recoveryScore < 58) {
    candidates.push({
      category:               "recovery",
      label:                  "Active recovery",
      severity:               severity(recoveryScore, 50, 35),
      currentScore:           recoveryScore,
      threshold:              70,
      evidence:               `Recovery score ${recoveryScore}/100`,
      estimatedReadinessDrag: Math.round((58 - recoveryScore) * 0.38),
    });
  }

  // Consistency / adherence
  if (consistencyScore < 55) {
    candidates.push({
      category:               "consistency",
      label:                  "Training consistency",
      severity:               severity(consistencyScore, 45, 30),
      currentScore:           consistencyScore,
      threshold:              68,
      evidence:               `Consistency score ${consistencyScore}/100`,
      estimatedReadinessDrag: Math.round((55 - consistencyScore) * 0.28),
    });
  }

  // Sort by biggest drag
  candidates.sort((a, b) => b.estimatedReadinessDrag - a.estimatedReadinessDrag);

  const confidence: "low" | "moderate" | "high" =
    readinessHistory.length >= 30 ? "high"
    : readinessHistory.length >= 14 ? "moderate"
    : "low";

  const primary      = candidates[0] ?? null;
  const summaryLine  = primary
    ? `Primary bottleneck: ${primary.label} (${primary.severity} — est. −${primary.estimatedReadinessDrag} pts readiness)`
    : "No significant bottlenecks detected — your key habits are solid.";

  return {
    primaryBottleneck: primary,
    allBottlenecks:    candidates,
    confidence,
    dataReady:         readinessHistory.length >= 14,
    summaryLine,
  };
}
