// ─── lib/testing/regressionRunner.ts ──────────────────────────────────────────
// Phase 66 — Regression Runner
// Runs the full scenario library, compares against stored baselines, and
// produces a regression report.

import { SCENARIO_LIBRARY, type TestScenario } from "./scenarios";
import {
  generateSnapshot,
  compareSnapshots,
  loadSnapshot,
  saveSnapshot,
  type RecommendationSnapshot,
  type SnapshotDiff,
} from "./snapshotEngine";
import { runPropertyTests, allPropertiesPass } from "./propertyValidators";

// ── Per-scenario result ───────────────────────────────────────────────────────

export type ScenarioStatus = "pass" | "drift" | "regression" | "new" | "error";

export interface ScenarioResult {
  scenarioId:        string;
  scenarioLabel:     string;
  status:            ScenarioStatus;
  current:           RecommendationSnapshot;
  baseline:          RecommendationSnapshot | null;
  diff:              SnapshotDiff | null;
  propertyFailures:  string[];
  durationMs:        number;
}

// ── Aggregate report ──────────────────────────────────────────────────────────

export interface RegressionReport {
  runAt:             string;
  totalScenarios:    number;
  passed:            number;
  drifted:           number;
  regressed:         number;
  newScenarios:      number;
  errors:            number;
  overallStatus:     "green" | "yellow" | "red";
  results:           ScenarioResult[];
  driftedScenarios:  string[];
  regressedScenarios: string[];
  maxVolumeDrift:    number;
  algorithmVersion:  string;
  summary:           string;
}

// ── Run a single scenario ─────────────────────────────────────────────────────

function runScenario(scenario: TestScenario): ScenarioResult {
  const t0 = Date.now();
  try {
    const current  = generateSnapshot(scenario);
    const baseline = loadSnapshot(scenario.id);
    const diff     = baseline ? compareSnapshots(baseline, current) : null;
    const failures = current.propertyResults.filter(r => r.status === "fail").map(r => r.property);

    let status: ScenarioStatus;
    if (!baseline) {
      status = "new";
    } else if (failures.length > 0 || (diff && diff.newFailingProperties.length > 0)) {
      status = "regression";
    } else if (diff && diff.hasChanged) {
      status = "drift";
    } else {
      status = "pass";
    }

    return {
      scenarioId:       scenario.id,
      scenarioLabel:    scenario.label,
      status,
      current,
      baseline,
      diff,
      propertyFailures: failures,
      durationMs:       Date.now() - t0,
    };
  } catch (err) {
    const current = generateSnapshot(scenario);
    return {
      scenarioId:       scenario.id,
      scenarioLabel:    scenario.label,
      status:           "error",
      current,
      baseline:         null,
      diff:             null,
      propertyFailures: [`Error: ${err instanceof Error ? err.message : String(err)}`],
      durationMs:       Date.now() - t0,
    };
  }
}

// ── Run full suite ────────────────────────────────────────────────────────────

export function runRegressionSuite(
  scenarios: TestScenario[] = SCENARIO_LIBRARY,
): RegressionReport {
  const results   = scenarios.map(runScenario);
  const passed    = results.filter(r => r.status === "pass").length;
  const drifted   = results.filter(r => r.status === "drift").length;
  const regressed = results.filter(r => r.status === "regression").length;
  const newOnes   = results.filter(r => r.status === "new").length;
  const errors    = results.filter(r => r.status === "error").length;

  const overallStatus: RegressionReport["overallStatus"] =
    regressed > 0 || errors > 0 ? "red" :
    drifted > 0                 ? "yellow" :
    "green";

  const maxVolumeDrift = Math.max(0, ...results
    .filter(r => r.diff)
    .map(r => Math.abs(r.diff!.volumeScaleDelta)));

  const parts: string[] = [];
  if (regressed)  parts.push(`${regressed} regression(s)`);
  if (drifted)    parts.push(`${drifted} drift(s)`);
  if (newOnes)    parts.push(`${newOnes} new scenario(s)`);
  if (errors)     parts.push(`${errors} error(s)`);
  if (passed && !parts.length) parts.push(`all ${passed} scenarios pass`);

  return {
    runAt:              new Date().toISOString(),
    totalScenarios:     scenarios.length,
    passed,
    drifted,
    regressed,
    newScenarios:       newOnes,
    errors,
    overallStatus,
    results,
    driftedScenarios:   results.filter(r => r.status === "drift").map(r => r.scenarioId),
    regressedScenarios: results.filter(r => r.status === "regression").map(r => r.scenarioId),
    maxVolumeDrift,
    algorithmVersion:   "axis-v1.0",
    summary:            parts.join(", "),
  };
}

// ── Promote current snapshots to baselines ────────────────────────────────────
// Call this after a deliberate algorithm change to accept the new behavior.

export function promoteToBaseline(
  scenarios: TestScenario[] = SCENARIO_LIBRARY,
): number {
  let saved = 0;
  for (const scenario of scenarios) {
    const snap = generateSnapshot(scenario);
    saveSnapshot(snap);
    saved++;
  }
  return saved;
}
