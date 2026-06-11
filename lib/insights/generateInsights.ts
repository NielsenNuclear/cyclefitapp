// ─── lib/insights/generateInsights.ts ────────────────────────────────────────
// Centralised insight-generation layer.
// Pure logic — no React, no side effects.
// All language is evidence-informed and hedged. No deterministic medical claims.

import type { PhaseData }             from "@/types/recommendation";
import type { TrainingState }         from "@/types/recommendation";
import type { VolumeReport, MuscleGroup } from "@/lib/exercises/volumeTracking";
import type { TrainingLoadReport }    from "@/lib/analytics/trainingLoad";
import type { WorkoutHistoryEntry }   from "@/lib/history/workoutHistory";
import type { ProgressionProfile }    from "@/lib/progression/progressionProfile";
import type { ReadinessScore }        from "@/lib/readiness/calculateReadiness";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightCategory =
  | "cycle"
  | "training"
  | "recovery"
  | "volume"
  | "progression"
  | "readiness";

export interface Insight {
  category: InsightCategory;
  heading:  string;
  body:     string;
  priority: number;   // 1–5, higher = shown first
}

export interface InsightReport {
  insights:    Insight[];
  generatedAt: string;
}

export interface InsightInput {
  phase:               PhaseData;
  energyLevel:         number;               // 0–4 from deriveEnergyLevel()
  trainingState:       TrainingState;
  volumeReport?:       VolumeReport;         // optional — from generateVolumeReport()
  loadReport?:         TrainingLoadReport;   // optional — from generateTrainingLoadReport()
  history?:            WorkoutHistoryEntry[];
  progressionProfile?: ProgressionProfile;   // optional — from buildProgressionProfile()
  readinessScore?:     ReadinessScore;       // optional — from calculateReadiness()
}

// ─── Muscle group display names ───────────────────────────────────────────────

const MUSCLE_DISPLAY: Record<MuscleGroup, string> = {
  chest:       "chest",
  upperBack:   "upper back",
  lats:        "lats",
  rearDelts:   "rear deltoids",
  frontDelts:  "front deltoids",
  sideDelts:   "side deltoids",
  biceps:      "biceps",
  triceps:     "triceps",
  quadriceps:  "quadriceps",
  hamstrings:  "hamstrings",
  glutes:      "glutes",
  calves:      "calves",
  abs:         "abs",
  obliques:    "obliques",
  lowerBack:   "lower back",
};

// ─── Cycle insight ────────────────────────────────────────────────────────────

const CYCLE_BODIES: Record<string, string> = {
  "Follicular":
    "During the follicular phase, rising oestrogen may support improved recovery " +
    "capacity and training tolerance. Research suggests this window can be well-suited " +
    "to progressive overload and strength-focused work.",
  "Ovulatory":
    "Oestrogen peaks around ovulation, which many women associate with higher energy " +
    "and motivation. This may be a well-timed window for higher-intensity efforts and " +
    "performance-oriented training.",
  "Luteal":
    "Progesterone rises in the luteal phase, which can affect recovery efficiency and " +
    "perceived exertion. Sustaining training quality over peak volume output may support " +
    "consistency across the cycle.",
  "Late Luteal":
    "The late luteal phase is often associated with reduced energy and heightened fatigue " +
    "sensitivity. Honouring those signals with reduced intensity may help protect performance " +
    "in the following phase.",
  "Menstrual":
    "During menstruation, energy and recovery capacity vary widely between individuals. " +
    "Using perceived effort as the primary guide — rather than fixed targets — may be the " +
    "most reliable approach today.",
};

function cycleInsight(phase: PhaseData): Insight {
  return {
    category: "cycle",
    heading:  "Cycle Insight",
    body:     CYCLE_BODIES[phase.name] ??
              "Cycle phase context has been factored into today's session. " +
              "Listening to energy and recovery signals is always a reliable guide.",
    priority: 5,
  };
}

// ─── Training insight ─────────────────────────────────────────────────────────

function trainingInsight(trainingState: TrainingState, energyLevel: number): Insight {
  const priority = trainingState === "overreached" || trainingState === "fatigued" ? 4 : 3;

  let body: string;

  if (trainingState === "overreached") {
    body =
      "Recent training signals suggest accumulated load that may benefit from a structured " +
      "reduction. Today's session is scaled to prioritise nervous system recovery while " +
      "preserving movement quality over intensity.";
  } else if (trainingState === "fatigued") {
    body =
      "Accumulated training load is present. Volume has been moderated today to protect " +
      "adaptation quality — consistent, lower-intensity work can still deliver meaningful " +
      "stimulus during this window.";
  } else if (energyLevel <= 1) {
    body =
      "Today's energy is lower than typical. Research suggests reducing session intensity " +
      "during low-energy periods — rather than pushing through — may support better long-term " +
      "consistency and reduce injury risk.";
  } else if (energyLevel >= 4) {
    body =
      "Training state is fresh and energy is high. This is a sound opportunity to apply " +
      "progressive overload — small, consistent increases in load or volume compound " +
      "meaningfully over time.";
  } else if (trainingState === "loaded") {
    body =
      "Training load is at a sustainable level. Maintaining current intensity while monitoring " +
      "recovery signals across the week is a sensible approach to long-term adaptation.";
  } else {
    body =
      "Moderate energy and a stable training state suggest today's session can proceed at " +
      "standard volume. Movement quality generally matters more than absolute load for " +
      "sustained progress.";
  }

  return { category: "training", heading: "Training Insight", body, priority };
}

// ─── Recovery insight ─────────────────────────────────────────────────────────

function recoveryInsight(
  loadReport?:   TrainingLoadReport,
  trainingState?: TrainingState,
): Insight {
  if (loadReport) {
    const { recoveryStatus, workloadTrend, completedWorkouts } = loadReport;

    let body: string;
    let priority: number;

    if (recoveryStatus === "High Fatigue") {
      priority = 4;
      body =
        "Your recent training load has been notably high. Evidence suggests prioritising " +
        "sleep, nutrition, and lighter activity may help restore performance capacity before " +
        "returning to full training intensity.";
    } else if (recoveryStatus === "Elevated Fatigue" && workloadTrend === "Increasing") {
      priority = 4;
      const pct = loadReport.previousWeekVolume > 0
        ? Math.round(((loadReport.weeklyVolume - loadReport.previousWeekVolume) /
            loadReport.previousWeekVolume) * 100)
        : null;
      body =
        pct !== null
          ? `Training volume has increased approximately ${pct}% over the last 7 days. ` +
            "A modest reduction or a recovery-focused session may help maintain performance " +
            "quality in the days ahead."
          : "Training volume has increased recently. A modest reduction or recovery-focused " +
            "session may help maintain performance quality in the days ahead.";
    } else if (recoveryStatus === "Elevated Fatigue") {
      priority = 3;
      body =
        "Some accumulated fatigue is present based on recent training frequency. Sustaining " +
        "current or slightly reduced volume while prioritising sleep may support recovery.";
    } else if (recoveryStatus === "Recovered" && workloadTrend === "Decreasing") {
      priority = 2;
      body =
        "Recent training load has been relatively low, which may have allowed meaningful " +
        "recovery. This can be a good window to gradually reintroduce higher training volume " +
        "if your goals support it.";
    } else if (recoveryStatus === "Recovered") {
      priority = 2;
      body =
        `You've completed ${completedWorkouts} workout${completedWorkouts === 1 ? "" : "s"} this week ` +
        "and recovery signals look positive. This may be a suitable window to progressively " +
        "increase workload if you have been in a planned lower-intensity phase.";
    } else {
      priority = 2;
      body =
        "Training load and recovery signals appear balanced. Continuing with current volume " +
        "and monitoring energy levels across the week is a consistent approach.";
    }

    return { category: "recovery", heading: "Recovery Insight", body, priority };
  }

  // Fallback: derive from trainingState alone
  const priority = trainingState === "overreached" || trainingState === "fatigued" ? 3 : 2;
  const body =
    trainingState === "overreached"
      ? "High training load has been detected. Adequate sleep and reduced activity outside " +
        "scheduled sessions may help restore readiness."
      : trainingState === "fatigued"
      ? "Some fatigue is present. Prioritising recovery practices — sleep quality, nutrition " +
        "timing, and stress management — can support adaptation between sessions."
      : "No significant fatigue signals are present. Maintaining consistent recovery habits " +
        "supports ongoing adaptation even when training feels manageable.";

  return { category: "recovery", heading: "Recovery Insight", body, priority };
}

// ─── Volume insight ───────────────────────────────────────────────────────────

function volumeInsight(report: VolumeReport): Insight | null {
  const entries = Object.entries(report) as [MuscleGroup, VolumeReport[MuscleGroup]][];

  // Find most under-target group by deficit percentage
  let worstGroup: MuscleGroup | null = null;
  let worstDeficit = 0;

  for (const [group, entry] of entries) {
    if (entry.status === "under") {
      const target = entry.target.hypertrophy; // use hypertrophy as reference target
      const deficit = target > 0 ? (target - entry.sets) / target : 0;
      if (deficit > worstDeficit) {
        worstDeficit = deficit;
        worstGroup   = group;
      }
    }
  }

  // Find any over-target group
  const overGroup = entries.find(([, e]) => e.status === "over")?.[0] ?? null;

  if (!worstGroup && !overGroup) return null;

  let body: string;

  if (worstGroup && overGroup) {
    body =
      `Weekly volume for ${MUSCLE_DISPLAY[worstGroup]} appears below target, while ` +
      `${MUSCLE_DISPLAY[overGroup]} is receiving higher-than-typical stimulus. ` +
      "Balancing training emphasis across muscle groups may support more even adaptation.";
  } else if (worstGroup) {
    body =
      `Weekly volume for ${MUSCLE_DISPLAY[worstGroup]} appears below the estimated effective ` +
      "range. Adding one targeted set or session across the week may help maintain balanced " +
      "development.";
  } else {
    body =
      `${MUSCLE_DISPLAY[overGroup!]} is receiving notably high weekly stimulus. While this may ` +
      "align with specific goals, evidence suggests adequate recovery between sessions is " +
      "important for that muscle group.";
  }

  return { category: "volume", heading: "Volume Insight", body, priority: 3 };
}

// ─── Progression insight ──────────────────────────────────────────────────────
// Uses ProgressionProfile data when available for concrete, score-referenced
// language. Falls back to history-only logic when profile is absent.

function progressionInsight(
  history:     WorkoutHistoryEntry[],
  loadReport?: TrainingLoadReport,
  profile?:    ProgressionProfile,
): Insight | null {
  if (history.length === 0) return null;

  // ── Rich path: profile data available ──
  if (profile && profile.confidence >= 0.35) {
    const { adherenceScore, recoveryScore, progressionScore, workloadTrend, recommendedAction } = profile;
    let body: string;
    let priority: number;

    if (recommendedAction === "progress") {
      priority = 4;
      body =
        `Adherence score is ${adherenceScore}/100 over the last 28 days and recovery is ` +
        `strong (${recoveryScore}/100). Current training load supports progressive overload — ` +
        `today's session includes one additional working set on primary movements.`;
    } else if (recommendedAction === "deload") {
      priority = 4;
      body =
        `Recovery score has dropped to ${recoveryScore}/100 with ${workloadTrend} workload. ` +
        `A structured deload — 40% volume reduction — will restore adaptation capacity. ` +
        `Deload sessions are not rest; they are a planned phase of training.`;
    } else if (recommendedAction === "reduce") {
      priority = 3;
      if (adherenceScore < 50) {
        body =
          `Completion rate over the last 28 days is ${adherenceScore}/100. Reducing ` +
          `session complexity may lower the barrier to consistent attendance — ` +
          `volume is reduced 20% and one accessory movement removed.`;
      } else {
        body =
          `Recovery signals are below threshold (${recoveryScore}/100). Volume is ` +
          `reduced 20% this session to protect adaptation quality without stopping training.`;
      }
    } else {
      // maintain
      priority = 2;
      body =
        `Progression score is ${progressionScore}/100 — adherence (${adherenceScore}/100) ` +
        `and recovery (${recoveryScore}/100) are balanced. Current training load is appropriate; ` +
        `no progression adjustment applied today.`;
    }

    return { category: "progression", heading: "Progression Insight", body, priority };
  }

  // ── Fallback path: no profile or insufficient confidence ──
  const streak         = loadReport?.currentStreak ?? 0;
  const nonPending     = history.filter(e => e.status !== "pending");
  const completed      = nonPending.filter(
    e => e.status === "completed" || e.status === "partially_completed"
  );
  const completionRate = nonPending.length > 0 ? completed.length / nonPending.length : 0;

  let body: string;
  let priority: number;

  if (streak >= 5) {
    priority = 3;
    body =
      `You've completed ${streak} consecutive training days. Consistency is one of the ` +
      "strongest predictors of long-term adaptation — this pattern supports sustained progress.";
  } else if (completionRate >= 0.85 && nonPending.length >= 4) {
    priority = 3;
    body =
      `Your recent completion rate of ${Math.round(completionRate * 100)}% reflects strong ` +
      "training consistency. Sustained adherence typically outperforms any single training " +
      "variable in driving long-term progress.";
  } else if (loadReport?.workloadTrend === "Increasing" && completionRate >= 0.7) {
    priority = 3;
    body =
      "Training volume has been increasing alongside solid completion. Gradual, " +
      "progressive load increases are well-supported by evidence as a driver of adaptation.";
  } else if (streak >= 2) {
    priority = 2;
    body =
      `${streak} consecutive training days on record. Building on this momentum with ` +
      "consistent session completion is one of the most reliable routes to long-term progress.";
  } else {
    priority = 2;
    body =
      "Tracking your training history makes it easier to identify patterns in energy, " +
      "recovery, and performance over time. Each logged session adds useful context.";
  }

  return { category: "progression", heading: "Progression Insight", body, priority };
}

// ─── Readiness insight ────────────────────────────────────────────────────────
// Identifies the primary interaction between training load and recovery capacity.
// Distinct from ReadinessCard (which shows the current score) — focuses on the
// WHY and TREND rather than repeating the score breakdown.

type ReadinessContribKey = keyof ReadinessScore["contributors"];

const READINESS_SIGNAL_LABELS: Record<ReadinessContribKey, string> = {
  sleep:        "Sleep quality",
  stress:       "Stress load",
  energy:       "Energy pattern",
  cycle:        "Cycle phase",
  trainingLoad: "Training load recovery",
  adherence:    "Training consistency",
};

function readinessInsight(
  score:        ReadinessScore,
  loadReport?:  TrainingLoadReport,
  progression?: ProgressionProfile,
): Insight | null {
  const entries = Object.entries(score.contributors) as [ReadinessContribKey, number][];
  const primaryLimiter  = [...entries].sort((a, b) => a[1] - b[1])[0];
  const primaryStrength = [...entries].sort((a, b) => b[1] - a[1])[0];
  const trend           = loadReport?.workloadTrend;

  // Increasing load + recovery capacity below threshold
  if (score.contributors.trainingLoad <= 40 && trend === "Increasing") {
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `Training volume is increasing while recovery capacity is below threshold ` +
        `(readiness ${score.score}/100). If load continues to rise without a deload week, ` +
        `readiness is likely to decline further.`,
      priority: 4,
    };
  }

  // Sleep is dominant limiter
  if (primaryLimiter[0] === "sleep" && primaryLimiter[1] <= 20) {
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `Sleep quality is the dominant readiness constraint today (${score.score}/100). ` +
        `Sleep carries the highest weighting in the readiness model — improving it would have ` +
        `more impact on readiness than any other single signal.`,
      priority: 4,
    };
  }

  // Stress is dominant limiter
  if (primaryLimiter[0] === "stress" && primaryLimiter[1] <= 20) {
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `Elevated stress is the primary readiness constraint today (${score.score}/100). ` +
        `Chronic high stress suppresses recovery efficiency — the physiological impact is ` +
        `equivalent to missing sleep or adding training volume.`,
      priority: 4,
    };
  }

  // Low adherence is primary limiter
  if (primaryLimiter[0] === "adherence" && primaryLimiter[1] <= 30 && progression) {
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `Training consistency is limiting readiness to ${score.score}/100 — ` +
        `session completion is at ${progression.adherenceScore}/100 over the last 28 days. ` +
        `Consistent attendance is the highest-leverage behaviour for long-term adaptation.`,
      priority: 3,
    };
  }

  // Positive trend: decreasing load + strong recovery
  if (score.score >= 75 && trend === "Decreasing" && score.contributors.trainingLoad >= 70) {
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `Training load is decreasing while recovery capacity is positive ` +
        `(readiness ${score.score}/100). This may be a well-timed window to gradually ` +
        `reintroduce progressive volume if training goals support it.`,
      priority: 3,
    };
  }

  // Strong readiness — name the leading contributor
  if (score.score >= 75 && primaryStrength[1] >= 80) {
    const label = READINESS_SIGNAL_LABELS[primaryStrength[0]];
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `${label} is the strongest readiness contributor today — ` +
        `readiness is at ${score.score}/100, supporting full training stimulus.`,
      priority: 2,
    };
  }

  // Generic cautious: name primary limiter
  if (score.score < 60 && primaryLimiter[1] <= 45) {
    const label = READINESS_SIGNAL_LABELS[primaryLimiter[0]];
    return {
      category: "readiness",
      heading:  "Readiness Insight",
      body:
        `${label} is the primary readiness constraint today (${score.score}/100). ` +
        `Session volume has been moderated accordingly.`,
      priority: 3,
    };
  }

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateInsights(input: InsightInput): InsightReport {
  const {
    phase, energyLevel, trainingState,
    volumeReport, loadReport, history,
    progressionProfile, readinessScore,
  } = input;

  const candidates: Insight[] = [
    cycleInsight(phase),
    trainingInsight(trainingState, energyLevel),
    recoveryInsight(loadReport, trainingState),
  ];

  if (volumeReport) {
    const vi = volumeInsight(volumeReport);
    if (vi) candidates.push(vi);
  }

  if (history && history.length > 0) {
    const pi = progressionInsight(history, loadReport, progressionProfile);
    if (pi) candidates.push(pi);
  }

  if (readinessScore) {
    const ri = readinessInsight(readinessScore, loadReport, progressionProfile);
    if (ri) candidates.push(ri);
  }

  // Sort priority desc; stable secondary sort by category for determinism
  const ORDER: InsightCategory[] = ["cycle", "training", "recovery", "volume", "progression", "readiness"];
  const sorted = candidates
    .sort((a, b) => b.priority - a.priority || ORDER.indexOf(a.category) - ORDER.indexOf(b.category))
    .slice(0, 5);

  return {
    insights:    sorted,
    generatedAt: new Date().toISOString(),
  };
}
