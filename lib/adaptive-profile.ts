import type { OnboardingData } from "./onboarding-types";

export interface AdaptiveProfile {
  readinessWeights: {
    sleep: number;
    energy: number;
    stress: number;
    recovery: number;
    cyclePhase: number;
  };
  primaryFocus: string;
  trainingBadge: string;
  nutritionApproach: string;
  recoveryProtocol: string;
  coachingInsight: string;
  predictedFirstScore: number | null;
  keySignals: string[];
  phaseStrategy: string;
  estimatedDaysToPersonalization: number;
}

export function buildAdaptiveProfile(data: OnboardingData): AdaptiveProfile {
  // ── Readiness weight calibration ─────────────────────────────────────────
  // We elevate the weight of whichever signal is the user's biggest variable.
  const sleepWeight   = data.sleepQuality === "poor" ? 0.30 : data.sleepQuality === "variable" ? 0.27 : 0.22;
  const stressWeight  = data.stressLevel >= 7 ? 0.22 : data.stressLevel >= 5 ? 0.17 : 0.13;
  const energyWeight  = data.energyPattern === "variable" ? 0.20 : 0.17;
  const cycleWeight   = data.trackingPreference === "none" ? 0.05 : 0.10;
  const recoveryWeight = 1 - sleepWeight - stressWeight - energyWeight - cycleWeight;

  // ── Training badge ────────────────────────────────────────────────────────
  const badgeMap: Record<string, string> = {
    just_starting: "Building baseline",
    recreational:  "Recreational athlete",
    consistent:    "Consistent performer",
    competitive:   "Competitive athlete",
  };
  const trainingBadge = badgeMap[data.trainingLevel] ?? "Athlete";

  // ── Primary focus ─────────────────────────────────────────────────────────
  const focusMap: Record<string, string> = {
    build_strength:      "Strength & progressive overload",
    improve_endurance:   "Aerobic capacity & endurance",
    body_composition:    "Body composition & lean mass",
    improve_performance: "Athletic performance",
    recover_better:      "Recovery optimisation",
    understand_my_body:  "Physiological awareness",
    stay_consistent:     "Consistency & habit",
  };
  const primaryFocus = focusMap[data.goals[0]] ?? "Adaptive performance";

  // ── Nutrition approach ────────────────────────────────────────────────────
  const hasLutealSymptoms = data.symptoms.some(s =>
    ["bloating", "cravings", "mood_swings", "fatigue"].includes(s)
  );
  const nutritionApproach = hasLutealSymptoms
    ? "Luteal-phase carbohydrate prioritisation with anti-inflammatory baseline"
    : data.goals.includes("body_composition")
      ? "Performance-first fuelling with phase-adjusted protein targets"
      : "Adaptive macro cycling aligned to training load and readiness";

  // ── Recovery protocol ────────────────────────────────────────────────────
  const recoveryPractices = data.recoveryPractices;
  let recoveryProtocol = "Rest days recommended when readiness is below threshold";
  if (recoveryPractices.includes("stretching") || recoveryPractices.includes("yoga")) {
    recoveryProtocol = "Active recovery sessions integrated with mobility work";
  }
  if (recoveryPractices.includes("sleep_focus")) {
    recoveryProtocol = "Sleep-first protocol with sleep window protection guidance";
  }

  // ── Coaching insight ─────────────────────────────────────────────────────
  const insights: string[] = [];
  if (data.sleepQuality === "poor" || data.sleepHours < 6.5) {
    insights.push("Sleep is your highest-impact lever — the adaptive engine will weight it heavily and flag dips proactively.");
  } else if (data.stressLevel >= 7) {
    insights.push("Stress patterns suggest recovery may be your primary constraint. Axis will monitor accumulation and recommend deload weeks proactively.");
  } else if (data.goals.includes("build_strength") && data.trainingLevel === "consistent") {
    insights.push("Your training history and goals suggest progressive overload is a core outcome. The engine will track volume load weekly and recommend overload on high-readiness days.");
  } else {
    insights.push("Your multi-signal profile is well-balanced. Axis will begin identifying patterns after your first 7 check-ins and personalise recommendations progressively.");
  }

  // ── Key signals ──────────────────────────────────────────────────────────
  const keySignals: string[] = ["Sleep quality", "Energy level"];
  if (data.stressLevel >= 6) keySignals.push("Stress");
  if (data.symptoms.length > 2) keySignals.push("Symptom severity");
  if (data.trackingPreference !== "none") keySignals.push("Cycle phase");
  keySignals.push("Soreness");

  // ── Phase strategy ───────────────────────────────────────────────────────
  let phaseStrategy = "Cycle phase will be used as an advisory modifier alongside all other signals.";
  if (data.cycleRegularity === "irregular") {
    phaseStrategy = "Given cycle irregularity, phase is weighted lower. Readiness signals lead.";
  } else if (data.trackingPreference === "none") {
    phaseStrategy = "Physiology-based recommendations will be driven entirely by daily signals, without cycle context.";
  }

  // ── Days to personalisation ──────────────────────────────────────────────
  const baselineDays = data.trainingLevel === "just_starting" ? 10 : 7;

  // ── Predicted first score ─────────────────────────────────────────────────
  // A rough estimate for illustration — real score requires actual check-ins
  const predictedScore: number | null = null;

  return {
    readinessWeights: {
      sleep:      Math.round(sleepWeight * 100),
      energy:     Math.round(energyWeight * 100),
      stress:     Math.round(stressWeight * 100),
      recovery:   Math.round(Math.max(recoveryWeight, 0.08) * 100),
      cyclePhase: Math.round(cycleWeight * 100),
    },
    primaryFocus,
    trainingBadge,
    nutritionApproach,
    recoveryProtocol,
    coachingInsight: insights[0],
    predictedFirstScore: predictedScore,
    keySignals,
    phaseStrategy,
    estimatedDaysToPersonalization: baselineDays,
  };
}
