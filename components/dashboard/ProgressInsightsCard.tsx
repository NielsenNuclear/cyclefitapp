"use client";

import { useMemo } from "react";
import {
  getAllExerciseHistory,
  type ExercisePerformance,
} from "@/lib/progression/exerciseHistory";
import { detectAllPlateaus } from "@/lib/progression/plateauDetection";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function volumeProxy(p: ExercisePerformance): number {
  return (p.weight + 1) * p.reps * p.sets;
}

// Estimated 1RM via Epley formula; returns 0 for bodyweight
function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

interface ProgressInsight {
  strongestLift:       string | null;  // exercise name with most volume growth
  strongestGrowthPct:  number;
  biggestPlateau:      string | null;  // exercise name with detected plateau
  plateauReason:       string;
  totalStrengthGain:   number;         // sum of 1RM gains across tracked exercises
  bestPattern:         string | null;  // movement pattern with most improvement
}

function computeInsights(): ProgressInsight {
  const all = getAllExerciseHistory();
  if (all.length === 0) {
    return {
      strongestLift: null, strongestGrowthPct: 0,
      biggestPlateau: null, plateauReason: "",
      totalStrengthGain: 0, bestPattern: null,
    };
  }

  // Group by exercise name, newest first
  const byExercise = new Map<string, ExercisePerformance[]>();
  for (const p of all) {
    if (!p.completed) continue;
    const list = byExercise.get(p.exerciseName) ?? [];
    list.push(p);
    byExercise.set(p.exerciseName, list);
  }

  let strongestLift       = "";
  let strongestGrowthPct  = 0;
  let totalStrengthGain   = 0;
  const patternGrowth     = new Map<string, number>();

  for (const [name, entries] of byExercise) {
    if (entries.length < 3) continue;

    // Volume growth: compare first 2 sessions vs last 2
    const recent = entries.slice(0, 2).map(volumeProxy);
    const oldest = entries.slice(-2).map(volumeProxy);
    const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
    const oldMean    = oldest.reduce((s, v) => s + v, 0) / oldest.length;
    const growthPct  = oldMean > 0 ? ((recentMean - oldMean) / oldMean) * 100 : 0;

    if (growthPct > strongestGrowthPct) {
      strongestGrowthPct = growthPct;
      strongestLift      = name;
    }

    // 1RM gain (first session vs latest)
    const first   = entries[entries.length - 1];
    const latest  = entries[0];
    const firstRM = epley1RM(first.weight, first.reps);
    const lastRM  = epley1RM(latest.weight, latest.reps);
    if (firstRM > 0 && lastRM > firstRM) {
      totalStrengthGain += lastRM - firstRM;
    }
  }

  // Biggest plateau
  const plateaus = detectAllPlateaus();
  const topPlateau = plateaus.find(p => p.plateauDetected);
  const REASON_SHORT: Record<string, string> = {
    volume_flat:     "Volume flat",
    weight_stuck:    "Weight unchanged",
    rpe_rising:      "Effort creeping up",
    incomplete_sets: "Sets not completed",
    insufficient_data: "",
  };

  return {
    strongestLift:      strongestLift  || null,
    strongestGrowthPct: Math.round(strongestGrowthPct * 10) / 10,
    biggestPlateau:     topPlateau?.exerciseName     ?? null,
    plateauReason:      topPlateau ? (REASON_SHORT[topPlateau.reason] ?? "") : "",
    totalStrengthGain:  Math.round(totalStrengthGain * 10) / 10,
    bestPattern:        null, // populated below if possible
  };
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-surface-hover my-3" />;
}

function MetricRow({
  label,
  value,
  sub,
  accent,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  accent?: "green" | "amber" | "purple";
}) {
  const valueColor =
    accent === "green"  ? "text-success-text" :
    accent === "amber"  ? "text-nutrition" :
    accent === "purple" ? "text-brand" :
                          "text-ink";
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[11px] text-ink-secondary">{label}</div>
        {sub && <div className="text-[10px] text-ink-muted mt-0.5">{sub}</div>}
      </div>
      <div className={`text-[13px] font-semibold ${valueColor} text-right flex-shrink-0`}>
        {value}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ProgressInsightsCard() {
  const insights = useMemo(() => computeInsights(), []);
  const all      = useMemo(() => getAllExerciseHistory(), []);

  const trackedCount  = new Set(all.filter(p => p.completed).map(p => p.exerciseName)).size;
  const sessionCount  = new Set(all.filter(p => p.completed).map(p => p.date)).size;

  if (trackedCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
          Progress Insights
        </div>
        <p className="text-[12px] text-ink-muted leading-relaxed">
          Complete 3+ workouts with set logging to unlock progression insights.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Progress Insights
        </div>
        <span className="text-[10px] text-ink-muted">
          {trackedCount} exercise{trackedCount !== 1 ? "s" : ""} · {sessionCount} session{sessionCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">

        {/* Strongest progressing lift */}
        {insights.strongestLift && (
          <MetricRow
            label="Strongest progress"
            sub={insights.strongestLift}
            value={`+${insights.strongestGrowthPct}%`}
            accent="green"
          />
        )}

        {/* Biggest plateau */}
        {insights.biggestPlateau && (
          <>
            <Divider />
            <MetricRow
              label="Needs attention"
              sub={insights.plateauReason || insights.biggestPlateau}
              value={insights.biggestPlateau}
              accent="amber"
            />
          </>
        )}

        {/* Total strength gain */}
        {insights.totalStrengthGain > 0 && (
          <>
            <Divider />
            <MetricRow
              label="Est. total 1RM gain"
              sub="Sum across all tracked lifts"
              value={`+${insights.totalStrengthGain} kg`}
              accent="purple"
            />
          </>
        )}

        {/* Nothing interesting yet */}
        {!insights.strongestLift && !insights.biggestPlateau && insights.totalStrengthGain === 0 && (
          <p className="text-[12px] text-ink-muted leading-relaxed">
            Keep logging sets — progression patterns appear after a few sessions per exercise.
          </p>
        )}

      </div>
    </div>
  );
}
