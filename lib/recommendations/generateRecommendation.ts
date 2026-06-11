// ─── lib/recommendations/generateRecommendation.ts ───────────────────────────
// Recommendation engine. Pure logic layer — no UI, no React imports.
// Accepts PhaseData + UserOnboarding → returns DailyRecommendation.
//
// Philosophy:
//   – Recommendations are probabilistic and hedged, never prescriptive.
//   – Phase is one signal. Sleep, stress, training history, and energy also weight.
//   – Language is empowering and evidence-informed.

import type { OnboardingData as UserOnboarding } from "@/lib/onboarding-types";
import type { AdaptiveProfile }    from "@/lib/adaptive-profile";
import type { ProgressionProfile } from "@/lib/progression/progressionProfile";
import type {
  PhaseData,
  DailyRecommendation,
  TrainingRecommendation,
  NutritionRecommendation,
  RecoveryRecommendation,
  ExplanationPoint,
  ReadinessBadge,
  IntensityLevel,
  TrainingState,
} from "@/types/recommendation";

// ─── Helper: readiness modifier (-2 to +2) ───────────────────────────────────

const SLEEP_MOD: Record<string, number> = {
  excellent:  1,
  good:       0,
  variable:  -1,
  poor:      -2,
};

type ReadinessWeights = AdaptiveProfile["readinessWeights"];

const SLEEP_WEIGHT_BASELINE  = 25;
const STRESS_WEIGHT_BASELINE = 17;

function weightScale(actual: number, baseline: number): number {
  return Math.min(actual / baseline, 1.5);
}

function getReadinessModifier(user: UserOnboarding, weights?: ReadinessWeights): number {
  const sleepScale  = weights ? weightScale(weights.sleep,  SLEEP_WEIGHT_BASELINE)  : 1.0;
  const stressScale = weights ? weightScale(weights.stress, STRESS_WEIGHT_BASELINE) : 1.0;

  let mod = 0;
  mod += (SLEEP_MOD[user.sleepQuality] ?? 0) * sleepScale;

  const stressMod = user.stressLevel >= 8 ? -2 : user.stressLevel >= 6 ? -1 : user.stressLevel <= 3 ? 1 : 0;
  mod += stressMod * stressScale;

  if (user.sessionsPerWeek >= 5 && user.trainingLevel !== "competitive") mod -= 1;

  return Math.max(-2, Math.min(2, mod));
}

// ─── Helper: energy level (0–4) derived from pattern + readiness ─────────────

export type EnergyTier = "Very Low Energy" | "Low Energy" | "Moderate Energy" | "Good Energy" | "High Energy";

export function deriveEnergyLevel(user: UserOnboarding, weights?: ReadinessWeights): { level: number; tier: EnergyTier } {
  const baseMap: Record<string, number> = {
    consistent_high:  3,
    morning_peak:     3,
    afternoon_peak:   2,
    variable:         1,
    consistently_low: 0,
  };
  const base = user.energyPattern ? (baseMap[user.energyPattern] ?? 2) : 2;
  const level = Math.round(Math.max(0, Math.min(4, base + getReadinessModifier(user, weights))));
  const tiers: EnergyTier[] = ["Very Low Energy", "Low Energy", "Moderate Energy", "Good Energy", "High Energy"];
  return { level, tier: tiers[level] };
}

// ─── Helper: training state awareness ────────────────────────────────────────

export type { TrainingState };

export function getTrainingState(user: UserOnboarding, weights?: ReadinessWeights): TrainingState {
  const mod = getReadinessModifier(user, weights);
  if (user.sessionsPerWeek >= 5 && mod <= -2) return "overreached";
  if (user.sessionsPerWeek >= 5 && mod <= 0)  return "fatigued";
  if (user.sessionsPerWeek <= 2 || user.trainingLevel === "just_starting") return "fresh";
  return "loaded";
}

// ─── Training recommendations per phase ──────────────────────────────────────

function buildTraining(
  phase: PhaseData,
  user: UserOnboarding,
  weights?: ReadinessWeights,
): TrainingRecommendation {
  const mod           = getReadinessModifier(user, weights);
  const trainingState = getTrainingState(user, weights);
  const { tier }      = deriveEnergyLevel(user, weights);
  const isStrengthFocused  = user.trainingStyles.includes("strength");
  const isEnduranceFocused = user.trainingStyles.includes("endurance") || user.trainingStyles.includes("running");
  const isRecoveryFocused  = user.goals.includes("recover_better");
  const drivers: string[] = [];

  const fatigueNote =
    trainingState === "overreached"
      ? "Training load and readiness signals indicate nervous system fatigue — a short deload (reduce volume 40–50%, maintain frequency) is likely the highest-ROI training decision this week."
      : trainingState === "fatigued"
      ? "High session frequency combined with current readiness suggests accumulated fatigue. Reduce volume by ~20% and prioritise quality over quantity."
      : undefined;

  switch (phase.name) {
    case "Follicular": {
      drivers.push("Follicular phase (rising estrogen)");
      if (mod >= 0) drivers.push("Sleep quality adequate or better");
      drivers.push(tier);
      const badge: ReadinessBadge = mod >= 1 ? "Push" : mod >= -1 ? "Maintain" : "Watch";

      const suggestions: string[] = (() => {
        if (trainingState === "overreached") {
          return ["Neural deload: same frequency, 40–50% volume reduction", "Technique-focused sets at 55–65% 1RM", "10 min Zone 2 cool-down after each session"];
        }
        if (trainingState === "fatigued") {
          return ["Reduce working sets by 1–2 per movement", "Keep intensity at 70–75% 1RM — quality over load", "Zone 2 cardio: 20–30 min at conversational pace"];
        }
        if (mod >= 1) {
          if (isStrengthFocused) {
            return ["Hypertrophy block: 4–5 sets of compound lifts at 75–85% 1RM", "Aim for top of rep range — progressive overload opportunity", "Accessory work: 3 sets per muscle group", "Consider adding a working set if energy remains high"];
          }
          if (isEnduranceFocused) {
            return ["4×4 interval protocol: 4 min at 90–95% HRmax, 3 min recovery", "Or 8×20s Tabata for VO₂max stimulus", "Zone 2 base session if second workout of the day"];
          }
          return ["Compound lifts at moderate-to-high load (75–80% 1RM)", "Interval training: 5–6 repeats at RPE 8–9", "New movement patterns or skill work while adaptation is high"];
        }
        if (mod >= 0) {
          return ["Moderate strength work at 65–75% 1RM", "Zone 2 cardio: 30–40 min at 65–70% HRmax", "Technique work — quality reps over maximum load"];
        }
        return ["Technique-focused lifting at 60–70% 1RM", "Zone 2 cardio: 20–30 min easy pace", "Mobility and movement quality work"];
      })();

      return {
        badge,
        focus:     isStrengthFocused ? "Strength Progression" : "Performance Building",
        intensity: mod >= 1 ? "Moderate to High" : mod >= 0 ? "Moderate" : "Light to Moderate",
        headline:  trainingState === "overreached" ? "Deload this week to protect future gains."
                 : trainingState === "fatigued"    ? "Pull back volume — protect the quality of each session."
                 : "A good window for progressive overload.",
        body: "Rising estrogen supports improved recovery and insulin sensitivity. Many women find strength gains come more easily in this phase. Adjust intensity based on how you feel today.",
        rationale: "Estrogen upregulates mTOR signalling and reduces cortisol response to exercise stress in the follicular window, improving anabolic response per training session (Enns & Tidus, 2010). Insulin sensitivity peaks mid-follicular, favouring carbohydrate-fuelled high-intensity work.",
        suggestions,
        signalDrivers: drivers,
        avoidNote: fatigueNote,
      };
    }

    case "Ovulatory": {
      drivers.push("Ovulatory phase (estrogen peak, possible testosterone rise)");
      drivers.push(tier);
      const badge: ReadinessBadge = mod >= 0 ? "Push" : "Maintain";

      const suggestions: string[] = (() => {
        if (trainingState === "overreached") {
          return ["Active recovery only: 20–30 min walk or easy swim", "Gentle mobility work — no structured loading"];
        }
        if (trainingState === "fatigued") {
          return ["Zone 2 cardio: 30–40 min at easy conversational pace", "Short strength session — 2–3 sets per movement, moderate load"];
        }
        if (mod >= 0) {
          if (isEnduranceFocused) {
            return ["HIIT: 8×20s Tabata or 4×4 VO₂max intervals", "Performance time trial if goals align", "Zone 2 base as second session — capitalise on aerobic adaptation"];
          }
          return ["High-intensity strength work: 4–6 sets at 80–90% 1RM", "Power and speed work: jump squats, med ball, plyometrics", "Performance testing (1RM, time trial) if goals align"];
        }
        return ["Moderate strength: 3–4 sets at 70–75% 1RM", "Zone 2 + short high-intensity block (2–3 intervals)", "Skill or technique work — fine motor learning is elevated"];
      })();

      return {
        badge,
        focus:     "Peak Performance",
        intensity: mod >= 0 ? "High" : "Moderate to High",
        headline:  trainingState === "overreached" ? "Protect the phase advantage — rest now, perform later."
                 : "Energy and motivation may be at their highest.",
        body: "Many women experience a window of peak performance around ovulation. If energy and motivation feel elevated, this can be a good time for high-intensity efforts or PRs. Always use your felt experience as the primary guide.",
        rationale: "The LH surge triggers a transient testosterone rise in approximately 40% of women, enhancing neuromuscular recruitment and motivation. Estrogen-mediated collagen synthesis peaks here — connective tissue is more resilient but also under greater stress; warm up thoroughly.",
        suggestions,
        signalDrivers: drivers,
        avoidNote: trainingState === "overreached" ? fatigueNote
                 : mod < 0 ? "Stress or sleep signals suggest moderating intensity today despite the phase advantage."
                 : undefined,
      };
    }

    case "Luteal": {
      drivers.push("Luteal phase (progesterone rising)");
      if (user.stressLevel >= 6) drivers.push("Elevated baseline stress");
      drivers.push(tier);
      const badge: ReadinessBadge = mod >= 1 ? "Maintain" : mod >= -1 ? "Watch" : "Recover";

      const suggestions: string[] = (() => {
        if (trainingState === "overreached" || mod <= -2) {
          return ["Gentle yoga or 20 min walk", "Breathwork or mobility session only", "Full rest is a performance decision — not a concession"];
        }
        if (trainingState === "fatigued" || mod <= 0) {
          return ["Zone 2 cardio: 30–40 min at 60–65% HRmax", "Low-load strength: 2–3 sets at 60–65% 1RM, prioritise form", "Yoga or mobility: 20–30 min on non-training days"];
        }
        if (isRecoveryFocused) {
          return ["Zone 2 cardio: 40–50 min steady state", "Moderate strength: 3 sets at 65–70% 1RM", "5–10 min post-session mobility mandatory"];
        }
        return ["Zone 2 cardio: 30–40 min at 65–70% HRmax", "Moderate-weight strength at comfortable rep ranges (65–75% 1RM)", "Yoga or mobility if evening energy is low"];
      })();

      return {
        badge,
        focus:     isRecoveryFocused ? "Recovery-Focused Training" : "Sustainable Output",
        intensity: mod >= 0 ? "Moderate" : "Light to Moderate",
        headline:  "Sustain rather than push — quality over volume.",
        body: "Progesterone may slightly reduce recovery efficiency and raise core temperature. Some women train well throughout the luteal phase; others find volume reductions more productive. Listen to your body rather than forcing the program.",
        rationale: "Progesterone elevates resting core temperature 0.3–0.5°C, increasing cardiovascular strain at equivalent absolute intensity. Substrate utilisation shifts toward fat oxidation and away from glycogen, which may reduce high-intensity capacity. Recovery time between sessions is typically extended 10–20%.",
        suggestions,
        signalDrivers: drivers,
        avoidNote: trainingState === "overreached" ? fatigueNote
                 : "If PMS symptoms are present, reduce volume rather than intensity to maintain training stimulus.",
      };
    }

    case "Late Luteal": {
      drivers.push("Late luteal phase (estrogen and progesterone declining)");
      drivers.push(tier);
      const badge: ReadinessBadge = mod >= 1 ? "Watch" : "Recover";

      const suggestions: string[] = (() => {
        if (trainingState === "overreached" || mod <= -2) {
          return ["Full rest or 15–20 min gentle walk", "Heat therapy or bath for comfort", "No structured training — prioritise nervous system recovery"];
        }
        if (mod <= 0) {
          return ["Zone 2 walk or easy cycle: 20–30 min", "Breathwork or restorative yoga: 20 min", "Mobility flow — no loading"];
        }
        return ["Zone 2 cardio: 20–30 min easy", "Light strength: 2 sets per movement at 55–65% 1RM, technique focus", "Stretching or mobility session"];
      })();

      return {
        badge,
        focus:     "Active Recovery",
        intensity: "Low",
        headline:  trainingState === "overreached" ? "Full rest — your body is asking for it."
                 : "Gentle movement and preparation for the cycle ahead.",
        body: "The final days before menstruation can bring energy dips and mood fluctuations for many women. Light movement, stretching, and recovery work may feel more sustainable than structured training today.",
        rationale: "Estrogen and progesterone withdrawal reduces serotonin precursor availability and increases cortisol reactivity, amplifying perceived fatigue. Prostaglandin production ramps up in anticipation of menstruation, which can increase systemic inflammation and reduce pain threshold.",
        suggestions,
        signalDrivers: drivers,
        avoidNote: trainingState === "overreached" ? fatigueNote
                 : "This is not a mandatory rest phase — if you feel energised, moderate training is appropriate.",
      };
    }

    case "Menstrual":
    default: {
      drivers.push("Menstrual phase (low estrogen and progesterone)");
      if (user.symptoms.includes("cramps") || user.symptoms.includes("fatigue")) {
        drivers.push("Reported cramps or fatigue");
      }
      drivers.push(tier);
      const badge: ReadinessBadge = mod >= 1 ? "Maintain" : "Watch";

      const suggestions: string[] = (() => {
        if (trainingState === "overreached" || mod <= -2) {
          return ["Rest, heat therapy, or 15 min gentle walk", "Breathing exercises — reduces prostaglandin-driven cramping for some", "Return to training when energy signals improve"];
        }
        if (mod <= 0) {
          return ["Walking, gentle yoga, or light mobility: 20–30 min", "Lower-weight strength at comfortable effort (55–65% 1RM)", "Prioritise movement quality over performance targets"];
        }
        return ["Walking, yoga, or light mobility: 30 min", "Lower-weight strength at comfortable effort (60–70% 1RM)", "Zone 2 cardio if energy allows — many women train effectively here"];
      })();

      return {
        badge,
        focus:     "Recovery and Restoration",
        intensity: mod >= 1 ? "Light to Moderate" : "Low",
        headline:  "Adjust intensity to match how you feel today.",
        body: "Energy may be lower in the first few days of menstruation, though individual experience varies widely. Some women train effectively throughout — use your felt energy as the primary signal, not the phase alone.",
        rationale: "Current evidence does not support impaired maximal strength output during menstruation for most women (Janse de Jonge, 2003). The primary limiters are prostaglandin-mediated inflammation, iron loss, and individual symptom burden — not hormonal state per se. Training performance is highly individual.",
        suggestions,
        signalDrivers: drivers,
        avoidNote: "Many women perform well in this phase. The recommendation is to listen closely — not to avoid training.",
      };
    }
  }
}

// ─── Nutrition recommendations per phase ─────────────────────────────────────

function buildNutrition(phase: PhaseData, user: UserOnboarding, weights?: ReadinessWeights): NutritionRecommendation {
  const isHighTraining   = user.sessionsPerWeek >= 4;
  const { tier }         = deriveEnergyLevel(user, weights);
  const hasLutealCraving = phase.name === "Luteal" || phase.name === "Late Luteal";

  switch (phase.name) {
    case "Follicular":
      return {
        focus:        "Performance Fueling",
        headline:     "Prioritise protein and complex carbohydrates.",
        body:         "Improved insulin sensitivity in this phase makes it a good time to leverage carbohydrate intake for training performance. Lean proteins support the muscle protein synthesis that follows strength training.",
        rationale:    "Follicular-phase estrogen enhances GLUT4 expression, increasing muscle glucose uptake and glycogen storage capacity. Higher insulin sensitivity means carbohydrates are partitioned preferentially toward muscle rather than fat — a meaningful ergogenic opportunity.",
        priorities:   ["Lean proteins for muscle adaptation", "Complex carbohydrates for sustained energy", "Fermented foods for gut and estrogen metabolism"],
        macroEmphasis: "Lean protein + complex carbs",
        hydration:    isHighTraining
          ? "35–40ml per kg bodyweight — increase on training days."
          : "35ml per kg bodyweight — standard intake.",
        keyNutrients: ["Zinc", "B vitamins", "Dietary fibre"],
        timingNote:   isHighTraining
          ? "Pre-session carbohydrates 2–3 hours before training will support performance. Post-session protein within 45–60 minutes."
          : "Time your largest carbohydrate serving around your most active part of the day.",
      };

    case "Ovulatory":
      return {
        focus:        "Peak Performance Nutrition",
        headline:     "Support peak output with quality carbs and protein timing.",
        body:         "With energy at its highest, nutrition timing matters most. Pre-session carbohydrates and post-session protein recovery are most impactful here.",
        rationale:    "The ovulatory window coincides with peak anabolic signalling. Post-session muscle protein synthesis rates are elevated relative to other phases, making protein timing particularly impactful — aim for 0.3–0.4g/kg leucine-rich protein within 60 minutes of training.",
        priorities:   ["Pre-workout carbohydrate availability", "Post-workout protein and recovery", "Antioxidant-rich foods to manage oxidative stress from high-intensity output"],
        macroEmphasis: "Performance carbs + quality protein",
        hydration:    "35–40ml per kg — more on high-intensity training days. Electrolyte replacement if sweating heavily.",
        keyNutrients: ["Electrolytes", "Antioxidants (vitamin C, E, polyphenols)", "Quality protein"],
        timingNote:   "Post-session protein within 60 minutes. Consider a carbohydrate + protein combination (3:1 ratio) for sessions longer than 60 minutes.",
      };

    case "Luteal":
    case "Late Luteal":
      return {
        focus:        "Satiety and Anti-Inflammatory Support",
        headline:     "Complex carbohydrates and magnesium are your allies.",
        body:         hasLutealCraving
          ? "Increased appetite in the luteal phase is physiologically driven — progesterone and serotonin fluctuations raise hunger. Satisfying appetite with complex carbohydrates supports serotonin production. This is not a willpower issue."
          : "Progesterone's thermogenic effect may slightly increase resting energy expenditure. Complex carbohydrates and magnesium-rich foods support both energy and mood.",
        rationale:    "Progesterone's thermogenic effect increases resting metabolic rate by approximately 2.5–10% in the luteal phase, elevating caloric needs. Serotonin synthesis is blunted by declining estrogen — dietary tryptophan (found in complex carbohydrates) partially compensates. Restricting calories in this phase is associated with worsened mood symptoms in several RCTs.",
        priorities:   ["Complex carbohydrates for serotonin support", "Magnesium-rich foods (dark chocolate, leafy greens, seeds)", "Anti-inflammatory Omega-3 sources", "Consistent protein to prevent catabolism"],
        macroEmphasis: "Complex carbs + protein + healthy fats",
        hydration:    "40ml per kg — body temperature is slightly elevated. Proactive hydration, especially before training.",
        keyNutrients: ["Magnesium", "Vitamin B6", "Omega-3 fatty acids", "Calcium"],
        timingNote:   "Avoid restricting calories in this phase — evidence suggests this worsens mood symptoms. Evening magnesium-rich snacks (nuts, seeds, dark chocolate) may support sleep quality.",
      };

    case "Menstrual":
    default:
      return {
        focus:        "Replenishment and Anti-Inflammatory",
        headline:     "Prioritise iron-rich foods and anti-inflammatory support.",
        body:         "Menstrual blood loss increases iron needs. Pairing iron-rich foods with vitamin C enhances absorption. Anti-inflammatory foods may ease discomfort for those who experience it.",
        rationale:    "Menstrual blood loss averages 30–80ml per cycle, representing 15–45mg of iron. Without dietary compensation, repeated cycles create cumulative iron depletion — a common but underdiagnosed contributor to fatigue and reduced aerobic capacity in active women. Non-haem iron absorption is up to 3× higher when paired with vitamin C.",
        priorities:   ["Iron-rich foods for replenishment", "Vitamin C to enhance iron absorption", "Anti-inflammatory foods (ginger, turmeric, Omega-3s)", "Adequate hydration"],
        macroEmphasis: "Iron-rich protein + anti-inflammatory fats",
        hydration:    "Standard to elevated — maintain consistent intake. Warm liquids may ease cramping for some.",
        keyNutrients: ["Iron", "Magnesium", "Omega-3 fatty acids", "Vitamin C"],
        timingNote:   "Warm meals and ginger or turmeric may ease cramp-related discomfort for some. Avoid high-tannin foods (tea, coffee) within 1 hour of iron-rich meals — they inhibit absorption.",
      };
  }
}

// ─── Recovery recommendations per phase ──────────────────────────────────────

function buildRecovery(phase: PhaseData, user: UserOnboarding, weights?: ReadinessWeights): RecoveryRecommendation {
  const hasSleepIssues  = user.sleepQuality === "poor" || user.sleepQuality === "variable";
  const highStress      = user.stressLevel >= 7;
  const trainingState   = getTrainingState(user, weights);

  const sleepTargetText = `${user.sleepHours} hours (your baseline). ${
    hasSleepIssues
      ? "Sleep quality has been variable — protecting your sleep window is the highest-impact recovery action available."
      : "Maintain your current pattern."
  }`;

  const neuralNote =
    trainingState === "overreached"
      ? "Nervous system fatigue is indicated — prioritise sleep above all other recovery modalities. Even one additional hour of sleep per night accelerates CNS recovery more than any supplement or passive intervention."
      : undefined;

  switch (phase.name) {
    case "Follicular":
      return {
        focus:    "Recovery Capacity Elevated",
        headline: "Recovery is efficient — use it wisely.",
        body:     "Rising estrogen is associated with improved recovery between training sessions. This is a good phase to capitalise on training adaptations without overloading the system.",
        rationale: "Estrogen has antioxidant properties that reduce exercise-induced oxidative damage and muscle soreness. Satellite cell proliferation (muscle repair) is enhanced in the follicular phase, meaning adaptations per training stimulus are higher — make the work count.",
        sleepTarget: sleepTargetText,
        sleepNote: "Sleep architecture in the follicular phase tends toward lighter, REM-dominant sleep — this is normal and supports memory consolidation and mood regulation.",
        practices: [
          "Standard cool-down and light stretching post-session",
          "Protein-rich post-workout meal within 45–60 minutes",
          "Consistent sleep and wake times — anchor your circadian rhythm",
        ],
        stressNote: highStress
          ? "Elevated baseline stress increases recovery time between sessions. Consider a deload if fatigue accumulates across the week."
          : undefined,
      };

    case "Ovulatory":
      return {
        focus:    "Maintain Recovery Baseline",
        headline: "Support peak performance with recovery basics.",
        body:     "High-output phases need matching recovery investment. Prioritise sleep and post-session nutrition to capitalise on adaptations.",
        rationale: "Peak estrogen collagen synthesis increases connective tissue turnover — this supports repair but also means ligament laxity is marginally elevated around ovulation. Warm up thoroughly before high-intensity sessions. Recovery nutrition is highest priority here: the anabolic window post-session is wider and more effective.",
        sleepTarget: sleepTargetText,
        sleepNote: "Sleep quality is typically good in the ovulatory window. Protect it by managing social or work scheduling stress around key training days.",
        practices: [
          "Post-session protein within 60 minutes",
          "7–9 hours sleep — do not shorten to fit training volume",
          "Manage scheduling stress around training days",
          trainingState === "fatigued" ? "Active recovery walk on rest days — do not add more structured sessions" : "Light active recovery on rest days (walking, mobility)",
        ],
        stressNote: highStress
          ? "Stress signals are elevated. Even in this high-performance window, chronic stress blunts adaptation — recovery quality matters as much as training quality."
          : undefined,
      };

    case "Luteal":
    case "Late Luteal":
      return {
        focus:    "Proactive Recovery",
        headline: "Recovery investment now protects performance later.",
        body:     "Progesterone's slight impact on recovery efficiency means rest days and sleep quality matter more in this phase. Proactive recovery — not passive — is the approach.",
        rationale: "Progesterone's thermogenic effect elevates core temperature at night, increasing sleep fragmentation and reducing deep (N3) sleep. Magnesium supplementation has RCT support for improving sleep quality specifically in the luteal phase. Recovery time between sessions is extended 10–20% — plan training load accordingly.",
        sleepTarget: sleepTargetText,
        sleepNote: "Luteal-phase sleep disruption is common due to elevated core temperature. Keep your bedroom cool (16–18°C), avoid alcohol (which worsens temperature regulation), and consider magnesium before bed.",
        practices: [
          "7–9 hours sleep — protect this above all else in this phase",
          "Magnesium-rich foods or supplement before bed for sleep quality",
          "Light mobility or yoga on non-training days",
          "Reduce caffeine after 2pm — half-life interaction with progesterone extends stimulant effect",
        ],
        stressNote: "PMS-related mood shifts can compound stress load. Even 10 minutes of breathwork or a short outdoor walk has measurable cortisol reduction effects — consistency matters more than duration.",
      };

    case "Menstrual":
    default:
      return {
        focus:    "Rest and Restore",
        headline: "Listen to your body — recovery is training.",
        body:     "The first days of menstruation are often when the body benefits most from deliberate recovery. Structured rest is a performance decision, not a concession.",
        rationale: "Prostaglandins released during menstruation trigger inflammation systemically — not just locally. This temporarily elevates resting inflammatory markers, reducing the adaptation signal from training and increasing soreness. Rest in this window is not detraining; it is accumulation of the adaptations from the previous phase.",
        sleepTarget: sleepTargetText,
        sleepNote: "Sleep quality often improves as menstruation progresses and progesterone clears. If sleep is disrupted in the first 1–2 days, this is normal and typically self-resolving.",
        practices: [
          "Heat therapy for cramp relief if relevant (reduces prostaglandin signalling locally)",
          "Gentle movement over complete sedentary rest — even short walks reduce inflammation",
          "Earlier sleep timing if energy is low",
          neuralNote ?? "Reduce high-intensity training volume — quality of rest matters here",
        ],
        stressNote: highStress
          ? "High stress combined with menstrual inflammation is a significant combined load. Protect recovery time aggressively this week."
          : undefined,
      };
  }
}

// ─── Explanation / transparency layer ────────────────────────────────────────

function buildExplanation(
  phase: PhaseData,
  user: UserOnboarding,
  weights?: ReadinessWeights,
): ExplanationPoint[] {
  const points: ExplanationPoint[] = [];
  const { level, tier } = deriveEnergyLevel(user, weights);
  const trainingState   = getTrainingState(user, weights);

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

  // Derived energy level
  points.push({
    signal:      "Derived energy level",
    observation: `${tier} (score ${level}/4)`,
    implication:
      level >= 3
        ? "Energy signals are favourable — training recommendations lean toward higher output and progressive stimulus."
        : level >= 2
        ? "Energy signals are moderate — recommendations balanced between stimulus and recovery."
        : "Energy signals are low — recommendations prioritise recovery, technique, and low-intensity output over load.",
    weight: level <= 1 ? "Primary" : "Secondary",
  });

  // Training state
  if (trainingState === "fatigued" || trainingState === "overreached") {
    points.push({
      signal:      "Training load",
      observation: trainingState === "overreached"
        ? `High session frequency (${user.sessionsPerWeek}/week) with low readiness — overreached state indicated`
        : `High session frequency (${user.sessionsPerWeek}/week) with reduced readiness`,
      implication:
        trainingState === "overreached"
          ? "Training load and readiness signals together indicate accumulated fatigue. Recommendations are shifted toward deload protocols."
          : "Accumulated training load is reducing current readiness. Volume reduction is recommended to preserve adaptation quality.",
      weight: "Primary",
    });
  }

  // Energy pattern (baseline)
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
      implication: "Your baseline energy pattern informs how deviations from your check-in data are interpreted and weights the derived energy level calculation.",
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

// ─── Progression explanation point ───────────────────────────────────────────
// Only added when confidence >= 0.35 (sufficient data to make a traceable claim).

function buildProgressionExplanation(
  progression?: ProgressionProfile,
): ExplanationPoint | null {
  if (!progression || progression.confidence < 0.35) return null;

  const { adherenceScore, recoveryScore, workloadTrend, recommendedAction, confidence } = progression;

  const actionLabels: Record<string, string> = {
    progress: "Progressive overload applied",
    maintain: "Current load maintained",
    reduce:   "Volume reduction applied",
    deload:   "Structured deload applied",
  };

  const trendLabels: Record<string, string> = {
    increasing: "increasing",
    stable:     "stable",
    decreasing: "decreasing",
  };

  const observation =
    `${actionLabels[recommendedAction]} · ` +
    `Adherence ${adherenceScore}/100 · ` +
    `Recovery ${recoveryScore}/100 · ` +
    `Workload ${trendLabels[workloadTrend]}`;

  const implication: string = (() => {
    if (recommendedAction === "progress") {
      return `Strong adherence (${adherenceScore}/100) and positive recovery signals (${recoveryScore}/100) ` +
             `support adding progressive load. One additional working set is applied to primary movements.`;
    }
    if (recommendedAction === "deload") {
      return `Recovery score (${recoveryScore}/100) and ${workloadTrend} workload indicate accumulated fatigue. ` +
             `Volume is reduced 40% and intensity targets are lowered. This is a performance investment.`;
    }
    if (recommendedAction === "reduce") {
      return `${adherenceScore < 50
        ? `Completion rate below 50% over 28 days (adherence ${adherenceScore}/100). Reducing volume and complexity to improve consistency.`
        : `Recovery score is below threshold (${recoveryScore}/100). Volume reduced 20% to protect adaptation quality.`}`;
    }
    return `Adherence (${adherenceScore}/100) and recovery (${recoveryScore}/100) are balanced. ` +
           `No progression adjustment applied — current prescription is appropriate.`;
  })();

  return {
    signal:      "Adaptive progression",
    observation,
    implication,
    weight:      (recommendedAction === "deload" || recommendedAction === "reduce") ? "Primary" : "Secondary",
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateRecommendation(
  phase:       PhaseData,
  user:        UserOnboarding,
  profile?:    AdaptiveProfile,
  progression?: ProgressionProfile,
): DailyRecommendation {
  const weights        = profile?.readinessWeights;
  const basePoints     = buildExplanation(phase, user, weights);
  const progressionPt  = buildProgressionExplanation(progression);
  const explanationPoints = progressionPt
    ? [...basePoints, progressionPt]
    : basePoints;

  return {
    generatedAt: new Date().toISOString(),
    phase,
    training:    buildTraining(phase, user, weights),
    nutrition:   buildNutrition(phase, user, weights),
    recovery:    buildRecovery(phase, user, weights),
    explanationPoints,
    disclaimer:
      "These recommendations are guidance informed by physiology research and your profile data. They are not medical advice. Individual responses vary — your felt experience is always the primary signal.",
  };
}
