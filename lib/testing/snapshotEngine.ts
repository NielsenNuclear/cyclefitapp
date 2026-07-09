// ─── lib/testing/snapshotEngine.ts ────────────────────────────────────────────
// Phase 66 — Snapshot Engine
// Generates, stores, and compares recommendation snapshots per scenario.
// A snapshot is the deterministic output of the recommendation engine for
// a given input scenario.

import type { TestScenario } from "./scenarios";
import type { PropertyTestResult } from "./propertyValidators";
import { runPropertyTests, type RecommendationOutput } from "./propertyValidators";

const STORAGE_KEY = "axis_regression_snapshots_v1";

function isClient(): boolean { return typeof window !== "undefined"; }

// ── Snapshot type ─────────────────────────────────────────────────────────────

export interface RecommendationSnapshot {
  scenarioId:          string;
  capturedAt:          string;      // ISO timestamp
  algorithmVersion:    string;
  output:              RecommendationOutput;
  propertyResults:     PropertyTestResult[];
  allPropertiesPass:   boolean;
}

// ── Delta between snapshots ───────────────────────────────────────────────────

export type DriftSeverity = "none" | "minor" | "significant" | "breaking";

export interface SnapshotDiff {
  scenarioId:         string;
  hasChanged:         boolean;
  driftSeverity:      DriftSeverity;
  volumeScaleDelta:   number;
  confidenceDelta:    number;
  badgeChanged:       boolean;
  classChanged:       boolean;
  intensityChanged:   boolean;
  newFailingProperties: string[];
  summary:            string;
}

// ── Storage ───────────────────────────────────────────────────────────────────

function loadSnapshots(): Record<string, RecommendationSnapshot> {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSnapshots(snaps: Record<string, RecommendationSnapshot>): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps));
  } catch {}
}

export function saveSnapshot(snap: RecommendationSnapshot): void {
  const all = loadSnapshots();
  all[snap.scenarioId] = snap;
  saveSnapshots(all);
}

export function loadSnapshot(scenarioId: string): RecommendationSnapshot | null {
  return loadSnapshots()[scenarioId] ?? null;
}

export function clearSnapshots(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function listSnapshots(): RecommendationSnapshot[] {
  return Object.values(loadSnapshots());
}

// ── Snapshot generation ───────────────────────────────────────────────────────
// Derives a deterministic output from a scenario using a simplified but
// representative version of the recommendation pipeline. This is separate
// from the production path to avoid coupling test infrastructure to live code.

const ALGORITHM_VERSION = "axis-v1.0";

function deriveOutput(scenario: TestScenario): RecommendationOutput {
  const { signals } = scenario;
  const { onboarding } = scenario;

  // Volume scale derivation (mirrors pipeline logic without importing live state)
  let volume = 1.0;

  // Readiness modifier
  if (signals.readinessScore >= 85)       volume *= 1.10;
  else if (signals.readinessScore >= 70)  volume *= 1.00;
  else if (signals.readinessScore >= 55)  volume *= 0.90;
  else if (signals.readinessScore >= 40)  volume *= 0.80;
  else                                    volume *= 0.65;

  // Recovery modifier
  if (signals.recoveryScore >= 80)       volume *= 1.05;
  else if (signals.recoveryScore >= 60)  volume *= 1.00;
  else if (signals.recoveryScore >= 40)  volume *= 0.90;
  else                                   volume *= 0.75;

  // Fatigue modifier
  if (signals.fatigueEstimate >= 70)     volume *= 0.82;
  else if (signals.fatigueEstimate >= 50) volume *= 0.92;

  // Adherence modifier
  if (signals.adherenceRate < 0.5)       volume *= 0.90;
  else if (signals.adherenceRate >= 0.85) volume *= 1.03;

  // Streak modifier (small positive for active streaks, capped)
  if (signals.streakDays >= 10)          volume *= 0.95; // fatigue risk
  else if (signals.streakDays >= 5)      volume *= 1.02;

  // Clamp
  volume = Math.max(0.50, Math.min(1.40, volume));
  volume = Math.round(volume * 1000) / 1000;

  // Badge
  const readinessBadge =
    signals.readinessScore >= 85 ? "Push" :
    signals.readinessScore >= 65 ? "Maintain" :
    signals.readinessScore >= 45 ? "Watch" :
    "Recover";

  // Recommendation class
  const recommendationClass =
    signals.recoveryScore < 35 || signals.fatigueEstimate >= 75 ? "deload" :
    volume >= 1.08 ? "volume_increase" :
    volume <= 0.78 ? "volume_decrease" :
    signals.recoveryScore < 50 ? "recovery_focus" :
    "volume_maintain";

  // Intensity
  const intensityLevel =
    readinessBadge === "Push" ? "Moderate to High" :
    readinessBadge === "Maintain" ? "Moderate" :
    readinessBadge === "Watch" ? "Light to Moderate" :
    "Low";

  // Confidence
  const hasEnoughData = signals.weeklyVolume > 0 && signals.adherenceRate > 0;
  const signalQuality = (signals.readinessScore + signals.recoveryScore) / 200;
  const confidenceScore = hasEnoughData
    ? Math.min(0.95, Math.max(0.25, signalQuality * 0.8 + (signals.adherenceRate * 0.2)))
    : 0.30;

  return { volumeScale: volume, confidenceScore, readinessBadge, recommendationClass, intensityLevel };
}

export function generateSnapshot(scenario: TestScenario): RecommendationSnapshot {
  const output          = deriveOutput(scenario);
  const propertyResults = runPropertyTests(output);
  return {
    scenarioId:        scenario.id,
    capturedAt:        new Date().toISOString(),
    algorithmVersion:  ALGORITHM_VERSION,
    output,
    propertyResults,
    allPropertiesPass: propertyResults.every(r => r.status !== "fail"),
  };
}

// ── Comparison ────────────────────────────────────────────────────────────────

export function compareSnapshots(
  baseline: RecommendationSnapshot,
  current:  RecommendationSnapshot,
): SnapshotDiff {
  const volDelta  = Math.abs(current.output.volumeScale - baseline.output.volumeScale);
  const confDelta = Math.abs(current.output.confidenceScore - baseline.output.confidenceScore);
  const badgeChg  = current.output.readinessBadge !== baseline.output.readinessBadge;
  const classChg  = current.output.recommendationClass !== baseline.output.recommendationClass;
  const intChg    = current.output.intensityLevel !== baseline.output.intensityLevel;

  const baselineFailures = new Set(baseline.propertyResults.filter(r => r.status === "fail").map(r => r.property));
  const newFailing       = current.propertyResults
    .filter(r => r.status === "fail" && !baselineFailures.has(r.property))
    .map(r => r.property);

  const severity: DriftSeverity =
    newFailing.length > 0        ? "breaking" :
    classChg || badgeChg         ? "significant" :
    volDelta > 0.05 || confDelta > 0.10 ? "minor" :
    volDelta > 0 || confDelta > 0 ? "minor" :
    "none";

  const hasChanged = severity !== "none";

  const parts: string[] = [];
  if (volDelta > 0)  parts.push(`volume ${volDelta > 0 ? "+" : ""}${(current.output.volumeScale - baseline.output.volumeScale).toFixed(3)}`);
  if (badgeChg)      parts.push(`badge ${baseline.output.readinessBadge}→${current.output.readinessBadge}`);
  if (classChg)      parts.push(`class ${baseline.output.recommendationClass}→${current.output.recommendationClass}`);
  if (newFailing.length) parts.push(`NEW failures: ${newFailing.join(", ")}`);

  return {
    scenarioId:             current.scenarioId,
    hasChanged,
    driftSeverity:          severity,
    volumeScaleDelta:       current.output.volumeScale - baseline.output.volumeScale,
    confidenceDelta:        current.output.confidenceScore - baseline.output.confidenceScore,
    badgeChanged:           badgeChg,
    classChanged:           classChg,
    intensityChanged:       intChg,
    newFailingProperties:   newFailing,
    summary:                hasChanged ? parts.join("; ") : "No change",
  };
}
