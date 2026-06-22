// ─── lib/unified/lifeBalanceDetection.ts ─────────────────────────────────────
// 44D — Life Balance Detection
// Detects when one or more pillars are significantly lagging, creating a
// systemic drag on overall performance that no single workout can fix.

import type { ConsistencyScore } from "@/lib/adherence/consistency";
import type { CapacityComponents } from "./capacityScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BalancePillar = "training" | "nutrition" | "recovery" | "sleep" | "stress" | "energy";

export interface PillarBalance {
  pillar:   BalancePillar;
  label:    string;
  score:    number;   // 0–100
  status:   "strong" | "adequate" | "weak" | "critical";
}

export interface LifeBalanceReport {
  pillars:         PillarBalance[];
  weakestPillar:   BalancePillar | null;
  isBalanced:      boolean;
  criticalCount:   number;
  message:         string;
  dataReady:       boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABELS: Record<BalancePillar, string> = {
  training:  "Training",
  nutrition: "Nutrition",
  recovery:  "Recovery",
  sleep:     "Sleep",
  stress:    "Stress",
  energy:    "Energy",
};

function pillarStatus(score: number): PillarBalance["status"] {
  if (score >= 75) return "strong";
  if (score >= 55) return "adequate";
  if (score >= 35) return "weak";
  return "critical";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectLifeBalance(
  consistency:  ConsistencyScore,
  components:   CapacityComponents,
): LifeBalanceReport {
  const pillars: PillarBalance[] = [
    { pillar: "training",  label: LABELS.training,  score: consistency.training,  status: pillarStatus(consistency.training)  },
    { pillar: "nutrition", label: LABELS.nutrition, score: consistency.nutrition, status: pillarStatus(consistency.nutrition) },
    { pillar: "recovery",  label: LABELS.recovery,  score: consistency.recovery,  status: pillarStatus(consistency.recovery)  },
    { pillar: "sleep",     label: LABELS.sleep,     score: components.readiness,  status: pillarStatus(components.readiness)  },
    { pillar: "stress",    label: LABELS.stress,    score: Math.max(0, 100 - (100 - components.lifestyle)), status: pillarStatus(components.lifestyle) },
    { pillar: "energy",    label: LABELS.energy,    score: components.lifestyle,  status: pillarStatus(components.lifestyle)  },
  ];

  const weakest      = [...pillars].sort((a, b) => a.score - b.score)[0];
  const criticalCount = pillars.filter(p => p.status === "critical").length;
  const weakCount     = pillars.filter(p => p.status === "weak" || p.status === "critical").length;
  const isBalanced    = weakCount <= 1 && criticalCount === 0;

  const message = isBalanced
    ? "All pillars are reasonably balanced — no systemic drag detected."
    : criticalCount > 0
      ? `${weakest?.label} is critical and limiting your overall capacity.`
      : `${weakest?.label} is your weakest pillar — addressing it would lift your overall performance.`;

  return {
    pillars,
    weakestPillar:  (weakest?.score ?? 100) < 70 ? weakest.pillar : null,
    isBalanced,
    criticalCount,
    message,
    dataReady:      true,
  };
}
