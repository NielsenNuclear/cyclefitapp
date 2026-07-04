// ─── lib/athlete/adaptationInsights.ts ───────────────────────────────────────
// Phase 62F — Adaptation Insights
// Generates specific, evidence-grounded observations about how this athlete
// adapts. Never generic advice — each insight must be derived from real data.

import type { WorkoutHistoryEntry }  from "@/lib/history/workoutHistory";
import type { RecoveryScore }        from "@/lib/recovery/recoveryScore";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import type { PersonalBaselines }    from "./adaptiveBaselines";
import type { RecoverySignature }    from "./recoverySignature";
import type { TrainingFingerprint }  from "./trainingFingerprint";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightStrength = "observed" | "pattern" | "strong";

export interface AdaptationInsight {
  id:        string;
  text:      string;            // user-facing, first person
  why:       string;            // brief evidence basis
  strength:  InsightStrength;  // how many data points support this
  category:  "recovery" | "performance" | "adherence" | "scheduling" | "volume";
  actionable: string;           // "What next?" — one sentence
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitLabel(split: string): string {
  const map: Record<string, string> = {
    push_pull_legs:   "Push/Pull/Legs",
    upper_lower:      "upper/lower",
    full_body:        "full-body",
    body_part_split:  "body-part split",
  };
  return map[split] ?? split;
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay();
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Individual insight generators ───────────────────────────────────────────

function recoveryConsistencyInsight(sig: RecoverySignature): AdaptationInsight | null {
  if (!sig.dataReady || sig.sampleCount < 14) return null;
  if (sig.stabilityLabel === "very consistent" || sig.stabilityLabel === "consistent") {
    return {
      id: "recovery-consistent",
      text: `Your recovery is remarkably consistent (${sig.stabilityLabel}).`,
      why: `Recovery scores across ${sig.sampleCount} days show low variability (±${sig.variability} points).`,
      strength: "strong",
      category: "recovery",
      actionable: "Continue your current recovery routine — it's working.",
    };
  }
  if (sig.stabilityLabel === "erratic") {
    return {
      id: "recovery-erratic",
      text: "Your recovery varies considerably day to day.",
      why: `Recovery scores fluctuate by ±${sig.variability} points on average.`,
      strength: "observed",
      category: "recovery",
      actionable: "Focus on sleep consistency first — it's the highest-leverage recovery lever.",
    };
  }
  return null;
}

function bestRecoveryDayInsight(sig: RecoverySignature): AdaptationInsight | null {
  if (!sig.bestDayOfWeek || sig.sampleCount < 21) return null;
  return {
    id: "best-recovery-day",
    text: `${sig.bestDayOfWeek}s are consistently your best recovery days.`,
    why: `${sig.bestDayOfWeek} shows the highest average recovery score across ${sig.sampleCount} logged days.`,
    strength: "pattern",
    category: "scheduling",
    actionable: `Consider scheduling your most demanding sessions on or after ${sig.bestDayOfWeek}.`,
  };
}

function sessionLengthInsight(fp: TrainingFingerprint, baselines: PersonalBaselines): AdaptationInsight | null {
  if (!fp.dataReady || fp.sampleCount < 10) return null;
  const dur = baselines.avgSessionDurationMin;
  if (dur === 0) return null;
  if (fp.sessionLengthBias === "short") {
    return {
      id: "session-short",
      text: `Your sessions average ${dur} minutes — on the shorter side.`,
      why: `Calculated from ${fp.sampleCount} completed sessions.`,
      strength: "strong",
      category: "volume",
      actionable: "Short sessions done consistently outperform long sessions done sporadically.",
    };
  }
  if (fp.sessionLengthBias === "long") {
    return {
      id: "session-long",
      text: `Your sessions average ${dur} minutes — comprehensive and thorough.`,
      why: `Calculated from ${fp.sampleCount} completed sessions.`,
      strength: "strong",
      category: "volume",
      actionable: "On lower-readiness days, cutting sessions by 20–30% preserves more than skipping entirely.",
    };
  }
  return null;
}

function trainingStyleInsight(fp: TrainingFingerprint): AdaptationInsight | null {
  if (!fp.dataReady || fp.sampleCount < 8) return null;
  const biasMap: Record<string, string> = {
    "strength-focused":     "strength training",
    "hypertrophy-focused":  "muscle-building work",
    "conditioning-focused": "conditioning",
    "balanced":             "a balanced mix of strength and hypertrophy work",
    "recovery-focused":     "lower-intensity sessions",
  };
  const label = biasMap[fp.primaryBias] ?? "varied training";
  return {
    id: "training-style",
    text: `Your training leans toward ${label}.`,
    why: `${fp.sampleCount} sessions classified by split type and RPE distribution.`,
    strength: "pattern",
    category: "performance",
    actionable: fp.primaryBias === "balanced"
      ? "A balanced approach supports broad fitness — ideal for long-term health."
      : `If your goal shifts, Axis will adjust the exercise selection to match.`,
  };
}

function varietyInsight(fp: TrainingFingerprint): AdaptationInsight | null {
  if (!fp.dataReady || fp.sampleCount < 10) return null;
  if (fp.varietyIndex >= 70) {
    return {
      id: "high-variety",
      text: "You rotate exercises frequently — high variety in your training.",
      why: `Exercise variety index: ${fp.varietyIndex}/100 across ${fp.sampleCount} sessions.`,
      strength: "pattern",
      category: "performance",
      actionable: "High variety supports broad adaptation but can slow strength gains on specific lifts. Consider locking 2–3 key movements for 6-week blocks.",
    };
  }
  if (fp.varietyIndex <= 30) {
    return {
      id: "low-variety",
      text: "Your exercise selection is highly consistent across sessions.",
      why: `Exercise variety index: ${fp.varietyIndex}/100 — sessions frequently repeat the same movements.`,
      strength: "pattern",
      category: "performance",
      actionable: "Consistent movements drive specific strength — this is a feature if you're chasing PRs.",
    };
  }
  return null;
}

function readinessTrendInsight(
  baselines: PersonalBaselines,
  readinessHistory: ReadinessHistoryEntry[],
): AdaptationInsight | null {
  if (readinessHistory.length < 14) return null;
  const recent14 = readinessHistory.slice(-14).map(e => e.score);
  const prior14  = readinessHistory.slice(-28, -14).map(e => e.score);
  if (prior14.length < 7) return null;
  const avgRecent = recent14.reduce((s, v) => s + v, 0) / recent14.length;
  const avgPrior  = prior14.reduce((s, v) => s + v, 0) / prior14.length;
  const delta = Math.round(avgRecent - avgPrior);
  if (Math.abs(delta) < 4) return null;
  const dir = delta > 0 ? "improving" : "declining";
  const arrow = delta > 0 ? "↑" : "↓";
  return {
    id: "readiness-trend",
    text: `Your readiness has been ${dir} over the past two weeks (${arrow}${Math.abs(delta)} pts).`,
    why: `Average readiness shifted from ${Math.round(avgPrior)} to ${Math.round(avgRecent)} comparing weeks 3–4 with the last two weeks.`,
    strength: "pattern",
    category: "recovery",
    actionable: delta > 0
      ? "Positive momentum — this is a good period to push progressive overload."
      : "Consider a deload week or extra recovery focus to reverse the trend.",
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateAdaptationInsights(
  workoutHistory:   WorkoutHistoryEntry[],
  recoveryScores:   RecoveryScore[],
  readinessHistory: ReadinessHistoryEntry[],
  baselines:        PersonalBaselines,
  fingerprint:      TrainingFingerprint,
  signature:        RecoverySignature,
): AdaptationInsight[] {
  const candidates: Array<AdaptationInsight | null> = [
    recoveryConsistencyInsight(signature),
    bestRecoveryDayInsight(signature),
    sessionLengthInsight(fingerprint, baselines),
    trainingStyleInsight(fingerprint),
    varietyInsight(fingerprint),
    readinessTrendInsight(baselines, readinessHistory),
  ];

  return candidates.filter(Boolean) as AdaptationInsight[];
}
