import type {
  DailyRecommendation,
  ReadinessBadge,
  IntensityLevel,
  ExplanationPoint,
} from "@/types/recommendation";
import type { LearnedPattern } from "@/lib/cycleLearning/types";
import { SYMPTOM_BY_ID } from "@/lib/symptoms/symptomCatalog";

// ─── Ordering tables (most demanding → least demanding) ───────────────────────

const BADGE_ORDER:     ReadinessBadge[]  = ["Push", "Maintain", "Watch", "Recover"];
const INTENSITY_ORDER: IntensityLevel[]  = [
  "High", "Moderate to High", "Moderate", "Light to Moderate", "Low",
];

// ─── Proximity filter ─────────────────────────────────────────────────────────
// A pattern is "active" if it typically occurs within this many days of today's cycle day.
const PROXIMITY_WINDOW = 5;

// ─── Rule tables ──────────────────────────────────────────────────────────────

interface TrainingRule {
  symptomId:       string;
  minSeverity:     number;
  minConsistency:  number;
  badgeLevels:     number;      // how many steps to downgrade ReadinessBadge
  intensityLevels: number;      // how many steps to downgrade IntensityLevel
  avoidNote:       string;
  suggestion:      string;
}

interface NutritionRule {
  symptomId:      string;
  minSeverity:    number;
  minConsistency: number;
  priority:       string;
  timingNote?:    string;
}

interface RecoveryRule {
  symptomId:      string;
  minSeverity:    number;
  minConsistency: number;
  practice:       string;
  stressNote?:    string;
  sleepNote?:     string;
}

const TRAINING_RULES: TrainingRule[] = [
  {
    symptomId:       "fatigue",
    minSeverity:     2.5,
    minConsistency:  60,
    badgeLevels:     1,
    intensityLevels: 1,
    avoidNote:       "Recurring fatigue historically peaks around this phase — consider reducing volume by 10–20%.",
    suggestion:      "Reduce working sets by 1–2 and prioritise movement quality over load.",
  },
  {
    symptomId:       "energy",
    minSeverity:     2.0,
    minConsistency:  60,
    badgeLevels:     1,
    intensityLevels: 1,
    avoidNote:       "Energy historically lower around this phase — quality over quantity.",
    suggestion:      "Shorter sessions with full effort sets rather than chasing volume.",
  },
  {
    symptomId:       "muscle-soreness",
    minSeverity:     2.5,
    minConsistency:  65,
    badgeLevels:     1,
    intensityLevels: 1,
    avoidNote:       "Recurring muscle soreness around this phase — allow more recovery between sessions.",
    suggestion:      "Add 5–10 min of targeted mobility work before and after training.",
  },
  {
    symptomId:       "cramps",
    minSeverity:     1.5,
    minConsistency:  55,
    badgeLevels:     0,
    intensityLevels: 1,
    avoidNote:       "Recurring cramps — mobility and gentle movement preferred over high-intensity work.",
    suggestion:      "Substitute high-impact work with mobility, Pilates, or low-intensity cycling.",
  },
  {
    symptomId:       "joint-pain",
    minSeverity:     2.0,
    minConsistency:  55,
    badgeLevels:     1,
    intensityLevels: 1,
    avoidNote:       "Recurring joint discomfort — lower-impact options preferred around this phase.",
    suggestion:      "Favour machines, cables, and controlled tempo over free-weight loading.",
  },
];

const NUTRITION_RULES: NutritionRule[] = [
  {
    symptomId:      "food-cravings",
    minSeverity:    1.0,
    minConsistency: 50,
    priority:       "Pre-planned protein and fibre intake may help manage recurring cravings.",
  },
  {
    symptomId:      "bloating",
    minSeverity:    1.5,
    minConsistency: 50,
    priority:       "Lower-sodium options to reduce bloating historically noted around this phase.",
  },
  {
    symptomId:      "appetite-increase",
    minSeverity:    1.0,
    minConsistency: 50,
    priority:       "Consistent meal timing helps manage appetite fluctuations.",
    timingNote:     "Eat at consistent times — appetite tends to increase around this phase.",
  },
  {
    symptomId:      "appetite-loss",
    minSeverity:    1.0,
    minConsistency: 50,
    priority:       "Smaller, more frequent meals help maintain intake during low-appetite phases.",
    timingNote:     "Smaller meals at regular intervals — appetite historically lower around this phase.",
  },
  {
    symptomId:      "digestive-issues",
    minSeverity:    1.5,
    minConsistency: 50,
    priority:       "Lighter, easily digestible pre-workout nutrition reduces discomfort.",
  },
  {
    symptomId:      "nausea",
    minSeverity:    1.5,
    minConsistency: 50,
    priority:       "Bland, easy-to-digest foods — nausea historically noted around this phase.",
  },
];

const RECOVERY_RULES: RecoveryRule[] = [
  {
    symptomId:      "sleep-quality",
    minSeverity:    2.0,
    minConsistency: 55,
    practice:       "Consistent sleep schedule and earlier wind-down — sleep quality historically lower around this phase.",
    sleepNote:      "Sleep disruption tends to occur around this phase — consistent bed and wake times recommended.",
  },
  {
    symptomId:      "stress",
    minSeverity:    2.0,
    minConsistency: 55,
    practice:       "Breathwork or gentle walking as recovery tools — stress tends to be elevated around this phase.",
    stressNote:     "Stress historically spikes around this phase — low-intensity movement and breathwork recommended.",
  },
  {
    symptomId:      "anxiety",
    minSeverity:    1.5,
    minConsistency: 55,
    practice:       "Low-intensity movement and breathwork for nervous system recovery.",
    stressNote:     "Anxiety patterns detected around this phase — gentle recovery emphasis.",
  },
  {
    symptomId:      "fatigue",
    minSeverity:    3.0,
    minConsistency: 60,
    practice:       "Extra recovery emphasis — severe fatigue historically peaks around this phase. Consider an additional rest day.",
  },
  {
    symptomId:      "night-sweats",
    minSeverity:    1.5,
    minConsistency: 55,
    practice:       "Cool sleep environment recommended — night sweats historically noted around this phase.",
    sleepNote:      "Sleep temperature management: light bedding and cool room temperature.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downgradeBadge(badge: ReadinessBadge, levels: number): ReadinessBadge {
  if (levels === 0) return badge;
  const idx = BADGE_ORDER.indexOf(badge);
  return BADGE_ORDER[Math.min(BADGE_ORDER.length - 1, idx + levels)];
}

function downgradeIntensity(intensity: IntensityLevel, levels: number): IntensityLevel {
  if (levels === 0) return intensity;
  const idx = INTENSITY_ORDER.indexOf(intensity);
  return INTENSITY_ORDER[Math.min(INTENSITY_ORDER.length - 1, idx + levels)];
}

function isNear(pattern: LearnedPattern, currentCycleDay: number): boolean {
  return Math.abs(pattern.averageCycleDay - currentCycleDay) <= PROXIMITY_WINDOW;
}

function confidenceLevel(pattern: LearnedPattern): number {
  if (pattern.confidence === "high")   return 3;
  if (pattern.confidence === "medium") return 2;
  return 1;
}

function qualifiesForModifier(
  pattern:        LearnedPattern,
  minSeverity:    number,
  minConsistency: number,
  currentCycleDay: number,
): boolean {
  return (
    pattern.confidence !== "low" &&          // medium+ only for actual modifiers
    pattern.averageSeverity >= minSeverity &&
    pattern.consistencyScore >= minConsistency &&
    isNear(pattern, currentCycleDay)
  );
}

function makeExplanationPoint(
  pattern:  LearnedPattern,
  implication: string,
): ExplanationPoint {
  const name = SYMPTOM_BY_ID[pattern.symptomId]?.name ?? pattern.symptomId;
  const day  = Math.round(pattern.averageCycleDay);

  const observationPrefix =
    pattern.confidence === "high"   ? "Established pattern:" :
    pattern.confidence === "medium" ? "Your patterns show:" :
                                      "Early indication:";

  return {
    signal:      "Cycle learning",
    observation: `${observationPrefix} ${name} around Day ${day} (${pattern.supportingCycles} cycle${pattern.supportingCycles !== 1 ? "s" : ""} of data)`,
    implication,
    weight:      "Advisory",
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Post-processes a DailyRecommendation with learned cycle patterns.
 *
 * Safety guarantees:
 *  - Only downgrades badge/intensity, never upgrades
 *  - Low-confidence patterns add explanation points only — no modifiers
 *  - All existing readiness safeguards are preserved
 *
 * Personalisation scales with data:
 *  - New user (0 patterns)          → unchanged baseline
 *  - 3 cycles (low confidence)      → explanation points only
 *  - 4–6 cycles (medium confidence) → mild modifiers + explanations
 *  - 7+ cycles (high confidence)    → same modifiers, stronger signal wording
 */
export function applyPatternModifiers(
  recommendation:  DailyRecommendation,
  patterns:        LearnedPattern[],
  currentCycleDay: number,
): DailyRecommendation {
  if (patterns.length === 0 || currentCycleDay <= 0) return recommendation;

  const nearbyPatterns = patterns.filter(p => isNear(p, currentCycleDay));
  if (nearbyPatterns.length === 0) return recommendation;

  // ── Accumulate modifiers ────────────────────────────────────────────────────

  let totalBadgeDowngrade     = 0;
  let totalIntensityDowngrade = 0;
  const trainingAvoidNotes:   string[] = [];
  const trainingSuggestions:  string[] = [];
  const nutritionPriorities:  string[] = [];
  let   nutritionTimingNote:  string | undefined;
  const recoveryPractices:    string[] = [];
  let   recoveryStressNote:   string | undefined;
  let   recoverySleepNote:    string | undefined;
  const explanationPoints:    ExplanationPoint[] = [];

  // Build a lookup from symptomId → pattern for the nearby set
  const patternBySymptom = new Map(nearbyPatterns.map(p => [p.symptomId, p]));

  // Training rules
  for (const rule of TRAINING_RULES) {
    const pattern = patternBySymptom.get(rule.symptomId);
    if (!pattern) continue;
    if (qualifiesForModifier(pattern, rule.minSeverity, rule.minConsistency, currentCycleDay)) {
      // Scale downgrade by confidence: medium = 1×, high = 1× (cap at 2 total)
      totalBadgeDowngrade     = Math.min(2, totalBadgeDowngrade + rule.badgeLevels);
      totalIntensityDowngrade = Math.min(2, totalIntensityDowngrade + rule.intensityLevels);
      trainingAvoidNotes.push(rule.avoidNote);
      trainingSuggestions.push(rule.suggestion);
      explanationPoints.push(makeExplanationPoint(pattern, rule.avoidNote));
    }
  }

  // Nutrition rules
  let nutritionRulesApplied = 0;
  for (const rule of NUTRITION_RULES) {
    if (nutritionRulesApplied >= 2) break;
    const pattern = patternBySymptom.get(rule.symptomId);
    if (!pattern) continue;
    if (qualifiesForModifier(pattern, rule.minSeverity, rule.minConsistency, currentCycleDay)) {
      nutritionPriorities.push(rule.priority);
      if (rule.timingNote && !nutritionTimingNote) nutritionTimingNote = rule.timingNote;
      explanationPoints.push(
        makeExplanationPoint(pattern, rule.priority)
      );
      nutritionRulesApplied++;
    }
  }

  // Recovery rules
  let recoveryRulesApplied = 0;
  for (const rule of RECOVERY_RULES) {
    if (recoveryRulesApplied >= 2) break;
    const pattern = patternBySymptom.get(rule.symptomId);
    if (!pattern) continue;
    if (qualifiesForModifier(pattern, rule.minSeverity, rule.minConsistency, currentCycleDay)) {
      recoveryPractices.push(rule.practice);
      if (rule.stressNote && !recoveryStressNote) recoveryStressNote = rule.stressNote;
      if (rule.sleepNote  && !recoverySleepNote)  recoverySleepNote  = rule.sleepNote;
      explanationPoints.push(
        makeExplanationPoint(pattern, rule.practice)
      );
      recoveryRulesApplied++;
    }
  }

  // Low-confidence nearby patterns: explanation points only
  for (const pattern of nearbyPatterns) {
    if (pattern.confidence !== "low") continue;
    // Don't duplicate an existing point for this symptom
    if (explanationPoints.some(ep => ep.observation.includes(
      SYMPTOM_BY_ID[pattern.symptomId]?.name ?? pattern.symptomId
    ))) continue;
    const name = SYMPTOM_BY_ID[pattern.symptomId]?.name ?? pattern.symptomId;
    explanationPoints.push(
      makeExplanationPoint(
        pattern,
        `Early data for ${name} — continue tracking to build a stronger pattern.`
      )
    );
  }

  // ── Assemble modified recommendation ───────────────────────────────────────

  const newBadge     = downgradeBadge(    recommendation.training.badge,     totalBadgeDowngrade);
  const newIntensity = downgradeIntensity(recommendation.training.intensity,  totalIntensityDowngrade);

  const combinedAvoidNote = [
    ...(recommendation.training.avoidNote ? [recommendation.training.avoidNote] : []),
    ...trainingAvoidNotes.slice(0, 2),
  ].join(" ");

  return {
    ...recommendation,
    training: {
      ...recommendation.training,
      badge:       newBadge,
      intensity:   newIntensity,
      avoidNote:   combinedAvoidNote || recommendation.training.avoidNote,
      suggestions: [
        ...trainingSuggestions.slice(0, 2),
        ...recommendation.training.suggestions,
      ],
    },
    nutrition: {
      ...recommendation.nutrition,
      priorities:  [
        ...recommendation.nutrition.priorities,
        ...nutritionPriorities,
      ],
      timingNote:  nutritionTimingNote ?? recommendation.nutrition.timingNote,
    },
    recovery: {
      ...recommendation.recovery,
      practices:  [
        ...recommendation.recovery.practices,
        ...recoveryPractices,
      ],
      stressNote: recoveryStressNote ?? recommendation.recovery.stressNote,
      sleepNote:  recoverySleepNote  ?? recommendation.recovery.sleepNote,
    },
    explanationPoints: [
      ...recommendation.explanationPoints,
      ...explanationPoints,
    ],
  };
}
