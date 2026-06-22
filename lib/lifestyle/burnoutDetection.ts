// ─── lib/lifestyle/burnoutDetection.ts ────────────────────────────────────────
// Phase 39H — Lifestyle Burnout Detection.
// Detects burnout driven by LIFE STRESS (declining adherence, high life load,
// sustained stress) rather than physiological overtraining (Phase 21).
// Different signal: lifestyle burnout can occur even with low training load.

import type { ActiveLifeEvent } from "@/lib/adherence/lifeEvents";
import type { AdherenceRiskReport } from "@/lib/adherence/riskDetection";

const STORAGE_KEY    = "axis_burnout_history";
const RETENTION_DAYS = 90;

function isClient(): boolean { return typeof window !== "undefined"; }

// ─── Types ────────────────────────────────────────────────────────────────────

export type LifestyleBurnoutLevel = "low" | "elevated" | "high" | "critical";

export interface LifestyleBurnoutReport {
  risk:            LifestyleBurnoutLevel;
  score:           number;           // 0–100
  confidence:      number;           // 0–100
  signals:         string[];
  recommendations: string[];
  dataMaturity:    "early" | "sufficient";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

interface StoredBurnoutEntry {
  date:  string;
  score: number;
  risk:  LifestyleBurnoutLevel;
}

export function saveBurnoutEntry(entry: StoredBurnoutEntry): void {
  if (!isClient()) return;
  try {
    const raw     = localStorage.getItem(STORAGE_KEY);
    const all: StoredBurnoutEntry[] = raw ? JSON.parse(raw) : [];
    const cutoff  = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const threshold = cutoff.toISOString().slice(0, 10);
    const pruned  = all.filter(e => e.date >= threshold && e.date !== entry.date);
    pruned.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

export function getBurnoutHistory(): StoredBurnoutEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredBurnoutEntry[]) : [];
  } catch { return []; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function riskFromScore(score: number): LifestyleBurnoutLevel {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "elevated";
  return "low";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeLifestyleBurnout(input: {
  recentAdherenceRate:   number;           // 0–100 (% completed in last 14 days)
  readinessTrendSlope:   number;           // from readinessTrend.slope7d
  stressLevel:           number;           // 1–10
  symptomCount:          number;
  activeLifeEvent:       ActiveLifeEvent | null;
  adherenceRiskReport:   AdherenceRiskReport | null;
  physioBurnoutScore:    number;           // Phase 21 burnout risk score
  historyDepth:          number;           // days of adherence history
}): LifestyleBurnoutReport {
  const signals: string[]         = [];
  const recommendations: string[] = [];
  let score = 0;

  // ── Adherence decline (35% weight) ─────────────────────────────────────
  const adherencePenalty = clamp(100 - input.recentAdherenceRate, 0, 100) * 0.35;
  score += adherencePenalty;
  if (input.recentAdherenceRate < 40) {
    signals.push("Session completion has dropped significantly in the last 2 weeks.");
    recommendations.push("Focus on habit consistency over intensity — even 15-minute sessions count.");
  }

  // ── Readiness trend (20% weight) ────────────────────────────────────────
  if (input.readinessTrendSlope < -2) {
    const rdxPenalty = clamp(Math.abs(input.readinessTrendSlope) * 3, 0, 20);
    score += rdxPenalty;
    signals.push("Readiness scores have been trending downward.");
  }

  // ── Stress level (20% weight) ────────────────────────────────────────────
  if (input.stressLevel >= 7) {
    const stressPenalty = clamp((input.stressLevel - 6) * 5, 0, 20);
    score += stressPenalty;
    signals.push(`High stress (${input.stressLevel}/10) is draining mental reserves.`);
    recommendations.push("Stress management (walks, breathwork, sleep) has higher ROI than training this week.");
  }

  // ── Symptom load (10% weight) ────────────────────────────────────────────
  if (input.symptomCount >= 3) {
    score += Math.min(10, input.symptomCount * 2);
    signals.push("Multiple active symptoms are adding to total body load.");
  }

  // ── Active life event (10% flat) ────────────────────────────────────────
  if (input.activeLifeEvent) {
    score += 10;
    signals.push(`Active life event (${input.activeLifeEvent.type.replace("_", " ")}) is contributing to lifestyle burnout risk.`);
  }

  // ── Adherence risk report ────────────────────────────────────────────────
  if (input.adherenceRiskReport?.level === "high") {
    score += 8;
    signals.push("Sustained high adherence risk detected across multiple indicators.");
    recommendations.push("Consider a planned lighter week to reset momentum rather than waiting to be forced to stop.");
  }

  // ── Physio burnout cross-signal ─────────────────────────────────────────
  if (input.physioBurnoutScore >= 60) {
    score += Math.min(10, (input.physioBurnoutScore - 60) * 0.4);
    signals.push("Physical and lifestyle burnout signals are compounding.");
    recommendations.push("A full recovery week (movement only, no structured training) will serve your long-term goals.");
  }

  score = clamp(Math.round(score), 0, 100);
  const risk = riskFromScore(score);

  if (risk === "critical") {
    recommendations.push("Axis recommends a full break from structured training for 5–7 days.");
  } else if (risk === "high" && recommendations.length === 0) {
    recommendations.push("Scale back this week — minimum effective sessions only.");
  }

  const confidence     = clamp(Math.round((input.historyDepth / 21) * 100), 20, 90);
  const dataMaturity   = input.historyDepth >= 14 ? "sufficient" : "early";

  return { risk, score, confidence, signals, recommendations, dataMaturity };
}
