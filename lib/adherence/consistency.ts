// ─── lib/adherence/consistency.ts ────────────────────────────────────────────
// Phase 35A — Consistency Engine.
// Composite score (0–100) across training, nutrition, recovery, and check-ins.
// Stored daily so momentum and trend calculations can use the history.

import type { AdherenceEntry }        from "./adherenceTracker";
import type { DailyNutritionCheckin } from "@/lib/nutrition/nutritionCheckin";
import type { DailyRecoveryLog }      from "@/lib/recovery/recoveryStrategyCatalog";
import type { ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";

const STORAGE_KEY    = "axis_consistency_history";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConsistencyTier = "at_risk" | "inconsistent" | "building" | "consistent";

export interface ConsistencyScore {
  date:      string;
  training:  number;   // 0–100
  nutrition: number;   // 0–100
  recovery:  number;   // 0–100
  checkins:  number;   // 0–100 (app engagement proxy)
  composite: number;   // weighted: training 40%, nutrition 20%, recovery 20%, checkins 20%
  tier:      ConsistencyTier;
  historyDepth: number; // total tracked days — data-maturity signal, see lib/intelligence/dataMaturity.ts
}

export interface StoredConsistencyEntry {
  date:      string;
  composite: number;
  tier:      ConsistencyTier;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadHistory(): StoredConsistencyEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredConsistencyEntry[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: StoredConsistencyEntry[]): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const pruned = entries.filter(e => e.date >= cutoffStr);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function windowCutoff(today: string, days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function toTier(composite: number): ConsistencyTier {
  if (composite >= 80) return "consistent";
  if (composite >= 60) return "building";
  if (composite >= 40) return "inconsistent";
  return "at_risk";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeConsistencyScore(
  today:             string,
  adherenceHistory:  AdherenceEntry[],
  nutritionCheckins: DailyNutritionCheckin[],
  recoveryLogs:      DailyRecoveryLog[],
  readinessHistory:  ReadinessHistoryEntry[],
): ConsistencyScore {
  const cutoff30 = windowCutoff(today, 30);

  // ── Training (40%) ────────────────────────────────────────────────────────
  const ah30   = adherenceHistory.filter(e => e.date >= cutoff30 && e.date <= today);
  const resolved = ah30.filter(e => e.status !== "pending");
  const completed = resolved.filter(e => e.status === "completed" || e.status === "partially_completed").length;
  const training = resolved.length > 0
    ? Math.min(100, Math.round((completed / resolved.length) * 100))
    : 50;   // neutral when no resolved sessions yet

  // ── Nutrition (20%) ───────────────────────────────────────────────────────
  const nc30      = nutritionCheckins.filter(e => e.date >= cutoff30 && e.date <= today);
  const ncCoverage = nc30.length / 30;
  const ncCompliance = nc30.length > 0
    ? (nc30.filter(e => e.hitProtein).length + nc30.filter(e => e.hitHydration).length) / (nc30.length * 2)
    : 0;
  const nutrition = Math.round(ncCoverage * ncCompliance * 100);

  // ── Recovery (20%) ────────────────────────────────────────────────────────
  const rl30       = recoveryLogs.filter(e => e.date >= cutoff30 && e.date <= today);
  const uniqueDates = new Set(rl30.map(e => e.date)).size;
  const recovery   = Math.round(Math.min(100, (uniqueDates / 30) * 100));

  // ── Check-ins / engagement (20%) ─────────────────────────────────────────
  const rh30   = readinessHistory.filter(e => e.date >= cutoff30 && e.date <= today);
  const checkins = Math.round(Math.min(100, (rh30.length / 30) * 100));

  // ── Composite ─────────────────────────────────────────────────────────────
  const composite = Math.round(
    training  * 0.40 +
    nutrition * 0.20 +
    recovery  * 0.20 +
    checkins  * 0.20,
  );

  return {
    date: today, training, nutrition, recovery, checkins, composite,
    tier: toTier(composite),
    historyDepth: adherenceHistory.length,
  };
}

export function saveConsistencyScore(score: ConsistencyScore): void {
  if (!isClient()) return;
  const entries  = loadHistory();
  const filtered = entries.filter(e => e.date !== score.date);
  filtered.push({ date: score.date, composite: score.composite, tier: score.tier });
  persistHistory(filtered);
}

export function getConsistencyHistory(): StoredConsistencyEntry[] {
  return loadHistory().sort((a, b) => b.date.localeCompare(a.date));
}
