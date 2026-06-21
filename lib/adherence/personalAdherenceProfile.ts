// ─── lib/adherence/personalAdherenceProfile.ts ───────────────────────────────
// Phase 34I — Personal adherence profile.
// Synthesises analytics + patterns + risk into a single learnable profile
// that coaches recommendations after 30+ days of data.

import type { AdherenceAnalytics }  from "./adherenceAnalytics";
import type { BehaviorPatterns }    from "./behaviorPatterns";
import type { AdherenceRisk }       from "./adherenceRisk";
import type { SkipReasonSummary }   from "./skipReasonStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdherenceCoachingInsight {
  headline: string;
  detail:   string;
}

export interface PersonalAdherenceProfile {
  consistencyScore:   number;              // 0–100 composite
  dataMaturity:       AdherenceAnalytics["dataMaturity"];
  strengths:          string[];            // e.g. "Strong bounce-back rate"
  gaps:               string[];            // e.g. "Mondays consistently missed"
  coachingInsights:   AdherenceCoachingInsight[];
  optimalTrainingDays: string[];           // weekday labels with highest completion
  challengeDays:      string[];            // weekday labels with lowest completion
  topSkipReason:      string | null;
  readyForCoaching:   boolean;             // true once ≥30 sessions logged
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPersonalAdherenceProfile(
  analytics:     AdherenceAnalytics,
  patterns:      BehaviorPatterns,
  risk:          AdherenceRisk,
  skipSummary:   SkipReasonSummary,
): PersonalAdherenceProfile {
  const strengths: string[]  = [];
  const gaps: string[]       = [];
  const insights: AdherenceCoachingInsight[] = [];

  // ── Strengths ────────────────────────────────────────────────────────────
  if (analytics.streakHealth.currentStreak >= 7) {
    strengths.push(`${analytics.streakHealth.currentStreak}-day active streak`);
  }
  if (analytics.resilience >= 0.75) {
    strengths.push("Strong bounce-back rate after skips");
  }
  if (analytics.completionRates.rate30d >= 0.80) {
    strengths.push("Consistent training over the past month");
  }
  if (patterns.bestWeekday) {
    strengths.push(`${patterns.bestWeekday.label}s are your best training day`);
  }

  // ── Gaps ─────────────────────────────────────────────────────────────────
  if (analytics.completionRates.rate7d < 0.5) {
    gaps.push("Completion rate has dropped this week");
  }
  if (analytics.resilience < 0.40 && analytics.sampleSize >= 14) {
    gaps.push("Tends to chain skips rather than bouncing back");
  }
  if (patterns.worstWeekday && patterns.worstWeekday.completionRate < 0.40) {
    gaps.push(`${patterns.worstWeekday.label}s are frequently missed`);
  }
  const worstPhase = patterns.phasePatterns
    .filter(p => p.sampleSize >= 3)
    .sort((a, b) => a.completionRate - b.completionRate)[0];
  if (worstPhase && worstPhase.completionRate < 0.50) {
    gaps.push(`${worstPhase.phase} phase shows lower training completion`);
  }

  // ── Coaching insights (shown after 30 sessions) ──────────────────────────
  const readyForCoaching = analytics.sampleSize >= 30;
  if (readyForCoaching) {
    if (patterns.bestWeekday && patterns.bestWeekday.completionRate >= 0.80) {
      insights.push({
        headline: `Schedule harder sessions on ${patterns.bestWeekday.label}s`,
        detail:   `You complete workouts ${Math.round(patterns.bestWeekday.completionRate * 100)}% of the time on ${patterns.bestWeekday.label}s — ideal for high-effort sessions.`,
      });
    }
    if (patterns.worstWeekday && patterns.worstWeekday.completionRate < 0.50) {
      insights.push({
        headline: `Protect ${patterns.worstWeekday.label}s differently`,
        detail:   `Only ${Math.round(patterns.worstWeekday.completionRate * 100)}% completion on ${patterns.worstWeekday.label}s. Consider a rest day or shorter session here.`,
      });
    }
    if (skipSummary.topReasons.length > 0) {
      const top = skipSummary.topReasons[0];
      if (top.reason === "No time" || top.reason === "Work/study commitments") {
        insights.push({
          headline: "Time is your main barrier",
          detail:   "Your most common skip reason is time. A 10-min rescue session on busy days may help maintain momentum.",
        });
      } else if (top.reason === "Too tired" || top.reason === "Didn't feel recovered") {
        insights.push({
          headline: "Recovery quality is the key barrier",
          detail:   "Low energy/recovery is your top skip reason. Axis will suggest lighter sessions when recovery signals are low.",
        });
      }
    }
    if (worstPhase && worstPhase.completionRate < 0.50) {
      insights.push({
        headline: `Plan easier sessions during ${worstPhase.phase}`,
        detail:   `Your training completion drops to ${Math.round(worstPhase.completionRate * 100)}% during ${worstPhase.phase}. Shorter, lower-intensity workouts may increase follow-through.`,
      });
    }
  }

  const optimalDays = patterns.weekdayPatterns
    .filter(p => p.sampleSize >= 3 && p.completionRate >= 0.70)
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 3)
    .map(p => p.label);

  const challengeDays = patterns.weekdayPatterns
    .filter(p => p.sampleSize >= 3 && p.completionRate < 0.55)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 2)
    .map(p => p.label);

  const topSkipReason = skipSummary.topReasons[0]?.reason ?? null;

  return {
    consistencyScore:    analytics.consistencyScore,
    dataMaturity:        analytics.dataMaturity,
    strengths,
    gaps,
    coachingInsights:    insights,
    optimalTrainingDays: optimalDays,
    challengeDays,
    topSkipReason,
    readyForCoaching,
  };
}
