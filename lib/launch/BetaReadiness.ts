// ─── lib/launch/BetaReadiness.ts ─────────────────────────────────────────────
// Phase 76 — aggregate beta readiness score from all system health checks.

import { computeLaunchReadiness } from "./LaunchChecklist";
import { computeAuditReport }     from "@/lib/qa/FeatureAudit";
import { getChecklistStats, loadChecklist } from "@/lib/qa/ReleaseChecklist";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SystemScore {
  name:   string;
  score:  number;    // 0–100
  weight: number;    // contribution weight (sums to 1)
  notes?: string;
}

export interface BetaReadinessReport {
  compositeScore:  number;
  systems:         SystemScore[];
  overallStatus:   "launch_ready" | "nearly_ready" | "in_progress" | "blocked";
  blockers:        string[];
  generatedAt:     string;
}

// ── Weights ───────────────────────────────────────────────────────────────────

const WEIGHTS = {
  launchGates:   0.30,
  featureAudit:  0.25,
  releaseItems:  0.20,
  qaScore:       0.15,
  buildHealth:   0.10,
};

// ── Compute ───────────────────────────────────────────────────────────────────

export function computeBetaReadiness(): BetaReadinessReport {
  const launch  = computeLaunchReadiness();
  const audit   = computeAuditReport();
  const checks  = loadChecklist();
  const stats   = getChecklistStats(checks);

  const requiredFraction = stats.required > 0
    ? stats.requiredComplete / stats.required
    : 0;

  // Build health is green if the build is clean — we approximate from
  // the launch gate "infra-01" status.
  const buildGate = launch.criticalBlocks.find(g => g.id === "infra-01");
  const buildScore = buildGate ? 0 : 100;

  const systems: SystemScore[] = [
    {
      name:   "Launch Gates",
      score:  launch.readinessScore,
      weight: WEIGHTS.launchGates,
      notes:  `${launch.criticalBlocks.length} critical block${launch.criticalBlocks.length !== 1 ? "s" : ""} remaining`,
    },
    {
      name:   "Feature Audit",
      score:  audit.readinessScore,
      weight: WEIGHTS.featureAudit,
      notes:  `${audit.blockers.length} blocker${audit.blockers.length !== 1 ? "s" : ""}, ${audit.notTested} not tested`,
    },
    {
      name:   "Release Checklist",
      score:  Math.round(requiredFraction * 100),
      weight: WEIGHTS.releaseItems,
      notes:  `${stats.requiredComplete}/${stats.required} required items complete`,
    },
    {
      name:   "QA Readiness",
      score:  audit.readinessScore,
      weight: WEIGHTS.qaScore,
      notes:  audit.releaseReady ? "Release ready" : "Items outstanding",
    },
    {
      name:   "Build Health",
      score:  buildScore,
      weight: WEIGHTS.buildHealth,
      notes:  buildScore === 100 ? "TypeScript clean, build passing" : "Build issues detected",
    },
  ];

  const composite = Math.round(
    systems.reduce((sum, s) => sum + s.score * s.weight, 0)
  );

  const blockers: string[] = [
    ...launch.criticalBlocks.map(g => `[Launch Gate] ${g.name}: ${g.notes ?? g.description}`),
    ...audit.blockers.map(b => `[Feature Audit] ${b.check}`),
    ...(stats.blocked > 0 ? [`[Release Checklist] ${stats.blocked} items blocked`] : []),
  ];

  const overallStatus =
    launch.launchReady && audit.releaseReady && stats.readyToLaunch
      ? "launch_ready"
      : composite >= 75
      ? "nearly_ready"
      : composite >= 40
      ? "in_progress"
      : "blocked";

  return {
    compositeScore: composite,
    systems,
    overallStatus,
    blockers,
    generatedAt: new Date().toISOString(),
  };
}
