// ─── lib/adaptive/coachingMemory.ts ──────────────────────────────────────────
// Derives visible coaching observations from all feedback loops.
// Pure function — callers pass data in; no localStorage reads here.

import type { AccuracyReport } from "@/lib/adaptive/readinessValidation";
import type { RecoveryResponsePattern } from "@/lib/adaptive/recoveryLearning";
import type { ExerciseProgressSummary } from "@/lib/progression/exerciseProgress";
import type { LearnedPattern } from "@/lib/cycleLearning/types";
import { SYMPTOM_BY_ID } from "@/lib/symptoms/symptomCatalog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryCategory =
  | "cycle"
  | "recovery"
  | "performance"
  | "accuracy";

export interface CoachingMemoryItem {
  category:   MemoryCategory;
  observation: string;          // plain-English coaching observation
  confidence: "early" | "growing" | "established";
  dataPoints: number;
}

// ─── Confidence label ─────────────────────────────────────────────────────────

function confidence(n: number): CoachingMemoryItem["confidence"] {
  if (n >= 7) return "established";
  if (n >= 4) return "growing";
  return "early";
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function cycleMemories(patterns: LearnedPattern[]): CoachingMemoryItem[] {
  return patterns
    .filter(p => p.consistencyScore >= 50)
    .slice(0, 4)
    .map(p => {
      const name = SYMPTOM_BY_ID[p.symptomId]?.name ?? p.symptomId;
      const day  = Math.round(p.averageCycleDay);
      const sev  = p.averageSeverity >= 2.5 ? "often significant" : "typically mild";
      return {
        category:    "cycle" as MemoryCategory,
        observation: `${name} tends to appear around Day ${day} and is ${sev}.`,
        confidence:  confidence(p.supportingCycles),
        dataPoints:  p.supportingCycles,
      };
    });
}

function recoveryMemories(patterns: RecoveryResponsePattern[]): CoachingMemoryItem[] {
  return patterns
    .filter(p => Math.abs(p.deviation) >= 10)
    .slice(0, 3)
    .map(p => {
      const direction = p.deviation > 0 ? "better" : "slower";
      const magnitude = Math.abs(p.deviation) >= 25 ? "significantly " : "";
      return {
        category:    "recovery" as MemoryCategory,
        observation: `Recovery during ${p.phase} is ${magnitude}${direction} than population averages suggest.`,
        confidence:  confidence(p.sampleCount),
        dataPoints:  p.sampleCount,
      };
    });
}

function performanceMemories(summaries: ExerciseProgressSummary[]): CoachingMemoryItem[] {
  const improving = summaries.filter(s => s.trend === "improving").slice(0, 2);
  const declining = summaries.filter(s => s.trend === "declining").slice(0, 1);

  return [
    ...improving.map(s => ({
      category:    "performance" as MemoryCategory,
      observation: `${s.exerciseName} has been improving over the last 30 days (avg effort ${s.averageRPE}/10 across ${s.frequency} sessions).`,
      confidence:  confidence(s.frequency),
      dataPoints:  s.frequency,
    })),
    ...declining.map(s => ({
      category:    "performance" as MemoryCategory,
      observation: `${s.exerciseName} may need attention — effort has been rising without a load increase.`,
      confidence:  confidence(s.frequency),
      dataPoints:  s.frequency,
    })),
  ];
}

function accuracyMemory(report: AccuracyReport): CoachingMemoryItem | null {
  if (report.totalSamples < 5) return null;
  const pct  = Math.round(report.lifetime * 100);
  const desc = pct >= 80 ? "well calibrated" : pct >= 65 ? "reasonably calibrated" : "still learning your patterns";
  return {
    category:    "accuracy",
    observation: `Readiness predictions are ${desc} — ${pct}% accuracy across ${report.totalSamples} sessions.`,
    confidence:  confidence(report.totalSamples),
    dataPoints:  report.totalSamples,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface CoachingMemoryInput {
  cyclePatterns:      LearnedPattern[];
  recoveryPatterns:   RecoveryResponsePattern[];
  exerciseSummaries:  ExerciseProgressSummary[];
  accuracyReport:     AccuracyReport;
}

/**
 * Derives a ranked list of coaching memory items from all learning signals.
 * Returns [] when there is insufficient data across all sources.
 */
export function buildCoachingMemory(input: CoachingMemoryInput): CoachingMemoryItem[] {
  const items: CoachingMemoryItem[] = [
    ...cycleMemories(input.cyclePatterns),
    ...recoveryMemories(input.recoveryPatterns),
    ...performanceMemories(input.exerciseSummaries),
    ...(accuracyMemory(input.accuracyReport) ? [accuracyMemory(input.accuracyReport)!] : []),
  ];

  // Sort: established first, then growing, then early; within tier by dataPoints
  const TIER: Record<CoachingMemoryItem["confidence"], number> = {
    established: 0,
    growing:     1,
    early:       2,
  };

  return items.sort(
    (a, b) => TIER[a.confidence] - TIER[b.confidence] || b.dataPoints - a.dataPoints
  );
}
