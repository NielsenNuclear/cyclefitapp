// ─── lib/unified/unifiedInsightsFeed.ts ──────────────────────────────────────
// 44H — Unified Insights Feed
// Collects the most important cross-domain signal into a prioritised list of
// 3–5 actionable insights. Replaces "12 separate cards" with one coherent story.

import type { CapacityScore }        from "./capacityScore";
import type { MomentumScore }        from "./momentumScore";
import type { TrajectoryScore }      from "./trajectoryEngine";
import type { LeveragePoint }        from "@/lib/outcomes/leveragePointEngine";
import type { DriftReport }          from "@/lib/accuracy/driftDetection";
import type { LifeBalanceReport }    from "./lifeBalanceDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightPriority = "critical" | "high" | "medium" | "low";
export type InsightDomain   = "capacity" | "momentum" | "trajectory" | "leverage" | "balance" | "drift" | "recovery";

export interface UnifiedInsight {
  id:       string;
  domain:   InsightDomain;
  priority: InsightPriority;
  headline: string;
  body:     string;
  action:   string;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildUnifiedInsightsFeed(params: {
  capacity:      CapacityScore;
  momentum:      MomentumScore;
  trajectory:    TrajectoryScore;
  leverage:      LeveragePoint | null;
  balance:       LifeBalanceReport;
  drift:         DriftReport | undefined;
}): UnifiedInsight[] {
  const { capacity, momentum, trajectory, leverage, balance, drift } = params;
  const insights: UnifiedInsight[] = [];

  // Capacity signal
  if (capacity.score <= 40) {
    insights.push({
      id: "capacity_low", domain: "capacity", priority: "critical",
      headline: "Low capacity today",
      body:     `Your unified capacity is ${capacity.score}/100 — ${capacity.headline}`,
      action:   "Focus on a minimum-effective dose or rest.",
    });
  } else if (capacity.score >= 85) {
    insights.push({
      id: "capacity_peak", domain: "capacity", priority: "medium",
      headline: "Peak capacity",
      body:     `All systems are high (${capacity.score}/100). This is an ideal day to train hard.`,
      action:   "Push today — it will count.",
    });
  }

  // Momentum signal
  if (momentum.direction === "fading") {
    insights.push({
      id: "momentum_fading", domain: "momentum", priority: "high",
      headline: "Momentum declining",
      body:     momentum.description,
      action:   "Prioritise sleep and one solid session this week.",
    });
  } else if (momentum.direction === "building") {
    insights.push({
      id: "momentum_building", domain: "momentum", priority: "low",
      headline: "Momentum building",
      body:     momentum.description,
      action:   "Protect this streak — consistency is the engine.",
    });
  }

  // Trajectory signal
  if (trajectory.dataReady && trajectory.status === "significantly_behind") {
    insights.push({
      id: "trajectory_behind", domain: "trajectory", priority: "high",
      headline: "Behind goal pace",
      body:     trajectory.message,
      action:   "Focus on your top leverage point this week.",
    });
  }

  // Leverage point
  if (leverage && (leverage.priority === "critical" || leverage.priority === "high")) {
    insights.push({
      id: "leverage", domain: "leverage", priority: leverage.priority,
      headline: `Focus: ${leverage.label}`,
      body:     `This is your highest-leverage improvement right now (${leverage.estimatedGain}).`,
      action:   leverage.actionableAdvice,
    });
  }

  // Balance signal
  if (!balance.isBalanced && balance.weakestPillar) {
    insights.push({
      id: "balance", domain: "balance", priority: balance.criticalCount > 0 ? "critical" : "medium",
      headline: `${balance.pillars.find(p => p.pillar === balance.weakestPillar)?.label ?? "A pillar"} needs attention`,
      body:     balance.message,
      action:   "Dedicating focus here will lift your entire system.",
    });
  }

  // Drift signal
  if (drift?.driftDetected) {
    insights.push({
      id: "drift", domain: "drift", priority: "high",
      headline: "Pattern shift detected",
      body:     drift.message,
      action:   "Axis is recalibrating to your new baseline.",
    });
  }

  // Sort by priority
  const ORDER: Record<InsightPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return insights.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]).slice(0, 5);
}
