// ─── lib/coaching/dailyGuidance.ts ────────────────────────────────────────────
// Generates a daily coaching headline + 2-3 actionable bullets.
// Pure function — all inputs passed in; no localStorage reads.

import type { ReadinessScore }    from "@/lib/readiness/calculateReadiness";
import type { RecoveryDebt }      from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }       from "@/lib/recovery/burnoutRisk";
import type { FatiguePrediction } from "@/lib/recovery/fatiguePrediction";
import type { DailyRecommendation } from "@/types/recommendation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GuidancePriority = "critical" | "caution" | "normal" | "positive";

export interface GuidanceBullet {
  icon:    string;        // single emoji or symbol
  text:    string;
  type:    "action" | "insight" | "warning";
}

export interface DailyGuidance {
  headline:    string;
  bullets:     GuidanceBullet[];
  priority:    GuidancePriority;
  hasContent:  boolean;
}

// ─── Headline builder ─────────────────────────────────────────────────────────

function buildHeadline(
  readiness:  ReadinessScore | null,
  debt:       RecoveryDebt | null,
  burnout:    BurnoutRisk | null,
  fatigue:    FatiguePrediction | undefined,
): { headline: string; priority: GuidancePriority } {
  // Critical conditions take priority
  if (debt?.category === "critical" || burnout?.level === "severe") {
    return {
      headline: "Rest is the workout today",
      priority: "critical",
    };
  }
  if (fatigue?.hasEnoughData && fatigue.day3.riskLevel === "critical") {
    return {
      headline: "High fatigue risk — protect your recovery window",
      priority: "critical",
    };
  }

  if (readiness?.category === "recover") {
    return {
      headline: "Your body is asking for recovery — honour it",
      priority: "caution",
    };
  }
  if (debt?.category === "high" || burnout?.level === "high") {
    return {
      headline: "Recovery debt is accumulating — ease the load",
      priority: "caution",
    };
  }
  if (fatigue?.hasEnoughData && fatigue.day3.riskLevel === "high") {
    return {
      headline: "Manage your intensity over the next few days",
      priority: "caution",
    };
  }

  if (readiness?.category === "optimal" || readiness?.category === "ready") {
    return {
      headline: "You're in a strong position — train with intention",
      priority: "positive",
    };
  }

  return {
    headline: "Stay consistent — today's effort compounds",
    priority: "normal",
  };
}

// ─── Bullet builders ──────────────────────────────────────────────────────────

function buildBullets(
  readiness:      ReadinessScore | null,
  debt:           RecoveryDebt | null,
  burnout:        BurnoutRisk | null,
  fatigue:        FatiguePrediction | undefined,
  recommendation: DailyRecommendation | null,
): GuidanceBullet[] {
  const bullets: GuidanceBullet[] = [];

  // ── Recovery debt ──
  if (debt) {
    if (debt.category === "critical" || debt.category === "high") {
      bullets.push({
        icon: "⚠",
        text: `Recovery debt is ${debt.category} (${debt.debtScore} pts). ${
          debt.trend === "accumulating"
            ? "Prioritise sleep and cut one training session this week."
            : "Debt is stabilising — keep protecting recovery time."
        }`,
        type: "warning",
      });
    } else if (debt.daysElevated >= 3) {
      bullets.push({
        icon: "→",
        text: `You've had elevated load for ${debt.daysElevated} days. A lighter session or rest day tomorrow would help.`,
        type: "action",
      });
    }
  }

  // ── Readiness insight ──
  if (readiness) {
    const low = readiness.contributors;
    const lowestKey = (Object.keys(low) as (keyof typeof low)[]).reduce(
      (a, b) => (low[a] < low[b] ? a : b),
    );
    const lowestVal = low[lowestKey];
    if (lowestVal < 40) {
      const labelMap: Record<string, string> = {
        sleep: "sleep quality", stress: "stress level", energy: "energy",
        cycle: "cycle phase", trainingLoad: "training load", adherence: "workout adherence",
      };
      bullets.push({
        icon: "→",
        text: `Your ${labelMap[lowestKey] ?? lowestKey} is the main drag on readiness right now (${Math.round(lowestVal)}/100). Focus there first.`,
        type: "insight",
      });
    }
  }

  // ── Fatigue forecast ──
  if (fatigue?.hasEnoughData) {
    if (fatigue.day3.riskLevel === "high" || fatigue.day3.riskLevel === "critical") {
      bullets.push({
        icon: "→",
        text: fatigue.day3.guidance,
        type: "action",
      });
    } else if (fatigue.trendDirection === "improving") {
      bullets.push({
        icon: "↑",
        text: "Your recovery trend is improving — a good day to push slightly harder if readiness supports it.",
        type: "insight",
      });
    }
  }

  // ── Recommendation badge ──
  if (recommendation?.training.badge === "Recover" || recommendation?.training.badge === "Watch") {
    const msg = recommendation.training.avoidNote;
    if (msg) {
      bullets.push({ icon: "→", text: msg, type: "action" });
    }
  } else if (recommendation?.training.badge === "Push" || recommendation?.training.badge === "Maintain") {
    bullets.push({
      icon: "✓",
      text: `Today's training badge is "${recommendation.training.badge}" — your system supports a quality session.`,
      type: "insight",
    });
  }

  // ── Burnout early warning ──
  if (burnout?.level === "moderate" && bullets.length < 3) {
    const topFactor = burnout.factors.sort((a, b) => b.score - a.score)[0];
    if (topFactor) {
      bullets.push({
        icon: "→",
        text: `Burnout signal: ${topFactor.detail} Keep an eye on this.`,
        type: "insight",
      });
    }
  }

  // Trim to max 3
  return bullets.slice(0, 3);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateDailyGuidance(input: {
  readiness?:     ReadinessScore | null;
  debt?:          RecoveryDebt | null;
  burnout?:       BurnoutRisk | null;
  fatigue?:       FatiguePrediction;
  recommendation?: DailyRecommendation | null;
}): DailyGuidance {
  const { readiness = null, debt = null, burnout = null, fatigue, recommendation = null } = input;

  const { headline, priority } = buildHeadline(readiness, debt, burnout, fatigue);
  const bullets = buildBullets(readiness, debt, burnout, fatigue, recommendation);

  return {
    headline,
    bullets,
    priority,
    hasContent: bullets.length > 0,
  };
}
