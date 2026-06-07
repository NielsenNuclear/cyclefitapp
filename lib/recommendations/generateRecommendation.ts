// ─── lib/recommendations/generateRecommendation.ts ───────────────────────────
// Recommendation engine. Pure logic layer — no UI, no React imports.
// Accepts PhaseData + UserOnboarding → returns DailyRecommendation.
//
// Philosophy:
//   – Recommendations are probabilistic and hedged, never prescriptive.
//   – Phase is one signal. Sleep, stress, and training history also weight.
//   – Language is empowering and evidence-informed.

import type { OnboardingData as UserOnboarding } from "@/lib/onboarding-types";
import type {
  PhaseData,
  DailyRecommendation,
  TrainingRecommendation,
  NutritionRecommendation,
  RecoveryRecommendation,
  ExplanationPoint,
  ReadinessBadge,
  IntensityLevel,
} from "@/types/recommendation";

// ─── Helper: map stress + sleep to a readiness modifier ──────────────────────

function getReadinessModifier(user: UserOnboarding): number {
  // Returns -2 to +2 modifier. Positive = more toward Push.
  let mod = 0;
  if (user.sleepQuality === "excellent") mod += 1;
  else if (user.sleepQuality === "poor") mod -= 2;
  else if (user.sleepQuality === "variable") mod -= 1;

  if (user.stressLevel >= 8) mod -= 2;
  else if (user.stressLevel >= 6) mod -= 1;
  else if (user.stressLevel <= 3) mod += 1;

  if (user.sessionsPerWeek >= 5 && user.trainingLevel !== "competitive") mod -= 1;

  return Math.max(-2, Math.min(2, mod));
}

// ─── Training recommendations per phase ──────────────────────────────────────

function buildTraining(
  phase: PhaseData,
  user: UserOnboarding
): TrainingRecommendation {
  const mod = getReadinessModifier(user);
  const isStrengthFocused = user.trainingStyles.includes("strength");
  const isRecoveryFocused = user.goals.includes("recover_better");

  const drivers: string[] = [];

  switch (phase.name) {
    case "Follicular": {
      drivers.push("Follicular phase (rising estrogen)");
      if (mod >= 0) drivers.push("Sleep quality adequate or better");
      const badge: ReadinessBadge = mod >= 1 ? "Push" : mod >= -1 ? "Maintain" : "Watch";
      return {
        badge,
        focus:     isStrengthFocused ? "Strength Progression" : "Performance Building",
        intensity: mod >= 1 ? "Moderate to High" : mod >= 0 ? "Moderate" : "Light to Moderate",
        headline:  "A good window for progressive overload.",
        body:      "Rising estrogen supports improved recovery and insulin sensitivity. Many women find strength gains come more easily in this phase. Adjust intensity based on how you feel today.",
        suggestions: isStrengthFocused
          ? ["Compound lifts at moderate-to-high load", "Aim for top of rep range", "Consider adding a working set if energy is high"]
          : ["Interval training", "Sport-specific performance work", "New movement patterns"],
        signalDrivers: drivers,
      };
    }

    case "Ovulatory": {
      drivers.push("Ovulatory phase (estrogen peak, possible testosterone rise)");
      const badge: ReadinessBadge = mod >= 0 ? "Push" : "Maintain";
      return {
        badge,
        focus:     "Peak Performance",
        intensity: mod >= 0 ? "High" : "Moderate to High",
        headline:  "Energy and motivation may be at their highest.",
        body:      "Many women experience a window of peak performance around ovulation. If energy and motivation feel elevated, this can be a good time for high-intensity efforts or PRs. Always use your felt experience as the primary guide.",
        suggestions: ["High-intensity strength work", "Power and speed intervals", "Performance testing if goals align"],
        signalDrivers: drivers,
        avoidNote: mod < 0
          ? "Stress or sleep signals suggest moderating intensity today despite the phase advantage."
          : undefined,
      };
    }

    case "Luteal": {
      drivers.push("Luteal phase (progesterone rising)");
      if (user.stressLevel >= 6) drivers.push("Elevated baseline stress");
      const badge: ReadinessBadge = mod >= 1 ? "Maintain" : mod >= -1 ? "Watch" : "Recover";
      return {
        badge,
        focus:     isRecoveryFocused ? "Recovery-Focused Training" : "Sustainable Output",
        intensity: mod >= 0 ? "Moderate" : "Light to Moderate",
        headline:  "Sustain rather than push — quality over volume.",
        body:      "Progesterone may slightly reduce recovery efficiency and raise core temperature. Some women train well throughout the luteal phase; others find volume reductions more productive. Listen to your body rather than forcing the program.",
        suggestions: ["Zone 2 cardio", "Moderate-weight strength at comfortable rep ranges", "Yoga or mobility if energy is low"],
        signalDrivers: drivers,
        avoidNote: "If PMS symptoms are present, reduce volume rather than intensity to maintain training stimulus.",
      };
    }

    case "Late Luteal": {
      drivers.push("Late luteal phase (estrogen and progesterone declining)");
      const badge: ReadinessBadge = mod >= 1 ? "Watch" : "Recover";
      return {
        badge,
        focus:     "Active Recovery",
        intensity: "Low",
        headline:  "Gentle movement and preparation for the cycle ahead.",
        body:      "The final days before menstruation can bring energy dips and mood fluctuations for many women. Light movement, stretching, and recovery work may feel more sustainable than structured training today.",
        suggestions: ["Walking or light yoga", "Mobility and stretching", "Low-load technique work"],
        signalDrivers: drivers,
        avoidNote: "This is not a mandatory rest phase — if you feel energised, moderate training is appropriate.",
      };
    }

    case "Menstrual":
    default: {
      drivers.push("Menstrual phase (low estrogen and progesterone)");
      if (user.symptoms.includes("cramps") || user.symptoms.includes("fatigue")) {
        drivers.push("Reported cramps or fatigue");
      }
      const badge: ReadinessBadge = mod >= 1 ? "Maintain" : "Watch";
      return {
        badge,
        focus:     "Recovery and Restoration",
        intensity: mod >= 1 ? "Light to Moderate" : "Low",
        headline:  "Adjust intensity to match how you feel today.",
        body:      "Energy may be lower in the first few days of menstruation, though individual experience varies widely. Some women train effectively throughout — use your felt energy as the primary signal, not the phase alone.",
        suggestions: ["Walking, yoga, or light mobility", "Lower-weight strength at comfortable effort", "Prioritise movement over performance targets"],
        signalDrivers: drivers,
        avoidNote: "Many women perform well in this phase. The recommendation is to listen closely — not to avoid training.",
      };
    }
  }
}

// ─── Nutrition recommendations per phase ─────────────────────────────────────

function buildNutrition(phase: PhaseData, user: UserOnboarding): NutritionRecommendation {
  const isHighTraining  = user.sessionsPerWeek >= 4;
  const hasLutealCraving = phase.name === "Luteal" || phase.name === "Late Luteal";

  switch (phase.name) {
    case "Follicular":
      return {
        focus:        "Performance Fueling",
        headline:     "Prioritise protein and complex carbohydrates.",
        body:         "Improved insulin sensitivity in this phase makes it a good time to leverage carbohydrate intake for training performance. Lean proteins support the muscle protein synthesis that follows strength training.",
        priorities:   ["Lean proteins for muscle adaptation", "Complex carbohydrates for sustained energy", "Fermented foods for gut and estrogen metabolism"],
        macroEmphasis: "Lean protein + complex carbs",
        hydration:    "Standard intake — 35ml per kg bodyweight.",
        keyNutrients: ["Zinc", "B vitamins", "Dietary fibre"],
        timingNote:   isHighTraining ? "Pre-session carbohydrates 2–3 hours before training will support performance." : undefined,
      };

    case "Ovulatory":
      return {
        focus:        "Peak Performance Nutrition",
        headline:     "Support peak output with quality carbs and protein timing.",
        body:         "With energy at its highest, nutrition timing matters most. Pre-session carbohydrates and post-session protein recovery are most impactful here.",
        priorities:   ["Pre-workout carbohydrate availability", "Post-workout protein and recovery", "Antioxidant-rich foods"],
        macroEmphasis: "Performance carbs + quality protein",
        hydration:    "Slightly elevated — aim for 35–40ml per kg, more if training intensity is high.",
        keyNutrients: ["Electrolytes", "Antioxidants", "Quality protein"],
        timingNote:   "Post-session protein within 60 minutes supports the muscle adaptation gains typical of this phase.",
      };

    case "Luteal":
    case "Late Luteal":
      return {
        focus:        "Satiety and Anti-Inflammatory Support",
        headline:     "Complex carbohydrates and magnesium are your allies.",
        body:         hasLutealCraving
          ? "Increased appetite in the luteal phase is physiologically driven — progesterone and serotonin fluctuations raise hunger. Satisfying appetite with complex carbohydrates supports serotonin production. This is not a willpower issue."
          : "Progesterone's thermogenic effect may slightly increase resting energy expenditure. Complex carbohydrates and magnesium-rich foods support both energy and mood.",
        priorities:   ["Complex carbohydrates for serotonin support", "Magnesium-rich foods", "Anti-inflammatory Omega-3 sources", "Consistent protein to prevent catabolism"],
        macroEmphasis: "Complex carbs + protein + healthy fats",
        hydration:    "Elevated — body temperature may be slightly higher. Aim for 40ml per kg.",
        keyNutrients: ["Magnesium", "Vitamin B6", "Omega-3 fatty acids", "Calcium"],
        timingNote:   "Avoid restricting calories in this phase — evidence suggests this worsens mood symptoms.",
      };

    case "Menstrual":
    default:
      return {
        focus:        "Replenishment and Anti-Inflammatory",
        headline:     "Prioritise iron-rich foods and anti-inflammatory support.",
        body:         "Menstrual blood loss increases iron needs. Pairing iron-rich foods with vitamin C enhances absorption. Anti-inflammatory foods may ease discomfort for those who experience it.",
        priorities:   ["Iron-rich foods for replenishment", "Vitamin C to enhance iron absorption", "Anti-inflammatory foods", "Adequate hydration"],
        macroEmphasis: "Iron-rich protein + anti-inflammatory fats",
        hydration:    "Standard to elevated — maintain consistent intake.",
        keyNutrients: ["Iron", "Magnesium", "Omega-3 fatty acids", "Vitamin C"],
        timingNote:   "Warm meals and ginger or turmeric may help ease cramp-related discomfort for some.",
      };
  }
}

// ─── Recovery recommendations per phase ──────────────────────────────────────

function buildRecovery(phase: PhaseData, user: UserOnboarding): RecoveryRecommendation {
  const hasSleepIssues = user.sleepQuality === "poor" || user.sleepQuality === "variable";
  const highStress     = user.stressLevel >= 7;

  const base: Pick<RecoveryRecommendation, "sleepTarget" | "stressNote"> = {
    sleepTarget: `${user.sleepHours} hours (your baseline). ${hasSleepIssues ? "Sleep quality has been variable — protecting your sleep window is the highest-impact recovery action." : "Maintain your current pattern."}`,
    stressNote:  highStress ? "Elevated baseline stress increases recovery time between sessions. Consider a deload if fatigue accumulates across the week." : undefined,
  };

  switch (phase.name) {
    case "Follicular":
      return {
        ...base,
        focus:    "Recovery Capacity Elevated",
        headline: "Recovery is efficient — use it wisely.",
        body:     "Rising estrogen is associated with improved recovery between training sessions. This is a good phase to capitalise on training adaptations without overloading the system.",
        practices: ["Standard cool-down and light stretching", "Protein-rich post-workout meal", "Consistent sleep timing"],
      };

    case "Ovulatory":
      return {
        ...base,
        focus:    "Maintain Recovery Baseline",
        headline: "Support peak performance with recovery basics.",
        body:     "High-output phases need matching recovery investment. Prioritise sleep and post-session nutrition to capitalise on adaptations.",
        practices: ["Post-session protein within 60 minutes", "Quality sleep — 7–9 hours", "Manage scheduling stress around training days"],
      };

    case "Luteal":
    case "Late Luteal":
      return {
        ...base,
        focus:    "Proactive Recovery",
        headline: "Recovery investment now protects performance later.",
        body:     "Progesterone's slight impact on recovery efficiency means rest days and sleep quality matter more in this phase. Proactive recovery — not passive — is the approach.",
        practices: [
          "Prioritise 7–9 hours of sleep",
          "Magnesium-rich foods before bed may improve sleep quality",
          "Light mobility or yoga on non-training days",
          "Reduce caffeine intake in the afternoon",
        ],
        stressNote: "PMS-related mood shifts can compound stress load. Even brief breathwork or walks outdoors have measurable cortisol reduction effects.",
      };

    case "Menstrual":
    default:
      return {
        ...base,
        focus:    "Rest and Restore",
        headline: "Listen to your body — recovery is training.",
        body:     "The first days of menstruation are often when the body benefits most from deliberate recovery. Structured rest is a performance decision, not a concession.",
        practices: [
          "Heat therapy for cramp relief if relevant",
          "Gentle movement over complete sedentary rest",
          "Earlier sleep timing if energy is low",
          "Reduce high-intensity training volume",
        ],
      };
  }
}

// ─── Explanation / transparency layer ────────────────────────────────────────

function buildExplanation(
  phase: PhaseData,
  user: UserOnboarding
): ExplanationPoint[] {
  const points: ExplanationPoint[] = [];

  // Phase
  points.push({
    signal:      "Cycle phase",
    observation: `${phase.name}, day ${phase.cycleDay} of a ${phase.cycleLength}-day cycle`,
    implication: `Phase is an advisory signal — it contributes context but does not override other signals. Phase modifier is approximately 10% of the total recommendation weighting.`,
    weight:      "Advisory",
  });

  // Sleep
  const sleepLabels: Record<string, string> = {
    excellent: "Excellent — consistently restorative",
    good:      "Good — generally well-rested",
    variable:  "Variable — inconsistent quality",
    poor:      "Poor — frequently disrupted",
  };
  points.push({
    signal:      "Sleep quality",
    observation: sleepLabels[user.sleepQuality] ?? "Not specified",
    implication:
      user.sleepQuality === "poor" || user.sleepQuality === "variable"
        ? "Sleep is weighted most heavily in the readiness model (~40% combined). Current sleep quality is reducing estimated readiness."
        : "Sleep quality is supporting readiness and recovery capacity.",
    weight: "Primary",
  });

  // Stress
  const stressLabel =
    user.stressLevel <= 3 ? "Low" :
    user.stressLevel <= 6 ? "Moderate" :
    "Elevated";
  points.push({
    signal:      "Stress level",
    observation: `${stressLabel} (${user.stressLevel}/10 baseline)`,
    implication:
      user.stressLevel >= 7
        ? "Elevated chronic stress reduces recovery efficiency and training adaptation. Load recommendations are moderated accordingly."
        : "Stress is within a manageable range and is not negatively weighting today's recommendations.",
    weight: user.stressLevel >= 7 ? "Primary" : "Secondary",
  });

  // Energy pattern
  if (user.energyPattern) {
    const patternLabels: Record<string, string> = {
      consistent_high:  "Consistently high energy",
      morning_peak:     "Morning energy peak",
      afternoon_peak:   "Afternoon energy peak",
      variable:         "Variable day-to-day",
      consistently_low: "Consistently low energy",
    };
    points.push({
      signal:      "Energy pattern",
      observation: patternLabels[user.energyPattern] ?? user.energyPattern,
      implication: "Your baseline energy pattern informs how deviations from your check-in data are interpreted.",
      weight: "Secondary",
    });
  }

  // Symptoms
  if (user.symptoms.length > 0 && !user.symptoms.includes("none")) {
    points.push({
      signal:      "Reported symptoms",
      observation: user.symptoms.join(", "),
      implication: `Reported symptoms (${user.symptomSeverity} severity) may affect training capacity. The recommendation accounts for this by suggesting flexibility in intensity.`,
      weight: user.symptomSeverity === "severe" ? "Primary" : "Secondary",
    });
  }

  return points;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateRecommendation(
  phase: PhaseData,
  user: UserOnboarding
): DailyRecommendation {
  return {
    generatedAt:        new Date().toISOString(),
    phase,
    training:           buildTraining(phase, user),
    nutrition:          buildNutrition(phase, user),
    recovery:           buildRecovery(phase, user),
    explanationPoints:  buildExplanation(phase, user),
    disclaimer:
      "These recommendations are guidance informed by physiology research and your profile data. They are not medical advice. Individual responses vary — your felt experience is always the primary signal.",
  };
}
